from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    can_access_web = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "phone",
            "full_name",
            "avatar",
            "role",
            "is_active",
            "can_access_web",
            "bank_account_number",
            "bank_code",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_active", "can_access_web", "created_at", "updated_at"]

    def get_can_access_web(self, obj):
        return obj.can_access_web()
    
    def validate(self, attrs):
        """Validate that bank info can only be set by landlords"""
        bank_account_number = attrs.get('bank_account_number')
        bank_code = attrs.get('bank_code')
        
        # If trying to set bank info, check if user is landlord
        if bank_account_number or bank_code:
            user = self.instance if self.instance else None
            if user and user.role != 'landlord':
                raise serializers.ValidationError({
                    "bank_account_number": "Chỉ chủ trọ mới có thể cấu hình thông tin ngân hàng"
                })
        
        # Validate account number format (6-19 digits)
        if bank_account_number:
            if not bank_account_number.isdigit():
                raise serializers.ValidationError({
                    "bank_account_number": "Số tài khoản chỉ được chứa số"
                })
            if len(bank_account_number) < 6 or len(bank_account_number) > 19:
                raise serializers.ValidationError({
                    "bank_account_number": "Số tài khoản phải có từ 6 đến 19 ký tự"
                })
        
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "email", "phone", "password", "full_name", "role"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        role = validated_data.get("role")
        
        # Require role to be provided
        if not role or role not in ["landlord", "tenant"]:
            raise serializers.ValidationError({
                "role": "Role phải là 'landlord' hoặc 'tenant'"
            })
        
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LandlordRegisterSerializer(serializers.ModelSerializer):
    """Serializer for landlord registration"""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "email", "phone", "password", "full_name"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data["role"] = "landlord"
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that includes user info in response.
    Also checks web access for web login requests.
    """
    default_error_messages = {
        "no_active_account": "Tài khoản không hoạt động hoặc thông tin đăng nhập sai",
    }
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add user info to response
        user = self.user
        data["user"] = {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "avatar": user.avatar,
            "role": user.role,
            "can_access_web": user.can_access_web(),
        }
        
        return data


class WebLoginSerializer(CustomTokenObtainPairSerializer):
    """
    Login serializer for web portal.
    Both landlords and tenants can access web.
    """
    
    def validate(self, attrs):
        data = super().validate(attrs)
        # Both roles can access web, no additional validation needed
        return data

