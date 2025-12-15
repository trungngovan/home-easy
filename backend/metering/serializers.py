from rest_framework import serializers

from .models import MeterReading


class PropertyNestedSerializer(serializers.Serializer):
    """Minimal property info"""
    id = serializers.UUIDField()
    name = serializers.CharField()


class RoomNestedSerializer(serializers.Serializer):
    """Room info with property for meter reading"""
    id = serializers.UUIDField()
    room_number = serializers.CharField()
    floor = serializers.IntegerField()
    building = PropertyNestedSerializer()


class MeterReadingSerializer(serializers.ModelSerializer):
    electricity_usage = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    water_usage = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    source_display = serializers.CharField(source="get_source_display", read_only=True)
    room_detail = RoomNestedSerializer(source="room", read_only=True)

    class Meta:
        model = MeterReading
        fields = [
            "id",
            "room",
            "room_detail",
            "period",
            "electricity_old",
            "electricity_new",
            "electricity_usage",
            "water_old",
            "water_new",
            "water_usage",
            "source",
            "source_display",
            "ocr_image",
            "ocr_payload",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "electricity_usage", "water_usage", "source_display", "room_detail", "created_at", "updated_at"]

