from django.contrib import admin

from .models import Invite


@admin.register(Invite)
class InviteAdmin(admin.ModelAdmin):
    list_display = ("email", "phone", "property", "room", "status", "expires_at", "created_at")
    list_filter = ("status", "role", "property")
    search_fields = ("email", "phone", "token")
    ordering = ("-created_at",)
