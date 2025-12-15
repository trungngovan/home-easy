from django.contrib import admin

from payments.models import Payment

from .models import Invoice, InvoiceLine


class InvoiceLineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 0
    fields = ("item_type", "description", "quantity", "unit_price", "amount")
    readonly_fields = ("amount",)
    ordering = ("item_type",)
    show_change_link = True


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    fields = ("amount", "method", "status", "provider_ref", "created_at")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    show_change_link = True
    max_num = 20  # Giới hạn số forms có thể thêm mới


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "tenancy",
        "period",
        "status",
        "total_amount",
        "amount_due",
        "due_date",
        "issued_at",
        "paid_at",
    )
    list_filter = ("status", "period", "due_date")
    search_fields = ("tenancy__room__room_number", "tenancy__tenant__email", "period")
    ordering = ("-period", "-created_at")
    date_hierarchy = "due_date"
    inlines = (InvoiceLineInline, PaymentInline)
