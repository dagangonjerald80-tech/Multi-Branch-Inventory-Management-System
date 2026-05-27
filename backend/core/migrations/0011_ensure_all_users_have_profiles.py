# Generated manually to fix missing profiles on live databases like Render

from django.db import migrations

def ensure_profiles_exist(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    Profile = apps.get_model('core', 'Profile')
    
    for user in User.objects.all():
        try:
            profile = user.profile
            created = False
        except Exception:
            profile = Profile(user=user)
            created = True
            
        # If the user is a superuser, ensure they are ADMIN and email is verified
        if user.is_superuser:
            profile.role = 'ADMIN'
            profile.is_email_verified = True
        # If the user is staff, ensure they are STAFF and email is verified
        elif user.is_staff:
            if profile.role not in ('ADMIN', 'STAFF'):
                profile.role = 'STAFF'
            profile.is_email_verified = True
        elif created:
            profile.role = 'USER'
            profile.is_email_verified = False
            
        profile.save()

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_alter_profile_bio'),
    ]

    operations = [
        migrations.RunPython(ensure_profiles_exist, migrations.RunPython.noop),
    ]
