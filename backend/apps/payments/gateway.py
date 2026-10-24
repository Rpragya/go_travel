"""Razorpay integration via its REST API, with a mock fallback when keys aren't configured."""

import hashlib
import hmac
import secrets
from decimal import Decimal

import requests
from django.conf import settings

from .models import Payment

RAZORPAY_API = "https://api.razorpay.com/v1"


class PaymentError(Exception):
    pass


def razorpay_enabled():
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


def to_paise(amount: Decimal) -> int:
    return int((amount * 100).quantize(Decimal("1")))


def create_order(booking):
    amount = to_paise(booking.total_amount)
    if razorpay_enabled():
        resp = requests.post(
            f"{RAZORPAY_API}/orders",
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            json={
                "amount": amount,
                "currency": "INR",
                "receipt": booking.reference,
                "notes": {"booking": booking.reference},
            },
            timeout=15,
        )
        if resp.status_code >= 400:
            raise PaymentError(resp.json().get("error", {}).get("description", "Could not create order."))
        order_id, provider = resp.json()["id"], Payment.Provider.RAZORPAY
    else:
        order_id, provider = f"mock_order_{secrets.token_hex(8)}", Payment.Provider.MOCK
    return Payment.objects.create(booking=booking, provider=provider, order_id=order_id, amount=amount)


def _hmac(secret, message):
    return hmac.new(
        secret.encode(), message if isinstance(message, bytes) else message.encode(), hashlib.sha256
    ).hexdigest()


def verify_checkout_signature(order_id, payment_id, signature):
    expected = _hmac(settings.RAZORPAY_KEY_SECRET, f"{order_id}|{payment_id}")
    return hmac.compare_digest(expected, signature or "")


def verify_webhook_signature(body: bytes, signature):
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        return False
    return hmac.compare_digest(_hmac(settings.RAZORPAY_WEBHOOK_SECRET, body), signature or "")


def refund_payment(booking, amount: Decimal):
    payment = booking.payments.filter(status=Payment.Status.PAID).first()
    if not payment:
        return None
    paise = to_paise(amount)
    if payment.provider == Payment.Provider.RAZORPAY:
        resp = requests.post(
            f"{RAZORPAY_API}/payments/{payment.payment_id}/refund",
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            json={"amount": paise, "speed": "normal"},
            timeout=15,
        )
        if resp.status_code >= 400:
            raise PaymentError(resp.json().get("error", {}).get("description", "Refund failed."))
        payment.refund_id = resp.json()["id"]
    else:
        payment.refund_id = f"mock_rfnd_{secrets.token_hex(6)}"
    payment.refunded_amount = paise
    payment.status = Payment.Status.REFUNDED
    payment.save()
    return payment
