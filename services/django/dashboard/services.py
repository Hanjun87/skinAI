import hashlib
import json
import os
import re
import urllib.error
import urllib.request

from django.db import transaction

from .models import AIProviderConfig, SkinAnalysisRecord


PROVIDERS = ["external_ai_api"]

# 识别皮肤问题的默认提示词
DEFAULT_SYSTEM_PROMPT = """你是一位专业的皮肤科医生。请分析用户上传的皮肤照片，并提供以下信息（以JSON格式返回）：
{
  "diagnosis": "皮肤病名称",
  "probability": 85
}"""
DEFAULT_USER_PROMPT = "请分析这张皮肤照片，告诉我这是什么皮肤问题，并给出建议。"

# 记录皮肤状态的默认提示词
DEFAULT_SKIN_RECORD_SYSTEM_PROMPT = """你是一位专业的皮肤科医生。请分析用户上传的皮肤照片，评估照片质量和皮肤状态，并提供以下信息（以JSON格式返回）：
{
  "photo_quality": {
    "clarity": 92,
    "lighting": 88,
    "composition": 95
  },
  "skin_status": {
    "overall": "良好",
    "moisture": "正常",
    "texture": "细腻",
    "issues": ["轻微干燥"]
  },
  "observations": ["肤色均匀", "无明显瑕疵"],
  "suggestions": ["继续保持当前护肤习惯", "注意防晒"]
}

评分标准：
- clarity（清晰度）: 0-100分，评估照片对焦是否清晰、细节是否可见
- lighting（光线）: 0-100分，评估光线是否充足、均匀，无过曝或欠曝
- composition（构图）: 0-100分，评估拍摄角度、皮肤区域占比是否合适

skin_status字段说明：
- overall: 整体状态评价，如"良好"、"一般"、"需关注"
- moisture: 水润度，如"水润"、"正常"、"偏干"、"干燥"
- texture: 肤质，如"细腻"、"光滑"、"粗糙"、"毛孔粗大"
- issues: 发现的问题列表，如["轻微干燥", "少许痘印"]，无问题则填[]

observations: 观察到的皮肤特征列表
suggestions: 护肤建议列表"""

DEFAULT_SKIN_RECORD_USER_PROMPT = "请分析这张皮肤照片，评估照片质量和今日的皮肤状态，给出专业的观察和建议。"


def get_default_config_values():
    return {
        "provider": "external_ai_api",
        "external_endpoint": os.getenv("EXTERNAL_AI_ENDPOINT", "").strip(),
        "external_api_key": os.getenv("EXTERNAL_AI_API_KEY", "").strip(),
        "external_model": os.getenv("EXTERNAL_AI_MODEL", "").strip(),
        "external_timeout_ms": int(os.getenv("EXTERNAL_AI_TIMEOUT_MS", "20000") or "20000"),
        "external_system_prompt": os.getenv("EXTERNAL_AI_SYSTEM_PROMPT", "").strip(),
        "external_user_prompt_template": os.getenv("EXTERNAL_AI_USER_PROMPT_TEMPLATE", "").strip(),
        "external_skin_record_system_prompt": os.getenv("EXTERNAL_SKIN_RECORD_SYSTEM_PROMPT", "").strip(),
        "external_skin_record_user_prompt_template": os.getenv("EXTERNAL_SKIN_RECORD_USER_PROMPT_TEMPLATE", "").strip(),
    }


def get_ai_config():
    defaults = get_default_config_values()
    with transaction.atomic():
        config, _ = AIProviderConfig.objects.select_for_update().get_or_create(pk=1, defaults=defaults)
    return config


def mask_api_key(api_key: str) -> str:
    if not api_key:
        return ""
    if len(api_key) <= 8:
        return "********"
    return f"{api_key[:4]}********{api_key[-4:]}"


