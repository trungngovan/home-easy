from rest_framework import routers

from .views import PropertyViewSet, RoomViewSet

router = routers.DefaultRouter()
router.register(r'properties', PropertyViewSet, basename='property')
router.register(r'rooms', RoomViewSet, basename='room')

urlpatterns = router.urls

