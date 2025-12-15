from django.contrib import admin

from billing.models import Invoice

from .models import Tenancy


class InvoiceInline(admin.TabularInline):
    model = Invoice
    extra = 0
    fields = ("period", "status", "total_amount", "amount_due", "due_date", "issued_at")
    readonly_fields = ("total_amount", "amount_due", "issued_at")
    ordering = ("-period",)
    show_change_link = True
    max_num = 12  # Giới hạn số forms có thể thêm mới


@admin.register(Tenancy)
class TenancyAdmin(admin.ModelAdmin):
    list_display = (
        "room",
        "tenant",
        "status",
        "start_date",
        "end_date",
        "base_rent",
        "deposit",
        "created_at",
    )
    list_filter = ("status", "start_date", "end_date")
    search_fields = ("room__room_number", "tenant__email", "tenant__full_name")
    ordering = ("-start_date",)
    date_hierarchy = "start_date"
    readonly_fields = ("created_at", "updated_at")
    inlines = (InvoiceInline,)
