from django.urls import path

from . import views

urlpatterns = [
    path("airports/", views.AirportSearchView.as_view(), name="airport-search"),
    path("cities/", views.CitySearchView.as_view(), name="city-search"),
    path("cities/popular/", views.PopularCitiesView.as_view(), name="popular-cities"),
]
