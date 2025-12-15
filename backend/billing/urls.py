from rest_framework import routers

from .views import InvoiceLineViewSet, InvoiceViewSet

router = routers.DefaultRouter()
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'invoice-lines', InvoiceLineViewSet, basename='invoice-line')

urlpatterns = router.urls

