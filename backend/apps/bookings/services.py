"""Booking lifecycle: price -> hold inventory -> confirm on payment -> cancel/expire.

Inventory is decremented when a booking is created (PENDING) so two people can't pay for the
last seat. Rows are locked with select_for_update; unpaid holds are released after
BOOKING_HOLD_MINUTES by the `expire_pending_bookings` Celery task.
"""

from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from apps.flights.models import FlightFare
from apps.hotels.models import RoomInventory, RoomType
from apps.offers.models import Coupon

from .models import Booking, Passenger

FLIGHT_CANCEL_FEE_PER_PAX = Decimal(300)


class BookingError(Exception):
    pass


@dataclass
class Quote:
    base_amount: Decimal
    taxes: Decimal
    discount: Decimal = Decimal(0)
    coupon: Coupon | None = None
    coupon_message: str | None = None

    @property
    def total(self):
        return self.base_amount + self.taxes - self.discount


def hotel_tax_rate(price_per_night):
    # Simplified GST slabs for accommodation.
    return Decimal("0.12") if price_per_night <= 7500 else Decimal("0.18")


def quote_flight(fares, pax):
    base = sum((f.base_fare for f in fares), Decimal(0)) * pax
    taxes = sum((f.taxes for f in fares), Decimal(0)) * pax
    return Quote(base, taxes)


def quote_hotel(room_type, check_in, check_out, rooms):
    nights = (check_out - check_in).days
    base = room_type.price_per_night * nights * rooms
    return Quote(base, (base * hotel_tax_rate(room_type.price_per_night)).quantize(Decimal("1")))


def apply_coupon(quote, code, booking_type):
    if not code:
        return quote
    coupon = Coupon.objects.filter(code__iexact=code.strip()).first()
    if not coupon:
        quote.coupon_message = "Invalid coupon code."
        return quote
    discount, error = coupon.evaluate(booking_type, quote.base_amount + quote.taxes)
    if error:
        quote.coupon_message = error
    else:
        quote.discount, quote.coupon, quote.coupon_message = discount, coupon, coupon.title
    return quote


# ---- inventory -------------------------------------------------------------------------------


def _fares(booking):
    return [f for f in (booking.flight_fare, booking.return_fare) if f]


def _hold(booking):
    pax = booking.passengers.count()
    if booking.booking_type == Booking.Type.FLIGHT:
        ids = [f.id for f in _fares(booking)]
        for fare in FlightFare.objects.select_for_update().filter(id__in=ids).order_by("id"):
            if fare.seats_available < pax:
                raise BookingError(f"Only {fare.seats_available} seat(s) left on {fare.flight}.")
            fare.seats_available -= pax
            fare.save(update_fields=["seats_available"])
    else:
        room_type = RoomType.objects.select_for_update().get(pk=booking.room_type_id)
        dates = [booking.check_in + timedelta(days=i) for i in range(booking.nights)]
        for day in dates:
            try:
                with transaction.atomic():
                    RoomInventory.objects.get_or_create(room_type=room_type, date=day)
            except IntegrityError:
                pass  # created concurrently
        rows = RoomInventory.objects.select_for_update().filter(room_type=room_type, date__in=dates)
        for row in rows:
            if row.booked + booking.rooms > room_type.total_rooms:
                raise BookingError(f"{room_type.name} is sold out on {row.date:%d %b}.")
        rows.update(booked=F("booked") + booking.rooms)
    booking.inventory_held = True


def _release(booking):
    if not booking.inventory_held:
        return
    pax = booking.passengers.count()
    if booking.booking_type == Booking.Type.FLIGHT:
        FlightFare.objects.filter(id__in=[f.id for f in _fares(booking)]).update(
            seats_available=F("seats_available") + pax
        )
    else:
        RoomInventory.objects.filter(
            room_type=booking.room_type,
            date__gte=booking.check_in,
            date__lt=booking.check_out,
            booked__gte=booking.rooms,
        ).update(booked=F("booked") - booking.rooms)
    booking.inventory_held = False


# ---- lifecycle -------------------------------------------------------------------------------


