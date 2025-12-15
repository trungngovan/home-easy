from django.utils import timezone

from .models import Notification
from .constants import (
    INVOICE_CREATED,
    INVOICE_ISSUED,
    INVOICE_OVERDUE,
    PAYMENT_RECEIVED,
    PAYMENT_FAILED,
    PAYMENT_CREATED,
    MAINTENANCE_CREATED,
    MAINTENANCE_ASSIGNED,
    MAINTENANCE_STATUS_CHANGED,
    INVITE_SENT,
    INVITE_RECEIVED,
    INVITE_ACCEPTED,
    INVITE_REJECTED,
    METER_READING_SUBMITTED,
    TENANCY_CREATED,
    TEMPLATE_PRIORITY,
)


def create_notification(
    user,
    template,
    payload=None,
    channel="inapp",
    priority=None,
    related_object=None,
    sent_at=None,
):
    """
    Create a notification.
    
    Args:
        user: User to notify
        template: Notification template (from constants)
        payload: JSON payload with notification data
        channel: Notification channel (inapp, email, push)
        priority: Priority level (low, normal, high, urgent). If None, uses template default
        related_object: Related model instance (e.g., Invoice, Payment)
        sent_at: When notification was sent (None for immediate)
    
    Returns:
        Notification: Created notification instance
    """
    # Get priority from template if not provided
    if priority is None:
        priority = TEMPLATE_PRIORITY.get(template, "normal")
    
    # Extract related object info
    related_object_type = None
    related_object_id = None
    if related_object:
        related_object_type = related_object._meta.label.split(".")[-1].lower()  # e.g., "invoice"
        related_object_id = related_object.pk
    
    notification = Notification.objects.create(
        user=user,
        channel=channel,
        template=template,
        payload=payload or {},
        priority=priority,
        related_object_type=related_object_type,
        related_object_id=related_object_id,
        sent_at=sent_at or (timezone.now() if channel == "inapp" else None),
    )
    
    return notification


# Invoice notification helpers
def notify_invoice_created(invoice):
    """Notify tenant when invoice is created."""
    tenant = invoice.tenancy.tenant
    payload = {
        "invoice_id": str(invoice.id),
        "period": invoice.period,
        "amount": str(invoice.total_amount),
        "room_number": invoice.tenancy.room.room_number,
    }
    return create_notification(
        user=tenant,
        template=INVOICE_CREATED,
        payload=payload,
        related_object=invoice,
    )


def notify_invoice_issued(invoice):
    """Notify tenant when invoice is issued (status changes to pending)."""
    tenant = invoice.tenancy.tenant
    payload = {
        "invoice_id": str(invoice.id),
        "period": invoice.period,
        "amount": str(invoice.total_amount),
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "room_number": invoice.tenancy.room.room_number,
    }
    return create_notification(
        user=tenant,
        template=INVOICE_ISSUED,
        payload=payload,
        related_object=invoice,
    )


def notify_invoice_overdue(invoice):
    """Notify tenant and landlord when invoice is overdue."""
    tenant = invoice.tenancy.tenant
    landlord = invoice.tenancy.room.building.owner
    
    payload = {
        "invoice_id": str(invoice.id),
        "period": invoice.period,
        "amount": str(invoice.amount_due),
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "room_number": invoice.tenancy.room.room_number,
    }
    
    notifications = []
    # Notify tenant
    notifications.append(
        create_notification(
            user=tenant,
            template=INVOICE_OVERDUE,
            payload=payload,
            related_object=invoice,
        )
    )
    # Notify landlord
    notifications.append(
        create_notification(
            user=landlord,
            template=INVOICE_OVERDUE,
            payload=payload,
            related_object=invoice,
        )
    )
    return notifications


# Payment notification helpers
def notify_payment_created(payment):
    """Notify tenant and landlord when payment is created."""
    invoice = payment.invoice
    tenant = invoice.tenancy.tenant
    landlord = invoice.tenancy.room.building.owner
    room = invoice.tenancy.room
    
    payload = {
        "payment_id": str(payment.id),
        "invoice_id": str(invoice.id),
        "amount": str(payment.amount),
        "method": payment.method,
        "period": invoice.period,
        "tenant_name": tenant.full_name or tenant.email,
        "room_number": room.room_number,
    }
    
    notifications = []
    notifications.append(
        create_notification(
            user=tenant,
            template=PAYMENT_CREATED,
            payload=payload,
            related_object=payment,
        )
    )
    notifications.append(
        create_notification(
            user=landlord,
            template=PAYMENT_CREATED,
            payload=payload,
            related_object=payment,
        )
    )
    return notifications


