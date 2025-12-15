import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from files.models import FileAsset
from properties.models import Room


class MaintenanceRequest(models.Model):
    CATEGORY_CHOICES = (
        ("electricity", "Điện"),
        ("plumbing", "Nước/Ống"),
        ("appliance", "Thiết bị"),
        ("furniture", "Nội thất"),
        ("internet", "Internet"),
        ("other", "Khác"),
    )
    STATUS_CHOICES = (
        ("pending", "Chờ xử lý"),
        ("in_progress", "Đang xử lý"),
        ("done", "Hoàn thành"),
        ("rejected", "Từ chối"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="maintenance_requests")
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="requested_maintenances")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default="other")
    
    # AI fields (for premium feature)
    ai_predicted_category = models.CharField(max_length=50, blank=True, null=True)
    ai_confidence = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_maintenances"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["category"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"


class MaintenanceAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(MaintenanceRequest, on_delete=models.CASCADE, related_name="attachments")
    file = models.ForeignKey(FileAsset, on_delete=models.CASCADE, related_name="maintenance_files")
    uploaded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-uploaded_at"]
