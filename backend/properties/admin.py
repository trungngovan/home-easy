from django.contrib import admin

from invites.models import Invite
from maintenance.models import MaintenanceRequest
from metering.models import MeterReading
from pricing.models import ServicePrice
from tenancies.models import Tenancy

from .models import Property, Room


class RoomInline(admin.TabularInline):
    model = Room
    extra = 0
    fields = ("room_number", "floor", "area", "base_rent", "status", "description")
    readonly_fields = ()
    show_change_link = True


class TenancyInline(admin.TabularInline):
    model = Tenancy
    extra = 0
    fields = ("tenant", "status", "start_date", "end_date", "base_rent", "deposit")
    readonly_fields = ("created_at",)
    ordering = ("-start_date",)
    show_change_link = True
    max_num = 10  # Giới hạn hiển thị 10 tenancies gần nhất


class MeterReadingInline(admin.TabularInline):
    model = MeterReading
    extra = 0
    fields = ("period", "electricity_old", "electricity_new", "water_old", "water_new", "source")
    readonly_fields = ("created_at",)
    ordering = ("-period",)
    show_change_link = True
    max_num = 12  # Giới hạn số forms có thể thêm mới


class MaintenanceRequestInline(admin.TabularInline):
    model = MaintenanceRequest
    extra = 0
    fields = ("title", "requester", "status", "category", "created_at")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    show_change_link = True
    max_num = 10  # Giới hạn số forms có thể thêm mới


class InviteInline(admin.TabularInline):
    model = Invite
    extra = 0
    fk_name = "property"
    fields = ("email", "phone", "status", "role", "expires_at", "created_at")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    show_change_link = True
    max_num = 20  # Giới hạn số forms có thể thêm mới


class RoomInviteInline(admin.TabularInline):
    model = Invite
    extra = 0
    fk_name = "room"
    fields = ("email", "phone", "status", "role", "expires_at", "created_at")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    show_change_link = True
    max_num = 10  # Giới hạn số forms có thể thêm mới


class ServicePriceInline(admin.TabularInline):
    model = ServicePrice
    extra = 0
    fields = ("service_type", "name", "unit_price", "unit", "is_recurring")
    ordering = ("service_type",)
    show_change_link = True


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "address", "get_total_rooms", "get_vacant_rooms", "get_occupied_rooms", "created_at")
    list_filter = ("owner",)
    search_fields = ("name", "address")
    ordering = ("-created_at",)
    inlines = (RoomInline, ServicePriceInline, InviteInline)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("building", "room_number", "floor", "status", "base_rent", "created_at")
    list_filter = ("status", "floor", "building")
    search_fields = ("room_number", "building__name")
    ordering = ("building__name", "floor", "room_number")
    inlines = (TenancyInline, MeterReadingInline, MaintenanceRequestInline, RoomInviteInline)
