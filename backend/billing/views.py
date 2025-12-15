from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from backend.mixins import FieldSelectionMixin
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
import os
import platform

from .models import Invoice, InvoiceLine
from .serializers import InvoiceLineSerializer, InvoiceSerializer
from notifications.services import (
    notify_invoice_created,
    notify_invoice_issued,
)
from audit.utils import log_action, store_old_instance


def get_vietnamese_font():
    """Get Vietnamese font path - try system fonts first, then download if needed"""
    system = platform.system()
    
    # Try to find system fonts that support Vietnamese
    font_paths = []
    
    if system == "Darwin":  # macOS
        font_paths = [
            "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
            "/Library/Fonts/Arial Unicode.ttf",
            "/System/Library/Fonts/Supplemental/Helvetica.ttc",
        ]
    elif system == "Windows":
        font_paths = [
            "C:/Windows/Fonts/arialuni.ttf",  # Arial Unicode MS - best for Vietnamese
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/tahoma.ttf",
        ]
    else:  # Linux
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        ]
    
    # Try to find an available font
    for font_path in font_paths:
        if os.path.exists(font_path):
            return font_path
    
    # Try to download Noto Sans if not found (only once)
    try:
        import urllib.request
        
        # Use MEDIA_ROOT or create fonts directory in billing app
        font_dir = os.path.join(os.path.dirname(__file__), 'fonts')
        os.makedirs(font_dir, exist_ok=True)
        font_path = os.path.join(font_dir, 'NotoSans-Regular.ttf')
        
        if not os.path.exists(font_path):
            # Download Noto Sans Vietnamese font (supports Vietnamese well)
            try:
                url = "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans-Regular.ttf"
                urllib.request.urlretrieve(url, font_path)
            except Exception:
                # If download fails, try alternative source
                try:
                    url = "https://fonts.gstatic.com/s/notosans/v36/o-0IIpQlx3QUlC5A4PNb4j5Ba_2c7A.woff2"
                    # Note: woff2 needs conversion, so skip for now
                    pass
                except:
                    pass
        
        if os.path.exists(font_path) and os.path.getsize(font_path) > 0:
            return font_path
    except Exception:
        pass
    
    # If no font found, return None
    return None


def register_vietnamese_font():
    """Register Vietnamese font for reportlab"""
    font_path = get_vietnamese_font()
    
    if font_path:
        try:
            pdfmetrics.registerFont(TTFont('Vietnamese', font_path))
            # Also register bold variant if available
            try:
                bold_path = font_path.replace('Regular', 'Bold').replace('-Regular', '-Bold')
                if os.path.exists(bold_path):
                    pdfmetrics.registerFont(TTFont('Vietnamese-Bold', bold_path))
            except Exception:
                pass
            return 'Vietnamese'
        except Exception:
            # If registration fails, fall back to Helvetica
            pass
    
    # Fallback: Use Helvetica (may not support all Vietnamese characters perfectly)
    # Note: Helvetica doesn't support Vietnamese diacritics well
    return 'Helvetica'


