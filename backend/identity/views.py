import requests
import urllib.parse
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    RegisterSerializer,
    LandlordRegisterSerializer,
    UserSerializer,
    CustomTokenObtainPairSerializer,
    WebLoginSerializer,
)
from .permissions import IsLandlord
from .services.google_auth import GoogleAuthError, verify_google_id_token

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users.
    Only landlords and admins can list/manage other users.
    """
    queryset = User.objects.all().order_by("-created_at")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role == "landlord":
            # Landlords can see tenants linked to their properties
            return User.objects.all().order_by("-created_at")
        # Tenants can only see themselves
        return User.objects.filter(id=user.id)

    @action(detail=False, methods=["get"])
    def me(self, request):
        """Get current user profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=["patch"])
    def update_profile(self, request):
        """Update current user profile"""
        serializer = self.get_serializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class RegisterViewSet(viewsets.ModelViewSet):
    """
    Public registration endpoint.
    Default role is 'tenant'.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    http_method_names = ["post"]
    permission_classes = [permissions.AllowAny]


class LandlordRegisterView(APIView):
    """
    Registration endpoint specifically for landlords.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LandlordRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "message": "Đăng ký thành công! Vui lòng đăng nhập.",
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT login that returns user info.
    """
    serializer_class = CustomTokenObtainPairSerializer


class WebTokenObtainPairView(TokenObtainPairView):
    """
    JWT login for web portal.
    Both landlords and tenants can access web.
    """
    serializer_class = WebLoginSerializer


def _issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }


class GoogleWebAuthView(APIView):
    """
    Google auth endpoint for web portal.
    Handles both new user registration (requires role selection) and existing user login.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        id_token_raw = request.data.get("id_token")
        requested_role = request.data.get("role")  # Optional for existing users, required for new users
        expected_nonce = request.data.get("nonce")

        try:
            payload = verify_google_id_token(id_token_raw)
        except GoogleAuthError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        if expected_nonce:
            token_nonce = payload.get("nonce")
            if not token_nonce or token_nonce != expected_nonce:
                return Response(
                    {"detail": "Nonce không khớp, từ chối đăng nhập."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        email = payload.get("email", "").lower()
        full_name = payload.get("name", "") or payload.get("given_name", "")
        avatar = payload.get("picture", "")

        user = User.objects.filter(email=email).first()

        if not user:
            # User doesn't exist - require role selection
            if not requested_role or requested_role not in ("tenant", "landlord"):
                return Response(
                    {
                        "error": "role_required",
                        "detail": "Vui lòng chọn vai trò của bạn",
                        "user_info": {
                            "email": email,
                            "full_name": full_name,
                            "avatar": avatar,
                        },
                        "requires_role_selection": True
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create new user with selected role
            user = User.objects.create_user(
                email=email,
                password=None,  # unusable password - Google sign-in only
                full_name=full_name,
                avatar=avatar,
                role=requested_role,
            )
        else:
            # Existing user - update profile if needed
            updated = False
            if full_name and not user.full_name:
                user.full_name = full_name
                updated = True
            if avatar and user.avatar != avatar:
                user.avatar = avatar
                updated = True
            if not user.is_active:
                user.is_active = True
                updated = True
            if updated:
                user.save()

        data = _issue_tokens(user)
        return Response(data, status=status.HTTP_200_OK)


class BanksListView(APIView):
    """
    Get list of banks from VietQR API.
    Public endpoint, no authentication required.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Cache for 1 hour
        cache_key = 'vietqr_banks_list'
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)
        
        try:
            response = requests.get('https://api.vietqr.io/v2/banks', timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Cache the response for 1 hour (3600 seconds)
            cache.set(cache_key, data, 3600)
            
            return Response(data, status=status.HTTP_200_OK)
        except requests.RequestException as e:
            return Response(
                {"error": "Không thể lấy danh sách ngân hàng", "detail": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class QRCodeGenerateView(APIView):
    """
    Generate QR code URL for payment using VietQR Quick Link.
    Requires authentication.
    - If invoice_id is provided: Gets landlord from invoice (works for both landlords and tenants)
    - Otherwise: Uses current user (must be landlord)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        invoice_id = request.query_params.get('invoice_id')
        
        # If invoice_id is provided, get landlord from invoice
        if invoice_id:
            try:
                from billing.models import Invoice
                invoice = Invoice.objects.select_related(
                    'tenancy__room__building__owner'
                ).get(id=invoice_id)
                
                # Check if user has access to this invoice
                if user.role == 'tenant':
                    if invoice.tenancy.tenant != user:
                        return Response(
                            {"error": "Bạn không có quyền truy cập hóa đơn này"},
                            status=status.HTTP_403_FORBIDDEN
                        )
                elif user.role == 'landlord':
                    if invoice.tenancy.room.building.owner != user:
                        return Response(
                            {"error": "Bạn không có quyền truy cập hóa đơn này"},
                            status=status.HTTP_403_FORBIDDEN
                        )
                
                # Get landlord from invoice
                landlord = invoice.tenancy.room.building.owner
                if not landlord.bank_account_number or not landlord.bank_code:
                    return Response(
                        {"error": "Chủ trọ chưa cấu hình thông tin ngân hàng"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                user = landlord  # Use landlord's bank info
            except Invoice.DoesNotExist:
                return Response(
                    {"error": "Không tìm thấy hóa đơn"},
                    status=status.HTTP_404_NOT_FOUND
                )
            except Exception as e:
                return Response(
                    {"error": "Lỗi khi lấy thông tin hóa đơn", "detail": str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # No invoice_id - must be landlord
            if user.role != 'landlord':
                return Response(
                    {"error": "Chỉ chủ trọ mới có thể tạo mã QR thanh toán"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if user has bank info configured
            if not user.bank_account_number or not user.bank_code:
                return Response(
                    {"error": "Chủ trọ chưa cấu hình thông tin ngân hàng"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get query parameters
        amount = request.query_params.get('amount')
        add_info = request.query_params.get('addInfo', '')
        
        # Validate and format amount
        if amount:
            try:
                amount_float = float(amount)
                if amount_float < 0:
                    return Response(
                        {"error": "Số tiền không hợp lệ"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Format amount as integer (remove decimals for VietQR)
                amount_str = str(int(amount_float))
            except (ValueError, TypeError):
                return Response(
                    {"error": "Số tiền không hợp lệ"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            amount_str = None
        
        # Format addInfo: remove accents, max 25 chars, no special chars
        if add_info:
            # Remove Vietnamese accents and special characters
            add_info_clean = add_info.encode('ascii', 'ignore').decode('ascii')
            add_info_clean = ''.join(c for c in add_info_clean if c.isalnum() or c.isspace())
            add_info_clean = add_info_clean[:25].strip()
        else:
            add_info_clean = ''
        
        # Build VietQR Quick Link URL
        # Format: https://img.vietqr.io/image/{bankCode}-{accountNo}-compact.jpg?amount={amount}&addInfo={content}
        bank_code = user.bank_code.upper()
        account_no = user.bank_account_number
        
        # Build query parameters
        query_params = {}
        if amount_str:
            query_params['amount'] = amount_str
        if add_info_clean:
            query_params['addInfo'] = add_info_clean
        
        query_string = urllib.parse.urlencode(query_params)
        qr_url = f"https://img.vietqr.io/image/{bank_code}-{account_no}-compact.jpg"
        if query_string:
            qr_url += f"?{query_string}"
        
        # Get bank name from cache or API
        bank_name = bank_code  # Default to code
        try:
            cache_key = 'vietqr_banks_list'
            banks_data = cache.get(cache_key)
            if not banks_data:
                response = requests.get('https://api.vietqr.io/v2/banks', timeout=5)
                if response.status_code == 200:
                    banks_data = response.json()
                    cache.set(cache_key, banks_data, 3600)
            
            if banks_data and 'data' in banks_data:
                for bank in banks_data['data']:
                    if bank.get('code', '').upper() == bank_code or bank.get('bin', '') == bank_code:
                        bank_name = bank.get('name', bank_code)
                        break
        except Exception:
            pass  # Use default bank_code if lookup fails
        
        return Response({
            "qrUrl": qr_url,
            "bankName": bank_name,
            "accountNumber": account_no,
            "bankCode": bank_code,
        }, status=status.HTTP_200_OK)
