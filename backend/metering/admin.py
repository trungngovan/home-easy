from django.contrib import admin

from .models import MeterReading


@admin.register(MeterReading)
class MeterReadingAdmin(admin.ModelAdmin):
    list_display = (
        "room",
        "period",
        "electricity_old",
        "electricity_new",
        "water_old",
        "water_new",
        "source",
        "created_at",
    )
    list_filter = ("source", "period")
    search_fields = ("room__room_number", "period")
    ordering = ("-period", "-created_at")
