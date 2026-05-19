# PostgreSQL may still have a legacy NOT NULL "email_verified" column alongside
# Django's "is_email_verified", which breaks inserts. Drop the legacy column if present.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_verify_existing_profiles'),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE core_profile DROP COLUMN IF EXISTS email_verified;',
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
