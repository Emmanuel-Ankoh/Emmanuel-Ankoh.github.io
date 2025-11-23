import threading
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string

_USE_CELERY = getattr(settings, 'USE_CELERY', False)
_celery_send = None
if _USE_CELERY:
    try:
        from .tasks import send_email_task as _celery_send
    except Exception:
        _celery_send = None


def async_send_mail(subject, message, from_email, recipient_list, fail_silently=True, html_message=None):
    """Send email either synchronously or on a background thread depending
    on settings.USE_EMAIL_THREADING. This is a small, safe helper suitable for
    low-volume sites; for larger lists use a real task queue (Celery/RQ).
    """
    # Prefer Celery if configured and available
    if _USE_CELERY and _celery_send is not None:
        try:
            # schedule the celery task; pass html_message as the last arg
            _celery_send.delay(subject, message, from_email, recipient_list, html_message)
            return True
        except Exception:
            # Fall back to threading if Celery fails
            pass

    if getattr(settings, 'USE_EMAIL_THREADING', True):
        def _send():
            try:
                send_mail(subject, message, from_email, recipient_list, fail_silently=fail_silently, html_message=html_message)
            except Exception:
                # Intentionally swallow errors here to avoid crashing signals/views
                pass
        t = threading.Thread(target=_send, daemon=True)
        t.start()
        return True
    else:
        try:
            send_mail(subject, message, from_email, recipient_list, fail_silently=fail_silently)
            return True
        except Exception:
            return False