class InvoiceViewSet(FieldSelectionMixin, viewsets.ModelViewSet):
    """
    Invoice ViewSet with optimized queries and user-based filtering.
    
    Supports filtering:
    - ?status=pending,paid (comma-separated)
    - ?period=2024-01
    - ?tenancy__room__building=<property_id>
    - ?search=<room_number>
    
    Automatic filtering by user role:
    - Tenants: Only see their own invoices (tenancy__tenant=user)
    - Landlords: Only see invoices for tenants in their properties (tenancy__room__building__owner=user)
    """
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "status": ["exact", "in"],
        "period": ["exact", "gte", "lte"],
        "tenancy__room__building": ["exact"],
        "tenancy": ["exact"],
    }
    search_fields = ["tenancy__room__room_number", "period", "notes"]
    ordering_fields = ["created_at", "period", "total_amount", "due_date"]

    def get_queryset(self):
        """
        Filter queryset based on user role for security.
        - Tenants: Only their own invoices
        - Landlords: Invoices for tenants in their properties
        - Superusers: All invoices
        """
        user = self.request.user
        queryset = Invoice.objects.select_related(
            "tenancy__room__building",
            "tenancy__tenant"
        ).prefetch_related("lines", "payments").order_by("-created_at")

        # Superusers can see everything
        if user.is_superuser:
            return queryset

        # Tenants can only see their own invoices
        if user.role == "tenant":
            return queryset.filter(tenancy__tenant=user)

        # Landlords can see invoices for tenants in their properties
        if user.role == "landlord":
            return queryset.filter(tenancy__room__building__owner=user)

        # Default: return empty queryset for unknown roles
        return queryset.none()

    def get_object(self):
        """Override to ensure prefetch_related is always applied"""
        obj = super().get_object()
        # Ensure prefetch is applied even if get_object is called directly
        # The queryset from get_queryset() already has prefetch_related,
        # but this ensures it's applied even in edge cases
        if not hasattr(obj, '_prefetched_objects_cache'):
            from django.db.models import Prefetch
            from .models import Payment
            obj = Invoice.objects.select_related(
                "tenancy__room__building",
                "tenancy__tenant"
            ).prefetch_related(
                "lines",
                Prefetch("payments", queryset=Payment.objects.filter(invoice=obj))
            ).get(pk=obj.pk)
        return obj

    def perform_create(self, serializer):
        """Create invoice, log audit, and send notification."""
        # Set audit context for signals
        invoice = serializer.save()
        invoice._audit_user = self.request.user
        invoice._audit_request = self.request
        
        # Log audit
        try:
            log_action(
                user=self.request.user,
                action_type="create",
                instance=invoice,
                request=self.request,
            )
        except Exception:
            pass
        
        # Notify tenant when invoice is created
        try:
            notify_invoice_created(invoice)
        except Exception:
            # Don't fail invoice creation if notification fails
            pass

    def perform_update(self, serializer):
        """Update invoice, log audit, and send notifications for status changes."""
        old_instance = self.get_object()
        old_status = old_instance.status
        
        # Store old instance for comparison
        store_old_instance(old_instance)
        
        invoice = serializer.save()
        invoice._audit_user = self.request.user
        invoice._audit_request = self.request
        new_status = invoice.status
        
        # Log audit
        try:
            log_action(
                user=self.request.user,
                action_type="update",
                instance=invoice,
                request=self.request,
            )
        except Exception:
            pass
        
        # Notify when status changes to pending (issued)
        if old_status != new_status:
            if old_status == "draft" and new_status == "pending":
                try:
                    notify_invoice_issued(invoice)
                except Exception:
                    pass

    def perform_destroy(self, instance):
        """Delete invoice and log audit."""
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

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """Generate and download invoice as PDF"""
        invoice = self.get_object()
        
        # Register Vietnamese font
        font_name = register_vietnamese_font()
        
        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        story = []
        
        # Styles with Vietnamese font
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontName=font_name,
            fontSize=20,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontName=font_name,
            fontSize=14,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=12,
        )
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontName=font_name,
            fontSize=10,
        )
        
        # Title
        story.append(Paragraph("HÓA ĐƠN THANH TOÁN", title_style))
        story.append(Spacer(1, 0.5*cm))
        
        # Invoice Info
        invoice_data = [
            ["Kỳ thanh toán:", invoice.period],
            ["Mã hóa đơn:", str(invoice.id)[:8].upper()],
            ["Ngày tạo:", invoice.created_at.strftime("%d/%m/%Y")],
        ]
        if invoice.due_date:
            invoice_data.append(["Hạn thanh toán:", invoice.due_date.strftime("%d/%m/%Y")])
        invoice_data.append(["Trạng thái:", invoice.get_status_display()])
        
        invoice_table = Table(invoice_data, colWidths=[5*cm, 10*cm])
        invoice_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1a1a1a')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(invoice_table)
        story.append(Spacer(1, 0.5*cm))
        
        # Tenant Info
        tenancy = invoice.tenancy
        tenant = tenancy.tenant
        room = tenancy.room
        property_obj = room.building
        
        story.append(Paragraph("THÔNG TIN KHÁCH THUÊ", heading_style))
        tenant_data = [
            ["Họ và tên:", tenant.full_name],
            ["Email:", tenant.email],
        ]
        if tenant.phone:
            tenant_data.append(["Số điện thoại:", tenant.phone])
        tenant_data.extend([
            ["Địa chỉ:", f"{property_obj.name} - Phòng {room.room_number}"],
            ["", property_obj.address or ""],
        ])
        
        tenant_table = Table(tenant_data, colWidths=[5*cm, 10*cm])
        tenant_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1a1a1a')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(tenant_table)
        story.append(Spacer(1, 0.5*cm))
        
        # Invoice Lines
        story.append(Paragraph("CHI TIẾT HÓA ĐƠN", heading_style))
        
        item_type_labels = {
            "rent": "Tiền phòng",
            "electricity": "Tiền điện",
            "water": "Tiền nước",
            "internet": "Internet",
            "cleaning": "Vệ sinh",
            "service": "Dịch vụ khác",
            "adjustment": "Điều chỉnh",
            "deposit": "Tiền cọc",
        }
        
        lines_data = [["Khoản mục", "Số lượng", "Đơn giá", "Thành tiền"]]
        for line in invoice.lines.all():
            lines_data.append([
                item_type_labels.get(line.item_type, line.item_type),
                f"{line.quantity:,.0f}",
                f"{line.unit_price:,.0f}đ",
                f"{line.amount:,.0f}đ",
            ])
        
        lines_table = Table(lines_data, colWidths=[7*cm, 3*cm, 3*cm, 2*cm])
        lines_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f0f0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1a1a1a')),
            ('FONTNAME', (0, 0), (-1, 0), font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            # Body
            ('FONTNAME', (0, 1), (-1, -1), font_name),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#1a1a1a')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e0e0e0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(lines_table)
        story.append(Spacer(1, 0.3*cm))
        
        # Summary
        total_paid = sum(p.amount for p in invoice.payments.filter(status="completed"))
        summary_data = [
            ["Tổng cộng:", f"{invoice.total_amount:,.0f}đ"],
        ]
        if total_paid > 0:
            summary_data.append(["Đã thanh toán:", f"{total_paid:,.0f}đ"])
        summary_data.append(["Còn lại:", f"{invoice.amount_due:,.0f}đ"])
        
        summary_table = Table(summary_data, colWidths=[10*cm, 5*cm])
        summary_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (1, 0), (1, -1), font_name),
            ('FONTSIZE', (1, 0), (1, -1), 11),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1a1a1a')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(summary_table)
        
        # Notes
        if invoice.notes:
            story.append(Spacer(1, 0.5*cm))
            story.append(Paragraph("Ghi chú:", heading_style))
            story.append(Paragraph(invoice.notes, normal_style))
        
        # Build PDF
        doc.build(story)
        
        # Get PDF content
        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Hoa-don-{invoice.period}-{str(invoice.id)[:8]}.pdf"'
        return response


class InvoiceLineViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["invoice", "item_type"]

    def get_queryset(self):
        """
        Filter invoice lines based on user's access to invoices.
        """
        user = self.request.user
        queryset = InvoiceLine.objects.select_related(
            "invoice__tenancy__room__building",
            "invoice__tenancy__tenant"
        ).order_by("-invoice__created_at")

        # Superusers can see everything
        if user.is_superuser:
            return queryset

        # Filter based on invoice access
        if user.role == "tenant":
            # Tenants can only see lines for their own invoices
            return queryset.filter(invoice__tenancy__tenant=user)
        elif user.role == "landlord":
            # Landlords can see lines for invoices in their properties
            return queryset.filter(invoice__tenancy__room__building__owner=user)

        return queryset.none()
