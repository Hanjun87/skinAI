# SkinAI 项目架构文档

## 1. 项目概览

SkinAI 当前采用“前端应用 + Django 主后端 + Node 兼容层”的多服务架构：

- `apps/web`：用户端 React + Vite 应用
- `services/django`：Django 主后端，负责后台管理、AI 配置、识别接口、识别记录与 PostgreSQL
- `backend`：Node 兼容层，仅对旧 `/api/*` 调用做转发

仓库根目录通过 npm workspace 管理多包与多服务，开发、迁移、后台初始化等命令统一由根 `package.json` 提供。

## 2. 目录结构

```text
e:\skinAI
├─ apps
│  └─ web                 用户端 React + Vite
├─ backend                Node 兼容层
├─ services
│  └─ django              Django 主后端
├─ android                Android 容器工程
├─ docs                   项目文档
├─ start.py               一键启动脚本
└─ package.json           Monorepo 根命令入口
```

## 3. 服务职责

### 3.1 用户前端 `apps/web`

用户前端负责：

- 图片拍摄与上传
- 发起皮肤识别请求
- 展示识别结果
- 承载记录、社区、个人中心等前端页面

当前前端本质上是单体 React 应用，页面状态主要由前端本地 state 管理。开发模式下，Vite 会将 `/api` 请求代理到 Django 主后端。

### 3.2 Django 主后端 `services/django`

Django 是当前项目的核心业务中心，负责：

- 登录、登出、后台权限控制
- Django Admin
- 管理后台页面与静态资源
- AI 配置的持久化读写
- 用户侧 `/api/analyze-skin` 识别接口
- 后台侧 `/api/admin/ai/*` 管理接口
- 识别记录落库
- PostgreSQL 连接与数据模型管理

当前 AI 配置与识别逻辑已经从 Node 迁入 Django，Node 不再承担核心业务逻辑。

### 3.3 Node 兼容层 `backend`

Node 服务目前仅作为兼容层存在，职责非常明确：

- 保留旧的 `/api/*` 入口
- 将旧请求转发到 Django
- 为历史调用链或旧客户端提供兼容

因此它不是主业务服务，也不是数据真源。

## 4. 核心模块说明

### 4.1 Django Dashboard 模块

`dashboard` 应用是当前后台核心模块，包含：

- 后台视图
- AI 配置模型
- 识别记录模型
- 管理后台接口
- 默认管理员初始化命令

关键模型：

- `AIProviderConfig`
  - 单例配置模型
  - 存储 AI 服务 endpoint、apiKey、model、timeout、prompt 等
- `SkinAnalysisRecord`
  - 存储识别请求记录
  - 保存请求来源、诊断结果、概率、图片哈希、成功状态、错误信息等

### 4.2 AI 调用服务层

Django 的服务层负责：

- 从数据库读取当前 AI 配置
- 根据 endpoint 类型区分 DashScope 或 OpenAI 兼容接口
- 拼装请求体
- 解析 AI 返回结果
- 标准化 `diagnosis` 与 `probability`
- 持久化识别记录

为避免保存原图，系统只记录图片的 SHA256 哈希，不直接入库原始图像。

## 5. 请求链路

### 5.1 用户识别链路

用户端识别流程如下：

1. 用户在 `apps/web` 上传或拍摄图片
2. 前端将图片转成 base64
3. 前端调用 `POST /api/analyze-skin`
4. Django 接收请求并执行 AI 识别
5. Django 调用外部 AI 服务
6. Django 解析返回结果并写入 `SkinAnalysisRecord`
7. Django 返回标准化识别结果给前端

### 5.2 后台配置链路

后台配置流程如下：

1. 管理员登录 Django 后台控制台
2. 页面请求 `/api/admin/ai/config`
3. Django 从 `AIProviderConfig` 读取单例配置
4. 更新配置时写回 PostgreSQL
5. API Key 对外返回时做脱敏处理

### 5.3 Node 兼容链路

兼容链路如下：

1. 旧客户端调用 Node `/api/*`
2. Node 将请求透明转发给 Django
3. Django 返回真实业务结果
4. Node 原样返回给调用方

## 6. 数据存储

### 6.1 PostgreSQL

PostgreSQL 是当前唯一主数据库，负责存储：

- Django 用户、权限、会话
- AI 配置
- 识别记录
- 未来扩展业务表

数据库连接支持两种形式：

- `DATABASE_URL`
- `PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE`

### 6.2 配置初始化策略

AI 配置采用“环境变量默认值 + 数据库覆盖”的策略：

- 首次访问配置时，若数据库中不存在记录，则用环境变量创建默认单例配置
- 后台修改后，配置持久化到数据库
- 后续识别流程优先读取数据库中的最新配置

## 7. 启动方式

### 7.1 一键启动

推荐使用根目录：

```bash
python start.py
```

启动器会自动完成：

- Django 数据迁移
- 默认管理员初始化
- 端口冲突检测与自动切换
- 前端、Django、Node 三服务启动

### 7.2 Django 启动引导器

`services/django/bootstrap.py` 的作用：

- 检查项目本地 `.venv`
- 自动安装 Django 与 psycopg 依赖
- 再调用 Django `manage.py`

这样即使系统 Python 没有安装 Django，也可以在项目内自举运行。

## 8. 端口策略

默认端口设计如下：

- 前端：`3000`
- Django：`8788`
- Node：`8790`

为了避免本机已有项目占用这些端口，`start.py` 已支持自动向后寻找可用端口，例如：

- `3000` 被占用时，自动切到 `3001`、`3002` ...
- `8788` 被占用时，自动切到 `8789` ...
- `8790` 被占用时，自动切到 `8791` ...

最终实际访问地址以启动器打印结果为准。

## 9. 环境变量

根 `.env` 主要包含：

- Django 基础配置
- PostgreSQL 连接参数
- 外部 AI 接口参数
- Node 兼容层地址
- 默认管理员信息

服务级示例文件：

- `apps/web/.env.example`
- `backend/.env.example`
- `services/django/.env.example`

## 10. Android 关系

Android 目录不是独立后端，而是前端容器：

- Web 构建产物由 `apps/web` 输出
- 通过 Capacitor 同步到 Android 工程
- Android 最终仍依赖后端 API

因此 Android 只是交付形态，不是独立业务层。

## 11. 当前架构结论

当前项目的真实架构结论如下：

- Django 是主后端与核心业务中心
- PostgreSQL 是唯一主数据库
- Node 只承担兼容层职责
- React 前端是用户侧展示与交互层
- AI 配置、识别接口、识别记录都已经统一进入 Django

如果后续继续商业化演进，推荐按以下方向扩展：

- 用户业务表与档案体系
- 识别历史查询与统计
- 社区内容持久化
- 预约/咨询业务
- 更细粒度后台权限模型
- 生产部署方案与日志监控体系
