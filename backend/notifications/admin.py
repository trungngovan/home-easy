from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count, Q

from .models import Notification


@admin.action(description="Mark selected notifications as read")
def mark_as_read(modeladmin, request, queryset):
    """Admin action to mark notifications as read."""
    from django.utils import timezone
    queryset.filter(is_read=False).update(is_read=True, read_at=timezone.now())


@admin.action(description="Mark selected notifications as unread")
def mark_as_unread(modeladmin, request, queryset):
    """Admin action to mark notifications as unread."""
    queryset.filter(is_read=True).update(is_read=False, read_at=None)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "channel", "template", "priority", "is_read", "related_object_type", "created_at", "sent_at")
    list_filter = ("channel", "priority", "is_read", "template", "related_object_type", "created_at")
    search_fields = ("user__email", "template", "related_object_type")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    actions = [mark_as_read, mark_as_unread]
    
    fieldsets = (
        ("Basic Information", {
            "fields": ("user", "channel", "template", "priority")
        }),
        ("Content", {
            "fields": ("payload",)
        }),
        ("Related Object", {
            "fields": ("related_object_type", "related_object_id"),
            "classes": ("collapse",)
        }),
        ("Status", {
            "fields": ("is_read", "read_at", "sent_at")
        }),
        ("Timestamp", {
            "fields": ("created_at",)
        }),
    )
    
    readonly_fields = ("created_at", "read_at", "sent_at")
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related("user")
    
    def changelist_view(self, request, extra_context=None):
        """Add statistics to changelist view."""
        response = super().changelist_view(request, extra_context=extra_context)
        
        try:
            qs = response.context_data["cl"].queryset
        except (AttributeError, KeyError):
            return response
        
        # Statistics
        stats = {
            "total": qs.count(),
            "unread": qs.filter(is_read=False).count(),
            "read": qs.filter(is_read=True).count(),
            "by_channel": dict(qs.values("channel").annotate(count=Count("id")).values_list("channel", "count")),
            "by_priority": dict(qs.values("priority").annotate(count=Count("id")).values_list("priority", "count")),
            "by_template": dict(qs.values("template").annotate(count=Count("id")).order_by("-count")[:10].values_list("template", "count")),
        }
        
        if extra_context is None:
            extra_context = {}
        extra_context["stats"] = stats
        
        response.context_data.update(extra_context)
        return response
