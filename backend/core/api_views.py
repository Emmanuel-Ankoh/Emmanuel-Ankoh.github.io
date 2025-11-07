from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from . import serializers
from .models import (
    SiteSettings, SocialLink, Skill, Service,
    ProjectCategory, Project, ProjectImage,
    ResumeEntry, Testimonial,
    BlogCategory, Tag, BlogPost, ContactMessage,
)


class ReadOnlyOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class SiteSettingsViewSet(viewsets.ModelViewSet):
    queryset = SiteSettings.objects.all()
    serializer_class = serializers.SiteSettingsSerializer
    permission_classes = [ReadOnlyOrAdmin]


class SocialLinkViewSet(viewsets.ModelViewSet):
    queryset = SocialLink.objects.all()
    serializer_class = serializers.SocialLinkSerializer
    permission_classes = [ReadOnlyOrAdmin]


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = serializers.SkillSerializer
    permission_classes = [ReadOnlyOrAdmin]


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = serializers.ServiceSerializer
    permission_classes = [ReadOnlyOrAdmin]


class ProjectCategoryViewSet(viewsets.ModelViewSet):
    queryset = ProjectCategory.objects.all()
    serializer_class = serializers.ProjectCategorySerializer
    permission_classes = [ReadOnlyOrAdmin]


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.prefetch_related('images').all()
    serializer_class = serializers.ProjectSerializer
    permission_classes = [ReadOnlyOrAdmin]


class ProjectImageViewSet(viewsets.ModelViewSet):
    queryset = ProjectImage.objects.all()
    serializer_class = serializers.ProjectImageSerializer
    permission_classes = [ReadOnlyOrAdmin]


class ResumeEntryViewSet(viewsets.ModelViewSet):
    queryset = ResumeEntry.objects.all()
    serializer_class = serializers.ResumeEntrySerializer
    permission_classes = [ReadOnlyOrAdmin]


class TestimonialViewSet(viewsets.ModelViewSet):
    queryset = Testimonial.objects.all()
    serializer_class = serializers.TestimonialSerializer
    permission_classes = [ReadOnlyOrAdmin]


class BlogCategoryViewSet(viewsets.ModelViewSet):
    queryset = BlogCategory.objects.all()
    serializer_class = serializers.BlogCategorySerializer
    permission_classes = [ReadOnlyOrAdmin]


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = serializers.TagSerializer
    permission_classes = [ReadOnlyOrAdmin]


class BlogPostViewSet(viewsets.ModelViewSet):
    queryset = BlogPost.objects.all()
    serializer_class = serializers.BlogPostSerializer
    permission_classes = [ReadOnlyOrAdmin]


class ContactMessageViewSet(viewsets.ModelViewSet):
    queryset = ContactMessage.objects.all()
    serializer_class = serializers.ContactMessageSerializer
    permission_classes = [permissions.IsAdminUser]
