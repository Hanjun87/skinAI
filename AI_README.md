# 知己肤 项目架构文档

> 本文档供 AI 助手快速理解项目架构，以便更准确地协助开发。

## 项目概述

知己肤 是一个皮肤健康识别应用，用户可以拍摄皮肤照片，由 AI 分析并给出诊断建议。项目支持 Web 端和 Android 端。

## 技术栈

| 类别     | 技术                   |
| -------- | ---------------------- |
| 前端框架 | React 19 + TypeScript  |
| 构建工具 | Vite 6                 |
| 样式     | TailwindCSS 4          |
| 动画     | Motion (Framer Motion) |
| 图标     | Lucide React           |
| 后端     | Node.js + Express      |
| 数据库   | PostgreSQL             |
| 移动端   | Capacitor (Android)    |
| 部署     | Vercel                 |

## 项目结构

```
zhijifu/
├── src/                    # 前端源码
│   ├── App.tsx             # 主应用组件（单文件应用）
│   ├── main.tsx            # 入口文件
│   └── index.css           # 全局样式
├── server.js               # 后端 API 服务 (端口 8787)
├── admin/                  # 后台管理系统
│   ├── index.html          # 后台页面
│   ├── main.js             # 后台逻辑
│   ├── server.js           # 后台服务 (端口 8788)
│   └── styles.css          # 后台样式
├── android/                # Android 项目 (Capacitor)
├── .env                    # 环境变量配置
├── vite.config.ts          # Vite 配置
├── capacitor.config.ts     # Capacitor 配置
└── package.json            # 项目依赖
```

## 服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面                              │
├─────────────────┬─────────────────┬─────────────────────────┤
│  前端应用       │   后台管理       │   Android App           │
│  localhost:3000 │   localhost:8788 │   (APK)                │
└────────┬────────┴────────┬────────┴─────────────────────────┘
         │                 │
         ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端 API 服务                             │
│                    localhost:8787                            │
├─────────────────────────────────────────────────────────────┤
│  /api/health              - 健康检查                        │
│  /api/analyze-skin        - 皮肤图片分析                     │
│  /api/admin/ai/providers  - 获取 AI 提供商列表               │
│  /api/admin/ai/config     - 获取/更新 AI 配置                │
│  /api/admin/ai/analyze    - 后台测试分析                     │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据存储层                                │
├─────────────────┬───────────────────────────────────────────┤
│  PostgreSQL     │   AI 配置持久化 (ai_admin_config 表)       │
│  环境变量       │   默认配置 (.env 文件)                      │
└─────────────────┴───────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    外部 AI 服务                              │
├─────────────────────────────────────────────────────────────┤
│  阿里云通义千问 (qwen-vl-plus) - 支持图像识别                 │
│  DeepSeek (deepseek-chat)    - 仅支持文本                    │
│  OpenAI 兼容 API              - 支持图像识别                  │
└─────────────────────────────────────────────────────────────┘
```

## 核心数据流

### 皮肤识别流程

```
1. 用户拍照/选择图片
   └─> 前端将图片转为 Base64 (data:image/jpeg;base64,xxx)

2. 前端调用 API
   └─> POST /api/analyze-skin { imageBase64: "..." }

3. 后端处理
   ├─> 从数据库/环境变量加载 AI 配置
   ├─> 根据 endpoint 判断 AI 提供商类型
   ├─> 构建对应格式的请求体
   │   ├─> 阿里云: { model, input: { messages: [...] } }
   │   └─> OpenAI: { model, messages: [...] }
   └─> 调用外部 AI API

4. 解析响应
   ├─> 提取 AI 返回的文本内容
   ├─> 解析 JSON (支持 markdown 代码块)
   └─> 标准化输出格式

5. 返回结果
   └─> { diagnosis, probability }
```

## 关键文件说明

### server.js (后端 API)

**核心函数：**

| 函数                     | 作用                     |
| ------------------------ | ------------------------ |
| `createPoolFromEnv()`    | 创建 PostgreSQL 连接池   |
| `loadConfigFromDb()`     | 从数据库加载 AI 配置     |
| `saveConfigToDb()`       | 保存 AI 配置到数据库     |
| `analyzeByExternalApi()` | 调用外部 AI API 分析图片 |
| `normalizeOutput()`      | 标准化 AI 返回结果       |

**AI 提供商适配：**

```javascript
// 阿里云通义千问格式
if (isAliyun) {
  payload = {
    model: "qwen-vl-plus",
    input: {
      messages: [
        { role: "system", content: [{ type: "text", text: systemPrompt }] },
        {
          role: "user",
          content: [
            { type: "image", image: imageBase64 },
            { type: "text", text: userContent },
          ],
        },
      ],
    },
  };
}

// OpenAI/DeepSeek 格式
else {
  payload = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userContent },
          { type: "image_url", image_url: { url: imageBase64 } },
        ],
      },
    ],
  };
}
```

### src/App.tsx (前端应用)

**页面状态：**

```typescript
type Page =
  | "home"
  | "camera"
  | "analysis"
  | "result"
  | "records"
  | "record_detail"
  | "diary"
  | "diary_detail"
  | "profile"
  | "consultations"
  | "appointments"
  | "settings"
  | "about";
```

**核心状态：**

| 状态             | 类型           | 作用                |
| ---------------- | -------------- | ------------------- |
| `currentPage`    | Page           | 当前页面            |
| `capturedImage`  | string         | 拍摄的图片 (Base64) |
| `analysisResult` | AnalysisResult | 分析结果            |
| `records`        | Record[]       | 历史记录            |
| `isAnalyzing`    | boolean        | 是否正在分析        |

**API 调用：**

```typescript
// 构建API URL
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const buildApiUrl = (path: string) => `${apiBaseUrl}${path}`;

// 分析皮肤
const response = await fetch(buildApiUrl("/api/analyze-skin"), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ imageBase64 }),
});
```

## 环境变量配置

```bash
# 前端 API 基础地址（Android 真机需配置）
VITE_API_BASE_URL=""

# AI 接口配置
EXTERNAL_AI_ENDPOINT="https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
EXTERNAL_AI_API_KEY="sk-xxx"
EXTERNAL_AI_MODEL="qwen-vl-plus"
EXTERNAL_AI_TIMEOUT_MS="30000"
EXTERNAL_AI_SYSTEM_PROMPT="..."
EXTERNAL_AI_USER_PROMPT_TEMPLATE="..."

# 后台管理配置
ADMIN_PORT="8788"
ADMIN_API_BASE_URL="http://localhost:8787"

# PostgreSQL 配置
PGHOST="localhost"
PGPORT="5432"
PGUSER="postgres"
PGPASSWORD="xxx"
PGDATABASE="postgres"
```

## 数据库表结构

### ai_admin_config 表

```sql
CREATE TABLE ai_admin_config (
    id INTEGER PRIMARY KEY,
    provider TEXT NOT NULL,
    external JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**external 字段结构：**

```json
{
  "endpoint": "https://api.example.com",
  "apiKey": "sk-xxx",
  "model": "model-name",
  "timeoutMs": 30000,
  "systemPrompt": "系统提示词",
  "userPromptTemplate": "用户提示词模板"
}
```

## 启动命令

```bash
# 安装依赖
npm install

# 启动后端 API (端口 8787)
npm run dev:api

# 启动前端 (端口 3000)
npm run dev

# 启动后台管理 (端口 8788)
npm run dev:admin

# Android 构建
npm run android:sync        # 同步到 Android
npm run android:build:debug # 构建 APK
```

\*只允许修改我说了的部分，其他没有说的地方不能修改
