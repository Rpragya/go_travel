from django.contrib import admin

from .models import Amenity, Hotel, HotelImage, Review, RoomType


class ImageInline(admin.TabularInline):
    model = HotelImage
    extra = 0


class RoomInline(admin.StackedInline):
    model = RoomType
    extra = 0


@admin.register(Hotel)
class HotelAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "star_rating", "user_rating", "is_active"]
    list_filter = ["city", "star_rating", "property_type", "is_active"]
    search_fields = ["name", "city__name"]
    prepopulated_fields = {"slug": ["name"]}
    filter_horizontal = ["amenities"]
    inlines = [ImageInline, RoomInline]


admin.site.register(Amenity)
admin.site.register(Review)
