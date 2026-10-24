from django.urls import path

from . import views

urlpatterns = [
    path("search/", views.FlightSearchView.as_view(), name="flight-search"),
    path("calendar/", views.CheapestFaresView.as_view(), name="flight-calendar"),
    path("fares/<int:pk>/", views.FareDetailView.as_view(), name="fare-detail"),
]
