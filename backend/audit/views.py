from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    AuditLog ViewSet - Read-only, only accessible by superusers.
    
    Supports filtering:
    - ?action_type=create,update,delete
    - ?model_name=Invoice,Payment
    - ?user=<user_id>
    - ?created_at__gte=<date>
    - ?created_at__lte=<date>
    """
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAdminUser]  # Only superusers
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "action_type": ["exact", "in"],
        "model_name": ["exact", "icontains"],
        "user": ["exact"],
        "created_at": ["gte", "lte", "date"],
    }
    search_fields = ["model_name", "object_repr", "user__email", "ip_address"]
    ordering_fields = ["created_at", "action_type", "model_name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """
        Only superusers can access audit logs.
        """
        return AuditLog.objects.select_related("user").all()
