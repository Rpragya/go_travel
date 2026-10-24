import secrets
import string
from datetime import datetime

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.flights.models import FlightFare
from apps.hotels.models import RoomType
from apps.offers.models import Coupon


def generate_reference():
    alphabet = string.ascii_uppercase + string.digits
    return "GT" + "".join(secrets.choice(alphabet) for _ in range(8))


class Booking(models.Model):
    class Type(models.TextChoices):
        FLIGHT = "FLIGHT", "Flight"
        HOTEL = "HOTEL", "Hotel"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Payment pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CANCELLED = "CANCELLED", "Cancelled"
        EXPIRED = "EXPIRED", "Expired"
        FAILED = "FAILED", "Failed"

    reference = models.CharField(max_length=12, unique=True, default=generate_reference, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings")
    booking_type = models.CharField(max_length=10, choices=Type.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

    flight_fare = models.ForeignKey(FlightFare, null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    return_fare = models.ForeignKey(FlightFare, null=True, blank=True, on_delete=models.PROTECT, related_name="+")

    room_type = models.ForeignKey(RoomType, null=True, blank=True, on_delete=models.PROTECT, related_name="bookings")
    check_in = models.DateField(null=True, blank=True)
    check_out = models.DateField(null=True, blank=True)
    rooms = models.PositiveSmallIntegerField(default=1)
    guests = models.PositiveSmallIntegerField(default=1)

    base_amount = models.DecimalField(max_digits=12, decimal_places=2)
    taxes = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    coupon = models.ForeignKey(Coupon, null=True, blank=True, on_delete=models.SET_NULL)
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=15)

    inventory_held = models.BooleanField(default=False)
    hold_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "hold_expires_at"])]

    def __str__(self):
        return self.reference

    @property
    def nights(self):
        return (self.check_out - self.check_in).days if self.check_in and self.check_out else 0

    @property
    def pax_count(self):
        return self.passengers.count()

    @property
    def starts_at(self):
        if self.booking_type == self.Type.FLIGHT:
            return self.flight_fare.flight.departure
        hotel = self.room_type.hotel
        return timezone.make_aware(datetime.combine(self.check_in, hotel.check_in_time))

    @property
    def ends_at(self):
        if self.booking_type == self.Type.FLIGHT:
            return (self.return_fare or self.flight_fare).flight.arrival
        return timezone.make_aware(datetime.combine(self.check_out, self.room_type.hotel.check_out_time))

    @property
    def can_cancel(self):
        return self.status in (self.Status.PENDING, self.Status.CONFIRMED) and self.starts_at > timezone.now()


class Passenger(models.Model):
    class PaxType(models.TextChoices):
        ADULT = "ADULT", "Adult"
        CHILD = "CHILD", "Child"

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="passengers")
    first_name = models.CharField(max_length=60)
    last_name = models.CharField(max_length=60)
    gender = models.CharField(max_length=1, choices=[("M", "Male"), ("F", "Female"), ("O", "Other")])
    age = models.PositiveSmallIntegerField()
    pax_type = models.CharField(max_length=5, choices=PaxType.choices, default=PaxType.ADULT)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
