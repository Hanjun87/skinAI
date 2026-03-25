from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "初始化默认管理员账号"

    def handle(self, *args, **options):
        username = getattr(settings, "DEFAULT_ADMIN_USERNAME", "admin")
        password = getattr(settings, "DEFAULT_ADMIN_PASSWORD", "admin")
        email = getattr(settings, "DEFAULT_ADMIN_EMAIL", "admin@skinai.local")
        user_model = get_user_model()

        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        action = "创建" if created else "更新"
        self.stdout.write(self.style.SUCCESS(f"{action}默认管理员账号完成：{username}"))
