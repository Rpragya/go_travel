from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage

from .models import Booking
from .services import expire_stale_bookings
from .tickets import build_ticket_pdf


def _title(booking):
    if booking.booking_type == Booking.Type.FLIGHT:
        f = booking.flight_fare.flight
        return f"{f.origin.city.name} to {f.destination.city.name}"
    return booking.room_type.hotel.name


@shared_task
def send_booking_confirmation(booking_id):
    booking = Booking.objects.get(pk=booking_id)
    email = EmailMessage(
        subject=f"Booking confirmed: {_title(booking)} ({booking.reference})",
        body=(
            f"Hi {booking.user.first_name or 'traveller'},\n\n"
            f"Your booking {booking.reference} is confirmed. Amount paid: ₹{booking.total_amount:,.2f}.\n"
            f"Your e-ticket is attached. You can also view it at {settings.FRONTEND_URL}/trips/{booking.reference}\n\n"
            "Happy travels!\nTeam Go Travels"
        ),
        to=[booking.contact_email],
    )
    email.attach(f"GoTravels-{booking.reference}.pdf", build_ticket_pdf(booking), "application/pdf")
    email.send()


@shared_task
def send_cancellation_email(booking_id):
    booking = Booking.objects.get(pk=booking_id)
    EmailMessage(
        subject=f"Booking cancelled: {booking.reference}",
        body=(
            f"Hi {booking.user.first_name or 'traveller'},\n\n"
            f"Your booking {booking.reference} ({_title(booking)}) has been cancelled.\n"
            f"Refund amount: ₹{booking.refund_amount:,.2f}. Refunds reach your account in 5-7 working days.\n\n"
            "Team Go Travels"
        ),
        to=[booking.contact_email],
    ).send()


@shared_task
def expire_pending_bookings():
    return expire_stale_bookings()
