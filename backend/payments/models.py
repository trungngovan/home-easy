import uuid

from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone

from billing.models import Invoice


class Payment(models.Model):
    METHOD_CHOICES = (
        ("cash", "Tiền mặt"),
        ("bank_transfer", "Chuyển khoản"),
        ("momo", "MoMo"),
        ("vnpay", "VNPay"),
        ("other", "Khác"),
    )
    STATUS_CHOICES = (
        ("pending", "Chờ xử lý"),
        ("completed", "Thành công"),
        ("failed", "Thất bại"),
        ("refunded", "Hoàn tiền"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default="cash")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    provider_ref = models.CharField(max_length=255, blank=True)  # Transaction ID from payment gateway
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["method"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.invoice} - {self.amount:,.0f}đ"


@receiver(post_save, sender=Payment)
def update_invoice_on_payment_save(sender, instance, **kwargs):
    """Update invoice status and amount_due when payment is created or updated"""
    if instance.invoice:
        # Refresh invoice from database to get latest data
        instance.invoice.refresh_from_db()
        instance.invoice.update_status_from_payments()


@receiver(post_delete, sender=Payment)
def update_invoice_on_payment_delete(sender, instance, **kwargs):
    """Update invoice status and amount_due when payment is deleted"""
    if instance.invoice:
        instance.invoice.update_status_from_payments()
