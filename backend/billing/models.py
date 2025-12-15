import uuid

from django.db import models
from django.utils import timezone

from tenancies.models import Tenancy


class Invoice(models.Model):
    STATUS_CHOICES = (
        ("draft", "Nháp"),
        ("pending", "Chờ thanh toán"),
        ("partial", "Thanh toán một phần"),
        ("paid", "Đã thanh toán"),
        ("overdue", "Quá hạn"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenancy = models.ForeignKey(Tenancy, on_delete=models.CASCADE, related_name="invoices")
    period = models.CharField(max_length=7)  # Format: YYYY-MM
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    due_date = models.DateField(null=True, blank=True)
    issued_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["tenancy", "period"]
        ordering = ["-period", "-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["period"]),
            models.Index(fields=["due_date"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"Hóa đơn {self.period} - {self.tenancy}"

    @property
    def is_overdue(self):
        from datetime import date
        if self.due_date and self.status not in ["paid"]:
            return date.today() > self.due_date
        return False

    def update_status_from_payments(self):
        """Update invoice status and amount_due based on payments"""
        from django.db.models import Sum
        from datetime import date
        
        # Calculate total paid from completed payments
        total_paid = self.payments.filter(status="completed").aggregate(
            total=Sum("amount")
        )["total"] or 0
        
        # Update amount_due
        self.amount_due = self.total_amount - total_paid
        
        # Update status based on payment amount
        if total_paid >= self.total_amount:
            # Fully paid
            self.status = "paid"
            if not self.paid_at:
                from django.utils import timezone
                self.paid_at = timezone.now()
        elif total_paid > 0:
            # Partially paid
            self.status = "partial"
            self.paid_at = None
        else:
            # No payment yet
            if self.status == "draft":
                # Keep as draft if it's still a draft
                pass
            else:
                # Check if overdue
                if self.due_date and date.today() > self.due_date:
                    self.status = "overdue"
                else:
                    self.status = "pending"
            self.paid_at = None
        
        # Save the invoice
        self.save(update_fields=["amount_due", "status", "paid_at", "updated_at"])


class InvoiceLine(models.Model):
    ITEM_CHOICES = (
        ("rent", "Tiền phòng"),
        ("deposit", "Tiền cọc"),
        ("electricity", "Tiền điện"),
        ("water", "Tiền nước"),
        ("internet", "Internet"),
        ("cleaning", "Vệ sinh"),
        ("service", "Dịch vụ khác"),
        ("adjustment", "Điều chỉnh"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="lines")
    item_type = models.CharField(max_length=30, choices=ITEM_CHOICES)
    description = models.CharField(max_length=255, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    meta = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["item_type"]

    def __str__(self):
        return f"{self.get_item_type_display()} - {self.amount}"
