from rest_framework import permissions


class IsLandlord(permissions.BasePermission):
    """
    Permission check for landlord role.
    Only landlords can access web portal and manage properties.
    """
    message = "Chỉ chủ trọ mới có quyền truy cập."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "landlord"
        )


class IsTenant(permissions.BasePermission):
    """
    Permission check for tenant role.
    Tenants can only view their own data.
    """
    message = "Chỉ người thuê mới có quyền truy cập."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "tenant"
        )


class IsLandlordOrReadOnly(permissions.BasePermission):
    """
    Landlords can perform any action.
    Others can only read.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "landlord"
        )


class IsOwnerOrLandlord(permissions.BasePermission):
    """
    Object-level permission to only allow owners or landlords to access.
    """
    def has_object_permission(self, request, view, obj):
        # Landlords can access everything
        if request.user.role == "landlord":
            return True
        
        # Check if object has a tenant/user field
        if hasattr(obj, "tenant"):
            return obj.tenant == request.user
        if hasattr(obj, "requester"):
            return obj.requester == request.user
        if hasattr(obj, "user"):
            return obj.user == request.user
        
        return False


class CanAccessWebPortal(permissions.BasePermission):
    """
    Only landlords can access the web portal.
    Returns role info in error for frontend to handle.
    """
    message = {
        "error": "web_access_denied",
        "detail": "Người thuê không thể truy cập website. Vui lòng sử dụng ứng dụng di động.",
    }

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.can_access_web()

