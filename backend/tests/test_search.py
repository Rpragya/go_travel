from datetime import timedelta

from django.utils import timezone

from apps.flights.models import Flight


def test_flight_search_generates_deterministic_schedule(anon, airports):
    date = timezone.localdate() + timedelta(days=20)
    url = f"/api/flights/search/?from=DEL&to=BOM&date={date}"
    first = anon.get(url).data
    assert first["count"] > 0
    count = Flight.objects.count()
    anon.get(url + "&sort=duration")
    assert Flight.objects.count() == count  # not regenerated
    prices = [float(r["price"]) for r in first["results"]]
    assert prices == sorted(prices)


def test_flight_search_filters(anon, airports):
    date = timezone.localdate() + timedelta(days=20)
    data = anon.get(f"/api/flights/search/?from=DEL&to=BOM&date={date}&airlines=AI&slot=morning").data
    for r in data["results"]:
        assert r["flight"]["airline"]["code"] == "AI"
        assert 6 <= timezone.localtime(Flight.objects.get(pk=r["flight"]["id"]).departure).hour < 12


def test_flight_search_rejects_past_date(anon, airports):
    date = timezone.localdate() - timedelta(days=1)
    assert anon.get(f"/api/flights/search/?from=DEL&to=BOM&date={date}").status_code == 400


def test_hotel_search_hides_sold_out(anon, client, room):
    from .conftest import hotel_payload

    payload = hotel_payload(room, rooms=2)
    url = (
        f"/api/hotels/search/?city={room.hotel.city_id}&check_in={payload['check_in']}"
        f"&check_out={payload['check_out']}&guests=1"
    )
    assert anon.get(url).data["count"] == 1
    assert client.post("/api/bookings/", payload, format="json").status_code == 201
    assert anon.get(url).data["count"] == 0
