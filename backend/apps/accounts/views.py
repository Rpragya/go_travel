from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .emails import send_verification_otp
from .models import EmailOTP, Traveller
from .serializers import (
    LoginSerializer,
    RegisterSerializer,
    TravellerSerializer,
    UserSerializer,
    VerifyOTPSerializer,
    tokens_for,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_verification_otp(user)
        data = {**tokens_for(user), "user": UserSerializer(user).data}
        return Response(data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ResendOTPView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    @extend_schema(request=None, responses={200: dict})
    def post(self, request):
        if request.user.is_verified:
            return Response({"detail": "Email already verified."})
        send_verification_otp(request.user)
        return Response({"detail": "Verification code sent."})


class VerifyEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    @extend_schema(request=VerifyOTPSerializer, responses=UserSerializer)
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        otp = EmailOTP.objects.filter(user=request.user, code=serializer.validated_data["code"]).last()
        if not otp or not otp.is_valid:
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)
        otp.used = True
        otp.save(update_fields=["used"])
        request.user.is_verified = True
        request.user.save(update_fields=["is_verified"])
        return Response(UserSerializer(request.user).data)


class TravellerViewSet(viewsets.ModelViewSet):
    serializer_class = TravellerSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Traveller.objects.none()
        return self.request.user.travellers.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
