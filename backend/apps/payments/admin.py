from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["order_id", "booking", "provider", "status", "amount", "created_at"]
    list_filter = ["provider", "status"]
    search_fields = ["order_id", "payment_id", "booking__reference"]
