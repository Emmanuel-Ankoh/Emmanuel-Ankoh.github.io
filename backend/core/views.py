from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.conf import settings
from django.core.mail import send_mail
from .models import (
    SiteSettings, SocialLink, Project, ProjectImage, ProjectCategory,
    ResumeEntry, Skill, Service, Testimonial, BlogPost
)
from django.views.decorators.csrf import csrf_exempt
import json


def index(request):
    settings = SiteSettings.objects.first()
    projects = Project.objects.prefetch_related('images').all()
    resume = ResumeEntry.objects.all()
    skills = Skill.objects.all()
    services = Service.objects.all()
    testimonials = Testimonial.objects.all()
    social_links = SocialLink.objects.all()
    posts = BlogPost.objects.filter(published=True)[:5]
    return render(request, 'index.html', {
        'settings': settings,
        'projects': projects,
        'resume': resume,
        'skills': skills,
        'services': services,
        'testimonials': testimonials,
        'social_links': social_links,
        'posts': posts,
    })


def blog_detail(request, slug):
    post = get_object_or_404(BlogPost, slug=slug, published=True)
    return render(request, 'blog_detail.html', {'post': post})


@csrf_exempt
def api_contact(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode())
            name = data.get('name')
            email = data.get('email')
            message = data.get('message')
            from .models import ContactMessage
            ContactMessage.objects.create(name=name, email=email, message=message)
            # send notification email to site owner if configured
            recipient = getattr(settings, 'DEFAULT_CONTACT_RECIPIENT', None)
            if recipient:
                subject = f'Website contact from {name}'
                body = f'Name: {name}\nEmail: {email}\n\nMessage:\n{message}'
                try:
                    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [recipient])
                except Exception:
                    # swallow email errors but keep saved message
                    pass
            return JsonResponse({'ok': True})
        except Exception as e:
            return JsonResponse({'ok': False, 'error': str(e)}, status=400)
    return JsonResponse({'ok': False, 'error': 'POST only'}, status=405)
