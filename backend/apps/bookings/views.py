from django.http import HttpResponse
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Booking
from .serializers import BookingCreateSerializer, BookingSerializer
from .services import (
    BookingError,
    apply_coupon,
    cancel_booking,
    create_booking,
    expire_stale_bookings,
    quote_flight,
    quote_hotel,
)
from .tickets import build_ticket_pdf


class BookingViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "reference"
    pagination_class = None

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Booking.objects.none()
        qs = (
            Booking.objects.filter(user=self.request.user)
            .select_related(
                "flight_fare__flight__airline",
                "flight_fare__flight__origin__city",
                "flight_fare__flight__destination__city",
                "return_fare__flight__airline",
                "return_fare__flight__origin__city",
                "return_fare__flight__destination__city",
                "room_type__hotel__city",
                "coupon",
            )
            .prefetch_related("passengers", "payments", "room_type__hotel__images")
        )
        tab = self.request.query_params.get("tab")
        now = timezone.now()
        if tab == "upcoming":
            ids = [b.id for b in qs.filter(status=Booking.Status.CONFIRMED) if b.starts_at > now]
            qs = qs.filter(id__in=ids)
        elif tab == "completed":
            ids = [b.id for b in qs.filter(status=Booking.Status.CONFIRMED) if b.starts_at <= now]
            qs = qs.filter(id__in=ids)
        elif tab == "cancelled":
            qs = qs.filter(status__in=[Booking.Status.CANCELLED, Booking.Status.EXPIRED, Booking.Status.FAILED])
        elif tab == "pending":
            qs = qs.filter(status=Booking.Status.PENDING)
        return qs

    def list(self, request, *args, **kwargs):
        expire_stale_bookings()  # keeps state correct even when Celery beat isn't running
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        expire_stale_bookings()
        return super().retrieve(request, *args, **kwargs)

    def get_serializer_class(self):
        return BookingCreateSerializer if self.action in ("create", "quote") else BookingSerializer

    def create(self, request, *args, **kwargs):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            booking = create_booking(request.user, serializer.validated_data)
        except BookingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def quote(self, request):
        """Price breakdown for the review page, using the same rules as booking creation."""
        serializer = BookingCreateSerializer(data={**request.data, "quote_only": True})
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        if d["booking_type"] == Booking.Type.FLIGHT:
            fares = [f for f in (d["fare"], d.get("return_fare")) if f]
            pax = max(1, int(request.data.get("travellers", 1)))
            q = quote_flight(fares, pax)
        else:
            q = quote_hotel(d["room_type"], d["check_in"], d["check_out"], d["rooms"])
        q = apply_coupon(q, d.get("coupon_code"), d["booking_type"])
        return Response(
            {
                "base_amount": q.base_amount,
                "taxes": q.taxes,
                "discount": q.discount,
                "total": q.total,
                "coupon_code": q.coupon.code if q.coupon else None,
                "coupon_message": q.coupon_message,
                "coupon_valid": bool(q.coupon),
            }
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, reference=None):
        booking = self.get_object()
        try:
            booking = cancel_booking(booking.id)
        except BookingError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["get"])
    def ticket(self, request, reference=None):
        booking = self.get_object()
        if booking.status != Booking.Status.CONFIRMED:
            return Response({"detail": "Ticket is available after payment."}, status=status.HTTP_400_BAD_REQUEST)
        response = HttpResponse(build_ticket_pdf(booking), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="GoTravels-{booking.reference}.pdf"'
        return response
