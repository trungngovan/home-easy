from rest_framework import routers

from .views import InviteViewSet

router = routers.DefaultRouter()
router.register(r'invites', InviteViewSet, basename='invite')

urlpatterns = router.urls

