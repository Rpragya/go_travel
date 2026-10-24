from django.contrib import admin

from .models import Booking, Passenger


class PassengerInline(admin.TabularInline):
    model = Passenger
    extra = 0


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ["reference", "user", "booking_type", "status", "total_amount", "created_at"]
    list_filter = ["booking_type", "status"]
    search_fields = ["reference", "user__email", "contact_email"]
    readonly_fields = ["reference", "created_at", "confirmed_at", "cancelled_at"]
    raw_id_fields = ["flight_fare", "return_fare", "room_type", "user"]
    inlines = [PassengerInline]
