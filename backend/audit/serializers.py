from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    action_type_display = serializers.CharField(source="get_action_type_display", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "user_email",
            "action_type",
            "action_type_display",
            "model_name",
            "object_id",
            "object_repr",
            "changes",
            "ip_address",
            "user_agent",
            "metadata",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "action_type_display",
            "user_email",
            "created_at",
        ]
