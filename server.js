import express from 'express';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const app = express();
const port = Number(process.env.API_PORT || 8787);
const providers = ['local_model', 'external_ai_api'];
const aiConfig = {
    provider: 'local_model',
    external: {
        endpoint: process.env.EXTERNAL_AI_ENDPOINT || '',
        apiKey: process.env.EXTERNAL_AI_API_KEY || '',
        model: process.env.EXTERNAL_AI_MODEL || '',
        timeoutMs: Number(process.env.EXTERNAL_AI_TIMEOUT_MS || 20000)
    }
};

const labelMetadata = {
    akiec: {
        diagnosis: '光化性角化病',
        description: '模型识别为光化性角化病倾向，建议尽快至皮肤科进行面诊与皮镜检查确认。',
        precautions: ['避免暴晒并加强防晒', '不要自行抠抓或刺激病灶', '尽快进行专业皮肤科复查']
    },
    bcc: {
        diagnosis: '基底细胞癌',
        description: '模型识别为基底细胞癌倾向，此结果仅作辅助，请尽快到医院进一步检查。',
        precautions: ['避免延误诊治', '记录病灶变化并及时复诊', '遵循医生建议进行治疗']
    },
    bkl: {
        diagnosis: '良性角化样病变',
        description: '模型识别为良性角化样病变倾向，建议结合临床表现进行复核。',
        precautions: ['注意皮肤清洁与保湿', '避免反复摩擦病灶区域', '若快速变化请及时就医']
    },
    df: {
        diagnosis: '皮肤纤维瘤',
        description: '模型识别为皮肤纤维瘤倾向，通常为良性，但仍建议专业确认。',
        precautions: ['避免抓挠和刺激', '观察大小与颜色变化', '必要时到皮肤科复查']
    },
    mel: {
        diagnosis: '黑色素瘤',
        description: '模型识别为黑色素瘤倾向，存在较高风险，请尽快进行专业诊断。',
        precautions: ['尽快就医进行进一步检查', '避免阳光暴晒', '不要自行处理病灶']
    },
    nv: {
        diagnosis: '色素痣',
        description: '模型识别为色素痣倾向，建议持续观察其边界、颜色和大小变化。',
        precautions: ['避免频繁摩擦刺激', '做好防晒', '如出现不对称或出血请及时就医']
    },
    vasc: {
        diagnosis: '血管性皮肤病变',
        description: '模型识别为血管性皮肤病变倾向，建议结合医生检查进一步判断。',
        precautions: ['减少局部刺激', '避免高温暴晒', '若症状持续或加重请及时就医']
    }
};

const parseImagePayload = (imageBase64) => {
    if (!imageBase64 || typeof imageBase64 !== 'string') {
        throw new Error('缺少图片数据');
    }
    const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (match) {
        return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
    }
    return { mimeType: 'image/jpeg', buffer: Buffer.from(imageBase64, 'base64') };
};

const mimeToExt = (mimeType) => {
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('webp')) return 'webp';
    return 'jpg';
};

const normalizeOutput = (data) => {
    if (!data || typeof data !== 'object') {
        throw new Error('识别结果格式错误');
    }
    const diagnosis = String(data.diagnosis || '').trim();
    const probability = Number(data.probability);
    const description = String(data.description || '').trim();
    const precautions = Array.isArray(data.precautions)
        ? data.precautions.map((item) => String(item).trim()).filter(Boolean)
        : [];
    if (!diagnosis || Number.isNaN(probability) || !description || precautions.length === 0) {
        throw new Error('识别结果字段不完整');
    }
    return {
        diagnosis,
        probability: Math.max(0, Math.min(100, Math.round(probability))),
        description,
        precautions
    };
};

const mapPredictionToMedicalText = (predictions) => {
    if (!Array.isArray(predictions) || predictions.length === 0) {
        throw new Error('推理结果为空');
    }
    const top = predictions[0];
    const metadata = labelMetadata[top.label] || {
        diagnosis: top.label,
        description: '模型已完成识别，请结合专业医生意见进行判断。',
        precautions: ['避免抓挠和刺激病灶', '保持患处清洁干燥', '如有不适请及时就医']
    };
    return {
        diagnosis: metadata.diagnosis,
        probability: Math.round(Number(top.prob || 0) * 100),
        description: metadata.description,
        precautions: metadata.precautions,
        predictions: predictions.map((item) => ({
            label: item.label,
            probability: Math.round(Number(item.prob || 0) * 100)
        }))
    };
};

const analyzeByLocalModel = async (imageBase64) => {
    let imagePath = '';
    try {
        const { mimeType, buffer } = parseImagePayload(imageBase64);
        const ext = mimeToExt(mimeType);
        imagePath = path.join(os.tmpdir(), `skinai-${Date.now()}.${ext}`);
        await fs.writeFile(imagePath, buffer);
        const predictions = await runInference(imagePath);
        return mapPredictionToMedicalText(predictions);
    } finally {
        if (imagePath) {
            await fs.unlink(imagePath).catch(() => undefined);
        }
    }
};

