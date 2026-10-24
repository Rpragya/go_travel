from django.urls import path

from . import views

urlpatterns = [
    path("create-order/", views.CreateOrderView.as_view(), name="create-order"),
    path("verify/", views.VerifyPaymentView.as_view(), name="verify-payment"),
    path("webhook/", views.RazorpayWebhookView.as_view(), name="razorpay-webhook"),
]
