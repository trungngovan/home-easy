import uuid

from django.db import models
from django.utils import timezone

from files.models import FileAsset
from properties.models import Room


class MeterReading(models.Model):
    SOURCE_CHOICES = (
        ("manual", "Nhập tay"),
        ("ocr", "OCR"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="meter_readings")
    period = models.CharField(max_length=7)  # Format: YYYY-MM
    
    # Electricity readings
    electricity_old = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    electricity_new = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Water readings
    water_old = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    water_new = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual")
    ocr_image = models.ForeignKey(FileAsset, on_delete=models.SET_NULL, null=True, blank=True, related_name="meter_images")
    ocr_payload = models.JSONField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["room", "period"]
        ordering = ["-period", "room"]
        indexes = [
            models.Index(fields=["period"]),
            models.Index(fields=["source"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.room} - {self.period}"

    @property
    def electricity_usage(self):
        if self.electricity_old is not None and self.electricity_new is not None:
            return self.electricity_new - self.electricity_old
        return None

    @property
    def water_usage(self):
        if self.water_old is not None and self.water_new is not None:
            return self.water_new - self.water_old
        return None
