from django.db.models import Max, Min, Prefetch, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.locations.models import City

from .availability import available_room_types, cheapest_available_price, rooms_left
from .models import Amenity, Hotel, HotelImage
from .serializers import (
    AmenitySerializer,
    HotelDetailSerializer,
    HotelListSerializer,
    HotelSearchParamsSerializer,
    ReviewSerializer,
    RoomTypeSerializer,
    StayParamsSerializer,
)


class HotelPagination(PageNumberPagination):
    page_size = 12


class HotelSearchView(APIView):
    """GET /api/hotels/search/?city=7&check_in=...&check_out=...&rooms=1&guests=2"""

    permission_classes = [permissions.AllowAny]

    @extend_schema(parameters=[HotelSearchParamsSerializer], responses={200: dict})
    def get(self, request):
        params = HotelSearchParamsSerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        p = params.validated_data
        city = get_object_or_404(City, pk=p["city"])

        base_qs = (
            Hotel.objects.filter(city=city, is_active=True)
            .annotate(min_price=cheapest_available_price(p["check_in"], p["check_out"], p["rooms"], p["guests"]))
            .filter(min_price__isnull=False)
        )
        facets = {
            "price_range": base_qs.aggregate(min=Min("min_price"), max=Max("min_price")),
            "amenities": AmenitySerializer(Amenity.objects.all(), many=True).data,
        }

        qs = base_qs
        if p.get("q"):
            qs = qs.filter(Q(name__icontains=p["q"]) | Q(locality__icontains=p["q"]))
        if p.get("stars"):
            qs = qs.filter(star_rating__in=[int(s) for s in p["stars"].split(",") if s.isdigit()])
        if p.get("property_type"):
            qs = qs.filter(property_type__in=p["property_type"].upper().split(","))
        if p.get("min_price") is not None:
            qs = qs.filter(min_price__gte=p["min_price"])
        if p.get("max_price") is not None:
            qs = qs.filter(min_price__lte=p["max_price"])
        if p.get("min_rating") is not None:
            qs = qs.filter(user_rating__gte=p["min_rating"])
        if p.get("amenities"):
            for amenity_id in [int(a) for a in p["amenities"].split(",") if a.isdigit()]:
                qs = qs.filter(amenities__id=amenity_id)

        qs = qs.order_by(*params.SORTS[p["sort"]], "id").prefetch_related(
            "amenities", Prefetch("images", queryset=HotelImage.objects.order_by("order"))
        )
        paginator = HotelPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        response = paginator.get_paginated_response(HotelListSerializer(page, many=True).data)
        response.data["city"] = {
            "id": city.id,
            "name": city.name,
            "latitude": city.latitude,
            "longitude": city.longitude,
        }
        response.data["facets"] = facets
        return response


class HotelDetailView(generics.RetrieveAPIView):
    serializer_class = HotelDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    queryset = Hotel.objects.filter(is_active=True).select_related("city").prefetch_related("amenities", "images")


class HotelRoomsView(APIView):
    """Room types for a hotel, with availability for the requested stay."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(parameters=[StayParamsSerializer], responses=RoomTypeSerializer(many=True))
    def get(self, request, slug):
        hotel = get_object_or_404(Hotel, slug=slug, is_active=True)
        params = StayParamsSerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        p = params.validated_data
        available_ids = set(
            available_room_types(p["check_in"], p["check_out"], p["rooms"], p["guests"])
            .filter(hotel=hotel)
            .values_list("id", flat=True)
        )
        rooms = []
        for room in hotel.room_types.all():
            room.rooms_left = rooms_left(room, p["check_in"], p["check_out"]) if room.id in available_ids else 0
            rooms.append(room)
        return Response(RoomTypeSerializer(rooms, many=True).data)


class HotelReviewsView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_hotel(self):
        return get_object_or_404(Hotel, slug=self.kwargs["slug"])

    def get_queryset(self):
        return self.get_hotel().reviews.all()

    def perform_create(self, serializer):
        hotel = self.get_hotel()
        user = self.request.user
        name = f"{user.first_name} {user.last_name[:1]}.".strip() if user.first_name else user.email.split("@")[0]
        serializer.save(hotel=hotel, user=user, author_name=name)
        hotel.refresh_rating()
