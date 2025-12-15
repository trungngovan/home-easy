from rest_framework import routers

from .views import MaintenanceAttachmentViewSet, MaintenanceRequestViewSet

router = routers.DefaultRouter()
router.register(r'maintenance/requests', MaintenanceRequestViewSet, basename='maintenance-request')
router.register(r'maintenance/attachments', MaintenanceAttachmentViewSet, basename='maintenance-attachment')

urlpatterns = router.urls

