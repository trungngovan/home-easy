from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets

from .models import Tenancy
from .serializers import TenancySerializer
from notifications.services import notify_tenancy_created
from audit.utils import log_action, store_old_instance


class TenancyViewSet(viewsets.ModelViewSet):
    """
    Tenancy ViewSet with optimized queries and user-based filtering.
    
    Supports filtering:
    - ?status=active,expired
    - ?room=<room_id>
    - ?tenant=<user_id>
    - ?room__building=<property_id>
    
    Automatic filtering by user role:
    - Tenants: Only see their own tenancies (tenant=user)
    - Landlords: Only see tenancies in their properties (room__building__owner=user)
    """
    serializer_class = TenancySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "status": ["exact", "in"],
        "room": ["exact"],
        "tenant": ["exact"],
        "room__building": ["exact"],
    }
    search_fields = ["room__room_number", "tenant__full_name", "tenant__email"]
    ordering_fields = ["created_at", "start_date", "end_date", "base_rent"]

    def get_queryset(self):
        """
        Filter queryset based on user role for security.
        - Tenants: Only their own tenancies
        - Landlords: Tenancies in their properties
        - Superusers: All tenancies
        """
        user = self.request.user
        queryset = Tenancy.objects.select_related(
            "room__building__owner",
            "tenant",
            "contract_file"
        ).order_by("-created_at")

        # Superusers can see everything
        if user.is_superuser:
            return queryset

        # Tenants can only see their own tenancies
        if user.role == "tenant":
            return queryset.filter(tenant=user)

        # Landlords can see tenancies in their properties
        if user.role == "landlord":
            return queryset.filter(room__building__owner=user)

        # Default: return empty queryset for unknown roles
        return queryset.none()

    def perform_create(self, serializer):
        """Create tenancy, log audit, and send notification."""
        tenancy = serializer.save()
        tenancy._audit_user = self.request.user
        tenancy._audit_request = self.request
        
        # Log audit
        try:
            log_action(
                user=self.request.user,
                action_type="create",
                instance=tenancy,
                request=self.request,
            )
        except Exception:
            pass
        
        # Notify tenant and landlord when tenancy is created
        try:
            notify_tenancy_created(tenancy)
        except Exception:
            # Don't fail tenancy creation if notification fails
            pass

    def perform_update(self, serializer):
        """Update tenancy and log audit."""
        old_instance = self.get_object()
        store_old_instance(old_instance)
        
        tenancy = serializer.save()
        tenancy._audit_user = self.request.user
        tenancy._audit_request = self.request
        
        # Log audit
        try:
            log_action(
                user=self.request.user,
                action_type="update",
                instance=tenancy,
                request=self.request,
            )
        except Exception:
            pass

    def perform_destroy(self, instance):
        """Delete tenancy and log audit."""
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
