from rest_framework import routers

from .views import TenancyViewSet

router = routers.DefaultRouter()
router.register(r'tenancies', TenancyViewSet, basename='tenancy')

urlpatterns = router.urls