def get_public_config():
    config = get_ai_config()
    return {
        "provider": config.provider,
        "external": {
            "endpoint": config.external_endpoint,
            "model": config.external_model,
            "timeoutMs": config.external_timeout_ms,
            "systemPrompt": config.external_system_prompt,
            "userPromptTemplate": config.external_user_prompt_template,
            "skinRecordSystemPrompt": config.external_skin_record_system_prompt,
            "skinRecordUserPromptTemplate": config.external_skin_record_user_prompt_template,
            "apiKeyMasked": mask_api_key(config.external_api_key),
        },
    }


def update_ai_config(payload):
    provider = payload.get("provider", "external_ai_api")
    if provider != "external_ai_api":
        raise ValueError("当前仅支持 external_ai_api")

    external = payload.get("external") or {}
    if not isinstance(external, dict):
        raise ValueError("external 必须是对象")

    config = get_ai_config()
    config.provider = "external_ai_api"

    if "endpoint" in external:
        config.external_endpoint = str(external.get("endpoint") or "").strip()
    if "model" in external:
        config.external_model = str(external.get("model") or "").strip()
    if "apiKey" in external:
        config.external_api_key = str(external.get("apiKey") or "").strip()
    if "timeoutMs" in external:
        timeout_ms = int(external.get("timeoutMs") or 0)
        if timeout_ms < 1000 or timeout_ms > 120000:
            raise ValueError("timeoutMs 范围应在 1000~120000")
        config.external_timeout_ms = timeout_ms
    if "systemPrompt" in external:
        config.external_system_prompt = str(external.get("systemPrompt") or "").strip()
    if "userPromptTemplate" in external:
        config.external_user_prompt_template = str(external.get("userPromptTemplate") or "").strip()
    if "skinRecordSystemPrompt" in external:
        config.external_skin_record_system_prompt = str(external.get("skinRecordSystemPrompt") or "").strip()
    if "skinRecordUserPromptTemplate" in external:
        config.external_skin_record_user_prompt_template = str(external.get("skinRecordUserPromptTemplate") or "").strip()

    config.save()
    return {"ok": True, **get_public_config()}


def normalize_output(data):
    if not isinstance(data, dict):
        raise ValueError("识别结果格式错误")

    raw_diagnosis = data.get("diagnosis") or data.get("disease") or data.get("name") or data.get("title") or data.get("疾病名称") or data.get("诊断")
    diagnosis = str(raw_diagnosis or "").strip()
    raw_probability = data.get("probability", data.get("confidence", data.get("score", data.get("概率", data.get("置信度")))))
    if isinstance(raw_probability, str):
        probability_number = float(raw_probability.replace("%", "").strip() or "85")
    else:
        probability_number = float(raw_probability or 85)
    probability = 85 if probability_number != probability_number else probability_number
    if not diagnosis:
        raise ValueError("识别结果字段不完整")

    return {
        "diagnosis": diagnosis,
        "probability": max(0, min(100, round(probability))),
    }


def normalize_skin_record_output(data):
    """规范化记录皮肤状态的输出"""
    if not isinstance(data, dict):
        raise ValueError("分析结果格式错误")

    photo_quality = data.get("photo_quality", {})
    skin_status = data.get("skin_status", {})

    return {
        "photoQuality": {
            "clarity": max(0, min(100, round(float(photo_quality.get("clarity", 85))))),
            "lighting": max(0, min(100, round(float(photo_quality.get("lighting", 85))))),
            "composition": max(0, min(100, round(float(photo_quality.get("composition", 85))))),
        },
        "skinStatus": {
            "overall": str(skin_status.get("overall", "良好")),
            "moisture": str(skin_status.get("moisture", "正常")),
            "texture": str(skin_status.get("texture", "细腻")),
            "issues": skin_status.get("issues", []) if isinstance(skin_status.get("issues"), list) else [],
        },
        "observations": data.get("observations", []) if isinstance(data.get("observations"), list) else [],
        "suggestions": data.get("suggestions", []) if isinstance(data.get("suggestions"), list) else [],
    }


def parse_ai_content(content):
    if not content:
        raise ValueError("AI 返回结果为空")
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
        if json_match:
            return json.loads(json_match.group(1))
        obj_match = re.search(r"\{[\s\S]*\}", content)
        if obj_match:
            return json.loads(obj_match.group(0))
        raise ValueError("无法解析 AI 返回的结果")


