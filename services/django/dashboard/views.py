import json

from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .services import PROVIDERS, get_public_config, run_analysis, update_ai_config


def get_remote_addr(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def parse_json_body(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise ValueError("请求体不是合法 JSON") from exc


@require_GET
def health(request):
    return JsonResponse({"ok": True, "service": "django"})


@csrf_exempt
@require_http_methods(["POST"])
def analyze_skin(request):
    try:
        payload = parse_json_body(request)
        image_base64 = payload.get("imageBase64")
        if not image_base64 or not isinstance(image_base64, str):
            raise ValueError("缺少图片数据")
        result = run_analysis(image_base64, request_source="app", remote_addr=get_remote_addr(request))
        return JsonResponse(result)
    except ValueError as exc:
        return JsonResponse({"message": str(exc)}, status=400)
    except RuntimeError as exc:
        return JsonResponse({"message": str(exc)}, status=502)
    except Exception as exc:
        return JsonResponse({"message": str(exc)}, status=500)


@staff_member_required(login_url="/login/")
def index(request):
    return render(request, "dashboard/index.html")


@staff_member_required(login_url="/login/")
@require_GET
def providers(request):
    return JsonResponse({
        "providers": PROVIDERS,
        "currentProvider": "external_ai_api",
    })


@staff_member_required(login_url="/login/")
@require_http_methods(["GET", "PUT"])
def config(request):
    try:
        if request.method == "GET":
            return JsonResponse(get_public_config())
        payload = parse_json_body(request)
        return JsonResponse(update_ai_config(payload))
    except ValueError as exc:
        return JsonResponse({"message": str(exc)}, status=400)


@staff_member_required(login_url="/login/")
@require_http_methods(["POST"])
def analyze(request):
    try:
        payload = parse_json_body(request)
        image_base64 = payload.get("imageBase64")
        provider = payload.get("provider")
        if provider is not None and provider != "external_ai_api":
            raise ValueError("当前仅支持 external_ai_api")
        if not image_base64 or not isinstance(image_base64, str):
            raise ValueError("缺少图片数据")
        result = run_analysis(image_base64, request_source="admin", remote_addr=get_remote_addr(request))
        return JsonResponse(result)
    except ValueError as exc:
        return JsonResponse({"message": str(exc)}, status=400)
    except RuntimeError as exc:
        return JsonResponse({"message": str(exc)}, status=502)
    except Exception as exc:
        return JsonResponse({"message": str(exc)}, status=500)
