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
    const rawDiagnosis = data.diagnosis || data.disease || data.name || data.title || data.疾病名称 || data.诊断;
    const diagnosis = String(rawDiagnosis || '').trim();
    const rawProbability = data.probability ?? data.confidence ?? data.score ?? data.概率 ?? data.置信度;
    const probabilityNumber = typeof rawProbability === 'string'
        ? Number(rawProbability.replace('%', '').trim())
        : Number(rawProbability);
    const probability = Number.isNaN(probabilityNumber) ? 85 : probabilityNumber;
    if (!diagnosis) {
        throw new Error('识别结果字段不完整');
    }
    return {
        diagnosis,
        probability: Math.max(0, Math.min(100, Math.round(probability)))
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

        // 构建系统提示词
        const systemPrompt = aiConfig.external.systemPrompt || `你是一位专业的皮肤科医生。请分析用户上传的皮肤照片，并提供以下信息（以JSON格式返回）：
{
  "diagnosis": "皮肤病名称",
  "probability": 85,
}`;

        // 构建用户消息
        const userContent = aiConfig.external.userPromptTemplate
            ? aiConfig.external.userPromptTemplate.replace('{{image}}', '[图片]')
            : '请分析这张皮肤照片，告诉我这是什么皮肤问题，并给出建议。';

        // 判断是否为阿里云通义千问
        const isAliyun = aiConfig.external.endpoint.includes('dashscope.aliyuncs.com');

        let payload;
        let apiUrl;

        if (isAliyun) {
            // 阿里云通义千问格式
            // 阿里云 qwen-vl 模型支持 base64 data URL 格式
            // 确保图片数据是完整的 data:image/jpeg;base64,xxx 格式
            let imageUrl = imageBase64;
            if (!imageUrl.startsWith('data:')) {
                // 如果没有 data: 前缀，添加默认的 jpeg 前缀
                imageUrl = `data:image/jpeg;base64,${imageUrl}`;
            }
            apiUrl = aiConfig.external.endpoint;
            payload = {
                model: aiConfig.external.model || 'qwen-vl-plus',
                input: {
                    messages: [
                        {
                            role: 'system',
                            content: [
                                {
                                    type: 'text',
                                    text: systemPrompt
                                }
                            ]
                        },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'image',
                                    image: imageUrl
                                },
                                {
                                    type: 'text',
                                    text: userContent
                                }
                            ]
                        }
                    ]
                }
            };
        } else {
            // DeepSeek/OpenAI 兼容格式
            apiUrl = `${aiConfig.external.endpoint}/chat/completions`;
            payload = {
                model: aiConfig.external.model || 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: userContent
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageBase64
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 8192,
                temperature: 0.7
            };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('AI API Error:', errorData);
            throw new Error(`外部AI接口调用失败(${response.status})`);
        }

        const result = await response.json();

        // 解析 AI 返回的内容
        let content;
        if (isAliyun) {
            // 阿里云格式
            const aliContent = result.output?.choices?.[0]?.message?.content;
            if (Array.isArray(aliContent)) {
                // 找到文本内容
                const textItem = aliContent.find(item => item.text);
                content = textItem ? textItem.text : JSON.stringify(aliContent);
            } else {
                content = aliContent;
            }
        } else {
            // OpenAI/DeepSeek 格式
            content = result.choices?.[0]?.message?.content;
        }

        if (!content) {
            throw new Error('AI 返回结果为空');
        }

        // 尝试从内容中提取 JSON
        let parsedData;
        try {
            // 先尝试直接解析
            parsedData = JSON.parse(content);
        } catch {
            // 尝试从 markdown 代码块中提取
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[1]);
            } else {
                // 尝试匹配 JSON 对象
                const objMatch = content.match(/\{[\s\S]*\}/);
                if (objMatch) {
                    parsedData = JSON.parse(objMatch[0]);
                } else {
                    throw new Error('无法解析 AI 返回的结果');
                }
            }
        }

        return normalizeOutput(parsedData);
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
