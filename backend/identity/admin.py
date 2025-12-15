from django.contrib import admin
from django.contrib.auth import get_user_model

from notifications.models import Notification
from properties.models import Property
from tenancies.models import Tenancy

User = get_user_model()


class TenancyInline(admin.TabularInline):
    model = Tenancy
    extra = 0
    fk_name = "tenant"
    fields = ("room", "status", "start_date", "end_date", "base_rent")
    readonly_fields = ("created_at",)
    ordering = ("-start_date",)
    show_change_link = True
    max_num = 10  # Giới hạn hiển thị 10 tenancies gần nhất


class PropertyInline(admin.TabularInline):
    model = Property
    extra = 0
    fk_name = "owner"
    fields = ("name", "address", "created_at")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    show_change_link = True
    max_num = 20  # Giới hạn hiển thị 20 properties gần nhất


class NotificationInline(admin.TabularInline):
    model = Notification
    extra = 0
    fields = ("channel", "template", "priority", "is_read", "created_at")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    show_change_link = True
    max_num = 20  # Giới hạn số forms có thể thêm mới


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "full_name", "phone", "role", "is_active", "is_staff", "created_at")
    search_fields = ("email", "full_name", "phone")
    list_filter = ("role", "is_active", "is_staff")
    ordering = ("-created_at",)
    inlines = (TenancyInline, PropertyInline, NotificationInline)
