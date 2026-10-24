from django.urls import path

from . import views

urlpatterns = [
    path("", views.OfferListView.as_view(), name="offers"),
    path("apply/", views.ApplyCouponView.as_view(), name="apply-coupon"),
]
