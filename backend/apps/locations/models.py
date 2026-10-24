import math

from django.db import models


class City(models.Model):
    name = models.CharField(max_length=80)
    state = models.CharField(max_length=80, blank=True)
    country = models.CharField(max_length=80, default="India")
    latitude = models.FloatField()
    longitude = models.FloatField()
    image_url = models.URLField(blank=True)
    tagline = models.CharField(max_length=120, blank=True)
    is_popular = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "cities"
        constraints = [models.UniqueConstraint(fields=["name", "country"], name="uniq_city_country")]

    def __str__(self):
        return f"{self.name}, {self.country}"


class Airport(models.Model):
    iata = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=120)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="airports")
    latitude = models.FloatField()
    longitude = models.FloatField()
    # 1 = metro hub, 2 = large, 3 = regional. Drives how many flights a route gets.
    tier = models.PositiveSmallIntegerField(default=2)

    class Meta:
        ordering = ["iata"]

    def __str__(self):
        return f"{self.iata} - {self.city.name}"

    @property
    def is_domestic(self):
        return self.city.country == "India"

    def distance_km(self, other):
        lat1, lon1, lat2, lon2 = map(math.radians, [self.latitude, self.longitude, other.latitude, other.longitude])
        a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
        return 6371 * 2 * math.asin(math.sqrt(a))
