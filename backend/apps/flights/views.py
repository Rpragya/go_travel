from datetime import timedelta

from django.core.cache import cache
from django.db.models import DecimalField as ModelDecimalField
from django.db.models import ExpressionWrapper, F, Max, Min
from django.db.models.functions import ExtractHour
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.locations.models import Airport

from .generator import generate_route_day
from .models import FlightFare
from .serializers import FareSerializer, FlightSearchParamsSerializer

SEARCH_CACHE_SECONDS = 30


class FlightSearchView(APIView):
    """GET /api/flights/search/?from=DEL&to=BOM&date=2026-11-20&cabin=ECONOMY&travellers=2"""

    permission_classes = [permissions.AllowAny]

    @extend_schema(parameters=[FlightSearchParamsSerializer], responses={200: dict})
    def get(self, request):
        params = FlightSearchParamsSerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        p = params.validated_data
        today = timezone.localdate()
        if not today <= p["date"] <= today + timedelta(days=365):
            raise serializers.ValidationError({"date": "Choose a date within the next 12 months."})

        cache_key = "flight-search:" + request.get_full_path()
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        origin = get_object_or_404(Airport.objects.select_related("city"), iata=p["from"].upper())
        destination = get_object_or_404(Airport.objects.select_related("city"), iata=p["to"].upper())
        if origin == destination:
            raise serializers.ValidationError({"to": "Origin and destination must differ."})
        generate_route_day(origin, destination, p["date"])

        price = ExpressionWrapper(F("base_fare") + F("taxes"), output_field=ModelDecimalField())
        base_qs = (
            FlightFare.objects.select_related(
                "flight__airline", "flight__origin__city", "flight__destination__city", "flight__stop_airport__city"
            )
            .filter(
                flight__origin=origin,
                flight__destination=destination,
                flight__departure__date=p["date"],
                flight__departure__gt=timezone.now() + timedelta(hours=2),
                cabin_class=p["cabin"],
                seats_available__gte=p["travellers"],
            )
            .annotate(total=price, dep_hour=ExtractHour("flight__departure"))
        )

        facets = {
            "airlines": [
                {"code": row["flight__airline__code"], "name": row["flight__airline__name"], "min_price": row["min"]}
                for row in base_qs.values("flight__airline__code", "flight__airline__name")
                .annotate(min=Min("total"))
                .order_by("min")
            ],
            "price_range": base_qs.aggregate(min=Min("total"), max=Max("total")),
        }

        qs = base_qs
        if p.get("stops"):
            stops = [int(s) for s in p["stops"].split(",") if s.isdigit()]
            qs = qs.filter(flight__stops__in=stops)
        if p.get("airlines"):
            qs = qs.filter(flight__airline__code__in=p["airlines"].upper().split(","))
        if p.get("slot"):
            slots = [FlightSearchParamsSerializer.SLOTS[s] for s in p["slot"].split(",") if s in params.SLOTS]
            hours = {h for lo, hi in slots for h in range(lo, hi)}
            qs = qs.filter(dep_hour__in=hours)
        if p.get("max_price"):
            qs = qs.filter(total__lte=p["max_price"])
        if p.get("refundable"):
            qs = qs.filter(refundable=True)

        order = {
            "price": ["total", "flight__departure"],
            "-price": ["-total"],
            "duration": ["flight__duration_minutes", "total"],
            "departure": ["flight__departure"],
            "-departure": ["-flight__departure"],
            "arrival": ["flight__arrival"],
        }[p["sort"]]
        results = FareSerializer(qs.order_by(*order), many=True).data
        data = {
            "origin": {"iata": origin.iata, "city": origin.city.name},
            "destination": {"iata": destination.iata, "city": destination.city.name},
            "date": p["date"],
            "count": len(results),
            "facets": facets,
            "results": results,
        }
        cache.set(cache_key, data, SEARCH_CACHE_SECONDS)
        return Response(data)


class FareDetailView(generics.RetrieveAPIView):
    serializer_class = FareSerializer
    permission_classes = [permissions.AllowAny]
    queryset = FlightFare.objects.select_related(
        "flight__airline", "flight__origin__city", "flight__destination__city", "flight__stop_airport__city"
    )


class CheapestFaresView(APIView):
    """Lowest economy fare for each of the next 7 days around a date (for the date strip)."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: dict})
    def get(self, request):
        origin = get_object_or_404(Airport, iata=request.query_params.get("from", "").upper())
        destination = get_object_or_404(Airport, iata=request.query_params.get("to", "").upper())
        try:
            center = serializers.DateField().to_internal_value(request.query_params.get("date"))
        except serializers.ValidationError:
            center = timezone.localdate()
        today = timezone.localdate()
        start = max(today, center - timedelta(days=3))
        days = [start + timedelta(days=i) for i in range(7)]
        out = []
        for day in days:
            generate_route_day(origin, destination, day)
            low = (
                FlightFare.objects.filter(
                    flight__origin=origin,
                    flight__destination=destination,
                    flight__departure__date=day,
                    cabin_class=FlightFare.Cabin.ECONOMY,
                    seats_available__gt=0,
                )
                .annotate(total=ExpressionWrapper(F("base_fare") + F("taxes"), output_field=ModelDecimalField()))
                .aggregate(m=Min("total"))["m"]
            )
            out.append({"date": day, "min_price": low})
        return Response(out)
