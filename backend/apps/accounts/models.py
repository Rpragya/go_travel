import secrets
from datetime import timedelta

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("Email is required")
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("is_verified", True)
        return self._create_user(email, password, **extra)


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True)
    is_verified = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email


class EmailOTP(models.Model):
    VALID_FOR = timedelta(minutes=10)

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otps")
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    @classmethod
    def issue(cls, user):
        cls.objects.filter(user=user, used=False).update(used=True)
        return cls.objects.create(user=user, code=f"{secrets.randbelow(10**6):06d}")

    def __str__(self):
        return f"OTP for {self.user}"

    @property
    def is_valid(self):
        return not self.used and timezone.now() - self.created_at < self.VALID_FOR


class Traveller(models.Model):
    GENDERS = [("M", "Male"), ("F", "Female"), ("O", "Other")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="travellers")
    first_name = models.CharField(max_length=60)
    last_name = models.CharField(max_length=60)
    gender = models.CharField(max_length=1, choices=GENDERS)
    date_of_birth = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
