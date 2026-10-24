from django.conf import settings
from django.db import models
from django.db.models import Avg, Count

from apps.locations.models import City


class Amenity(models.Model):
    name = models.CharField(max_length=60, unique=True)
    icon = models.CharField(max_length=40, blank=True, help_text="lucide icon name")

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "amenities"

    def __str__(self):
        return self.name


class Hotel(models.Model):
    class PropertyType(models.TextChoices):
        HOTEL = "HOTEL", "Hotel"
        RESORT = "RESORT", "Resort"
        VILLA = "VILLA", "Villa"
        HOMESTAY = "HOMESTAY", "Homestay"

    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="hotels")
    locality = models.CharField(max_length=80, blank=True)
    address = models.CharField(max_length=255)
    description = models.TextField()
    property_type = models.CharField(max_length=10, choices=PropertyType.choices, default=PropertyType.HOTEL)
    star_rating = models.PositiveSmallIntegerField(default=3)
    latitude = models.FloatField()
    longitude = models.FloatField()
    amenities = models.ManyToManyField(Amenity, blank=True, related_name="hotels")
    check_in_time = models.TimeField(default="14:00")
    check_out_time = models.TimeField(default="11:00")
    user_rating = models.DecimalField(max_digits=2, decimal_places=1, default=0)
    review_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-user_rating"]

    def __str__(self):
        return self.name

    def refresh_rating(self):
        agg = self.reviews.aggregate(avg=Avg("rating"), n=Count("id"))
        self.user_rating = round(agg["avg"] or 0, 1)
        self.review_count = agg["n"]
        self.save(update_fields=["user_rating", "review_count"])


class HotelImage(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name="images")
    url = models.URLField()
    caption = models.CharField(max_length=120, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]


class RoomType(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name="room_types")
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    bed_type = models.CharField(max_length=40, default="King bed")
    size_sqft = models.PositiveIntegerField(default=250)
    max_guests = models.PositiveSmallIntegerField(default=2)
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    total_rooms = models.PositiveIntegerField(default=10)
    breakfast_included = models.BooleanField(default=False)
    refundable = models.BooleanField(default=True)
    image_url = models.URLField(blank=True)

    class Meta:
        ordering = ["price_per_night"]

    def __str__(self):
        return f"{self.hotel.name} - {self.name}"


class RoomInventory(models.Model):
    """Rooms held or booked for one room type on one night. Missing row = nothing booked."""

    room_type = models.ForeignKey(RoomType, on_delete=models.CASCADE, related_name="inventory")
    date = models.DateField()
    booked = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["room_type", "date"], name="uniq_room_date")]
        indexes = [models.Index(fields=["date"])]


class Review(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    author_name = models.CharField(max_length=80)
    rating = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=120)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
