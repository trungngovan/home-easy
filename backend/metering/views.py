from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets

from .models import MeterReading
from .serializers import MeterReadingSerializer
from notifications.services import notify_meter_reading_submitted
from audit.utils import log_action, store_old_instance


class MeterReadingViewSet(viewsets.ModelViewSet):
    """
    Meter Reading ViewSet with optimized queries and user-based filtering.
    
    Supports filtering:
    - ?room=<room_id>
    - ?room__building=<property_id>
    - ?period=2024-01
    - ?source=manual,ocr
    
    Automatic filtering by user role:
    - Tenants: Only see readings for rooms in their active tenancies
    - Landlords: Only see readings for rooms in their properties (room__building__owner=user)
    """
    serializer_class = MeterReadingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "room": ["exact"],
        "room__building": ["exact"],
        "period": ["exact", "gte", "lte"],
        "source": ["exact"],
    }
    search_fields = ["room__room_number", "period"]
    ordering_fields = ["created_at", "period"]

    def get_queryset(self):
        """
        Filter queryset based on user role for security.
        - Tenants: Only readings for rooms in their active tenancies
        - Landlords: Only readings for rooms in their properties
        - Superusers: All readings
        """
        user = self.request.user
        queryset = MeterReading.objects.select_related(
            "room__building",
            "ocr_image"
        ).order_by("-period", "-created_at")

        # Superusers can see everything
        if user.is_superuser:
            return queryset

        # Tenants can only see readings for rooms in their active tenancies
        if user.role == "tenant":
            # Use join instead of subquery for better performance
            return queryset.filter(
                room__tenancies__tenant=user,
                room__tenancies__status="active"
            ).distinct()

        # Landlords can only see readings for rooms in their properties
        if user.role == "landlord":
            return queryset.filter(room__building__owner=user)

        # Default: return empty queryset for unknown roles
        return queryset.none()

    def perform_create(self, serializer):
        """Create meter reading, log audit, and send notification."""
        meter_reading = serializer.save()
        meter_reading._audit_user = self.request.user
        meter_reading._audit_request = self.request
        
        # Log audit
        try:
            log_action(
                user=self.request.user,
                action_type="create",
                instance=meter_reading,
                request=self.request,
            )
        except Exception:
            pass
        
        # Notify tenant when meter reading is submitted
        try:
            notify_meter_reading_submitted(meter_reading)
        except Exception:
            # Don't fail reading creation if notification fails
            pass

    def perform_update(self, serializer):
        """Update meter reading and log audit."""
        old_instance = self.get_object()
        store_old_instance(old_instance)
        
        meter_reading = serializer.save()
        meter_reading._audit_user = self.request.user
        meter_reading._audit_request = self.request
        
        # Log audit
        try:
            log_action(
                user=self.request.user,
                action_type="update",
                instance=meter_reading,
                request=self.request,
            )
        except Exception:
            pass

    def perform_destroy(self, instance):
        """Delete meter reading and log audit."""
        instance._audit_user = self.request.user
        instance._audit_request = self.request
        
        # Log audit
        try:
            log_action(
                user=self.request.user,
                action_type="delete",
                instance=instance,
                request=self.request,
            )
        except Exception:
            pass
        
        instance.delete()
