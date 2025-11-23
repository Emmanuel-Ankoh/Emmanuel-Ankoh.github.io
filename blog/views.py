from django.shortcuts import render, get_object_or_404, redirect
from django.core.paginator import Paginator
from django.db.models import Q
from .models import Post, Subscriber
from django.utils.text import slugify
from django.views.decorators.cache import cache_page
from django.conf import settings
from .utils import async_send_mail
from django.urls import reverse


@cache_page(60 * 10)
def post_list(request):
    q = request.GET.get('q', '').strip()
    posts_qs = Post.objects.filter(published=True)
    if q:
        posts_qs = posts_qs.filter(
            Q(title__icontains=q) |
            Q(content__icontains=q) |
            Q(author__icontains=q) |
            Q(tags__icontains=q) |
            Q(category__icontains=q)
        )
    paginator = Paginator(posts_qs, 6)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    return render(request, 'blog/post_list.html', {'page_obj': page_obj, 'q': q, 'posts': page_obj.object_list})


def post_detail(request, slug):
    post = get_object_or_404(Post, slug=slug, published=True)
    # Rough reading time: 200 wpm
    words = len(post.content.split()) if post.content else 0
    reading_time = max(1, round(words / 200))
    # Prev/next posts
    newer = Post.objects.filter(published=True, created_at__gt=post.created_at).order_by('created_at').first()
    older = Post.objects.filter(published=True, created_at__lt=post.created_at).order_by('-created_at').first()
    return render(request, 'blog/post_detail.html', {'post': post, 'reading_time': reading_time, 'newer': newer, 'older': older})


def subscribe(request):
    """Collect email and send a confirmation link (double opt-in).

    The view accepts POST with `email`. If the email is new or inactive, a
    confirmation email is sent containing a token link. No immediate activation
    occurs until the user follows the link.
    """
    message = ''
    if request.method == 'POST':
        email = request.POST.get('email', '').strip().lower()
        if email:
            subscriber, created = Subscriber.objects.get_or_create(email=email)
            if subscriber.active:
                # Already active
                return render(request, 'blog/subscribe_success.html', {'email': subscriber.email})
            # Ensure token exists
            if not getattr(subscriber, 'token', None):
                import uuid as _uuid
                subscriber.token = _uuid.uuid4()
            subscriber.active = False
            subscriber.save()
            # Send confirmation email with token link
            try:
                confirm_url = request.build_absolute_uri(reverse('blog:subscribe_confirm', kwargs={'token': str(subscriber.token)}))
                ctx = {'confirm_url': confirm_url}
                from django.template.loader import render_to_string
                text_body = render_to_string('emails/subscribe_confirm.txt', ctx)
                html_body = render_to_string('emails/subscribe_confirm.html', ctx)
            except Exception:
                text_body = f"Please confirm your subscription: {request.build_absolute_uri(reverse('blog:subscribe_confirm', kwargs={'token': str(subscriber.token)}))}"
                html_body = None
            try:
                async_send_mail('Confirm your subscription', text_body, settings.DEFAULT_FROM_EMAIL, [subscriber.email], fail_silently=True, html_message=html_body)
            except Exception:
                pass
            return render(request, 'blog/subscribe_success.html', {'email': subscriber.email})
        else:
            message = 'Please provide a valid email address.'
    return render(request, 'blog/subscribe.html', {'message': message})


def subscribe_confirm(request, token):
    try:
        sub = Subscriber.objects.get(token=token)
    except Subscriber.DoesNotExist:
        return render(request, 'blog/unsubscribe_invalid.html')
    # Activate and rotate token
    sub.active = True
    try:
        import uuid as _uuid
        sub.token = _uuid.uuid4()
    except Exception:
        pass
    sub.save()
    return render(request, 'blog/subscribe_confirmed.html', {'email': sub.email})


def manage_subscription(request):
    """Allow users to request a management link for their subscription by email.

    POST with `email` will (if a subscriber exists) send a one-time token link to
    manage the subscription (view status and unsubscribe). This avoids exposing
    subscriber lists and does not require authentication.
    """
    message = ''
    if request.method == 'POST':
        email = request.POST.get('email', '').strip().lower()
        if email:
            sub = Subscriber.objects.filter(email=email).first()
            if not sub:
                message = 'No subscription found for that email address.'
                return render(request, 'blog/manage_request.html', {'message': message})
            # Ensure token exists
            if not getattr(sub, 'token', None):
                import uuid as _uuid
                sub.token = _uuid.uuid4()
                sub.save()
            try:
                manage_url = request.build_absolute_uri(reverse('blog:manage_subscription_token', kwargs={'token': sub.token}))
                from django.template.loader import render_to_string
                text_body = render_to_string('emails/manage_subscription.txt', {'manage_url': manage_url})
                html_body = render_to_string('emails/manage_subscription.html', {'manage_url': manage_url})
            except Exception:
                text_body = f'Manage your subscription: {manage_url}'
                html_body = None
            try:
                async_send_mail('Manage your subscription', text_body, settings.DEFAULT_FROM_EMAIL, [sub.email], fail_silently=True, html_message=html_body)
            except Exception:
                pass
            return render(request, 'blog/manage_sent.html', {'email': sub.email})
        else:
            message = 'Please provide a valid email address.'
    return render(request, 'blog/manage_request.html', {'message': message})


def manage_subscription_token(request, token):
    """Show subscription status for a token and allow unsubscribe.

    GET shows status, POST unsubscribes the subscriber.
    """
    try:
        sub = Subscriber.objects.get(token=token)
    except Subscriber.DoesNotExist:
        return render(request, 'blog/unsubscribe_invalid.html')
    if request.method == 'POST':
        sub.active = False
        sub.save()
        return render(request, 'blog/unsubscribe_success.html', {'email': sub.email})
    return render(request, 'blog/manage_dashboard.html', {'subscriber': sub})


def unsubscribe(request, token):
    try:
        sub = Subscriber.objects.get(token=token)
    except Subscriber.DoesNotExist:
        return render(request, 'blog/unsubscribe_invalid.html')
    if request.method == 'POST':
        sub.active = False
        sub.save()
        return render(request, 'blog/unsubscribe_success.html', {'email': sub.email})
    return render(request, 'blog/unsubscribe_confirm.html', {'email': sub.email, 'token': sub.token})


@cache_page(60 * 10)
def post_list_by_category(request, category):
    """Pretty URL filter by category slug, reusing the same template."""
    posts_qs = Post.objects.filter(published=True)
    cat_slug = (category or '').strip().lower()
    # Filter in Python to match slugified category values reliably
    filtered = [p for p in posts_qs if p.category and slugify(p.category) == cat_slug]
    paginator = Paginator(filtered, 6)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    ctx = {
        'page_obj': page_obj,
        'q': '',
        'posts': page_obj.object_list,
        'active_category': category,
        'base_path': request.path,
    }
    return render(request, 'blog/post_list.html', ctx)


@cache_page(60 * 10)
def post_list_by_tag(request, tag):
    """Pretty URL filter by tag slug, reusing the same template."""
    posts_qs = Post.objects.filter(published=True)
    tag_slug = (tag or '').strip().lower()
    filtered = []
    for p in posts_qs:
        tags = getattr(p, 'tag_list', []) or []
        if any(slugify(t) == tag_slug for t in tags):
            filtered.append(p)
    paginator = Paginator(filtered, 6)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    ctx = {
        'page_obj': page_obj,
        'q': '',
        'posts': page_obj.object_list,
        'active_tag': tag,
        'base_path': request.path,
    }
    return render(request, 'blog/post_list.html', ctx)
