from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets

from .models import Invite
from .serializers import InviteSerializer
from notifications.services import (
    notify_invite_sent,
    notify_invite_accepted,
    notify_invite_rejected,
)
from audit.utils import log_action, store_old_instance


class InviteViewSet(viewsets.ModelViewSet):
    """
    Invite ViewSet with optimized queries and user-based filtering.
    
    Supports filtering:
    - ?status=pending,accepted,rejected,expired
    - ?room=<room_id>
    - ?property=<property_id>
    
    Automatic filtering by user role:
    - Tenants: Only see invites sent to their email/phone
    - Landlords: Only see invites for their properties (property__owner=user)
    """
    serializer_class = InviteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "status": ["exact", "in"],
        "room": ["exact"],
        "property": ["exact"],
    }
    search_fields = ["email", "phone"]
    ordering_fields = ["created_at", "expires_at"]

    def get_queryset(self):
        """
        Filter queryset based on user role for security.
        - Tenants: Only invites sent to their email/phone
        - Landlords: Only invites for their properties
        - Superusers: All invites
        """
        user = self.request.user
        queryset = Invite.objects.select_related(
            "property",
            "room__building"
        ).order_by("-created_at")

        # Superusers can see everything
        if user.is_superuser:
            return queryset

        # Tenants can only see invites sent to their email/phone
        if user.role == "tenant":
            q_filter = Q(email=user.email)
            if user.phone:
                q_filter |= Q(phone=user.phone)
            return queryset.filter(q_filter)

        # Landlords can only see invites for their properties
        if user.role == "landlord":
            return queryset.filter(property__owner=user)

        return queryset.none()

    def perform_create(self, serializer):
        """Create invite, log audit, and send notification."""
        invite = serializer.save()
        invite._audit_user = self.request.user
        invite._audit_request = self.request
        
        # Log audit
        try:
            log_action(
                user=self.request.user,
                action_type="create",
                instance=invite,
                request=self.request,
            )
        except Exception:
            pass
        
        # Notify landlord when invite is sent
        try:
            notify_invite_sent(invite)
        except Exception:
            # Don't fail invite creation if notification fails
            pass

    def perform_update(self, serializer):
        """Update invite, log audit, and send notifications for status changes."""
        from django.contrib.auth import get_user_model
        from django.utils import timezone
        from tenancies.models import Tenancy
        
        User = get_user_model()
        old_instance = self.get_object()
        old_status = old_instance.status
        
        # Store old instance for comparison
        store_old_instance(old_instance)
        
        invite = serializer.save()
        invite._audit_user = self.request.user
        invite._audit_request = self.request
        new_status = invite.status
        
        # Log audit
        try:
            log_action(
                user=self.request.user,
                action_type="update",
                instance=invite,
                request=self.request,
            )
        except Exception:
            pass
        
        # When invite is accepted, create tenancy and update room status
        if old_status != new_status and new_status == "accepted":
            # Prevent accepting already accepted/rejected invite
            if old_status == "accepted":
                from rest_framework.exceptions import ValidationError
                raise ValidationError("Lời mời này đã được chấp nhận rồi")
            if old_status == "rejected":
                from rest_framework.exceptions import ValidationError
                raise ValidationError("Lời mời này đã bị từ chối rồi")
            
            # Get tenant user
            tenant = None
            if invite.email:
                tenant = User.objects.filter(email=invite.email, role="tenant").first()
            elif invite.phone:
                tenant = User.objects.filter(phone=invite.phone, role="tenant").first()
            
            if tenant:
                # Check if tenancy already exists for this room and tenant
                existing_tenancy = Tenancy.objects.filter(
                    room=invite.room,
                    tenant=tenant,
                    status="active"
                ).first()
                
                if not existing_tenancy:
                    # Create tenancy with contract_file from invite
                    Tenancy.objects.create(
                        room=invite.room,
                        tenant=tenant,
                        start_date=timezone.now().date(),
                        base_rent=invite.room.base_rent,
                        status="active",
                        contract_file=invite.contract_file  # Copy contract_file from invite
                    )
                    
                    # Update room status to occupied
                    invite.room.status = "occupied"
                    invite.room.save(update_fields=["status"])
                
                # Mark related notifications as read for the tenant
                from notifications.models import Notification
                Notification.objects.filter(
                    user=tenant,
                    related_object_type="invite",
                    related_object_id=invite.id,
                    is_read=False
                ).update(is_read=True, read_at=timezone.now())
            
            # Notify landlord
            try:
                notify_invite_accepted(invite)
            except Exception:
                pass
        
        # When invite is rejected, mark notifications as read and notify landlord
        if old_status != new_status and new_status == "rejected":
            # Prevent rejecting already accepted/rejected invite
            if old_status == "accepted":
                from rest_framework.exceptions import ValidationError
                raise ValidationError("Lời mời này đã được chấp nhận rồi")
            if old_status == "rejected":
                from rest_framework.exceptions import ValidationError
                raise ValidationError("Lời mời này đã bị từ chối rồi")
            
            # Get tenant user
            tenant = None
            if invite.email:
                tenant = User.objects.filter(email=invite.email, role="tenant").first()
            elif invite.phone:
                tenant = User.objects.filter(phone=invite.phone, role="tenant").first()
            
            if tenant:
                # Mark related notifications as read for the tenant
                from notifications.models import Notification
                Notification.objects.filter(
                    user=tenant,
                    related_object_type="invite",
                    related_object_id=invite.id,
                    is_read=False
                ).update(is_read=True, read_at=timezone.now())
            
            # Notify landlord
            try:
                notify_invite_rejected(invite)
            except Exception:
                pass

    def perform_destroy(self, instance):
        """Delete invite and log audit."""
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
