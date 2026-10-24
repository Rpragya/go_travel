from rest_framework import serializers

from apps.locations.models import Airport

from .models import Airline, Flight, FlightFare


class AirlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Airline
        fields = ["code", "name", "color"]


class AirportBriefSerializer(serializers.ModelSerializer):
    city = serializers.CharField(source="city.name")

    class Meta:
        model = Airport
        fields = ["iata", "name", "city"]


class FlightSerializer(serializers.ModelSerializer):
    airline = AirlineSerializer()
    origin = AirportBriefSerializer()
    destination = AirportBriefSerializer()
    stop_airport = AirportBriefSerializer(allow_null=True)

    class Meta:
        model = Flight
        fields = [
            "id",
            "airline",
            "flight_number",
            "origin",
            "destination",
            "departure",
            "arrival",
            "duration_minutes",
            "stops",
            "stop_airport",
            "aircraft",
        ]


class FareSerializer(serializers.ModelSerializer):
    flight = FlightSerializer()
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = FlightFare
        fields = [
            "id",
            "cabin_class",
            "base_fare",
            "taxes",
            "price",
            "seats_available",
            "refundable",
            "baggage_checkin",
            "baggage_cabin",
            "flight",
        ]


class FlightSearchParamsSerializer(serializers.Serializer):
    SLOTS = {"early": (0, 6), "morning": (6, 12), "afternoon": (12, 18), "night": (18, 24)}
    SORTS = ["price", "-price", "duration", "departure", "-departure", "arrival"]

    origin = serializers.CharField(source="from", max_length=3)
    destination = serializers.CharField(source="to", max_length=3)
    date = serializers.DateField()
    cabin = serializers.ChoiceField(choices=FlightFare.Cabin.choices, default=FlightFare.Cabin.ECONOMY)
    travellers = serializers.IntegerField(min_value=1, max_value=9, default=1)
    stops = serializers.CharField(required=False)  # "0,1"
    airlines = serializers.CharField(required=False)  # "6E,AI"
    slot = serializers.CharField(required=False)  # "morning,night"
    max_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    refundable = serializers.BooleanField(required=False, default=False)
    sort = serializers.ChoiceField(choices=SORTS, default="price")

    def to_internal_value(self, data):
        # "from"/"to" are Python keywords, so map query params by hand.
        data = data.copy()
        data.setdefault("origin", data.get("from"))
        data.setdefault("destination", data.get("to"))
        return super().to_internal_value(data)
