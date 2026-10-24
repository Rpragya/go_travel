from rest_framework import serializers

from .models import Airport, City


class CitySerializer(serializers.ModelSerializer):
    hotel_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = City
        fields = ["id", "name", "state", "country", "latitude", "longitude", "image_url", "tagline", "hotel_count"]


class AirportSerializer(serializers.ModelSerializer):
    city = serializers.CharField(source="city.name")
    country = serializers.CharField(source="city.country")

    class Meta:
        model = Airport
        fields = ["iata", "name", "city", "country"]
