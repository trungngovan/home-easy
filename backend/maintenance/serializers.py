from rest_framework import serializers

from .models import MaintenanceAttachment, MaintenanceRequest


class UserNestedSerializer(serializers.Serializer):
    """Minimal user info"""
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    avatar = serializers.URLField(allow_null=True)


class PropertyNestedSerializer(serializers.Serializer):
    """Minimal property info"""
    id = serializers.UUIDField()
    name = serializers.CharField()


class RoomNestedSerializer(serializers.Serializer):
    """Room info with property"""
    id = serializers.UUIDField()
    room_number = serializers.CharField()
    floor = serializers.IntegerField()
    building = PropertyNestedSerializer()


class MaintenanceAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceAttachment
        fields = ["id", "request", "file", "file_url", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at", "file_url"]

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    attachments = MaintenanceAttachmentSerializer(many=True, required=False, read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    
    # Nested details
    room_detail = RoomNestedSerializer(source="room", read_only=True)
    requester_detail = UserNestedSerializer(source="requester", read_only=True)
    assignee_detail = UserNestedSerializer(source="assignee", read_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = [
            "id",
            "room",
            "room_detail",
            "requester",
            "requester_detail",
            "title",
            "description",
            "category",
            "category_display",
            "ai_predicted_category",
            "ai_confidence",
            "status",
            "status_display",
            "assignee",
            "assignee_detail",
            "resolved_at",
            "resolution_note",
            "created_at",
            "updated_at",
            "attachments",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "category_display", "status_display", "room_detail", "requester_detail", "assignee_detail"]

    def create(self, validated_data):
        attachments_data = validated_data.pop("attachments", [])
        req = super().create(validated_data)
        for attachment in attachments_data:
            MaintenanceAttachment.objects.create(request=req, **attachment)
        return req

