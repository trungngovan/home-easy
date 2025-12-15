from django.contrib import admin

from .models import FileAsset


@admin.register(FileAsset)
class FileAssetAdmin(admin.ModelAdmin):
    list_display = ("path", "purpose", "created_at")
    list_filter = ("purpose",)
    search_fields = ("file",)
    ordering = ("-created_at",)
