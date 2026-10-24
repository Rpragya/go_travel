from decimal import Decimal

from django.db import models
from django.utils import timezone


class Coupon(models.Model):
    class DiscountType(models.TextChoices):
        PERCENT = "PERCENT", "Percentage"
        FLAT = "FLAT", "Flat amount"

    class AppliesTo(models.TextChoices):
        ALL = "ALL", "All bookings"
        FLIGHT = "FLIGHT", "Flights"
        HOTEL = "HOTEL", "Hotels"

    code = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=120)
    description = models.CharField(max_length=255)
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    min_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    applies_to = models.CharField(max_length=10, choices=AppliesTo.choices, default=AppliesTo.ALL)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.code

    def evaluate(self, booking_type, amount):
        """Return (discount, error message). Error is None when the coupon applies."""
        now = timezone.now()
        if not self.is_active or now < self.valid_from or (self.valid_to and now > self.valid_to):
            return Decimal(0), "This coupon has expired."
        if self.applies_to not in (self.AppliesTo.ALL, booking_type):
            return Decimal(0), f"This coupon is valid only on {self.get_applies_to_display().lower()}."
        if amount < self.min_amount:
            return Decimal(0), f"Minimum booking amount for this coupon is ₹{self.min_amount:,.0f}."
        if self.discount_type == self.DiscountType.PERCENT:
            discount = (amount * self.value / 100).quantize(Decimal("1"))
            if self.max_discount:
                discount = min(discount, self.max_discount)
        else:
            discount = self.value
        return min(discount, amount), None
