from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .models import SiteSettings, Project, Experience, Skill, BlogPost
from django.views.decorators.csrf import csrf_exempt
import json


def index(request):
    settings = SiteSettings.objects.first()
    projects = Project.objects.all()
    experiences = Experience.objects.all()
    skills = Skill.objects.all()
    posts = BlogPost.objects.filter(published=True)[:5]
    return render(request, 'index.html', {
        'settings': settings,
        'projects': projects,
        'experiences': experiences,
        'skills': skills,
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
            return JsonResponse({'ok': True})
        except Exception as e:
            return JsonResponse({'ok': False, 'error': str(e)}, status=400)
    return JsonResponse({'ok': False, 'error': 'POST only'}, status=405)
