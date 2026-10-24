import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.accounts.models import User
from apps.flights.models import Airline
from apps.hotels.models import Amenity, Hotel, HotelImage, Review, RoomType
from apps.locations import seed_data as D
from apps.locations.models import Airport, City
from apps.offers.models import Coupon

ROOM_TEMPLATES = [
    # name, bed, sqft, guests, price multiplier, breakfast, refundable
    ("Standard Room", "Queen bed", 220, 2, 1.0, False, True),
    ("Deluxe Room", "King bed", 300, 2, 1.35, True, True),
    ("Premium Room", "King bed", 360, 3, 1.7, True, False),
    ("Family Suite", "2 Queen beds", 520, 4, 2.4, True, True),
    ("Executive Suite", "King bed + sofa", 650, 3, 3.2, True, True),
]
INTL_PRICE_FACTOR = {"India": 1.0}


class Command(BaseCommand):
    help = "Seed reference data: cities, airports, airlines, hotels, coupons and demo users."

    def add_arguments(self, parser):
        parser.add_argument("--hotels-per-city", type=int, default=9)

    @transaction.atomic
    def handle(self, *args, **opts):
        rng = random.Random(42)
        cities = self._cities()
        self._airports(cities)
        self._airlines()
        amenities = self._amenities()
        if not Hotel.objects.exists():
            self._hotels(cities, amenities, opts["hotels_per_city"], rng)
        self._coupons()
        self._users()
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {City.objects.count()} cities, {Airport.objects.count()} airports, "
                f"{Airline.objects.count()} airlines, {Hotel.objects.count()} hotels, {Coupon.objects.count()} coupons."
            )
        )

    def _cities(self):
        cities = {}
        for name, state, country, lat, lng, photo, tagline, popular in D.CITIES:
            city, _ = City.objects.update_or_create(
                name=name,
                country=country,
                defaults=dict(
                    state=state,
                    latitude=lat,
                    longitude=lng,
                    tagline=tagline,
                    is_popular=popular,
                    image_url=D.IMG.format(photo) if photo else "",
                ),
            )
            cities[name] = city
        return cities

    def _airports(self, cities):
        for iata, name, city, lat, lng, tier in D.AIRPORTS:
            Airport.objects.update_or_create(
                iata=iata, defaults=dict(name=name, city=cities[city], latitude=lat, longitude=lng, tier=tier)
            )

    def _airlines(self):
        for code, name, color, domestic, country in D.AIRLINES:
            Airline.objects.update_or_create(
                code=code, defaults=dict(name=name, color=color, is_domestic=domestic, home_country=country)
            )

    def _amenities(self):
        return [Amenity.objects.update_or_create(name=n, defaults={"icon": i})[0] for n, i in D.AMENITIES]

    def _hotels(self, cities, amenities, per_city, rng):
        used_names = set()
        now = timezone.now()
        for city in cities.values():
            intl = city.country != "India"
            for i in range(per_city):
                stars = rng.choices([2, 3, 4, 5], weights=[1, 4, 4, 2])[0]
                while True:
                    name = f"{rng.choice(D.HOTEL_PREFIXES)} {rng.choice(D.HOTEL_SUFFIXES)}"
                    if (name, city.name) not in used_names:
                        used_names.add((name, city.name))
                        break
                locality = rng.choice(D.LOCALITIES)
                ptype = rng.choices(
                    [
                        Hotel.PropertyType.HOTEL,
                        Hotel.PropertyType.RESORT,
                        Hotel.PropertyType.VILLA,
                        Hotel.PropertyType.HOMESTAY,
                    ],
                    weights=[6, 2, 1, 1],
                )[0]
                hotel = Hotel.objects.create(
                    name=name,
                    slug=slugify(f"{name}-{city.name}-{i}"),
                    city=city,
                    locality=locality,
                    address=f"{rng.randint(1, 250)}, {locality}, {city.name}"
                    + (f", {city.state}" if city.state else f", {city.country}"),
                    description=(
                        f"{name} is a {stars}-star {ptype.label.lower()} in {locality}, {city.name}. "
                        f"Guests enjoy comfortable rooms, warm hospitality and easy access to the best of "
                        f"{city.name}{' - ' + city.tagline.lower() if city.tagline else ''}. "
                        "Ideal for families, couples and business travellers alike."
                    ),
                    property_type=ptype,
                    star_rating=stars,
                    latitude=city.latitude + rng.uniform(-0.04, 0.04),
                    longitude=city.longitude + rng.uniform(-0.04, 0.04),
                )
                count = {2: 3, 3: 5, 4: 7, 5: 10}[stars]
                hotel.amenities.set(rng.sample(amenities, min(count, len(amenities))))
                photos = rng.sample(D.HOTEL_PHOTOS, 3) + rng.sample(D.ROOM_PHOTOS, 2)
                HotelImage.objects.bulk_create(
                    [HotelImage(hotel=hotel, url=D.IMG.format(p), order=n) for n, p in enumerate(photos)]
                )
                base = {2: 1400, 3: 2600, 4: 4800, 5: 9500}[stars] * rng.uniform(0.8, 1.3) * (2.2 if intl else 1)
                templates = ROOM_TEMPLATES[: {2: 2, 3: 3, 4: 4, 5: 5}[stars]]
                RoomType.objects.bulk_create(
                    [
                        RoomType(
                            hotel=hotel,
                            name=t[0],
                            bed_type=t[1],
                            size_sqft=t[2],
                            max_guests=t[3],
                            price_per_night=Decimal(round(base * t[4] / 50) * 50),
                            breakfast_included=t[5],
                            refundable=t[6],
                            total_rooms=rng.randint(3, 15),
                            description=f"{t[2]} sq.ft {t[0].lower()} with {t[1].lower()}, air conditioning, "
                            "TV and an en-suite bathroom.",
                            image_url=D.IMG.format(rng.choice(D.ROOM_PHOTOS)),
                        )
                        for t in templates
                    ]
                )
                reviews = []
                for _ in range(rng.randint(3, 9)):
                    rating, title, comment = rng.choice(D.REVIEW_SNIPPETS)
                    rating = max(1, min(5, rating + (1 if stars == 5 and rating < 5 else 0)))
                    reviews.append(
                        Review(
                            hotel=hotel,
                            author_name=rng.choice(D.REVIEWER_NAMES),
                            rating=rating,
                            title=title,
                            comment=comment,
                        )
                    )
                Review.objects.bulk_create(reviews)
                # bulk_create skips auto_now_add overrides, so spread dates afterwards for realism
                for r in hotel.reviews.all():
                    Review.objects.filter(pk=r.pk).update(created_at=now - timedelta(days=rng.randint(3, 400)))
                hotel.refresh_rating()

    def _coupons(self):
        for code, title, desc, kind, value, max_disc, min_amt, applies in D.COUPONS:
            Coupon.objects.update_or_create(
                code=code,
                defaults=dict(
                    title=title,
                    description=desc,
                    discount_type=kind,
                    value=value,
                    max_discount=max_disc,
                    min_amount=min_amt,
                    applies_to=applies,
                    valid_to=timezone.now() + timedelta(days=365),
                ),
            )

    def _users(self):
        if not User.objects.filter(email="demo@gotravels.dev").exists():
            User.objects.create_user(
                "demo@gotravels.dev",
                "Demo@12345",
                first_name="Demo",
                last_name="User",
                phone="9876543210",
                is_verified=True,
            )
        if not User.objects.filter(email="admin@gotravels.dev").exists():
            User.objects.create_superuser("admin@gotravels.dev", "Admin@12345", first_name="Admin")
