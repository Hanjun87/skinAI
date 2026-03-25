from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.shortcuts import redirect
from django.urls import include, path


def home_redirect(request):
    if request.user.is_authenticated:
        return redirect("dashboard:index")
    return redirect("login")


urlpatterns = [
    path("", home_redirect, name="home"),
    path("admin/", admin.site.urls),
    path("login/", auth_views.LoginView.as_view(template_name="registration/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("", include(("dashboard.urls", "dashboard"), namespace="dashboard")),
]
