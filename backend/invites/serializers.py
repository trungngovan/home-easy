import uuid

from rest_framework import serializers

from .models import Invite


class PropertyNestedSerializer(serializers.Serializer):
    """Minimal property info"""
    id = serializers.UUIDField()
    name = serializers.CharField()
    address = serializers.CharField()


class RoomNestedSerializer(serializers.Serializer):
    """Minimal room info"""
    id = serializers.UUIDField()
    room_number = serializers.CharField()
    floor = serializers.IntegerField()


class InviteSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    property_detail = PropertyNestedSerializer(source="property", read_only=True)
    room_detail = RoomNestedSerializer(source="room", read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = Invite
        fields = [
            "id",
            "property",
            "property_detail",
            "room",
            "room_detail",
            "email",
            "phone",
            "token",
            "role",
            "status",
            "status_display",
            "is_expired",
            "contract_file",
            "created_at",
            "expires_at",
        ]
        read_only_fields = ["id", "created_at", "status_display", "is_expired", "property_detail", "room_detail"]
        extra_kwargs = {
            "email": {"required": False, "allow_blank": True, "allow_null": True},
            "phone": {"required": False, "allow_blank": True, "allow_null": True},
            "token": {"read_only": True},
            "contract_file": {"required": True},
        }

    def get_is_expired(self, obj):
        from django.utils import timezone
        if obj.expires_at:
            return timezone.now() > obj.expires_at
        return False

    def validate(self, attrs):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Only validate email/phone if they are being updated or during creation
        # For partial updates (e.g., only updating status), skip this validation
        instance = getattr(self, 'instance', None)
        email_provided = "email" in attrs
        phone_provided = "phone" in attrs
        
        # If creating new invite, email/phone validation is required
        if instance is None:
            email = (attrs.get("email") or "").strip()
            phone = (attrs.get("phone") or "").strip()
            
            if not email and not phone:
                raise serializers.ValidationError("Cần ít nhất email hoặc số điện thoại")
            
            # Validate contract_file is provided
            if not attrs.get("contract_file"):
                raise serializers.ValidationError("Hợp đồng là bắt buộc để đảm bảo pháp lý và bảo vệ người thuê")
            
            # Validate tenant exists
            tenant = None
            if email:
                tenant = User.objects.filter(email=email, role="tenant").first()
            elif phone:
                tenant = User.objects.filter(phone=phone, role="tenant").first()
            
            if not tenant:
                identifier = email or phone
                raise serializers.ValidationError(
                    f"Không tìm thấy người thuê với {identifier}. "
                    "Vui lòng đảm bảo người thuê đã đăng ký tài khoản với vai trò 'Người thuê'."
                )
            
            attrs["email"] = email
            attrs["phone"] = phone
        # If updating and email/phone fields are provided, validate them
        elif email_provided or phone_provided:
            email = (attrs.get("email") or "").strip()
            phone = (attrs.get("phone") or "").strip()
            
            # If both are being cleared, check existing values
            if not email and not phone:
                # Check if instance has at least one
                if not instance.email and not instance.phone:
                    raise serializers.ValidationError("Cần ít nhất email hoặc số điện thoại")
            
            attrs["email"] = email
            attrs["phone"] = phone
        
        return attrs

    def create(self, validated_data):
        # Handle contract_file_id from request data
        contract_file_id = self.initial_data.get('contract_file_id')
        if contract_file_id:
            from files.models import FileAsset
            try:
                contract_file = FileAsset.objects.get(id=contract_file_id)
                validated_data['contract_file'] = contract_file
            except FileAsset.DoesNotExist:
                pass  # Ignore if file doesn't exist
        
        # Auto-generate token if missing
        if not validated_data.get("token"):
            validated_data["token"] = uuid.uuid4().hex
        return super().create(validated_data)

