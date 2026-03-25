from django.urls import path

from . import views


urlpatterns = [
    path("dashboard/", views.index, name="index"),
    path("api/health", views.health, name="health"),
    path("api/analyze-skin", views.analyze_skin, name="analyze-skin"),
    path("api/admin/ai/providers", views.providers, name="providers"),
    path("api/admin/ai/config", views.config, name="config"),
    path("api/admin/ai/analyze", views.analyze, name="analyze"),
]
