from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('blog/<slug:slug>/', views.blog_detail, name='blog_detail'),
    path('api/contact/', views.api_contact, name='api_contact'),
]
