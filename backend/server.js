import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = Number(process.env.API_PORT || 8790);
const djangoApiBaseUrl = (process.env.SKINAI_DJANGO_API_BASE_URL || 'http://127.0.0.1:8788').replace(/\/$/, '');

const proxyJson = async (req, res, path) => {
    try {
        const response = await fetch(`${djangoApiBaseUrl}${path}`, {
            method: req.method,
            headers: {
                Accept: 'application/json',
                ...(req.method === 'GET' || req.method === 'HEAD' ? {} : { 'Content-Type': 'application/json' })
            },
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body || {})
        });
        const contentType = response.headers.get('content-type') || 'application/json; charset=utf-8';
        const text = await response.text();
        res.status(response.status);
        res.set('Content-Type', contentType);
        res.send(text);
    } catch (error) {
        res.status(502).json({
            message: error instanceof Error ? `Django API 不可用: ${error.message}` : 'Django API 不可用'
        });
    }
};

app.use(cors());
app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (req, res) => proxyJson(req, res, '/api/health'));
app.post('/api/analyze-skin', (req, res) => proxyJson(req, res, '/api/analyze-skin'));
app.get('/api/admin/ai/providers', (req, res) => proxyJson(req, res, '/api/admin/ai/providers'));
app.get('/api/admin/ai/config', (req, res) => proxyJson(req, res, '/api/admin/ai/config'));
app.put('/api/admin/ai/config', (req, res) => proxyJson(req, res, '/api/admin/ai/config'));
app.post('/api/admin/ai/analyze', (req, res) => proxyJson(req, res, '/api/admin/ai/analyze'));

const start = async () => {
    app.listen(port, () => {
        console.log(`知己肤 compatibility API running at http://localhost:${port}`);
        console.log(`Proxying requests to Django at ${djangoApiBaseUrl}`);
    });
};

start();
