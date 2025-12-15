from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import FileAsset
from .serializers import FileAssetSerializer


class FileAssetViewSet(viewsets.ModelViewSet):
    queryset = FileAsset.objects.all().order_by("-created_at")
    serializer_class = FileAssetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        """Add request to serializer context for absolute URLs"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        """Set purpose from request data if provided"""
        purpose = self.request.data.get('purpose', 'contract')
        serializer.save(purpose=purpose)
