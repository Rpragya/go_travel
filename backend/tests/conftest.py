from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.flights.models import Airline, Flight, FlightFare
from apps.hotels.models import Hotel, RoomType
from apps.locations.models import Airport, City


@pytest.fixture
def user(db):
    return User.objects.create_user("asha@example.com", "Str0ng!pass", first_name="Asha", is_verified=True)


@pytest.fixture
def client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


@pytest.fixture
def anon():
    return APIClient()


@pytest.fixture
def airports(db):
    delhi = City.objects.create(name="New Delhi", latitude=28.6, longitude=77.2)
    mumbai = City.objects.create(name="Mumbai", latitude=19.0, longitude=72.8)
    Airline.objects.create(code="6E", name="IndiGo")
    Airline.objects.create(code="AI", name="Air India")
    return (
        Airport.objects.create(iata="DEL", name="Delhi", city=delhi, latitude=28.55, longitude=77.1, tier=1),
        Airport.objects.create(iata="BOM", name="Mumbai", city=mumbai, latitude=19.08, longitude=72.86, tier=1),
    )


@pytest.fixture
def fare(airports):
    dep = timezone.now() + timedelta(days=5)
    flight = Flight.objects.create(
        airline=Airline.objects.get(code="6E"),
        flight_number="101",
        origin=airports[0],
        destination=airports[1],
        departure=dep,
        arrival=dep + timedelta(hours=2),
        duration_minutes=120,
    )
    return FlightFare.objects.create(
        flight=flight,
        cabin_class="ECONOMY",
        base_fare=Decimal("5000"),
        taxes=Decimal("1000"),
        seats_available=3,
        refundable=True,
    )


@pytest.fixture
def room(airports):
    hotel = Hotel.objects.create(
        name="Sea View",
        slug="sea-view",
        city=airports[1].city,
        address="Marine Drive",
        description="Nice",
        latitude=19.0,
        longitude=72.8,
    )
    return RoomType.objects.create(hotel=hotel, name="Deluxe", price_per_night=Decimal("4000"), total_rooms=2)


def pax(n=1, **extra):
    return [
        {"first_name": f"P{i}", "last_name": "Test", "gender": "F", "age": 30, "pax_type": "ADULT", **extra}
        for i in range(n)
    ]


def flight_payload(fare, n=1, **extra):
    return {
        "booking_type": "FLIGHT",
        "fare_id": fare.id,
        "passengers": pax(n),
        "contact_email": "a@b.com",
        "contact_phone": "9876543210",
        **extra,
    }


def hotel_payload(room, days_out=5, nights=2, rooms=1, **extra):
    check_in = timezone.localdate() + timedelta(days=days_out)
    return {
        "booking_type": "HOTEL",
        "room_type_id": room.id,
        "check_in": str(check_in),
        "check_out": str(check_in + timedelta(days=nights)),
        "rooms": rooms,
        "guests": rooms,
        "passengers": pax(1),
        "contact_email": "a@b.com",
        "contact_phone": "9876543210",
        **extra,
    }
