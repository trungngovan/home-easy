from django.utils import timezone
from django.db import models

from .models import AuditLog


def get_changes(old_instance, new_instance):
    """
    Compare two model instances and return a dictionary of changed fields.
    
    Args:
        old_instance: The original instance (can be None for create)
        new_instance: The updated instance
    
    Returns:
        dict: Dictionary with field names as keys and {"old": old_value, "new": new_value} as values
    """
    if old_instance is None:
        # Creating new instance - all fields are "new"
        changes = {}
        for field in new_instance._meta.fields:
            if field.name not in ['id', 'created_at', 'updated_at']:
                value = getattr(new_instance, field.name, None)
                if value is not None:
                    changes[field.name] = {"old": None, "new": str(value)}
        return changes
    
    changes = {}
    for field in new_instance._meta.fields:
        if field.name in ['id', 'created_at', 'updated_at']:
            continue
        
        old_value = getattr(old_instance, field.name, None)
        new_value = getattr(new_instance, field.name, None)
        
        # Handle ForeignKey fields
        if isinstance(field, models.ForeignKey):
            old_value = str(old_value) if old_value else None
            new_value = str(new_value) if new_value else None
        
        # Only record if value changed
        if old_value != new_value:
            changes[field.name] = {
                "old": str(old_value) if old_value is not None else None,
                "new": str(new_value) if new_value is not None else None,
            }
    
    return changes


def log_action(
    user,
    action_type,
    instance,
    changes=None,
    request=None,
    metadata=None
):
    """
    Create an audit log entry.
    
    Args:
        user: User who performed the action (can be None for system actions)
        action_type: Type of action (create, update, delete, etc.)
        instance: The model instance being acted upon
        changes: Dictionary of changes (if None, will be calculated for update actions)
        request: Django request object (optional, for IP and user agent)
        metadata: Additional metadata dictionary (optional)
    
    Returns:
        AuditLog: The created audit log entry
    """
    # Get IP address and user agent from request
    ip_address = None
    user_agent = None
    if request:
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]  # Limit length
    
    # Get object representation
    object_repr = str(instance) if instance else ""
    
    # Get model name
    model_name = instance._meta.label if instance else "Unknown"
    
    # Get object ID
    object_id = instance.pk if instance and hasattr(instance, 'pk') else None
    
    # Create audit log
    audit_log = AuditLog.objects.create(
        user=user,
        action_type=action_type,
        model_name=model_name,
        object_id=object_id,
        object_repr=object_repr,
        changes=changes or {},
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata or {},
    )
    
    return audit_log


def get_client_ip(request):
    """
    Get the client IP address from request.
    Handles proxy headers like X-Forwarded-For.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# Track old instances for comparison (used by signals)
_old_instances = {}


def store_old_instance(instance):
    """
    Store a copy of the instance before update for comparison.
    Call this in perform_update or before saving.
    """
    if instance.pk:
        model_name = instance._meta.label
        instance_key = f"{model_name}_{instance.pk}"
        
        # Create a copy of the instance
        # We'll store the current state of all fields
        old_instance = type(instance).objects.get(pk=instance.pk)
        _old_instances[instance_key] = old_instance


def get_old_instance(instance):
    """
    Get stored old instance for comparison.
    Used by signals to retrieve the old instance.
    """
    if instance.pk:
        model_name = instance._meta.label
        instance_key = f"{model_name}_{instance.pk}"
        return _old_instances.pop(instance_key, None)
    return None
