"""Migrate local media files to Cloudinary and update model fields.

Run this locally (only when you have the original media files present and
your Cloudinary credentials set in the environment). It will upload files
found under MEDIA_ROOT and replace the FileField.name with the Cloudinary
storage name returned by the upload.

Usage:
  python tools/migrate_media_to_cloudinary.py

Important: review the code and back up your DB before running. This will
modify model file fields in-place.
"""
import os
import sys
# Ensure project root is on sys.path so `import myportfolio` succeeds when running
# this script from the tools/ directory. This mirrors how `python -m` would set
# the module search path when run from the project root.
from pathlib import Path
_SCRIPT_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _SCRIPT_DIR.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myportfolio.settings')
try:
    import django
    django.setup()
except Exception as exc:
    print('Django setup failed:', exc)
    sys.exit(1)


from django.apps import apps
from django.core.files import File
from django.conf import settings

DRY_RUN = '--dry-run' in sys.argv

if not DRY_RUN:
    try:
        from cloudinary_storage.storage import MediaCloudinaryStorage
    except Exception:
        print('cloudinary_storage not installed or import failed. Please install django-cloudinary-storage and try again.')
        sys.exit(1)
    storage = MediaCloudinaryStorage()
else:
    storage = None
MEDIA_ROOT = getattr(settings, 'MEDIA_ROOT', None)
if not MEDIA_ROOT:
    print('MEDIA_ROOT is not set in settings. Aborting.')
    sys.exit(1)

MODELS_AND_FIELDS = [
    ('portfolio', 'Profile', ['avatar']),
    ('portfolio', 'Project', ['image']),
    ('portfolio', 'Testimonial', ['image']),
    ('portfolio', 'GalleryItem', ['image']),
    ('portfolio', 'SiteSettings', ['logo','logo_light','logo_dark','home_avatar','favicon','default_og_image']),
    ('blog', 'Post', ['thumbnail']),
]

def migrate_field(inst, field_name):
    f = getattr(inst, field_name)
    if not f:
        return False, 'empty'
    # Try to get local path
    try:
        path = f.path
    except Exception:
        return False, 'no_local_path'
    if not path or not os.path.exists(path):
        return False, 'missing_file'
    # Open and upload via cloudinary storage
    try:
        if DRY_RUN:
            # Dry-run mode: report what would be uploaded
            return True, f'dry-run: {f.name}'
        with open(path, 'rb') as fh:
            django_file = File(fh)
            # Save using cloudinary storage; use same name to preserve folder structure
            new_name = storage.save(f.name, django_file)
            # Update model field to point to new storage name
            getattr(inst, field_name).name = new_name
            inst.save()
            return True, new_name
    except Exception as e:
        return False, repr(e)

def main():
    # Safety: ensure Cloudinary credentials are set when actually uploading.
    cs = getattr(settings, 'CLOUDINARY_STORAGE', {}) or {}
    if not DRY_RUN:
        if not cs.get('CLOUD_NAME') or not cs.get('API_KEY') or not cs.get('API_SECRET'):
            print('Cloudinary credentials are not set in settings.CLOUDINARY_STORAGE. Aborting.')
            sys.exit(1)
    else:
        print('Running in dry-run mode; no uploads will be performed.')

    for app_label, model_name, fields in MODELS_AND_FIELDS:
        try:
            Model = apps.get_model(app_label, model_name)
        except Exception:
            continue
        qs = Model.objects.all()
        if not qs.exists():
            continue
        print(f"\n=== {app_label}.{model_name} (count={qs.count()}) ===")
        for inst in qs:
            print(f"- {model_name} id={getattr(inst,'id',None)}")
            for f in fields:
                ok, msg = migrate_field(inst, f)
                print(f"    {f}: {ok} -> {msg}")

if __name__ == '__main__':
    main()