const analyzeByExternalApi = async (imageBase64) => {
    if (!aiConfig.external.endpoint) {
        throw new Error('外部AI接口未配置');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), aiConfig.external.timeoutMs);
    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (aiConfig.external.apiKey) {
            headers.Authorization = `Bearer ${aiConfig.external.apiKey}`;
        }
        const response = await fetch(aiConfig.external.endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                imageBase64,
                model: aiConfig.external.model || undefined
            }),
            signal: controller.signal
        });
        if (!response.ok) {
            throw new Error(`外部AI接口调用失败(${response.status})`);
        }
        const result = await response.json();
        return normalizeOutput(result);
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('外部AI接口超时');
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
};

const analyzeByConfiguredProvider = async (imageBase64, overrideProvider) => {
    const provider = overrideProvider || aiConfig.provider;
    if (provider === 'local_model') {
        return analyzeByLocalModel(imageBase64);
    }
    if (provider === 'external_ai_api') {
        return analyzeByExternalApi(imageBase64);
    }
    throw new Error('不支持的AI提供方');
};

const maskApiKey = (apiKey) => {
    if (!apiKey) return '';
    if (apiKey.length <= 8) return '********';
    return `${apiKey.slice(0, 4)}********${apiKey.slice(-4)}`;
};

const runInference = async (imagePath) => {
    const pythonArgs = [
        'model/infer.py',
        '--image',
        imagePath,
        '--package-dir',
        'model',
        '--topk',
        '3',
        '--cpu'
    ];
    const command = process.env.PYTHON_BIN || 'python';

    return new Promise((resolve, reject) => {
        const child = spawn(command, pythonArgs, {
            cwd: process.cwd(),
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        child.on('error', (err) => {
            reject(err);
        });
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr || `推理进程退出码 ${code}`));
                return;
            }
            try {
                const parsed = JSON.parse(stdout);
                resolve(parsed);
            } catch {
                reject(new Error('推理结果解析失败'));
            }
        });
    });
};

app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});

app.post('/api/analyze-skin', async (req, res) => {
    try {
        const { imageBase64 } = req.body || {};
        if (!imageBase64 || typeof imageBase64 !== 'string') {
            throw new Error('缺少图片数据');
        }
        const result = await analyzeByConfiguredProvider(imageBase64);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            message: error instanceof Error ? error.message : '识别失败'
        });
    }
});

app.get('/api/admin/ai/providers', (_req, res) => {
    res.json({
        providers,
        currentProvider: aiConfig.provider
    });
});

app.get('/api/admin/ai/config', (_req, res) => {
    res.json({
        provider: aiConfig.provider,
        external: {
            endpoint: aiConfig.external.endpoint,
            model: aiConfig.external.model,
            timeoutMs: aiConfig.external.timeoutMs,
            apiKeyMasked: maskApiKey(aiConfig.external.apiKey)
        }
    });
});

app.put('/api/admin/ai/config', (req, res) => {
    try {
        const { provider, external } = req.body || {};
        if (provider !== undefined) {
            if (!providers.includes(provider)) {
                throw new Error('provider 不合法');
            }
            aiConfig.provider = provider;
        }
        if (external && typeof external === 'object') {
            if (external.endpoint !== undefined) {
                aiConfig.external.endpoint = String(external.endpoint || '').trim();
            }
            if (external.model !== undefined) {
                aiConfig.external.model = String(external.model || '').trim();
            }
            if (external.apiKey !== undefined) {
                aiConfig.external.apiKey = String(external.apiKey || '').trim();
            }
            if (external.timeoutMs !== undefined) {
                const timeoutMs = Number(external.timeoutMs);
                if (Number.isNaN(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
                    throw new Error('timeoutMs 范围应在 1000~120000');
                }
                aiConfig.external.timeoutMs = timeoutMs;
            }
        }
        res.json({
            ok: true,
            provider: aiConfig.provider,
            external: {
                endpoint: aiConfig.external.endpoint,
                model: aiConfig.external.model,
                timeoutMs: aiConfig.external.timeoutMs,
                apiKeyMasked: maskApiKey(aiConfig.external.apiKey)
            }
        });
    } catch (error) {
        res.status(400).json({
            message: error instanceof Error ? error.message : '配置更新失败'
        });
    }
});

app.post('/api/admin/ai/analyze', async (req, res) => {
    try {
        const { imageBase64, provider } = req.body || {};
        if (!imageBase64 || typeof imageBase64 !== 'string') {
            throw new Error('缺少图片数据');
        }
        if (provider !== undefined && !providers.includes(provider)) {
            throw new Error('provider 不合法');
        }
        const result = await analyzeByConfiguredProvider(imageBase64, provider);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            message: error instanceof Error ? error.message : '识别失败'
        });
    }
});

app.listen(port, () => {
    console.log(`SkinAI API server running at http://localhost:${port}`);
});
