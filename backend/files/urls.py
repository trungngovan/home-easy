from rest_framework import routers

from .views import FileAssetViewSet

router = routers.DefaultRouter()
router.register(r'files', FileAssetViewSet, basename='fileasset')

urlpatterns = router.urls

