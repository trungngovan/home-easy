import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def _create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "landlord")
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model with role-based access:
    - landlord: Chủ trọ - can access website, manage properties, view all data
    - tenant: Người thuê - can access website, view own invoices, submit maintenance, view own contract
    """
    ROLE_CHOICES = (
        ("landlord", "Chủ trọ"),
        ("tenant", "Người thuê"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True, unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    avatar = models.URLField(blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="tenant")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    # Bank information for landlords (for QR code payment)
    bank_account_number = models.CharField(max_length=50, blank=True, null=True)
    bank_code = models.CharField(max_length=10, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.full_name or self.email

    @property
    def is_landlord(self):
        return self.role == "landlord"

    @property
    def is_tenant(self):
        return self.role == "tenant"

    def can_access_web(self):
        """Both landlords and tenants can access the web portal"""
        return True
