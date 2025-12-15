from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    channel_display = serializers.CharField(source="get_channel_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    is_sent = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "user",
            "channel",
            "channel_display",
            "template",
            "payload",
            "is_read",
            "read_at",
            "priority",
            "priority_display",
            "related_object_type",
            "related_object_id",
            "is_sent",
            "created_at",
            "sent_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "sent_at",
            "read_at",
            "channel_display",
            "priority_display",
            "is_sent",
        ]

    def get_is_sent(self, obj):
        return obj.sent_at is not None