@transaction.atomic
def create_booking(user, data):
    booking = Booking(
        user=user,
        booking_type=data["booking_type"],
        contact_email=data["contact_email"],
        contact_phone=data["contact_phone"],
    )
    passengers = data["passengers"]
    if booking.booking_type == Booking.Type.FLIGHT:
        booking.flight_fare = data["fare"]
        booking.return_fare = data.get("return_fare")
        quote = quote_flight(_fares(booking), len(passengers))
    else:
        booking.room_type = data["room_type"]
        booking.check_in, booking.check_out = data["check_in"], data["check_out"]
        booking.rooms, booking.guests = data["rooms"], data["guests"]
        quote = quote_hotel(booking.room_type, booking.check_in, booking.check_out, booking.rooms)

    quote = apply_coupon(quote, data.get("coupon_code"), booking.booking_type)
    if data.get("coupon_code") and not quote.coupon:
        raise BookingError(quote.coupon_message)
    booking.base_amount, booking.taxes = quote.base_amount, quote.taxes
    booking.discount, booking.coupon, booking.total_amount = quote.discount, quote.coupon, quote.total
    booking.hold_expires_at = timezone.now() + timedelta(minutes=settings.BOOKING_HOLD_MINUTES)
    booking.save()
    Passenger.objects.bulk_create([Passenger(booking=booking, **p) for p in passengers])
    _hold(booking)
    booking.save(update_fields=["inventory_held"])
    return booking


def confirm_booking(booking_id):
    """Mark a booking paid. Re-acquires inventory if the hold lapsed before payment landed."""
    from .tasks import send_booking_confirmation

    failure = None
    with transaction.atomic():
        booking = Booking.objects.select_for_update().get(pk=booking_id)
        if booking.status == Booking.Status.CONFIRMED:
            return booking
        if booking.status in (Booking.Status.CANCELLED, Booking.Status.FAILED):
            raise BookingError("This booking can no longer be confirmed.")
        if not booking.inventory_held:
            try:
                with transaction.atomic():
                    _hold(booking)
            except BookingError as exc:
                failure = exc
        if failure:
            # Saved outside the failed savepoint so the FAILED status is committed.
            booking.status = Booking.Status.FAILED
            booking.save(update_fields=["status"])
        else:
            booking.status = Booking.Status.CONFIRMED
            booking.confirmed_at = timezone.now()
            booking.hold_expires_at = None
            booking.save()
            transaction.on_commit(lambda: send_booking_confirmation.delay(booking.id))
    if failure:
        raise failure
    return booking


def refund_for(booking, now=None):
    now = now or timezone.now()
    if booking.status != Booking.Status.CONFIRMED:
        return Decimal(0)
    if booking.booking_type == Booking.Type.FLIGHT:
        pax = booking.passengers.count()
        amount = Decimal(0)
        for fare in _fares(booking):
            if fare.refundable:
                amount += (fare.base_fare + fare.taxes - FLIGHT_CANCEL_FEE_PER_PAX) * pax
            else:
                amount += fare.taxes * pax
    else:
        if not booking.room_type.refundable:
            return Decimal(0)
        amount = booking.total_amount
        if booking.starts_at - now < timedelta(hours=24):
            one_night = booking.room_type.price_per_night * booking.rooms
            amount -= one_night * (1 + hotel_tax_rate(booking.room_type.price_per_night))
    return max(Decimal(0), min(amount, booking.total_amount)).quantize(Decimal("1.00"))


def cancel_booking(booking_id):
    from apps.payments.gateway import refund_payment

    from .tasks import send_cancellation_email

    with transaction.atomic():
        booking = Booking.objects.select_for_update().get(pk=booking_id)
        if not booking.can_cancel:
            raise BookingError("This booking can't be cancelled.")
        was_confirmed = booking.status == Booking.Status.CONFIRMED
        booking.refund_amount = refund_for(booking)
        _release(booking)
        booking.status = Booking.Status.CANCELLED
        booking.cancelled_at = timezone.now()
        booking.save()
        if was_confirmed and booking.refund_amount > 0:
            refund_payment(booking, booking.refund_amount)
        if was_confirmed:
            transaction.on_commit(lambda: send_cancellation_email.delay(booking.id))
    return booking


def expire_stale_bookings():
    expired = 0
    stale = Booking.objects.filter(status=Booking.Status.PENDING, hold_expires_at__lt=timezone.now())
    for booking_id in stale.values_list("id", flat=True):
        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(pk=booking_id)
            if booking.status != Booking.Status.PENDING:
                continue
            _release(booking)
            booking.status = Booking.Status.EXPIRED
            booking.save()
            expired += 1
    return expired
