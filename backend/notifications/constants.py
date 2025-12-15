"""
Notification template constants.
These define the types of notifications that can be sent.
"""

# Invoice notifications
INVOICE_CREATED = "invoice.created"
INVOICE_ISSUED = "invoice.issued"
INVOICE_OVERDUE = "invoice.overdue"

# Payment notifications
PAYMENT_RECEIVED = "payment.received"
PAYMENT_FAILED = "payment.failed"
PAYMENT_CREATED = "payment.created"

# Maintenance notifications
MAINTENANCE_CREATED = "maintenance.created"
MAINTENANCE_ASSIGNED = "maintenance.assigned"
MAINTENANCE_STATUS_CHANGED = "maintenance.status_changed"

# Invite notifications
INVITE_SENT = "invite.sent"
INVITE_RECEIVED = "invite.received"  # For tenant when they receive an invite
INVITE_ACCEPTED = "invite.accepted"
INVITE_REJECTED = "invite.rejected"

# Meter reading notifications
METER_READING_SUBMITTED = "meter_reading.submitted"

# Tenancy notifications
TENANCY_CREATED = "tenancy.created"

# All notification templates
NOTIFICATION_TEMPLATES = [
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
]

# Priority mapping for different notification types
TEMPLATE_PRIORITY = {
    INVOICE_OVERDUE: "urgent",
    PAYMENT_FAILED: "high",
    MAINTENANCE_CREATED: "high",
    INVOICE_CREATED: "normal",
    INVOICE_ISSUED: "normal",
    PAYMENT_RECEIVED: "normal",
    PAYMENT_CREATED: "normal",
    MAINTENANCE_ASSIGNED: "normal",
    MAINTENANCE_STATUS_CHANGED: "normal",
    INVITE_SENT: "low",
    INVITE_RECEIVED: "normal",  # Higher priority for tenant
    INVITE_ACCEPTED: "normal",
    INVITE_REJECTED: "normal",
    METER_READING_SUBMITTED: "low",
    TENANCY_CREATED: "normal",
}
