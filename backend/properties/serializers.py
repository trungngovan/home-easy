from rest_framework import serializers

from .models import Property, Room


class OwnerNestedSerializer(serializers.Serializer):
    """Minimal owner info"""
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()


class PropertyListSerializer(serializers.ModelSerializer):
    """Optimized serializer for list view with annotated counts"""
    owner_detail = OwnerNestedSerializer(source="owner", read_only=True)
    total_rooms = serializers.IntegerField(read_only=True)
    vacant_rooms = serializers.IntegerField(read_only=True)
    occupied_rooms = serializers.IntegerField(read_only=True)
    maintenance_rooms = serializers.IntegerField(read_only=True)
    occupancy_rate = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            "id",
            "owner",
            "owner_detail",
            "name",
            "address",
            "description",
            "image",
            "total_rooms",
            "vacant_rooms",
            "occupied_rooms",
            "maintenance_rooms",
            "occupancy_rate",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_occupancy_rate(self, obj):
        total = getattr(obj, "total_rooms", 0)
        if total == 0:
            return 0
        occupied = getattr(obj, "occupied_rooms", 0)
        return round((occupied / total) * 100, 1)


class PropertySerializer(serializers.ModelSerializer):
    """Full property serializer for detail/create/update"""
    owner_detail = OwnerNestedSerializer(source="owner", read_only=True)

    class Meta:
        model = Property
        fields = [
            "id",
            "owner",
            "owner_detail",
            "name",
            "address",
            "description",
            "image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "owner": {"required": False},  # Will be set automatically in perform_create
        }

    def validate_owner(self, value):
        """Ensure user can only set themselves as owner (unless superuser)"""
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            user = request.user
            # If owner is provided and user is not superuser, must be themselves
            if value and not user.is_superuser and value != user:
                raise serializers.ValidationError("Bạn chỉ có thể tạo tài sản cho chính mình.")
        return value


class PropertyNestedSerializer(serializers.Serializer):
    """Minimal property info for nested relations"""
    id = serializers.UUIDField()
    name = serializers.CharField()
    address = serializers.CharField()


class RoomSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    building_detail = PropertyNestedSerializer(source="building", read_only=True)

    class Meta:
        model = Room
        fields = [
            "id",
            "building",
            "building_detail",
            "room_number",
            "floor",
            "area",
            "base_rent",
            "status",
            "status_display",
            "description",
            "image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "status_display", "building_detail"]

