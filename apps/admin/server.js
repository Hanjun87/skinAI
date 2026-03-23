import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = Number(process.env.ADMIN_PORT || 8788);
const apiBaseUrl = process.env.ADMIN_API_BASE_URL || `http://localhost:${process.env.API_PORT || 8787}`;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

app.get('/admin-config.js', (_req, res) => {
  res.type('application/javascript');
  res.send(`window.__ADMIN_API_BASE_URL__ = ${JSON.stringify(apiBaseUrl)};`);
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`SkinAI admin running at http://localhost:${port}`);
  console.log(`SkinAI admin API base: ${apiBaseUrl}`);
});
