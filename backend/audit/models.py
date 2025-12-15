import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    ACTION_TYPE_CHOICES = (
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
        ("status_change", "Status Change"),
        ("login", "Login"),
        ("logout", "Logout"),
        ("view", "View"),
        ("export", "Export"),
        ("other", "Other"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs"
    )
    action_type = models.CharField(max_length=20, choices=ACTION_TYPE_CHOICES)
    model_name = models.CharField(max_length=100)  # e.g., "Invoice", "Payment"
    object_id = models.UUIDField(null=True, blank=True)  # ID of the object
    object_repr = models.CharField(max_length=255, blank=True)  # String representation
    changes = models.JSONField(null=True, blank=True)  # Old/new values
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)  # Additional info
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["user"]),
            models.Index(fields=["model_name"]),
            models.Index(fields=["action_type"]),
            models.Index(fields=["model_name", "object_id"]),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else "System"
        return f"{self.action_type} {self.model_name} by {user_str} at {self.created_at}"
