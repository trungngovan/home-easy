from rest_framework import serializers

from .models import Tenancy


class TenantNestedSerializer(serializers.Serializer):
    """Minimal tenant info for tenancy display"""
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField(allow_null=True)
    avatar = serializers.URLField(allow_null=True)


class PropertyNestedSerializer(serializers.Serializer):
    """Minimal property info"""
    id = serializers.UUIDField()
    name = serializers.CharField()
    address = serializers.CharField()


class RoomNestedSerializer(serializers.Serializer):
    """Room info with nested property"""
    id = serializers.UUIDField()
    room_number = serializers.CharField()
    floor = serializers.IntegerField()
    area = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)
    base_rent = serializers.DecimalField(max_digits=12, decimal_places=2)
    status = serializers.CharField()
    building = PropertyNestedSerializer()


class TenancySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    
    # Nested details for read operations
    tenant_detail = TenantNestedSerializer(source="tenant", read_only=True)
    room_detail = RoomNestedSerializer(source="room", read_only=True)

    class Meta:
        model = Tenancy
        fields = [
            "id",
            "room",
            "room_detail",
            "tenant",
            "tenant_detail",
            "start_date",
            "end_date",
            "deposit",
            "base_rent",
            "status",
            "status_display",
            "is_active",
            "days_remaining",
            "contract_file",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "status_display", "is_active", "days_remaining", "tenant_detail", "room_detail"]

