from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils import timezone

from .utils import get_changes, log_action, get_old_instance


@receiver(post_save)
def log_model_save(sender, instance, created, **kwargs):
    """
    Automatically log create and update actions.
    Only logs models that are registered for auditing.
    """
    # Skip if this is not a model we want to audit
    model_name = sender._meta.label
    auditable_models = [
        'properties.Property',
        'properties.Room',
        'tenancies.Tenancy',
        'billing.Invoice',
        'billing.InvoiceLine',
        'payments.Payment',
        'maintenance.MaintenanceRequest',
        'metering.MeterReading',
        'invites.Invite',
    ]
    
    if model_name not in auditable_models:
        return
    
    # Skip audit logs themselves to avoid recursion
    if model_name == 'audit.AuditLog':
        return
    
    # Determine action type
    action_type = "create" if created else "update"
    
    # Get user from thread-local storage (set by middleware or viewset)
    user = getattr(instance, '_audit_user', None)
    request = getattr(instance, '_audit_request', None)
    
    # For updates, get changes
    changes = None
    if not created:
        old_instance = get_old_instance(instance)
        if old_instance:
            changes = get_changes(old_instance, instance)
    
    # Create audit log
    log_action(
        user=user,
        action_type=action_type,
        instance=instance,
        changes=changes,
        request=request,
    )


@receiver(pre_delete)
def log_model_delete(sender, instance, **kwargs):
    """
    Automatically log delete actions.
    Only logs models that are registered for auditing.
    """
    # Skip if this is not a model we want to audit
    model_name = sender._meta.label
    auditable_models = [
        'properties.Property',
        'properties.Room',
        'tenancies.Tenancy',
        'billing.Invoice',
        'billing.InvoiceLine',
        'payments.Payment',
        'maintenance.MaintenanceRequest',
        'metering.MeterReading',
        'invites.Invite',
    ]
    
    if model_name not in auditable_models:
        return
    
    # Skip audit logs themselves to avoid recursion
    if model_name == 'audit.AuditLog':
        return
    
    # Get user from thread-local storage
    user = getattr(instance, '_audit_user', None)
    request = getattr(instance, '_audit_request', None)
    
    # Create audit log
    log_action(
        user=user,
        action_type="delete",
        instance=instance,
        changes=None,
        request=request,
    )
