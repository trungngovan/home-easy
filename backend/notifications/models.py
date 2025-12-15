import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Notification(models.Model):
    CHANNEL_CHOICES = (
        ("inapp", "In App"),
        ("email", "Email"),
        ("push", "Push"),
    )
    
    PRIORITY_CHOICES = (
        ("low", "Low"),
        ("normal", "Normal"),
        ("high", "High"),
        ("urgent", "Urgent"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default="inapp")
    template = models.CharField(max_length=100)
    payload = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    # New fields for admin tracking
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="normal")
    related_object_type = models.CharField(max_length=50, null=True, blank=True)  # e.g., 'invoice', 'payment', 'maintenance'
    related_object_id = models.UUIDField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["user", "is_read"]),
            models.Index(fields=["is_read"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["related_object_type", "related_object_id"]),
        ]

    def __str__(self):
        return f"{self.channel} - {self.template}"
    
    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])
    
    def mark_as_unread(self):
        """Mark notification as unread."""
        if self.is_read:
            self.is_read = False
            self.read_at = None
            self.save(update_fields=["is_read", "read_at"])
