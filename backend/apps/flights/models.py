from django.db import models

from apps.locations.models import Airport


class Airline(models.Model):
    code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=80)
    color = models.CharField(max_length=7, default="#1F2937")
    is_domestic = models.BooleanField(default=True)
    home_country = models.CharField(max_length=80, default="India")

    def __str__(self):
        return self.name


class Flight(models.Model):
    airline = models.ForeignKey(Airline, on_delete=models.PROTECT, related_name="flights")
    flight_number = models.CharField(max_length=10)
    origin = models.ForeignKey(Airport, on_delete=models.PROTECT, related_name="departures")
    destination = models.ForeignKey(Airport, on_delete=models.PROTECT, related_name="arrivals")
    departure = models.DateTimeField()
    arrival = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField()
    stops = models.PositiveSmallIntegerField(default=0)
    stop_airport = models.ForeignKey(Airport, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    aircraft = models.CharField(max_length=40, blank=True)

    class Meta:
        ordering = ["departure"]
        indexes = [models.Index(fields=["origin", "destination", "departure"])]

    def __str__(self):
        return f"{self.airline.code}-{self.flight_number} {self.origin.iata}->{self.destination.iata}"


class FlightFare(models.Model):
    class Cabin(models.TextChoices):
        ECONOMY = "ECONOMY", "Economy"
        PREMIUM = "PREMIUM", "Premium Economy"
        BUSINESS = "BUSINESS", "Business"

    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name="fares")
    cabin_class = models.CharField(max_length=10, choices=Cabin.choices)
    base_fare = models.DecimalField(max_digits=10, decimal_places=2)
    taxes = models.DecimalField(max_digits=10, decimal_places=2)
    seats_available = models.PositiveIntegerField()
    refundable = models.BooleanField(default=False)
    baggage_checkin = models.CharField(max_length=20, default="15 kg")
    baggage_cabin = models.CharField(max_length=20, default="7 kg")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["flight", "cabin_class"], name="uniq_flight_cabin")]

    @property
    def price(self):
        return self.base_fare + self.taxes

    def __str__(self):
        return f"{self.flight} {self.cabin_class}"


class GeneratedRouteDay(models.Model):
    """Marks a route/date whose schedule has been generated, so it is only generated once."""

    origin = models.ForeignKey(Airport, on_delete=models.CASCADE, related_name="+")
    destination = models.ForeignKey(Airport, on_delete=models.CASCADE, related_name="+")
    date = models.DateField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["origin", "destination", "date"], name="uniq_generated_route_day")
        ]
