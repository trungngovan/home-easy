from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets

from .models import Payment
from .serializers import PaymentSerializer
from notifications.services import (
    notify_payment_created,
    notify_payment_received,
    notify_payment_failed,
)
from audit.utils import log_action, store_old_instance


class PaymentViewSet(viewsets.ModelViewSet):
    """
    Payment ViewSet with optimized queries and user-based filtering.
    
    Supports filtering:
    - ?status=pending,completed,failed
    - ?method=cash,bank_transfer,momo
    - ?invoice=<invoice_id>
    - ?invoice__tenancy__room__building=<property_id>
    
    Automatic filtering by user role:
    - Tenants: Only see payments for their own invoices (invoice__tenancy__tenant=user)
    - Landlords: Only see payments for invoices in their properties (invoice__tenancy__room__building__owner=user)
    """
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "status": ["exact", "in"],
        "method": ["exact", "in"],
        "invoice": ["exact"],
        "invoice__tenancy__room__building": ["exact"],
    }
    search_fields = ["provider_ref", "note"]
    ordering_fields = ["created_at", "amount", "status"]

    def get_queryset(self):
        """
        Filter queryset based on user role for security.
        - Tenants: Only payments for their own invoices
        - Landlords: Payments for invoices in their properties
        - Superusers: All payments
        """
        user = self.request.user
        queryset = Payment.objects.select_related(
            "invoice__tenancy__room__building",
            "invoice__tenancy__tenant"
        ).order_by("-created_at")

        # Superusers can see everything
        if user.is_superuser:
            return queryset

        # Tenants can only see payments for their own invoices
        if user.role == "tenant":
            return queryset.filter(invoice__tenancy__tenant=user)

        # Landlords can see payments for invoices in their properties
        if user.role == "landlord":
            return queryset.filter(invoice__tenancy__room__building__owner=user)

        # Default: return empty queryset for unknown roles
        return queryset.none()

    def perform_create(self, serializer):
        """Create payment, log audit, and send notification."""
        payment = serializer.save()
        payment._audit_user = self.request.user
        payment._audit_request = self.request
        
        # Log audit
        try:
            log_action(
                user=self.request.user,
                action_type="create",
                instance=payment,
                request=self.request,
            )
        except Exception:
            pass
        
        # Notify when payment is created
        try:
            notify_payment_created(payment)
        except Exception:
            # Don't fail payment creation if notification fails
            pass

    def perform_update(self, serializer):
        """Update payment, log audit, and send notifications for status changes."""
        old_instance = self.get_object()
        old_status = old_instance.status
        
        # Store old instance for comparison
        store_old_instance(old_instance)
        
        payment = serializer.save()
        payment._audit_user = self.request.user
        payment._audit_request = self.request
        new_status = payment.status
        
        # Log audit
        try:
            log_action(
                user=self.request.user,
                action_type="update",
                instance=payment,
                request=self.request,
            )
        except Exception:
            pass
        
        # Notify when status changes
        if old_status != new_status:
            try:
                if new_status == "completed":
                    notify_payment_received(payment)
                elif new_status == "failed":
                    notify_payment_failed(payment)
            except Exception:
                pass

    def perform_destroy(self, instance):
        """Delete payment and log audit."""
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
