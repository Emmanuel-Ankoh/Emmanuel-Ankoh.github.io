from django.apps import AppConfig

class BlogConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'blog'
    def ready(self):
        # Import signals to ensure subscription notifications work
        try:
            from . import signals  # noqa: F401
        except Exception:
            # Avoid import-time failure affecting management commands
            pass
