"""Standalone script to test saving a tiny image using Django's default storage.

Run locally with:
  python tools/admin_upload_test.py

It will configure Django, create a 1x1 PNG in memory, and save it via
`default_storage.save()`. It prints the saved path and storage location.
"""
import os
import sys
import base64

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myportfolio.settings')
try:
    import django
    django.setup()
except Exception as e:
    print('Failed to setup Django:', e)
    sys.exit(1)

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage


def run():
    # 1x1 PNG base64
    b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
    data = base64.b64decode(b64)
    name = 'test-admin-upload-1x1.png'
    try:
        path = default_storage.save(name, ContentFile(data))
        print('Saved:', path)
        loc = getattr(default_storage, 'location', None)
        if loc:
            print('Storage location (MEDIA_ROOT):', loc)
        else:
            print('Storage backend:', type(default_storage))
    except Exception as e:
        print('Upload failed:', repr(e))


if __name__ == '__main__':
    run()
