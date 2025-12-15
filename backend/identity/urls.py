from django.urls import path
from rest_framework import routers
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterViewSet,
    UserViewSet,
    LandlordRegisterView,
    CustomTokenObtainPairView,
    WebTokenObtainPairView,
    GoogleWebAuthView,
    BanksListView,
    QRCodeGenerateView,
)

router = routers.DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'auth/register', RegisterViewSet, basename='register')

urlpatterns = [
    # Token endpoints
    path('auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Web portal login (both landlords and tenants)
    path('auth/web/token/', WebTokenObtainPairView.as_view(), name='web_token_obtain_pair'),
    # Google OAuth for web
    path('auth/google/web/', GoogleWebAuthView.as_view(), name='google_web_auth'),
    
    # Landlord registration (kept for backward compatibility)
    path('auth/register/landlord/', LandlordRegisterView.as_view(), name='landlord_register'),
    
    # Get current user
    path('auth/me/', UserViewSet.as_view({'get': 'me', 'patch': 'update_profile'}), name='user_me'),
    
    # Banks and QR code endpoints
    path('banks/', BanksListView.as_view(), name='banks_list'),
    path('qr-code/', QRCodeGenerateView.as_view(), name='qr_code_generate'),
]

urlpatterns += router.urls

