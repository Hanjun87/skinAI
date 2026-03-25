import json
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from .models import AIProviderConfig, SkinAnalysisRecord


class DashboardViewTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="password12345",
        )

    def test_dashboard_requires_login(self):
        response = self.client.get("/dashboard/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login/", response.url)

    def test_dashboard_renders_for_staff(self):
        self.client.force_login(self.user)
        response = self.client.get("/dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Django 管理控制台")

    def test_config_put_persists_to_database(self):
        self.client.force_login(self.user)
        response = self.client.put(
            "/api/admin/ai/config",
            data=json.dumps({
                "provider": "external_ai_api",
                "external": {
                    "endpoint": "https://example.com",
                    "model": "demo-model",
                    "timeoutMs": 5000,
                    "systemPrompt": "system",
                    "userPromptTemplate": "user",
                    "apiKey": "secret-key",
                },
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        config = AIProviderConfig.objects.get(pk=1)
        self.assertEqual(config.external_endpoint, "https://example.com")
        self.assertEqual(config.external_model, "demo-model")
        self.assertEqual(config.external_timeout_ms, 5000)

    @patch("dashboard.services.urllib.request.urlopen")
    def test_public_analyze_creates_record(self, mock_urlopen):
        mock_response = Mock()
        mock_response.read.return_value = json.dumps({
            "choices": [
                {
                    "message": {
                        "content": json.dumps({
                            "diagnosis": "湿疹",
                            "probability": 88,
                        })
                    }
                }
            ]
        }).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        AIProviderConfig.objects.create(
            provider="external_ai_api",
            external_endpoint="https://example.com",
            external_api_key="secret-key",
            external_model="demo-model",
            external_timeout_ms=5000,
        )
        response = self.client.post(
            "/api/analyze-skin",
            data=json.dumps({"imageBase64": "data:image/jpeg;base64,abc"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"diagnosis": "湿疹", "probability": 88})
        self.assertEqual(SkinAnalysisRecord.objects.count(), 1)
        self.assertTrue(SkinAnalysisRecord.objects.first().success)

    def test_bootstrap_admin_resets_default_credentials(self):
        user_model = get_user_model()
        user_model.objects.create_user(username="temp", password="temp")
        call_command("bootstrap_admin")
        admin_user = user_model.objects.get(username="admin")
        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_superuser)
        self.assertTrue(admin_user.check_password("admin"))
