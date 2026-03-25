import uuid

from django.db import models


class AIProviderConfig(models.Model):
    provider = models.CharField(max_length=32, default="external_ai_api")
    external_endpoint = models.URLField(blank=True)
    external_api_key = models.CharField(max_length=512, blank=True)
    external_model = models.CharField(max_length=128, blank=True)
    external_timeout_ms = models.PositiveIntegerField(default=20000)
    external_system_prompt = models.TextField(blank=True)
    external_user_prompt_template = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "AI配置"
        verbose_name_plural = "AI配置"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.provider} 配置"


class SkinAnalysisRecord(models.Model):
    request_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    provider = models.CharField(max_length=32, default="external_ai_api")
    diagnosis = models.CharField(max_length=255, blank=True)
    probability = models.PositiveSmallIntegerField(null=True, blank=True)
    image_sha256 = models.CharField(max_length=64)
    request_source = models.CharField(max_length=32, default="app")
    remote_addr = models.GenericIPAddressField(blank=True, null=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "识别记录"
        verbose_name_plural = "识别记录"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.request_id} - {self.diagnosis or '处理中'}"
