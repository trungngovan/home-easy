import uuid

from django.db import models
from django.utils import timezone

from properties.models import Property


class ServicePrice(models.Model):
    SERVICE_TYPE_CHOICES = (
        ("electricity", "Điện"),
        ("water", "Nước"),
        ("internet", "Internet"),
        ("cleaning", "Vệ sinh"),
        ("parking", "Đỗ xe"),
        ("other", "Khác"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="service_prices")
    service_type = models.CharField(max_length=50, choices=SERVICE_TYPE_CHOICES, default="other")
    name = models.CharField(max_length=100, blank=True)  # Custom name if service_type is "other"
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=20, default="")  # e.g., "kWh", "m³", "tháng"
    is_recurring = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["property", "service_type"]

    def __str__(self):
        return f"{self.property} - {self.get_service_type_display()}"

    def get_display_name(self):
        if self.service_type == "other" and self.name:
            return self.name
        return self.get_service_type_display()
