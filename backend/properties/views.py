from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets

from .models import Property, Room
from .serializers import PropertySerializer, PropertyListSerializer, RoomSerializer


class PropertyViewSet(viewsets.ModelViewSet):
    """
    Property ViewSet with optimized queries and room statistics.
    
    Supports filtering:
    - ?search=<name or address>
    - ?owner=<user_id>
    
    Automatic filtering by user role:
    - Tenants: Cannot see properties (empty queryset)
    - Landlords: Only see their own properties (owner=user)
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["owner"]
    search_fields = ["name", "address"]
    ordering_fields = ["created_at", "name"]

    def get_queryset(self):
        user = self.request.user
        
        # Superusers can see everything
        if user.is_superuser:
            return Property.objects.select_related("owner").annotate(
                total_rooms=Count("rooms"),
                vacant_rooms=Count("rooms", filter=Q(rooms__status="vacant")),
                occupied_rooms=Count("rooms", filter=Q(rooms__status="occupied")),
                maintenance_rooms=Count("rooms", filter=Q(rooms__status="maintenance")),
            ).order_by("-created_at")

        # Tenants cannot see properties
        if user.role == "tenant":
            return Property.objects.none()

        # Landlords can only see their own properties
        if user.role == "landlord":
            return Property.objects.filter(owner=user).select_related("owner").annotate(
                total_rooms=Count("rooms"),
                vacant_rooms=Count("rooms", filter=Q(rooms__status="vacant")),
                occupied_rooms=Count("rooms", filter=Q(rooms__status="occupied")),
                maintenance_rooms=Count("rooms", filter=Q(rooms__status="maintenance")),
            ).order_by("-created_at")

        return Property.objects.none()

    def get_serializer_class(self):
        if self.action == "list":
            return PropertyListSerializer
        return PropertySerializer

    def perform_create(self, serializer):
        """Automatically set owner to current user when creating property"""
        serializer.save(owner=self.request.user)


class RoomViewSet(viewsets.ModelViewSet):
    """
    Room ViewSet with optimized queries and user-based filtering.
    
    Supports filtering:
    - ?building=<property_id>
    - ?status=vacant,occupied
    - ?search=<room_number>
    
    Automatic filtering by user role:
    - Tenants: Only see rooms in their active tenancies
    - Landlords: Only see rooms in their properties (building__owner=user)
    """
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "building": ["exact"],
        "status": ["exact", "in"],
        "floor": ["exact", "gte", "lte"],
    }
    search_fields = ["room_number", "building__name"]
    ordering_fields = ["created_at", "room_number", "floor", "base_rent"]

    def get_queryset(self):
        """
        Filter queryset based on user role for security.
        - Tenants: Only rooms in their active tenancies
        - Landlords: Only rooms in their properties
        - Superusers: All rooms
        """
        user = self.request.user
        queryset = Room.objects.select_related("building__owner").order_by("building", "floor", "room_number")

        # Superusers can see everything
        if user.is_superuser:
            return queryset

        # Tenants can only see rooms in their active tenancies
        if user.role == "tenant":
            # Use join instead of subquery for better performance
            return queryset.filter(
                tenancies__tenant=user,
                tenancies__status="active"
            ).distinct()

        # Landlords can only see rooms in their properties
        if user.role == "landlord":
            return queryset.filter(building__owner=user)

        # Default: return empty queryset for unknown roles
        return queryset.none()
