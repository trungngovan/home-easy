from django.contrib import admin

from .models import ServicePrice


@admin.register(ServicePrice)
class ServicePriceAdmin(admin.ModelAdmin):
    list_display = ("property", "service_type", "name", "unit_price", "unit", "is_recurring", "updated_at")
    list_filter = ("service_type", "is_recurring", "property")
    search_fields = ("property__name", "name")
    ordering = ("-updated_at",)