def notify_payment_received(payment):
    """Notify tenant and landlord when payment is completed."""
    invoice = payment.invoice
    tenant = invoice.tenancy.tenant
    landlord = invoice.tenancy.room.building.owner
    room = invoice.tenancy.room
    
    payload = {
        "payment_id": str(payment.id),
        "invoice_id": str(invoice.id),
        "amount": str(payment.amount),
        "method": payment.method,
        "period": invoice.period,
        "tenant_name": tenant.full_name or tenant.email,
        "room_number": room.room_number,
    }
    
    notifications = []
    notifications.append(
        create_notification(
            user=tenant,
            template=PAYMENT_RECEIVED,
            payload=payload,
            related_object=payment,
        )
    )
    notifications.append(
        create_notification(
            user=landlord,
            template=PAYMENT_RECEIVED,
            payload=payload,
            related_object=payment,
        )
    )
    return notifications


def notify_payment_failed(payment):
    """Notify tenant and landlord when payment fails."""
    invoice = payment.invoice
    tenant = invoice.tenancy.tenant
    landlord = invoice.tenancy.room.building.owner
    
    payload = {
        "payment_id": str(payment.id),
        "invoice_id": str(invoice.id),
        "amount": str(payment.amount),
        "method": payment.method,
        "period": invoice.period,
    }
    
    notifications = []
    notifications.append(
        create_notification(
            user=tenant,
            template=PAYMENT_FAILED,
            payload=payload,
            related_object=payment,
        )
    )
    notifications.append(
        create_notification(
            user=landlord,
            template=PAYMENT_FAILED,
            payload=payload,
            related_object=payment,
        )
    )
    return notifications


# Maintenance notification helpers
def notify_maintenance_created(maintenance_request):
    """Notify landlord when maintenance request is created."""
    landlord = maintenance_request.room.building.owner
    
    payload = {
        "request_id": str(maintenance_request.id),
        "title": maintenance_request.title,
        "category": maintenance_request.category,
        "room_number": maintenance_request.room.room_number,
        "requester_name": maintenance_request.requester.full_name,
    }
    
    return create_notification(
        user=landlord,
        template=MAINTENANCE_CREATED,
        payload=payload,
        related_object=maintenance_request,
    )


def notify_maintenance_assigned(maintenance_request):
    """Notify tenant and assignee when maintenance is assigned."""
    tenant = maintenance_request.requester
    assignee = maintenance_request.assignee
    
    payload = {
        "request_id": str(maintenance_request.id),
        "title": maintenance_request.title,
        "category": maintenance_request.category,
        "room_number": maintenance_request.room.room_number,
    }
    
    notifications = []
    # Notify tenant
    notifications.append(
        create_notification(
            user=tenant,
            template=MAINTENANCE_ASSIGNED,
            payload=payload,
            related_object=maintenance_request,
        )
    )
    # Notify assignee
    if assignee:
        notifications.append(
            create_notification(
                user=assignee,
                template=MAINTENANCE_ASSIGNED,
                payload=payload,
                related_object=maintenance_request,
            )
        )
    return notifications


def notify_maintenance_status_changed(maintenance_request, old_status):
    """Notify tenant and landlord when maintenance status changes."""
    tenant = maintenance_request.requester
    landlord = maintenance_request.room.building.owner
    
    payload = {
        "request_id": str(maintenance_request.id),
        "title": maintenance_request.title,
        "old_status": old_status,
        "new_status": maintenance_request.status,
        "room_number": maintenance_request.room.room_number,
    }
    
    notifications = []
    notifications.append(
        create_notification(
            user=tenant,
            template=MAINTENANCE_STATUS_CHANGED,
            payload=payload,
            related_object=maintenance_request,
        )
    )
    notifications.append(
        create_notification(
            user=landlord,
            template=MAINTENANCE_STATUS_CHANGED,
            payload=payload,
            related_object=maintenance_request,
        )
    )
    return notifications


