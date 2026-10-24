from django.db import models

from apps.bookings.models import Booking


class Payment(models.Model):
    class Provider(models.TextChoices):
        RAZORPAY = "RAZORPAY", "Razorpay"
        MOCK = "MOCK", "Mock gateway"

    class Status(models.TextChoices):
        CREATED = "CREATED", "Created"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="payments")
    provider = models.CharField(max_length=10, choices=Provider.choices)
    order_id = models.CharField(max_length=60, unique=True)
    payment_id = models.CharField(max_length=60, blank=True)
    amount = models.PositiveIntegerField(help_text="In paise")
    currency = models.CharField(max_length=3, default="INR")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.CREATED)
    refund_id = models.CharField(max_length=60, blank=True)
    refunded_amount = models.PositiveIntegerField(default=0)
    error = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order_id} ({self.status})"
