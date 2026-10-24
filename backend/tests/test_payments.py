import hashlib
import hmac
import json

from django.core import mail
from django.test import override_settings

from apps.bookings.models import Booking
from apps.payments.models import Payment

from .conftest import flight_payload


def _book(client, fare):
    return client.post("/api/bookings/", flight_payload(fare), format="json").data["reference"]


def test_mock_payment_flow(client, fare, django_capture_on_commit_callbacks):
    ref = _book(client, fare)
    order = client.post("/api/payments/create-order/", {"booking_reference": ref}, format="json").data
    assert order["provider"] == "MOCK" and order["amount"] == 600000

    fail = client.post(
        "/api/payments/verify/",
        {"booking_reference": ref, "order_id": order["order_id"], "mock_outcome": "failure"},
        format="json",
    )
    assert fail.status_code == 402
    assert Booking.objects.get(reference=ref).status == "PENDING"

    order = client.post("/api/payments/create-order/", {"booking_reference": ref}, format="json").data
    with django_capture_on_commit_callbacks(execute=True):
        ok = client.post(
            "/api/payments/verify/", {"booking_reference": ref, "order_id": order["order_id"]}, format="json"
        )
    assert ok.status_code == 200 and ok.data["status"] == "CONFIRMED"
    assert mail.outbox and mail.outbox[-1].attachments  # e-ticket attached

    ticket = client.get(f"/api/bookings/{ref}/ticket/")
    assert ticket.status_code == 200 and ticket["Content-Type"] == "application/pdf"


@override_settings(RAZORPAY_KEY_ID="rzp_test_x", RAZORPAY_KEY_SECRET="secret")
def test_razorpay_signature_verification(client, fare):
    ref = _book(client, fare)
    booking = Booking.objects.get(reference=ref)
    Payment.objects.create(booking=booking, provider="RAZORPAY", order_id="order_1", amount=600000)
    bad = client.post(
        "/api/payments/verify/",
        {"booking_reference": ref, "order_id": "order_1", "payment_id": "pay_1", "signature": "nope"},
        format="json",
    )
    assert bad.status_code == 402
    sig = hmac.new(b"secret", b"order_1|pay_1", hashlib.sha256).hexdigest()
    ok = client.post(
        "/api/payments/verify/",
        {"booking_reference": ref, "order_id": "order_1", "payment_id": "pay_1", "signature": sig},
        format="json",
    )
    assert ok.status_code == 200 and ok.data["status"] == "CONFIRMED"


def test_webhook_confirms_booking(client, anon, fare):
    ref = _book(client, fare)
    booking = Booking.objects.get(reference=ref)
    Payment.objects.create(booking=booking, provider="RAZORPAY", order_id="order_2", amount=600000)
    body = json.dumps(
        {"event": "payment.captured", "payload": {"payment": {"entity": {"id": "pay_2", "order_id": "order_2"}}}}
    ).encode()
    assert (
        anon.post(
            "/api/payments/webhook/", body, content_type="application/json", HTTP_X_RAZORPAY_SIGNATURE="bad"
        ).status_code
        == 400
    )
    sig = hmac.new(b"test-webhook-secret", body, hashlib.sha256).hexdigest()
    resp = anon.post("/api/payments/webhook/", body, content_type="application/json", HTTP_X_RAZORPAY_SIGNATURE=sig)
    assert resp.status_code == 200
    booking.refresh_from_db()
    assert booking.status == "CONFIRMED"
