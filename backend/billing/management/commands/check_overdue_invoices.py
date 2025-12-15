"""
Management command to check for overdue invoices and send notifications.

Usage:
    python manage.py check_overdue_invoices

This command should be run daily (e.g., via cron) to check for invoices
that are past their due date and notify tenants and landlords.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date

from billing.models import Invoice
from notifications.services import notify_invoice_overdue


class Command(BaseCommand):
    help = 'Check for overdue invoices and send notifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without actually sending notifications',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        today = date.today()
        
        # Find invoices that are overdue
        # Overdue = due_date < today AND status not in ['paid']
        overdue_invoices = Invoice.objects.filter(
            due_date__lt=today,
            status__in=['pending', 'partial', 'overdue'],
        ).select_related(
            'tenancy__tenant',
            'tenancy__room__building__owner',
        )
        
        count = overdue_invoices.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('No overdue invoices found.')
            )
            return
        
        self.stdout.write(
            f'Found {count} overdue invoice(s).'
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN: Notifications will not be sent.')
            )
            for invoice in overdue_invoices:
                self.stdout.write(
                    f'  - Invoice {invoice.id} for {invoice.tenancy.tenant.email} '
                    f'(Period: {invoice.period}, Due: {invoice.due_date})'
                )
            return
        
        # Send notifications
        notified_count = 0
        error_count = 0
        
        for invoice in overdue_invoices:
            try:
                # Update status to overdue if not already
                if invoice.status != 'overdue':
                    invoice.status = 'overdue'
                    invoice.save(update_fields=['status', 'updated_at'])
                
                # Send notifications
                notify_invoice_overdue(invoice)
                notified_count += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Notified for invoice {invoice.id} '
                        f'(Period: {invoice.period})'
                    )
                )
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'✗ Error notifying for invoice {invoice.id}: {str(e)}'
                    )
                )
        
        # Summary
        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS(
                f'Completed: {notified_count} notified, {error_count} errors'
            )
        )
