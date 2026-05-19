# Generated manually — verify existing accounts so deployments keep access.

from django.db import migrations


def verify_existing_profiles(apps, schema_editor):
    Profile = apps.get_model('core', 'Profile')
    Profile.objects.all().update(is_email_verified=True)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_product_image_profile_avatar_and_more'),
    ]

    operations = [
        migrations.RunPython(verify_existing_profiles, migrations.RunPython.noop),
    ]
