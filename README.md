<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 知己肤

## 项目结构

- `apps/web`：React + Vite 用户端
- `backend`：Node.js 兼容层，对旧接口做转发
- `services/django`：Django 主后端，负责管理后台、AI 配置、皮肤识别与 PostgreSQL 数据

## Run Locally

**Prerequisites:** Node.js、Python 3.11+、PostgreSQL

1. 安装前端与后端依赖：
   `npm install`
2. 安装 Django 依赖：
   `python -m pip install -r services/django/requirements.txt`
3. 配置根目录 `.env` 中的 PostgreSQL 与外部 AI 参数
4. 初始化 PostgreSQL 表并创建默认管理员：
   `npm run setup:commercial`
5. 启动用户前端：
   `npm run dev:web`
6. 启动 Django 主后端：
   `npm run dev:admin`
7. 启动 Node 兼容层：
   `npm run dev:api`

也可以直接运行根目录启动器：

`python start.py`

## Django 管理控制台

- 控制台地址：`http://localhost:8788/dashboard/`
- Django 后台地址：`http://localhost:8788/admin/`
- 登录地址：`http://localhost:8788/login/`
- 默认管理员账号按当前需求初始化为 `admin / admin`
- AI 配置与识别逻辑都在 Django 中，Node 仅保留兼容转发
- Django Admin 可直接管理 AI 配置和识别记录

## PostgreSQL 配置

- Django 与 Node 共用同一套 PostgreSQL 连接变量
- Django 使用 PostgreSQL 作为唯一数据库，不再使用 SQLite
- AI 配置、识别记录、账号体系都由 Django 管理
- 建议在生产环境把默认管理员密码与 Django Secret Key 改成独立安全值

## Android Build (APK)

1. Build web assets and sync Android project:
   `npm run android:sync`
2. Build debug APK:
   `npm run android:build:debug`
3. APK output path:
   `android/app/build/outputs/apk/debug/app-debug.apk`

## Android API Configuration

- Web deployment can keep `VITE_API_BASE_URL` empty.
- Android app should set `VITE_API_BASE_URL` to a reachable backend URL before build, for example:
  - emulator: `http://10.0.2.2:8788`
  - LAN backend: `http://<your-lan-ip>:8788`
