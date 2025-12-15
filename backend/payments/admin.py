from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("invoice", "amount", "method", "status", "created_at")
    list_filter = ("status", "method")
    search_fields = ("invoice__tenancy__tenant__email", "invoice__tenancy__room__room_number")
    ordering = ("-created_at",)
