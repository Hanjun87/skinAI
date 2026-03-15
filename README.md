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
