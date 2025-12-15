import uuid
import os

from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError


def upload_to(instance, filename):
    """Generate upload path based on purpose"""
    purpose = instance.purpose or "other"
    return f"{purpose}/{instance.id}/{filename}"


def validate_pdf_file(value):
    """Validate that uploaded file is a PDF"""
    ext = os.path.splitext(value.name)[1].lower()
    if ext != '.pdf':
        raise ValidationError('Chỉ chấp nhận file PDF cho hợp đồng.')


class FileAsset(models.Model):
    PURPOSE_CHOICES = (
        ("contract", "Contract"),
        ("meter", "Meter"),
        ("maintenance", "Maintenance"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to=upload_to, max_length=500)
    mime_type = models.CharField(max_length=100, blank=True)
    purpose = models.CharField(max_length=50, choices=PURPOSE_CHOICES, default="contract")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return str(self.file.name) if self.file else "No file"

    def save(self, *args, **kwargs):
        # Validate PDF for contracts
        if self.purpose == "contract" and self.file:
            validate_pdf_file(self.file)
        # Set mime_type from file if not provided
        if self.file and not self.mime_type:
            import mimetypes
            self.mime_type, _ = mimetypes.guess_type(self.file.name)
        super().save(*args, **kwargs)

    @property
    def path(self):
        """Backward compatibility - return file path"""
        return str(self.file.name) if self.file else ""

    @property
    def url(self):
        """Return file URL"""
        if self.file:
            return self.file.url
        return None
