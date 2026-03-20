import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const app = express();
const port = Number(process.env.API_PORT || 8787);
const { Pool } = pg;
const providers = ['external_ai_api'];

const defaultAiConfig = {
    provider: 'external_ai_api',
    external: {
        endpoint: process.env.EXTERNAL_AI_ENDPOINT || '',
        apiKey: process.env.EXTERNAL_AI_API_KEY || '',
        model: process.env.EXTERNAL_AI_MODEL || '',
        timeoutMs: Number(process.env.EXTERNAL_AI_TIMEOUT_MS || 20000),
        systemPrompt: process.env.EXTERNAL_AI_SYSTEM_PROMPT || '',
        userPromptTemplate: process.env.EXTERNAL_AI_USER_PROMPT_TEMPLATE || ''
    }
};
let aiConfig = JSON.parse(JSON.stringify(defaultAiConfig));

const createPoolFromEnv = () => {
    const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
    const hasPgHost = Boolean(process.env.PGHOST);
    if (!hasDatabaseUrl && !hasPgHost) {
        return null;
    }
    if (hasDatabaseUrl) {
        return new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined
        });
    }
    return new Pool({
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        database: process.env.PGDATABASE || 'postgres',
        ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined
    });
};

const pool = createPoolFromEnv();
const configTableName = 'ai_admin_config';

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

const normalizeExternalConfig = (external) => {
    if (!external || typeof external !== 'object') {
        return { ...defaultAiConfig.external };
    }
    return {
        endpoint: String(external.endpoint || '').trim(),
        apiKey: String(external.apiKey || '').trim(),
        model: String(external.model || '').trim(),
        timeoutMs: Number(external.timeoutMs || 20000),
        systemPrompt: String(external.systemPrompt || '').trim(),
        userPromptTemplate: String(external.userPromptTemplate || '').trim()
    };
};

const getPublicConfig = () => ({
    provider: aiConfig.provider,
    external: {
        endpoint: aiConfig.external.endpoint,
        model: aiConfig.external.model,
        timeoutMs: aiConfig.external.timeoutMs,
        systemPrompt: aiConfig.external.systemPrompt,
        userPromptTemplate: aiConfig.external.userPromptTemplate,
        apiKeyMasked: maskApiKey(aiConfig.external.apiKey)
    }
});

const ensureConfigTable = async () => {
    if (!pool) {
        throw new Error('PostgreSQL 未配置，请先设置 DATABASE_URL 或 PGHOST');
    }
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${configTableName} (
            id INTEGER PRIMARY KEY,
            provider TEXT NOT NULL,
            external JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
};

const loadConfigFromDb = async () => {
    if (!pool) {
        return;
    }
    const result = await pool.query(`SELECT provider, external FROM ${configTableName} WHERE id = 1 LIMIT 1`);
    if (result.rows.length === 0) {
        await pool.query(
            `INSERT INTO ${configTableName} (id, provider, external) VALUES (1, $1, $2::jsonb)
             ON CONFLICT (id) DO UPDATE SET provider = EXCLUDED.provider, external = EXCLUDED.external, updated_at = NOW()`,
            [defaultAiConfig.provider, JSON.stringify(defaultAiConfig.external)]
        );
        aiConfig = JSON.parse(JSON.stringify(defaultAiConfig));
        return;
    }
    const row = result.rows[0];
    aiConfig = {
        provider: row.provider === 'external_ai_api' ? 'external_ai_api' : 'external_ai_api',
        external: normalizeExternalConfig(row.external)
    };
};

const saveConfigToDb = async () => {
    if (!pool) {
        throw new Error('PostgreSQL 未配置，请先设置 DATABASE_URL 或 PGHOST');
    }
    await pool.query(
        `INSERT INTO ${configTableName} (id, provider, external) VALUES (1, $1, $2::jsonb)
         ON CONFLICT (id) DO UPDATE SET provider = EXCLUDED.provider, external = EXCLUDED.external, updated_at = NOW()`,
        [aiConfig.provider, JSON.stringify(aiConfig.external)]
    );
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
        const payload = {
            imageBase64,
            model: aiConfig.external.model || undefined
        };
        if (aiConfig.external.systemPrompt) {
            payload.systemPrompt = aiConfig.external.systemPrompt;
        }
        if (aiConfig.external.userPromptTemplate) {
            payload.userPromptTemplate = aiConfig.external.userPromptTemplate;
        }
        const response = await fetch(aiConfig.external.endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
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

app.use(cors());
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

app.get('/api/admin/ai/config', async (_req, res) => {
    try {
        await loadConfigFromDb();
        res.json(getPublicConfig());
    } catch (error) {
        res.status(500).json({
            message: error instanceof Error ? error.message : '读取配置失败'
        });
    }
});

app.put('/api/admin/ai/config', async (req, res) => {
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
            if (external.systemPrompt !== undefined) {
                aiConfig.external.systemPrompt = String(external.systemPrompt || '').trim();
            }
            if (external.userPromptTemplate !== undefined) {
                aiConfig.external.userPromptTemplate = String(external.userPromptTemplate || '').trim();
            }
        }
        await saveConfigToDb();
        res.json({ ok: true, ...getPublicConfig() });
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

const start = async () => {
    try {
        if (pool) {
            await ensureConfigTable();
            await loadConfigFromDb();
            console.log('PostgreSQL config storage enabled');
        } else {
            console.warn('PostgreSQL 未配置，AI 后台配置将仅使用环境变量默认值');
        }
    } catch (error) {
        console.error('PostgreSQL 初始化失败:', error);
    }
    app.listen(port, () => {
        console.log(`SkinAI API server running at http://localhost:${port}`);
    });
};

start();
