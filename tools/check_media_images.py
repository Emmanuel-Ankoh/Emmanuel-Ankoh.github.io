"""Scan common image fields in the project and report file sizes and dimensions.

Run locally with:
  python tools/check_media_images.py

This helps determine whether uploaded images are tiny on disk (1x1) or if
they're present but not rendered correctly in templates.
"""
import os
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myportfolio.settings')
try:
    import django
    django.setup()
except Exception as e:
    print('Django setup failed:', e)
    sys.exit(1)

from django.apps import apps
from PIL import Image

MODELS_AND_FIELDS = [
    ('portfolio', 'Profile', ['avatar']),
    ('portfolio', 'Project', ['image']),
    ('portfolio', 'Testimonial', ['image']),
    ('portfolio', 'GalleryItem', ['image']),
    ('portfolio', 'SiteSettings', ['logo','logo_light','logo_dark','home_avatar','favicon','default_og_image']),
    ('blog', 'Post', ['thumbnail']),
]

def check_field(inst, field_name):
    f = getattr(inst, field_name, None)
    if not f:
        return None
    try:
        path = f.path
    except Exception:
        # Storage backend may not expose path (S3 etc.)
        url = getattr(f, 'url', None)
        return {'name': getattr(f, 'name', None), 'url': url, 'path': None, 'size': None, 'width': None, 'height': None}
    if not path or not os.path.exists(path):
        return {'name': getattr(f, 'name', None), 'url': getattr(f, 'url', None), 'path': path, 'size': None, 'width': None, 'height': None}
    try:
        size = os.path.getsize(path)
    except Exception:
        size = None
    width = height = None
    try:
        with Image.open(path) as im:
            width, height = im.size
    except Exception:
        pass
    return {'name': getattr(f, 'name', None), 'url': getattr(f, 'url', None), 'path': path, 'size': size, 'width': width, 'height': height}

def main():
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
                info = check_field(inst, f)
                if not info:
                    print(f"    {f}: <empty>")
                    continue
                print(f"    {f}: name={info['name']}, url={info.get('url')}, path={info.get('path')}")
                print(f"        size={info.get('size')}, width={info.get('width')}, height={info.get('height')}")

if __name__ == '__main__':
    main()
