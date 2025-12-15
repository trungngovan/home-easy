from django.contrib import admin

from .models import MaintenanceAttachment, MaintenanceRequest


class MaintenanceAttachmentInline(admin.TabularInline):
    model = MaintenanceAttachment
    extra = 0
    fields = ("file", "uploaded_at")
    readonly_fields = ("uploaded_at",)
    show_change_link = True


@admin.register(MaintenanceRequest)
class MaintenanceRequestAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "room",
        "requester",
        "assignee",
        "status",
        "category",
        "created_at",
    )
    list_filter = ("status", "category", "created_at")
    search_fields = ("title", "description", "room__room_number", "requester__email")
    readonly_fields = ("created_at", "updated_at", "resolved_at")
    inlines = (MaintenanceAttachmentInline,)
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
