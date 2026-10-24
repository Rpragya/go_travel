from django.urls import path

from . import views

urlpatterns = [
    path("search/", views.HotelSearchView.as_view(), name="hotel-search"),
    path("<slug:slug>/", views.HotelDetailView.as_view(), name="hotel-detail"),
    path("<slug:slug>/rooms/", views.HotelRoomsView.as_view(), name="hotel-rooms"),
    path("<slug:slug>/reviews/", views.HotelReviewsView.as_view(), name="hotel-reviews"),
]