def analyze_by_external_api(image_base64: str, mode: str = "diagnosis"):
    """
    调用外部AI API进行分析
    mode: "diagnosis" - 识别皮肤问题, "record" - 记录皮肤状态
    """
    config = get_ai_config()
    if not config.external_endpoint:
        raise ValueError("外部AI接口未配置")

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if config.external_api_key:
        headers["Authorization"] = f"Bearer {config.external_api_key}"

    # 根据模式选择提示词
    if mode == "record":
        system_prompt = config.external_skin_record_system_prompt or DEFAULT_SKIN_RECORD_SYSTEM_PROMPT
        user_prompt = config.external_skin_record_user_prompt_template or DEFAULT_SKIN_RECORD_USER_PROMPT
    else:
        system_prompt = config.external_system_prompt or DEFAULT_SYSTEM_PROMPT
        user_prompt = config.external_user_prompt_template or DEFAULT_USER_PROMPT

    user_content = user_prompt.replace("{{image}}", "[图片]")
    is_aliyun = "dashscope.aliyuncs.com" in config.external_endpoint

    if is_aliyun:
        image_url = image_base64 if image_base64.startswith("data:") else f"data:image/jpeg;base64,{image_base64}"
        api_url = config.external_endpoint
        payload = {
            "model": config.external_model or "qwen-vl-plus",
            "input": {
                "messages": [
                    {
                        "role": "system",
                        "content": [{"type": "text", "text": system_prompt}],
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "image", "image": image_url},
                            {"type": "text", "text": user_content},
                        ],
                    },
                ]
            },
        }
    else:
        api_url = f"{config.external_endpoint.rstrip('/')}/chat/completions"
        payload = {
            "model": config.external_model or "deepseek-chat",
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_content},
                        {"type": "image_url", "image_url": {"url": image_base64}},
                    ],
                },
            ],
            "max_tokens": 8192,
            "temperature": 0.7,
        }

    request = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=config.external_timeout_ms / 1000) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        error_text = exc.read().decode("utf-8")
        raise RuntimeError(f"外部AI接口调用失败({exc.code}) {error_text[:120]}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"外部AI接口连接失败: {exc.reason}") from exc
    except TimeoutError as exc:
        raise RuntimeError("外部AI接口超时") from exc

    if is_aliyun:
        ali_content = (((result.get("output") or {}).get("choices") or [{}])[0].get("message") or {}).get("content")
        if isinstance(ali_content, list):
            content = next((item.get("text") for item in ali_content if item.get("text")), json.dumps(ali_content, ensure_ascii=False))
        else:
            content = ali_content
    else:
        content = (((result.get("choices") or [{}])[0].get("message") or {}).get("content"))

    parsed_data = parse_ai_content(content)

    # 根据模式返回不同格式的结果
    if mode == "record":
        return normalize_skin_record_output(parsed_data)
    else:
        return normalize_output(parsed_data)


def create_analysis_record(image_base64: str, request_source: str, remote_addr: str | None, success: bool, result=None, error_message: str = ""):
    SkinAnalysisRecord.objects.create(
        provider="external_ai_api",
        diagnosis=(result or {}).get("diagnosis", ""),
        probability=(result or {}).get("probability"),
        image_sha256=hashlib.sha256(image_base64.encode("utf-8")).hexdigest(),
        request_source=request_source,
        remote_addr=remote_addr or None,
        success=success,
        error_message=error_message,
    )


def run_analysis(image_base64: str, request_source: str, remote_addr: str | None, mode: str = "diagnosis"):
    """
    运行皮肤分析
    mode: "diagnosis" - 识别皮肤问题, "record" - 记录皮肤状态
    """
    try:
        result = analyze_by_external_api(image_base64, mode)
        if mode == "diagnosis":
            create_analysis_record(image_base64, request_source, remote_addr, True, result=result)
        return result
    except Exception as exc:
        if mode == "diagnosis":
            create_analysis_record(image_base64, request_source, remote_addr, False, error_message=str(exc))
        raise
