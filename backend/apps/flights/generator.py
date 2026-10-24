"""Deterministic schedule generator.

Real flight inventory needs a GDS/airline API. Instead, the first search for a route + date
generates a realistic schedule seeded by the route and date, so results are stable.
"""

import random
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.locations.models import Airport

from .models import Airline, Flight, FlightFare, GeneratedRouteDay

HUBS = ["DEL", "BOM", "BLR", "HYD"]
INTL_HUBS = {"United Arab Emirates": "DXB", "Singapore": "SIN", "Thailand": "BKK", "Malaysia": "KUL"}
AIRCRAFT = {
    "short": ["Airbus A320neo", "Airbus A321neo", "Boeing 737 MAX 8", "ATR 72-600"],
    "long": ["Boeing 787-8", "Boeing 777-300ER", "Airbus A350-900", "Airbus A380"],
}


def _money(value):
    return Decimal(round(value)).quantize(Decimal("1.00"))


def _carriers(origin, destination):
    airlines = list(Airline.objects.all())
    domestic = [a for a in airlines if a.is_domestic]
    if origin.is_domestic and destination.is_domestic:
        return domestic
    foreign_countries = {origin.city.country, destination.city.country} - {"India"}
    foreign = [a for a in airlines if a.home_country in foreign_countries]
    return foreign + [a for a in domestic if a.code in ("AI", "6E", "IX")]


def _flights_per_day(origin, destination, rng):
    tier = max(origin.tier, destination.tier)
    low, high = {1: (8, 14), 2: (4, 8), 3: (2, 5)}[tier]
    return rng.randint(low, high)


def generate_route_day(origin: Airport, destination: Airport, date):
    """Create flights for one route/date unless already generated. Safe to call concurrently."""
    if origin.pk == destination.pk:
        return
    if GeneratedRouteDay.objects.filter(origin=origin, destination=destination, date=date).exists():
        return
    try:
        with transaction.atomic():
            GeneratedRouteDay.objects.create(origin=origin, destination=destination, date=date)
            _generate(origin, destination, date)
    except IntegrityError:
        pass  # another request generated it first


def _generate(origin, destination, date):
    rng = random.Random(f"{origin.iata}-{destination.iata}-{date.isoformat()}")
    carriers = _carriers(origin, destination)
    if not carriers:
        return
    distance = origin.distance_km(destination)
    domestic = origin.is_domestic and destination.is_domestic
    long_haul = distance > 3000
    hub_pool = HUBS if domestic else HUBS + list(INTL_HUBS.values())
    hubs = [h for h in hub_pool if h not in (origin.iata, destination.iata)]
    hub_airports = {a.iata: a for a in Airport.objects.filter(iata__in=hubs)}

    days_out = (date - timezone.localdate()).days
    # Fares rise as the date approaches, and on weekends.
    demand = 1.0 + max(0, 21 - days_out) * 0.03 + (0.12 if date.weekday() in (4, 6) else 0)
    tz = timezone.get_current_timezone()

    for _ in range(_flights_per_day(origin, destination, rng)):
        airline = rng.choice(carriers)
        stop_airport = None
        stops = 0
        if (max(origin.tier, destination.tier) == 3 or long_haul) and hubs and rng.random() < 0.4:
            stop_airport = hub_airports.get(rng.choice(hubs))
            stops = 1 if stop_airport else 0

        flying = distance / 780 * 60 + 35
        if stop_airport:
            flying = (origin.distance_km(stop_airport) + stop_airport.distance_km(destination)) / 780 * 60 + 70
            flying += rng.randint(60, 240)  # layover
        duration = int(round(flying / 5) * 5)

        dep_minutes = rng.randrange(5 * 60, 23 * 60 + 30, 5)
        departure = datetime.combine(date, time()) + timedelta(minutes=dep_minutes)
        departure = departure.replace(tzinfo=tz)
        flight = Flight.objects.create(
            airline=airline,
            flight_number=str(rng.randint(100, 2999)),
            origin=origin,
            destination=destination,
            departure=departure,
            arrival=departure + timedelta(minutes=duration),
            duration_minutes=duration,
            stops=stops,
            stop_airport=stop_airport,
            aircraft=rng.choice(AIRCRAFT["long" if long_haul else "short"]),
        )

        base = (1800 + distance * (4.2 if domestic else 5.5)) * rng.uniform(0.8, 1.45) * demand
        if stops:
            base *= 0.85
        refundable = rng.random() < 0.35
        if refundable:
            base *= 1.12
        cabins = [(FlightFare.Cabin.ECONOMY, 1.0)]
        if airline.code in ("AI", "EK", "SQ", "TG", "BA", "MH", "UL") or (not domestic and rng.random() < 0.5):
            cabins += [(FlightFare.Cabin.PREMIUM, 1.7), (FlightFare.Cabin.BUSINESS, 3.4)]
        elif rng.random() < 0.3:
            cabins.append((FlightFare.Cabin.BUSINESS, 2.8))
        for cabin, multiplier in cabins:
            fare_base = base * multiplier
            FlightFare.objects.create(
                flight=flight,
                cabin_class=cabin,
                base_fare=_money(fare_base),
                taxes=_money(fare_base * 0.12 + (450 if domestic else 1800)),
                seats_available=rng.choice([2, 3, 5, 8, 12, 20, 30, 40]),
                refundable=refundable or cabin == FlightFare.Cabin.BUSINESS,
                baggage_checkin="30 kg" if cabin != FlightFare.Cabin.ECONOMY or not domestic else "15 kg",
                baggage_cabin="7 kg",
            )
