"""Optional Celery tasks for background email delivery.

This module defines a Celery task `send_email_task` only when Celery is
installed. The rest of the code imports this module optionally and falls
back to threaded delivery when Celery is not available.
"""
try:
    from celery import shared_task
    from django.core.mail import send_mail
    from django.conf import settings

    @shared_task
    def send_email_task(subject, message, from_email, recipient_list, html_message=None):
        try:
            # Use Django's send_mail which supports html_message
            send_mail(subject, message, from_email, recipient_list, html_message=html_message, fail_silently=True)
        except Exception:
            # Avoid raising from background task
            return False
        return True
    @shared_task
    def send_notifications_task(post_id, subscriber_ids):
        """Background task: send personalized notifications for a post to a list of subscriber ids.

        This task loads the Post and Subscriber objects and sends individualized
        emails including unsubscribe links. It is intended to run on a worker.
        """
        try:
            from django.apps import apps
            from django.template.loader import render_to_string
            Post = apps.get_model('blog', 'Post')
            Subscriber = apps.get_model('blog', 'Subscriber')
            post = Post.objects.get(pk=post_id)
        except Exception:
            return False
        # Build post_url safely
        try:
            from django.conf import settings as _settings
            host = _settings.ALLOWED_HOSTS[0] if _settings.ALLOWED_HOSTS else ''
            scheme = 'https' if not _settings.DEBUG else 'http'
            post_url = f"{scheme}://{host}{post.get_absolute_url()}" if host else post.get_absolute_url()
        except Exception:
            post_url = post.get_absolute_url()

        for sid in subscriber_ids:
            try:
                sub = Subscriber.objects.get(pk=sid, active=True)
                unsubscribe_path = f"/blog/unsubscribe/{sub.token}/"
                unsubscribe_url = f"{scheme}://{host}{unsubscribe_path}" if host else unsubscribe_path
                excerpt = (post.content[:300] + '...') if post.content else ''
                try:
                    text_body = render_to_string('emails/post_notification.txt', {
                        'title': post.title,
                        'excerpt': excerpt,
                        'url': post_url,
                        'unsubscribe_url': unsubscribe_url,
                    })
                    html_body = render_to_string('emails/post_notification.html', {
                        'title': post.title,
                        'excerpt': excerpt,
                        'url': post_url,
                        'unsubscribe_url': unsubscribe_url,
                    })
                except Exception:
                    text_body = f"{post.title}\n\n{excerpt}\n\nRead more: {post_url}\n\nTo unsubscribe: {unsubscribe_url}"
                    html_body = None
                try:
                    send_mail(f"New post: {post.title}", text_body, _settings.DEFAULT_FROM_EMAIL, [sub.email], html_message=html_body, fail_silently=True)
                except Exception:
                    continue
            except Exception:
                continue
        return True
except Exception:
    # Celery not installed — define a dummy function for safe importing
    def send_email_task(*args, **kwargs):
        raise RuntimeError('Celery is not available')
