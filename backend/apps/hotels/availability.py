import math

from django.db.models import Exists, F, OuterRef, Subquery

from .models import RoomInventory, RoomType


def available_room_types(check_in, check_out, rooms=1, guests=1):
    """Room types with `rooms` free rooms every night in [check_in, check_out) that fit the party."""
    per_room = math.ceil(guests / rooms)
    full = RoomInventory.objects.filter(
        room_type=OuterRef("pk"),
        date__gte=check_in,
        date__lt=check_out,
        booked__gt=F("room_type__total_rooms") - rooms,
    )
    return RoomType.objects.filter(max_guests__gte=per_room, total_rooms__gte=rooms).exclude(Exists(full))


def cheapest_available_price(check_in, check_out, rooms, guests):
    """Subquery for annotating hotels with their lowest available nightly price."""
    return Subquery(
        available_room_types(check_in, check_out, rooms, guests)
        .filter(hotel=OuterRef("pk"))
        .order_by("price_per_night")
        .values("price_per_night")[:1]
    )


def rooms_left(room_type, check_in, check_out):
    booked = RoomInventory.objects.filter(room_type=room_type, date__gte=check_in, date__lt=check_out)
    peak = max(booked.values_list("booked", flat=True), default=0)
    return room_type.total_rooms - peak
