from django.urls import path, include
from rest_framework import routers
from . import views
from . import api_views

router = routers.DefaultRouter()
router.register(r'settings', api_views.SiteSettingsViewSet)
router.register(r'socials', api_views.SocialLinkViewSet)
router.register(r'skills', api_views.SkillViewSet)
router.register(r'services', api_views.ServiceViewSet)
router.register(r'project-categories', api_views.ProjectCategoryViewSet)
router.register(r'projects', api_views.ProjectViewSet)
router.register(r'project-images', api_views.ProjectImageViewSet)
router.register(r'resume', api_views.ResumeEntryViewSet)
router.register(r'testimonials', api_views.TestimonialViewSet)
router.register(r'blog-categories', api_views.BlogCategoryViewSet)
router.register(r'tags', api_views.TagViewSet)
router.register(r'posts', api_views.BlogPostViewSet)
router.register(r'contact-messages', api_views.ContactMessageViewSet)

urlpatterns = [
    path('', views.index, name='index'),
    path('blog/<slug:slug>/', views.blog_detail, name='blog_detail'),
    path('api/contact/', views.api_contact, name='api_contact'),
    path('api/', include(router.urls)),
]
