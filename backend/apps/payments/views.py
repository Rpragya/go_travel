import json
import secrets

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking
from apps.bookings.serializers import BookingSerializer
from apps.bookings.services import BookingError, confirm_booking, expire_stale_bookings

from .gateway import (
    PaymentError,
    create_order,
    refund_payment,
    verify_checkout_signature,
    verify_webhook_signature,
)
from .models import Payment


class CreateOrderSerializer(serializers.Serializer):
    booking_reference = serializers.CharField()


class VerifySerializer(serializers.Serializer):
    booking_reference = serializers.CharField()
    order_id = serializers.CharField()
    payment_id = serializers.CharField(required=False, allow_blank=True)
    signature = serializers.CharField(required=False, allow_blank=True)
    # Mock gateway only: lets the UI simulate a declined card.
    mock_outcome = serializers.ChoiceField(choices=["success", "failure"], required=False)


def _mark_paid(payment, payment_id):
    """Record a successful payment and confirm the booking. Refunds if inventory is gone."""
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        if payment.status == Payment.Status.PAID:
            return payment.booking
        payment.status = Payment.Status.PAID
        payment.payment_id = payment_id
        payment.save()
    try:
        return confirm_booking(payment.booking_id)
    except BookingError:
        booking = Booking.objects.get(pk=payment.booking_id)
        refund_payment(booking, booking.total_amount)
        raise


class CreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=CreateOrderSerializer, responses={200: dict})
    def post(self, request):
        s = CreateOrderSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        expire_stale_bookings()
        booking = get_object_or_404(Booking, reference=s.validated_data["booking_reference"], user=request.user)
        if booking.status != Booking.Status.PENDING:
            return Response({"detail": f"Booking is {booking.get_status_display().lower()}."}, status=400)
        try:
            payment = create_order(booking)
        except PaymentError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(
            {
                "provider": payment.provider,
                "key_id": settings.RAZORPAY_KEY_ID or None,
                "order_id": payment.order_id,
                "amount": payment.amount,
                "currency": payment.currency,
                "name": "Go Travels",
                "description": f"Booking {booking.reference}",
                "prefill": {
                    "name": f"{request.user.first_name} {request.user.last_name}".strip(),
                    "email": booking.contact_email,
                    "contact": booking.contact_phone,
                },
            }
        )


class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=VerifySerializer, responses=BookingSerializer)
    def post(self, request):
        s = VerifySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        payment = get_object_or_404(
            Payment.objects.select_related("booking"),
            order_id=d["order_id"],
            booking__reference=d["booking_reference"],
            booking__user=request.user,
        )
        if payment.provider == Payment.Provider.RAZORPAY:
            ok = verify_checkout_signature(payment.order_id, d.get("payment_id"), d.get("signature"))
            payment_id = d.get("payment_id", "")
        else:
            ok = d.get("mock_outcome", "success") == "success"
            payment_id = f"mock_pay_{secrets.token_hex(8)}"

        if not ok:
            payment.status = Payment.Status.FAILED
            payment.error = "Signature mismatch" if payment.provider == Payment.Provider.RAZORPAY else "Declined"
            payment.save()
            return Response({"detail": "Payment failed. You can retry while the booking is on hold."}, status=402)
        try:
            booking = _mark_paid(payment, payment_id)
        except BookingError as exc:
            return Response({"detail": f"{exc} Your payment has been refunded."}, status=409)
        return Response(BookingSerializer(booking).data)


class RazorpayWebhookView(APIView):
    """Razorpay calls this server-to-server; it's the source of truth if the browser closes mid-payment."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = []

    @extend_schema(request=None, responses={200: dict})
    def post(self, request):
        body = request.body
        if not verify_webhook_signature(body, request.headers.get("X-Razorpay-Signature")):
            return Response({"detail": "Invalid signature"}, status=400)
        event = json.loads(body)
        if event.get("event") in ("payment.captured", "order.paid"):
            entity = event["payload"]["payment"]["entity"]
            payment = Payment.objects.filter(order_id=entity.get("order_id")).first()
            if payment:
                try:
                    _mark_paid(payment, entity["id"])
                except BookingError:
                    pass  # refunded inside _mark_paid
        elif event.get("event") == "payment.failed":
            entity = event["payload"]["payment"]["entity"]
            Payment.objects.filter(order_id=entity.get("order_id"), status=Payment.Status.CREATED).update(
                status=Payment.Status.FAILED, error=entity.get("error_description", "")[:255]
            )
        return Response({"ok": True})
