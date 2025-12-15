from rest_framework import routers

from .views import MeterReadingViewSet

router = routers.DefaultRouter()
router.register(r'meter-readings', MeterReadingViewSet, basename='meter-reading')

urlpatterns = router.urls

