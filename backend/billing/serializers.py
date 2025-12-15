from rest_framework import serializers

from .models import Invoice, InvoiceLine


class InvoiceLineSerializer(serializers.ModelSerializer):
    item_type_display = serializers.CharField(source="get_item_type_display", read_only=True)

    class Meta:
        model = InvoiceLine
        fields = ["id", "invoice", "item_type", "item_type_display", "description", "quantity", "unit_price", "amount", "meta"]
        read_only_fields = ["id", "item_type_display"]


class InvoiceLineNestedSerializer(serializers.ModelSerializer):
    """Nested serializer for invoice lines when creating/updating invoice (invoice field is auto-set)"""
    
    class Meta:
        model = InvoiceLine
        fields = ["item_type", "description", "quantity", "unit_price", "amount", "meta"]
        extra_kwargs = {
            "item_type": {"required": True},
            "quantity": {"required": True},
            "unit_price": {"required": True},
            "amount": {"required": True},
        }


# Nested serializers for read operations (avoids circular imports)
class TenantNestedSerializer(serializers.Serializer):
    """Minimal tenant info for invoice display"""
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField(allow_null=True)


class RoomNestedSerializer(serializers.Serializer):
    """Minimal room info for invoice display"""
    id = serializers.UUIDField()
    room_number = serializers.CharField()
    floor = serializers.IntegerField()


class PropertyNestedSerializer(serializers.Serializer):
    """Minimal property info for invoice display"""
    id = serializers.UUIDField()
    name = serializers.CharField()
    address = serializers.CharField()


class TenancyNestedSerializer(serializers.Serializer):
    """Tenancy with nested room and tenant for invoice display"""
    id = serializers.UUIDField()
    room = RoomNestedSerializer()
    tenant = TenantNestedSerializer()
    property = serializers.SerializerMethodField()

    def get_property(self, obj):
        if obj.room and obj.room.building:
            return PropertyNestedSerializer(obj.room.building).data
        return None


class InvoiceSerializer(serializers.ModelSerializer):
    lines = InvoiceLineNestedSerializer(many=True, required=False)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    
    # Expanded nested data for list/detail views
    tenancy_detail = TenancyNestedSerializer(source="tenancy", read_only=True)
    
    # Computed fields
    total_paid = serializers.SerializerMethodField()
    payment_count = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id",
            "tenancy",
            "tenancy_detail",
            "period",
            "total_amount",
            "amount_due",
            "total_paid",
            "payment_count",
            "status",
            "status_display",
            "is_overdue",
            "issued_at",
            "due_date",
            "paid_at",
            "notes",
            "created_at",
            "updated_at",
            "lines",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "status_display", "is_overdue", "tenancy_detail", "total_paid", "payment_count"]

    def get_total_paid(self, obj):
        """Calculate total paid amount from payments"""
        if hasattr(obj, "_prefetched_objects_cache") and "payments" in obj._prefetched_objects_cache:
            return sum(p.amount for p in obj.payments.all() if p.status == "completed")
        return obj.payments.filter(status="completed").aggregate(
            total=serializers.models.Sum("amount")
        )["total"] or 0

    def get_payment_count(self, obj):
        """Count completed payments"""
        if hasattr(obj, "_prefetched_objects_cache") and "payments" in obj._prefetched_objects_cache:
            return sum(1 for p in obj.payments.all() if p.status == "completed")
        return obj.payments.filter(status="completed").count()

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        
        # Validate lines before creating invoice
        line_errors = []
        for idx, line_data in enumerate(lines_data):
            line_serializer = InvoiceLineNestedSerializer(data=line_data)
            if not line_serializer.is_valid():
                line_errors.append({
                    "index": idx,
                    "errors": line_serializer.errors
                })
        
        if line_errors:
            from rest_framework.exceptions import ValidationError
            error_dict = {}
            for line_error in line_errors:
                for field, messages in line_error["errors"].items():
                    field_key = f"lines[{line_error['index']}].{field}"
                    error_dict[field_key] = messages
            raise ValidationError(error_dict)
        
        invoice = super().create(validated_data)
        for line_data in lines_data:
            InvoiceLine.objects.create(invoice=invoice, **line_data)
        return invoice

