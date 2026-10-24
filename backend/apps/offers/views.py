from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Coupon
from .serializers import ApplyCouponSerializer, CouponSerializer


class OfferListView(generics.ListAPIView):
    serializer_class = CouponSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        now = timezone.now()
        qs = Coupon.objects.filter(is_active=True, valid_from__lte=now).filter(
            Q(valid_to__isnull=True) | Q(valid_to__gte=now)
        )
        kind = self.request.query_params.get("type")
        if kind:
            qs = qs.filter(applies_to__in=["ALL", kind.upper()])
        return qs


class ApplyCouponView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=ApplyCouponSerializer, responses={200: dict})
    def post(self, request):
        s = ApplyCouponSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        coupon = Coupon.objects.filter(code__iexact=s.validated_data["code"].strip()).first()
        if not coupon:
            return Response({"valid": False, "message": "Invalid coupon code."}, status=400)
        discount, error = coupon.evaluate(s.validated_data["booking_type"], s.validated_data["amount"])
        if error:
            return Response({"valid": False, "message": error}, status=400)
        return Response({"valid": True, "code": coupon.code, "discount": discount, "message": coupon.title})
