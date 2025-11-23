"""Create a default Profile and SiteSettings if none exist.

This data migration ensures the site has at least one Profile and one
SiteSettings row so templates that expect `PROFILE` or active SiteSettings
don't fail on a fresh database.
"""
from django.db import migrations


def create_defaults(apps, schema_editor):
    Profile = apps.get_model('portfolio', 'Profile')
    SiteSettings = apps.get_model('portfolio', 'SiteSettings')

    # Ensure there's at least one Profile
    profile = None
    if not Profile.objects.exists():
        profile = Profile.objects.create(
            name='Denis Lokwo',
            title='',
            intro='This is a default profile created during migrations.',
            summary='Profile created by migration to ensure templates have data.'
        )
    else:
        profile = Profile.objects.first()

    # Ensure there's at least one SiteSettings row
    if not SiteSettings.objects.exists():
        SiteSettings.objects.create(
            brand_name=(profile.name if profile else 'Portfolio'),
            email='',
            active_profile=(profile if profile else None),
            consent_required=True,
        )


def noop(apps, schema_editor):
    # Don't remove created defaults on reverse - keep migrations idempotent/safe.
    return


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0041_service_slug'),
    ]

    operations = [
        migrations.RunPython(create_defaults, noop),
    ]
