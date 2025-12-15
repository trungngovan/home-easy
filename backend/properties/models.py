import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Property(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="properties")
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    image = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Properties"

    def __str__(self):
        return self.name

    def get_total_rooms(self):
        return self.rooms.count()

    def get_vacant_rooms(self):
        return self.rooms.filter(status="vacant").count()

    def get_occupied_rooms(self):
        return self.rooms.filter(status="occupied").count()


class Room(models.Model):
    STATUS_CHOICES = (
        ("vacant", "Trống"),
        ("occupied", "Đang thuê"),
        ("maintenance", "Bảo trì"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="rooms", db_column="property_id")
    room_number = models.CharField(max_length=50)  # e.g., "101", "A02"
    floor = models.IntegerField(default=1)
    area = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)  # m²
    base_rent = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="vacant")
    description = models.TextField(blank=True)
    image = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["building", "room_number"]
        ordering = ["building", "floor", "room_number"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["floor"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.building.name} - Phòng {self.room_number}"

    def get_current_tenant(self):
        """Get current active tenant"""
        from tenancies.models import Tenancy
        tenancy = Tenancy.objects.filter(
            room=self, status="active"
        ).select_related("tenant").first()
        return tenancy.tenant if tenancy else None
