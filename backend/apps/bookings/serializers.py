from django.utils import timezone
from rest_framework import serializers

from apps.flights.models import FlightFare
from apps.flights.serializers import FareSerializer
from apps.hotels.models import RoomType
from apps.hotels.serializers import RoomTypeSerializer, StayParamsSerializer

from .models import Booking, Passenger


class PassengerSerializer(serializers.ModelSerializer):
    age = serializers.IntegerField(min_value=0, max_value=120)

    class Meta:
        model = Passenger
        fields = ["first_name", "last_name", "gender", "age", "pax_type"]

    def validate(self, attrs):
        child = attrs.get("pax_type") == Passenger.PaxType.CHILD
        if child and attrs["age"] >= 12:
            raise serializers.ValidationError("Children must be under 12.")
        if not child and attrs["age"] < 12:
            raise serializers.ValidationError("Adults must be 12 or older.")
        return attrs


class BookingCreateSerializer(serializers.Serializer):
    booking_type = serializers.ChoiceField(choices=Booking.Type.choices)
    fare_id = serializers.IntegerField(required=False)
    return_fare_id = serializers.IntegerField(required=False, allow_null=True)
    room_type_id = serializers.IntegerField(required=False)
    check_in = serializers.DateField(required=False)
    check_out = serializers.DateField(required=False)
    rooms = serializers.IntegerField(min_value=1, max_value=8, default=1)
    guests = serializers.IntegerField(min_value=1, max_value=24, default=1)
    passengers = PassengerSerializer(many=True, required=False)
    contact_email = serializers.EmailField(required=False)
    contact_phone = serializers.RegexField(
        r"^\+?\d{10,14}$", required=False, error_messages={"invalid": "Enter a valid phone number."}
    )
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    quote_only = serializers.BooleanField(default=False)

    def validate(self, attrs):
        if not attrs["quote_only"]:
            missing = {f: "This field is required." for f in ("contact_email", "contact_phone") if not attrs.get(f)}
            if missing:
                raise serializers.ValidationError(missing)
        if attrs["booking_type"] == Booking.Type.FLIGHT:
            return self._validate_flight(attrs)
        return self._validate_hotel(attrs)

    def _validate_flight(self, attrs):
        qs = FlightFare.objects.select_related("flight")
        fare = qs.filter(pk=attrs.get("fare_id")).first()
        if not fare:
            raise serializers.ValidationError({"fare_id": "Select a flight."})
        if fare.flight.departure <= timezone.now():
            raise serializers.ValidationError({"fare_id": "This flight has already departed."})
        attrs["fare"] = fare
        if attrs.get("return_fare_id"):
            ret = qs.filter(pk=attrs["return_fare_id"]).first()
            if not ret:
                raise serializers.ValidationError({"return_fare_id": "Return flight not found."})
            if ret.flight.departure < fare.flight.arrival:
                raise serializers.ValidationError({"return_fare_id": "Return flight departs before you land."})
            attrs["return_fare"] = ret
        passengers = attrs.get("passengers") or []
        if not attrs["quote_only"]:
            if not 1 <= len(passengers) <= 9:
                raise serializers.ValidationError({"passengers": "Add between 1 and 9 travellers."})
            if not any(p["pax_type"] == "ADULT" for p in passengers):
                raise serializers.ValidationError({"passengers": "At least one adult must travel."})
        return attrs

    def _validate_hotel(self, attrs):
        room = RoomType.objects.select_related("hotel").filter(pk=attrs.get("room_type_id")).first()
        if not room:
            raise serializers.ValidationError({"room_type_id": "Select a room."})
        stay = StayParamsSerializer(data={k: attrs.get(k) for k in ("check_in", "check_out", "rooms", "guests")})
        stay.is_valid(raise_exception=True)
        attrs.update(stay.validated_data)
        if attrs["guests"] > room.max_guests * attrs["rooms"]:
            raise serializers.ValidationError(
                {"guests": f"{room.name} fits {room.max_guests} guests per room. Add more rooms."}
            )
        attrs["room_type"] = room
        if not attrs["quote_only"] and not attrs.get("passengers"):
            raise serializers.ValidationError({"passengers": "Add the primary guest's details."})
        return attrs


class HotelSummarySerializer(serializers.Serializer):
    def to_representation(self, booking):
        hotel = booking.room_type.hotel
        image = hotel.images.first()
        return {
            "name": hotel.name,
            "slug": hotel.slug,
            "city": hotel.city.name,
            "address": hotel.address,
            "star_rating": hotel.star_rating,
            "thumbnail": image.url if image else "",
            "check_in_time": hotel.check_in_time,
            "check_out_time": hotel.check_out_time,
            "room": RoomTypeSerializer(booking.room_type).data,
        }


class BookingSerializer(serializers.ModelSerializer):
    passengers = PassengerSerializer(many=True)
    flight = FareSerializer(source="flight_fare")
    return_flight = FareSerializer(source="return_fare", allow_null=True)
    hotel = serializers.SerializerMethodField()
    coupon_code = serializers.CharField(source="coupon.code", default=None)
    can_cancel = serializers.BooleanField()
    nights = serializers.IntegerField()
    starts_at = serializers.DateTimeField()
    ends_at = serializers.DateTimeField()
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "reference",
            "booking_type",
            "status",
            "created_at",
            "confirmed_at",
            "cancelled_at",
            "hold_expires_at",
            "contact_email",
            "contact_phone",
            "base_amount",
            "taxes",
            "discount",
            "total_amount",
            "refund_amount",
            "coupon_code",
            "passengers",
            "flight",
            "return_flight",
            "hotel",
            "check_in",
            "check_out",
            "nights",
            "rooms",
            "guests",
            "can_cancel",
            "starts_at",
            "ends_at",
            "payment_status",
        ]

    def get_hotel(self, obj) -> dict | None:
        return HotelSummarySerializer().to_representation(obj) if obj.room_type_id else None

    def get_payment_status(self, obj) -> str | None:
        payment = obj.payments.order_by("-created_at").first()
        return payment.status if payment else None
