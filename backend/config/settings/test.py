from .base import *  # noqa: F401,F403
from .base import MIDDLEWARE

SECRET_KEY = "test-secret-key-that-is-long-enough-for-hs256"
MIDDLEWARE = [m for m in MIDDLEWARE if "whitenoise" not in m]

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
CELERY_TASK_ALWAYS_EAGER = True
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
RAZORPAY_KEY_ID = ""
RAZORPAY_KEY_SECRET = ""
RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret"
REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_CLASSES": []}  # noqa: F405
