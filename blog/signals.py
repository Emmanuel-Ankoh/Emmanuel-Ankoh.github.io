from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .utils import async_send_mail
from django.urls import reverse
from django.conf import settings
from django.template.loader import render_to_string
from .models import Post, Subscriber


@receiver(pre_save, sender=Post)
def _capture_previous_published(sender, instance, **kwargs):
    """Attach previous published state to instance for comparison in post_save."""
    if instance.pk:
        try:
            prev = sender.objects.get(pk=instance.pk)
            instance._previous_published = prev.published
        except sender.DoesNotExist:
            instance._previous_published = False
    else:
        instance._previous_published = False


@receiver(post_save, sender=Post)
def notify_subscribers_on_publish(sender, instance, created, **kwargs):
    """When a post is newly created or changed from unpublished -> published,
    notify active subscribers via email.
    """
    was_published = getattr(instance, '_previous_published', False)
    now_published = bool(instance.published)
    # Only notify when published now and previously not published OR newly created and published
    if now_published and (created or not was_published):
        # Compose simple plaintext email for subscribers
        subject = f"New post: {instance.title}"
        post_url = ''
        try:
            # Try to build full URL if SITE host is available in settings
            host = settings.ALLOWED_HOSTS[0] if settings.ALLOWED_HOSTS else ''
            scheme = 'https' if not settings.DEBUG else 'http'
            post_url = f"{scheme}://{host}{instance.get_absolute_url()}"
        except Exception:
            post_url = instance.get_absolute_url()
        # Send individualized emails so we can include an unsubscribe link per recipient
        subs_qs = Subscriber.objects.filter(active=True).values_list('id', flat=True)
        subs = list(subs_qs)
        if not subs:
            return
        # If Celery is enabled, dispatch batches of subscriber ids to the worker
        try:
            from django.conf import settings as _settings
            use_celery = getattr(_settings, 'USE_CELERY', False)
            batch_size = int(getattr(_settings, 'POST_NOTIFICATION_BATCH_SIZE', 50))
        except Exception:
            use_celery = False
            batch_size = 50

        if use_celery:
            try:
                from .tasks import send_notifications_task
                # Chunk subscriber ids and schedule tasks
                for i in range(0, len(subs), batch_size):
                    chunk = subs[i:i+batch_size]
                    try:
                        send_notifications_task.delay(instance.pk, list(chunk))
                    except Exception:
                        # If scheduling fails, fall back to immediate send for this chunk
                        from django.apps import apps as _apps
                        SubscriberModel = _apps.get_model('blog', 'Subscriber')
                        for sid in chunk:
                            try:
                                s = SubscriberModel.objects.get(pk=sid, active=True)
                                unsubscribe_path = reverse('blog:unsubscribe', args=[s.token])
                                host = _settings.ALLOWED_HOSTS[0] if _settings.ALLOWED_HOSTS else ''
                                scheme = 'https' if not _settings.DEBUG else 'http'
                                unsubscribe_url = f"{scheme}://{host}{unsubscribe_path}" if host else unsubscribe_path
                                excerpt = (instance.content[:300] + '...') if instance.content else ''
                                text_body = render_to_string('emails/post_notification.txt', {'title': instance.title, 'excerpt': excerpt, 'url': post_url, 'unsubscribe_url': unsubscribe_url})
                                html_body = render_to_string('emails/post_notification.html', {'title': instance.title, 'excerpt': excerpt, 'url': post_url, 'unsubscribe_url': unsubscribe_url})
                                async_send_mail(subject, text_body, _settings.DEFAULT_FROM_EMAIL, [s.email], fail_silently=True, html_message=html_body)
                            except Exception:
                                continue
            except Exception:
                # If importing task failed, fall back to local send below
                use_celery = False

        if not use_celery:
            # Local threaded sending per recipient (safe for small lists)
            from django.apps import apps as _apps
            SubscriberModel = _apps.get_model('blog', 'Subscriber')
            for sid in subs:
                try:
                    s = SubscriberModel.objects.get(pk=sid, active=True)
                    unsubscribe_path = reverse('blog:unsubscribe', args=[s.token])
                    host = settings.ALLOWED_HOSTS[0] if settings.ALLOWED_HOSTS else ''
                    scheme = 'https' if not settings.DEBUG else 'http'
                    unsubscribe_url = f"{scheme}://{host}{unsubscribe_path}" if host else unsubscribe_path
                    excerpt = (instance.content[:300] + '...') if instance.content else ''
                    try:
                        text_body = render_to_string('emails/post_notification.txt', {'title': instance.title, 'excerpt': excerpt, 'url': post_url, 'unsubscribe_url': unsubscribe_url})
                        html_body = render_to_string('emails/post_notification.html', {'title': instance.title, 'excerpt': excerpt, 'url': post_url, 'unsubscribe_url': unsubscribe_url})
                    except Exception:
                        text_body = f"{instance.title}\n\n{excerpt}\n\nRead more: {post_url}\n\nTo unsubscribe: {unsubscribe_url}"
                        html_body = None
                    async_send_mail(subject, text_body, settings.DEFAULT_FROM_EMAIL, [s.email], fail_silently=True, html_message=html_body)
                except Exception:
                    continue
