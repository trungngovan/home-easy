from rest_framework import serializers

from .models import Payment


class TenantNestedSerializer(serializers.Serializer):
    """Minimal tenant info"""
    id = serializers.UUIDField()
    full_name = serializers.CharField()


class PropertyNestedSerializer(serializers.Serializer):
    """Minimal property info"""
    id = serializers.UUIDField()
    name = serializers.CharField()


class RoomNestedSerializer(serializers.Serializer):
    """Minimal room info"""
    id = serializers.UUIDField()
    room_number = serializers.CharField()
    building = PropertyNestedSerializer()


class InvoiceNestedSerializer(serializers.Serializer):
    """Invoice summary for payment display"""
    id = serializers.UUIDField()
    period = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    amount_due = serializers.DecimalField(max_digits=12, decimal_places=2)
    status = serializers.CharField()
    room = serializers.SerializerMethodField()
    tenant = serializers.SerializerMethodField()

    def get_room(self, obj):
        if obj.tenancy and obj.tenancy.room:
            return RoomNestedSerializer(obj.tenancy.room).data
        return None

    def get_tenant(self, obj):
        if obj.tenancy and obj.tenancy.tenant:
            return TenantNestedSerializer(obj.tenancy.tenant).data
        return None


class PaymentSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source="get_method_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    invoice_detail = InvoiceNestedSerializer(source="invoice", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "invoice",
            "invoice_detail",
            "amount",
            "method",
            "method_display",
            "status",
            "status_display",
            "provider_ref",
            "note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "method_display", "status_display", "invoice_detail"]

