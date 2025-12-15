from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets

from .models import MaintenanceAttachment, MaintenanceRequest
from .serializers import MaintenanceAttachmentSerializer, MaintenanceRequestSerializer
from notifications.services import (
    notify_maintenance_created,
    notify_maintenance_assigned,
    notify_maintenance_status_changed,
)
from audit.utils import log_action, store_old_instance


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    """
    Maintenance Request ViewSet with optimized queries and user-based filtering.
    
    Supports filtering:
    - ?status=pending,in_progress,done
    - ?category=electricity,plumbing
    - ?room=<room_id>
    - ?room__building=<property_id>
    - ?requester=<user_id>
    - ?assignee=<user_id>
    
    Automatic filtering by user role:
    - Tenants: Only see their own requests (requester=user)
    - Landlords: Only see requests for rooms in their properties (room__building__owner=user)
    """
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "status": ["exact", "in"],
        "category": ["exact", "in"],
        "room": ["exact"],
        "room__building": ["exact"],
        "requester": ["exact"],
        "assignee": ["exact"],
    }
    search_fields = ["title", "description", "room__room_number"]
    ordering_fields = ["created_at", "status", "category"]

    def get_queryset(self):
        """
        Filter queryset based on user role for security.
        - Tenants: Only their own requests
        - Landlords: Requests for their properties
        - Superusers: All requests
        """
        user = self.request.user
        queryset = MaintenanceRequest.objects.select_related(
            "room__building",
            "requester",
            "assignee"
        ).prefetch_related("attachments__file").order_by("-created_at")

        # Superusers can see everything
        if user.is_superuser:
            return queryset

        # Tenants can only see their own requests
        if user.role == "tenant":
            return queryset.filter(requester=user)

        # Landlords can see requests for rooms in their properties
        if user.role == "landlord":
            return queryset.filter(room__building__owner=user)

        # Default: return empty queryset for unknown roles
        return queryset.none()

    def perform_create(self, serializer):
        """Create maintenance request, log audit, and send notification."""
        maintenance_request = serializer.save(requester=self.request.user)
        maintenance_request._audit_user = self.request.user
        maintenance_request._audit_request = self.request
        
        # Log audit
        try:
            log_action(
                user=self.request.user,
                action_type="create",
                instance=maintenance_request,
                request=self.request,
            )
        except Exception:
            pass
        
        # Notify landlord when maintenance request is created
        try:
            notify_maintenance_created(maintenance_request)
        except Exception:
            # Don't fail request creation if notification fails
            pass

    def perform_update(self, serializer):
        """Update maintenance request, log audit, and send notifications for changes."""
        old_instance = self.get_object()
        old_status = old_instance.status
        old_assignee = old_instance.assignee
        
        # Store old instance for comparison
        store_old_instance(old_instance)
        
        maintenance_request = serializer.save()
        maintenance_request._audit_user = self.request.user
        maintenance_request._audit_request = self.request
        new_status = maintenance_request.status
        new_assignee = maintenance_request.assignee
        
        # Log audit
        try:
            log_action(
                user=self.request.user,
                action_type="update",
                instance=maintenance_request,
                request=self.request,
            )
        except Exception:
            pass
        
        # Notify when assignee is assigned
        if old_assignee != new_assignee and new_assignee is not None:
            try:
                notify_maintenance_assigned(maintenance_request)
            except Exception:
                pass
        
        # Notify when status changes
        if old_status != new_status:
            try:
                notify_maintenance_status_changed(maintenance_request, old_status)
            except Exception:
                pass

    def perform_destroy(self, instance):
        """Delete maintenance request and log audit."""
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


class MaintenanceAttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["request"]

    def get_queryset(self):
        """
        Filter attachments based on user's access to maintenance requests.
        """
        user = self.request.user
        queryset = MaintenanceAttachment.objects.select_related("request", "file").order_by("-uploaded_at")

        # Superusers can see everything
        if user.is_superuser:
            return queryset

        # Filter based on maintenance request access
        if user.role == "tenant":
            # Tenants can only see attachments for their own requests
            return queryset.filter(request__requester=user)
        elif user.role == "landlord":
            # Landlords can see attachments for requests in their properties
            return queryset.filter(request__room__building__owner=user)

        return queryset.none()
