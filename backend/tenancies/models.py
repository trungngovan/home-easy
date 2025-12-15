import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from files.models import FileAsset
from properties.models import Room


class Tenancy(models.Model):
    STATUS_CHOICES = (
        ("active", "Đang thuê"),
        ("expired", "Hết hạn"),
        ("terminated", "Đã kết thúc"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="tenancies")
    tenant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tenancies")
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    deposit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    base_rent = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    contract_file = models.ForeignKey(FileAsset, on_delete=models.SET_NULL, null=True, blank=True, related_name="contracts")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Tenancies"
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["start_date"]),
            models.Index(fields=["end_date"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.room} - {self.tenant}"

    @property
    def is_active(self):
        return self.status == "active"

    @property
    def days_remaining(self):
        """Days until contract ends"""
        if not self.end_date:
            return None
        from datetime import date
        delta = self.end_date - date.today()
        return max(0, delta.days)
