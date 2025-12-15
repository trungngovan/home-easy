from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action_type", "model_name", "user", "object_repr", "created_at", "ip_address")
    list_filter = ("action_type", "model_name", "created_at")
    search_fields = ("user__email", "model_name", "object_repr", "ip_address")
    readonly_fields = ("id", "created_at", "changes", "metadata")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    
    fieldsets = (
        ("Basic Information", {
            "fields": ("id", "user", "action_type", "model_name", "object_id", "object_repr")
        }),
        ("Changes", {
            "fields": ("changes", "metadata"),
            "classes": ("collapse",)
        }),
        ("Request Information", {
            "fields": ("ip_address", "user_agent"),
            "classes": ("collapse",)
        }),
        ("Timestamp", {
            "fields": ("created_at",)
        }),
    )
