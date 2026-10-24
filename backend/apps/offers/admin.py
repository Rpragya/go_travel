from django.contrib import admin

from .models import Coupon


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ["code", "title", "discount_type", "value", "applies_to", "is_active", "valid_to"]
    list_filter = ["applies_to", "is_active"]
