<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SkinAI

## Run Locally

**Prerequisites:** Node.js


1. Install dependencies:
   `npm install`
2. Run backend API:
   `npm run dev:api`
3. Run frontend:
   `npm run dev`
4. Run admin frontend (separate window/port):
   `npm run dev:admin`

## 独立后台管理

- 后台地址：`http://localhost:8788`
- 后台与 App 前端分离，不再内嵌在移动应用页面中
- 后台默认调用 API：`http://localhost:8787`（可用 `ADMIN_API_BASE_URL` 覆盖）

## PostgreSQL 配置

- 支持两种连接方式：
  - `DATABASE_URL`
  - `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`
- AI 后台配置（接口地址、模型、提示词等）写入 PostgreSQL 表：`ai_admin_config`
- 若未配置 PostgreSQL，服务会使用环境变量默认值并提示警告

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
  - emulator: `http://10.0.2.2:8787`
  - LAN backend: `http://<your-lan-ip>:8787`
