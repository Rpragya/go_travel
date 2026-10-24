from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from apps.bookings.models import Booking
from apps.bookings.services import confirm_booking, expire_stale_bookings
from apps.hotels.models import RoomInventory

from .conftest import flight_payload, hotel_payload


def test_flight_booking_holds_seats(client, fare):
    resp = client.post("/api/bookings/", flight_payload(fare, 2), format="json")
    assert resp.status_code == 201, resp.data
    assert resp.data["status"] == "PENDING"
    assert Decimal(resp.data["total_amount"]) == Decimal("12000")
    fare.refresh_from_db()
    assert fare.seats_available == 1


def test_cannot_overbook_flight(client, fare):
    assert client.post("/api/bookings/", flight_payload(fare, 3), format="json").status_code == 201
    resp = client.post("/api/bookings/", flight_payload(fare, 1), format="json")
    assert resp.status_code == 409
    assert Booking.objects.count() == 1  # failed booking rolled back


def test_coupon_applied(client, fare):
    from apps.offers.models import Coupon

    Coupon.objects.create(
        code="SAVE10",
        title="t",
        description="d",
        discount_type="PERCENT",
        value=10,
        max_discount=500,
        applies_to="FLIGHT",
    )
    resp = client.post("/api/bookings/", flight_payload(fare, 1, coupon_code="save10"), format="json")
    assert Decimal(resp.data["discount"]) == Decimal("500")
    assert Decimal(resp.data["total_amount"]) == Decimal("5500")
    bad = client.post("/api/bookings/", flight_payload(fare, 1, coupon_code="NOPE"), format="json")
    assert bad.status_code == 409


def test_expired_hold_releases_seats(client, fare):
    ref = client.post("/api/bookings/", flight_payload(fare, 2), format="json").data["reference"]
    Booking.objects.filter(reference=ref).update(hold_expires_at=timezone.now() - timedelta(minutes=1))
    assert expire_stale_bookings() == 1
    fare.refresh_from_db()
    assert fare.seats_available == 3
    assert Booking.objects.get(reference=ref).status == "EXPIRED"


def test_late_payment_rehold_succeeds(client, fare):
    ref = client.post("/api/bookings/", flight_payload(fare, 1), format="json").data["reference"]
    booking = Booking.objects.get(reference=ref)
    Booking.objects.filter(pk=booking.pk).update(hold_expires_at=timezone.now() - timedelta(minutes=1))
    expire_stale_bookings()
    assert confirm_booking(booking.pk).status == "CONFIRMED"
    fare.refresh_from_db()
    assert fare.seats_available == 2


def test_cancel_refundable_flight(client, fare):
    ref = client.post("/api/bookings/", flight_payload(fare, 2), format="json").data["reference"]
    confirm_booking(Booking.objects.get(reference=ref).pk)
    resp = client.post(f"/api/bookings/{ref}/cancel/")
    assert resp.status_code == 200
    assert resp.data["status"] == "CANCELLED"
    assert Decimal(resp.data["refund_amount"]) == Decimal("11400")  # 12000 - 300 fee x 2
    fare.refresh_from_db()
    assert fare.seats_available == 3


def test_hotel_booking_inventory_and_cancel(client, room):
    payload = hotel_payload(room, nights=3, rooms=2)
    resp = client.post("/api/bookings/", payload, format="json")
    assert resp.status_code == 201, resp.data
    assert Decimal(resp.data["base_amount"]) == Decimal("24000")  # 4000 x 3 nights x 2 rooms
    assert Decimal(resp.data["taxes"]) == Decimal("2880")  # 12% slab
    assert list(RoomInventory.objects.values_list("booked", flat=True)) == [2, 2, 2]
    assert client.post("/api/bookings/", hotel_payload(room, nights=1), format="json").status_code == 409

    ref = resp.data["reference"]
    confirm_booking(Booking.objects.get(reference=ref).pk)
    resp = client.post(f"/api/bookings/{ref}/cancel/")
    assert Decimal(resp.data["refund_amount"]) == Decimal("26880")
    assert set(RoomInventory.objects.values_list("booked", flat=True)) == {0}


def test_users_only_see_own_bookings(client, fare, db):
    from apps.accounts.models import User

    ref = client.post("/api/bookings/", flight_payload(fare), format="json").data["reference"]
    client.force_authenticate(User.objects.create_user("b@b.com", "Str0ng!pass"))
    assert client.get(f"/api/bookings/{ref}/").status_code == 404


def test_quote_matches_booking(anon, fare):
    resp = anon.post(
        "/api/bookings/quote/", {"booking_type": "FLIGHT", "fare_id": fare.id, "travellers": 2}, format="json"
    )
    assert Decimal(resp.data["total"]) == Decimal("12000")
