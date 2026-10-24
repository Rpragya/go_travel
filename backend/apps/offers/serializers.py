from rest_framework import serializers

from .models import Coupon


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            "code",
            "title",
            "description",
            "discount_type",
            "value",
            "max_discount",
            "min_amount",
            "applies_to",
            "valid_to",
        ]


class ApplyCouponSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=20)
    booking_type = serializers.ChoiceField(choices=["FLIGHT", "HOTEL"])
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
