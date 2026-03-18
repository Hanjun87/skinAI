import express from 'express';

const app = express();
const port = Number(process.env.API_PORT || 8787);
const providers = ['external_ai_api'];
const aiConfig = {
    provider: 'external_ai_api',
    external: {
        endpoint: process.env.EXTERNAL_AI_ENDPOINT || '',
        apiKey: process.env.EXTERNAL_AI_API_KEY || '',
        model: process.env.EXTERNAL_AI_MODEL || '',
        timeoutMs: Number(process.env.EXTERNAL_AI_TIMEOUT_MS || 20000)
    }
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

const maskApiKey = (apiKey) => {
    if (!apiKey) return '';
    if (apiKey.length <= 8) return '********';
    return `${apiKey.slice(0, 4)}********${apiKey.slice(-4)}`;
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
        const result = await analyzeByExternalApi(imageBase64);
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
        if (provider !== undefined && provider !== 'external_ai_api') {
            throw new Error('当前仅支持 external_ai_api');
        }
        aiConfig.provider = 'external_ai_api';
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
        if (provider !== undefined && provider !== 'external_ai_api') {
            throw new Error('当前仅支持 external_ai_api');
        }
        const result = await analyzeByExternalApi(imageBase64);
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
