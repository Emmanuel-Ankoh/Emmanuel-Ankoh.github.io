from django.db import models
import uuid
from django.utils import timezone
from django.urls import reverse
import uuid

class Post(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, null=True)
    author = models.CharField(max_length=100)
    content = models.TextField()
    category = models.CharField(max_length=100, blank=True, help_text="Optional category e.g. Engineering, Tutorial")
    tags = models.TextField(blank=True, help_text="Comma-separated tags, e.g. django, performance, testing")
    thumbnail = models.ImageField(upload_to='blog/', blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    published = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse('blog:post_detail', args=[self.slug])

    @property
    def tag_list(self):
        if not self.tags:
            return []
        return [t.strip() for t in self.tags.split(',') if t.strip()]


class Subscriber(models.Model):
    """A simple email subscriber for blog updates.

    We store a token so users can unsubscribe without authentication.
    """
    email = models.EmailField(unique=True)
    active = models.BooleanField(default=True)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} ({'active' if self.active else 'unsubscribed'})"
