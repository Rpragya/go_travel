from django.contrib import admin

from .models import Airport, City


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ["name", "state", "country", "is_popular"]
    list_filter = ["country", "is_popular"]
    search_fields = ["name"]


@admin.register(Airport)
class AirportAdmin(admin.ModelAdmin):
    list_display = ["iata", "name", "city", "tier"]
    search_fields = ["iata", "name", "city__name"]
