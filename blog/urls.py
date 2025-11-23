from django.urls import path
from . import views
from .feeds import LatestPostsFeed
from django.views.decorators.cache import cache_page

app_name = 'blog'

urlpatterns = [
    path('', views.post_list, name='post_list'),
    path('subscribe/', views.subscribe, name='subscribe'),
    path('subscribe/confirm/<uuid:token>/', views.subscribe_confirm, name='subscribe_confirm'),
    path('unsubscribe/<uuid:token>/', views.unsubscribe, name='unsubscribe'),
    path('subscribe/manage/', views.manage_subscription, name='manage_subscription'),
    path('subscribe/manage/<uuid:token>/', views.manage_subscription_token, name='manage_subscription_token'),
    path('category/<slug:category>/', views.post_list_by_category, name='post_list_by_category'),
    path('tag/<slug:tag>/', views.post_list_by_tag, name='post_list_by_tag'),
    path('rss.xml', cache_page(60 * 60 * 24)(LatestPostsFeed()), name='post_feed'),
    path('<slug:slug>/', views.post_detail, name='post_detail'),
]
