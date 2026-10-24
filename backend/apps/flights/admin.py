from django.contrib import admin

from .models import Airline, Flight, FlightFare


class FareInline(admin.TabularInline):
    model = FlightFare
    extra = 0


@admin.register(Airline)
class AirlineAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "is_domestic"]


@admin.register(Flight)
class FlightAdmin(admin.ModelAdmin):
    list_display = ["__str__", "departure", "arrival", "stops"]
    list_filter = ["airline", "stops"]
    search_fields = ["flight_number", "origin__iata", "destination__iata"]
    date_hierarchy = "departure"
    inlines = [FareInline]