# Invite notification helpers
def notify_invite_sent(invite):
    """
    Notify landlord and tenant when invite is sent.
    - Landlord: Confirmation that invite was sent
    - Tenant: Notification that they received an invite
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    landlord = invite.property.owner
    notifications = []
    
    payload = {
        "invite_id": str(invite.id),
        "email": invite.email,
        "phone": invite.phone,
        "room_number": invite.room.room_number if invite.room else None,
        "property_name": invite.property.name if invite.property else None,
    }
    
    # Notify landlord (confirmation)
    notifications.append(
        create_notification(
            user=landlord,
            template=INVITE_SENT,
            payload=payload,
            related_object=invite,
            priority="low",
        )
    )
    
    # Notify tenant (if they exist in system)
    tenant = None
    if invite.email:
        tenant = User.objects.filter(email=invite.email, role="tenant").first()
    elif invite.phone:
        tenant = User.objects.filter(phone=invite.phone, role="tenant").first()
    
    if tenant:
        tenant_payload = {
            "invite_id": str(invite.id),
            "property_name": invite.property.name if invite.property else None,
            "room_number": invite.room.room_number if invite.room else None,
            "token": invite.token,  # Include token so tenant can accept invite
        }
        notifications.append(
            create_notification(
                user=tenant,
                template=INVITE_RECEIVED,  # Use separate template for tenant
                payload=tenant_payload,
                related_object=invite,
                priority="normal",  # Higher priority for tenant
            )
        )
    
    return notifications


def notify_invite_accepted(invite):
    """Notify landlord when invite is accepted."""
    landlord = invite.property.owner
    
    payload = {
        "invite_id": str(invite.id),
        "email": invite.email,
        "phone": invite.phone,
        "room_number": invite.room.room_number if invite.room else None,
    }
    
    return create_notification(
        user=landlord,
        template=INVITE_ACCEPTED,
        payload=payload,
        related_object=invite,
    )


def notify_invite_rejected(invite):
    """Notify landlord when invite is rejected."""
    landlord = invite.property.owner
    
    payload = {
        "invite_id": str(invite.id),
        "email": invite.email,
        "phone": invite.phone,
        "room_number": invite.room.room_number if invite.room else None,
    }
    
    return create_notification(
        user=landlord,
        template=INVITE_REJECTED,
        payload=payload,
        related_object=invite,
    )


# Meter reading notification helpers
def notify_meter_reading_submitted(meter_reading):
    """Notify tenant when meter reading is submitted."""
    # Get tenant from room's active tenancy
    from tenancies.models import Tenancy
    
    try:
        tenancy = Tenancy.objects.filter(
            room=meter_reading.room,
            status="active"
        ).first()
        if not tenancy:
            return None
        
        tenant = tenancy.tenant
        payload = {
            "reading_id": str(meter_reading.id),
            "period": meter_reading.period,
            "room_number": meter_reading.room.room_number,
            "electricity_usage": str(meter_reading.electricity_usage) if meter_reading.electricity_usage else None,
            "water_usage": str(meter_reading.water_usage) if meter_reading.water_usage else None,
        }
        
        return create_notification(
            user=tenant,
            template=METER_READING_SUBMITTED,
            payload=payload,
            related_object=meter_reading,
            priority="low",
        )
    except Exception:
        return None


# Tenancy notification helpers
def notify_tenancy_created(tenancy):
    """Notify tenant and landlord when tenancy is created."""
    tenant = tenancy.tenant
    landlord = tenancy.room.building.owner
    
    payload = {
        "tenancy_id": str(tenancy.id),
        "room_number": tenancy.room.room_number,
        "start_date": tenancy.start_date.isoformat() if tenancy.start_date else None,
        "base_rent": str(tenancy.base_rent),
    }
    
    notifications = []
    notifications.append(
        create_notification(
            user=tenant,
            template=TENANCY_CREATED,
            payload=payload,
            related_object=tenancy,
        )
    )
    notifications.append(
        create_notification(
            user=landlord,
            template=TENANCY_CREATED,
            payload=payload,
            related_object=tenancy,
        )
    )
    return notifications
