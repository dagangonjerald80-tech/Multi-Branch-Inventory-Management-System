import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventory_backend.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import Profile

def reset_or_create_admin(username, email, password):
    try:
        user = User.objects.get(username=username)
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        print(f"SUCCESS: Reset password for {username}")
    except User.DoesNotExist:
        user = User.objects.create_superuser(username, email, password)
        print(f"SUCCESS: Created superuser {username}")
    
    # Ensure profile exists, role is ADMIN, and email is verified
    profile, _ = Profile.objects.get_or_create(user=user)
    profile.role = 'ADMIN'
    profile.is_email_verified = True
    profile.save()

if __name__ == '__main__':
    reset_or_create_admin('admin', 'admin@example.com', 'admin12345')
    reset_or_create_admin('jeraldadmin', 'dagangonjerald80@gmail.com', 'admin12345')
    print("Admin reset script finished successfully!")
