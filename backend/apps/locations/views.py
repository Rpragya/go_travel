from django.db.models import Count, Q
from rest_framework import generics, permissions

from .models import Airport, City
from .serializers import AirportSerializer, CitySerializer


class AirportSearchView(generics.ListAPIView):
    serializer_class = AirportSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        q = self.request.query_params.get("q", "").strip()
        qs = Airport.objects.select_related("city").order_by("tier", "iata")
        if q:
            qs = qs.filter(
                Q(iata__iexact=q) | Q(city__name__icontains=q) | Q(name__icontains=q) | Q(city__country__icontains=q)
            )
        return qs[:10]


class CitySearchView(generics.ListAPIView):
    serializer_class = CitySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        q = self.request.query_params.get("q", "").strip()
        qs = City.objects.annotate(hotel_count=Count("hotels")).filter(hotel_count__gt=0)
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(state__icontains=q) | Q(country__icontains=q))
        return qs.order_by("-is_popular", "name")[:10]


class PopularCitiesView(generics.ListAPIView):
    serializer_class = CitySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return City.objects.filter(is_popular=True).annotate(hotel_count=Count("hotels"))
