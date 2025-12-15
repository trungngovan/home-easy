from rest_framework import routers

from .views import ServicePriceViewSet

router = routers.DefaultRouter()
router.register(r'prices', ServicePriceViewSet, basename='price')

urlpatterns = router.urls

