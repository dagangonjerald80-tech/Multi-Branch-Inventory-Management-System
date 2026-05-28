import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inventory_backend.settings")
django.setup()

from django.core.mail import send_mail
from django.conf import settings

print("EMAIL_BACKEND:", settings.EMAIL_BACKEND)
print("EMAIL_HOST:", settings.EMAIL_HOST)
print("EMAIL_PORT:", settings.EMAIL_PORT)
print("EMAIL_HOST_USER:", settings.EMAIL_HOST_USER)
print("EMAIL_HOST_PASSWORD length:", len(settings.EMAIL_HOST_PASSWORD) if settings.EMAIL_HOST_PASSWORD else 0)

try:
    send_mail(
        subject="Django Test Email",
        message="This is a test email sent from Django settings.",
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[settings.EMAIL_HOST_USER],
        fail_silently=False,
    )
    print("Django send_mail completed successfully!")
except Exception as e:
    import traceback
    print("Django send_mail failed:")
    traceback.print_exc()
