import uuid

from django.db import models
from django.utils import timezone

from properties.models import Property, Room
from files.models import FileAsset


class Invite(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("expired", "Expired"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="invites")
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="invites")
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    token = models.CharField(max_length=255)
    role = models.CharField(max_length=20, default="tenant")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    contract_file = models.ForeignKey(FileAsset, on_delete=models.SET_NULL, null=True, blank=True, related_name="invites")
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Invite {self.email or self.phone}"

# Create your models here.
