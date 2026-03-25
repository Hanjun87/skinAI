from django.contrib import admin

from .models import AIProviderConfig, SkinAnalysisRecord


@admin.register(AIProviderConfig)
class AIProviderConfigAdmin(admin.ModelAdmin):
    list_display = ("provider", "external_model", "external_endpoint", "updated_at")

    def has_add_permission(self, request):
        if AIProviderConfig.objects.exists():
            return False
        return super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SkinAnalysisRecord)
class SkinAnalysisRecordAdmin(admin.ModelAdmin):
    list_display = ("request_id", "provider", "diagnosis", "probability", "request_source", "success", "created_at")
    list_filter = ("provider", "request_source", "success", "created_at")
    search_fields = ("request_id", "diagnosis", "image_sha256", "error_message")
    readonly_fields = ("request_id", "provider", "diagnosis", "probability", "image_sha256", "request_source", "remote_addr", "success", "error_message", "created_at")

    def has_add_permission(self, request):
        return False
