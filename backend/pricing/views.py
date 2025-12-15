from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets

from .models import ServicePrice
from .serializers import ServicePriceSerializer


class ServicePriceViewSet(viewsets.ModelViewSet):
    """
    Service Price ViewSet with optimized queries and user-based filtering.
    
    Supports filtering:
    - ?property=<property_id>
    - ?service_type=electricity,water
    - ?is_recurring=true,false
    
    Automatic filtering by user role:
    - Tenants: Cannot see service prices (empty queryset)
    - Landlords: Only see prices for their properties (property__owner=user)
    """
    serializer_class = ServicePriceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = {
        "property": ["exact"],
        "service_type": ["exact", "in"],
        "is_recurring": ["exact"],
    }
    ordering_fields = ["created_at", "service_type", "unit_price"]

    def get_queryset(self):
        """
        Filter queryset based on user role for security.
        - Tenants: Cannot see service prices
        - Landlords: Only prices for their properties
        - Superusers: All prices
        """
        user = self.request.user
        queryset = ServicePrice.objects.select_related("property").order_by("property", "service_type")

        # Superusers can see everything
        if user.is_superuser:
            return queryset

        # Tenants cannot see service prices
        if user.role == "tenant":
            return queryset.none()

        # Landlords can only see prices for their properties
        if user.role == "landlord":
            return queryset.filter(property__owner=user)

        return queryset.none()
