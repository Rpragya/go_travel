from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from apps.locations.serializers import CitySerializer

from .models import Amenity, Hotel, HotelImage, Review, RoomType


class AmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = ["id", "name", "icon"]


class HotelImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = HotelImage
        fields = ["url", "caption"]


class HotelListSerializer(serializers.ModelSerializer):
    city = serializers.CharField(source="city.name")
    amenities = AmenitySerializer(many=True)
    thumbnail = serializers.SerializerMethodField()
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Hotel
        fields = [
            "id",
            "slug",
            "name",
            "city",
            "locality",
            "property_type",
            "star_rating",
            "user_rating",
            "review_count",
            "latitude",
            "longitude",
            "amenities",
            "thumbnail",
            "min_price",
        ]

    def get_thumbnail(self, obj):
        images = list(obj.images.all())
        return images[0].url if images else ""


class RoomTypeSerializer(serializers.ModelSerializer):
    rooms_left = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = RoomType
        fields = [
            "id",
            "name",
            "description",
            "bed_type",
            "size_sqft",
            "max_guests",
            "price_per_night",
            "breakfast_included",
            "refundable",
            "image_url",
            "rooms_left",
        ]


class HotelDetailSerializer(serializers.ModelSerializer):
    city = CitySerializer()
    amenities = AmenitySerializer(many=True)
    images = HotelImageSerializer(many=True)

    class Meta:
        model = Hotel
        fields = [
            "id",
            "slug",
            "name",
            "city",
            "locality",
            "address",
            "description",
            "property_type",
            "star_rating",
            "user_rating",
            "review_count",
            "latitude",
            "longitude",
            "amenities",
            "images",
            "check_in_time",
            "check_out_time",
        ]


class ReviewSerializer(serializers.ModelSerializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)

    class Meta:
        model = Review
        fields = ["id", "author_name", "rating", "title", "comment", "created_at"]
        read_only_fields = ["id", "author_name", "created_at"]


class StayParamsSerializer(serializers.Serializer):
    check_in = serializers.DateField()
    check_out = serializers.DateField()
    rooms = serializers.IntegerField(min_value=1, max_value=8, default=1)
    guests = serializers.IntegerField(min_value=1, max_value=24, default=2)

    def validate(self, attrs):
        today = timezone.localdate()
        if attrs["check_in"] < today:
            raise serializers.ValidationError({"check_in": "Check-in cannot be in the past."})
        if attrs["check_out"] <= attrs["check_in"]:
            raise serializers.ValidationError({"check_out": "Check-out must be after check-in."})
        if attrs["check_out"] - attrs["check_in"] > timedelta(days=30):
            raise serializers.ValidationError({"check_out": "Stays are limited to 30 nights."})
        if attrs["check_in"] > today + timedelta(days=365):
            raise serializers.ValidationError({"check_in": "Choose a date within the next 12 months."})
        if attrs["guests"] < attrs["rooms"]:
            raise serializers.ValidationError({"guests": "Each room needs at least one guest."})
        return attrs


class HotelSearchParamsSerializer(StayParamsSerializer):
    SORTS = {
        "popularity": ["-review_count"],
        "price": ["min_price"],
        "-price": ["-min_price"],
        "rating": ["-user_rating", "-review_count"],
        "stars": ["-star_rating", "min_price"],
    }

    city = serializers.IntegerField()
    stars = serializers.CharField(required=False)
    amenities = serializers.CharField(required=False)
    property_type = serializers.CharField(required=False)
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    min_rating = serializers.DecimalField(max_digits=2, decimal_places=1, required=False)
    q = serializers.CharField(required=False)
    sort = serializers.ChoiceField(choices=list(SORTS), default="popularity")
