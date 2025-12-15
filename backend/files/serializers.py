from rest_framework import serializers

from .models import FileAsset


class FileAssetSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    path = serializers.SerializerMethodField()  # Backward compatibility

    class Meta:
        model = FileAsset
        fields = ["id", "file", "path", "url", "mime_type", "purpose", "created_at"]
        read_only_fields = ["id", "created_at", "url", "path"]

    def get_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def get_path(self, obj):
        """Backward compatibility"""
        return obj.path

