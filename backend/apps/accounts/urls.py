from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

router = DefaultRouter()
router.register("travellers", views.TravellerViewSet, basename="traveller")

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", views.MeView.as_view(), name="me"),
    path("verify-email/", views.VerifyEmailView.as_view(), name="verify-email"),
    path("resend-otp/", views.ResendOTPView.as_view(), name="resend-otp"),
    *router.urls,
]
