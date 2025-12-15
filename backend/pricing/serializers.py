from rest_framework import serializers

from .models import ServicePrice


class PropertyNestedSerializer(serializers.Serializer):
    """Minimal property info"""
    id = serializers.UUIDField()
    name = serializers.CharField()


class ServicePriceSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    service_type_display = serializers.CharField(source="get_service_type_display", read_only=True)
    property_detail = PropertyNestedSerializer(source="property", read_only=True)

    class Meta:
        model = ServicePrice
        fields = [
            "id",
            "property",
            "property_detail",
            "service_type",
            "service_type_display",
            "name",
            "display_name",
            "unit_price",
            "unit",
            "is_recurring",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "display_name", "service_type_display", "property_detail", "created_at", "updated_at"]

    def get_display_name(self, obj):
        return obj.get_display_name()

