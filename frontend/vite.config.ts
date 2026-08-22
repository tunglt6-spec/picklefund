import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Version + ngày build inject lúc build (thay hardcode ở màn Cài Đặt Hệ Thống).
const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { version: string }
const BUILD_DATE = new Date().toISOString().slice(0, 10)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(BUILD_DATE),
  },
  plugins: [
    react(),
    tailwindcss(),
    // EPIC11: PWA cài đặt được + cập nhật AN TOÀN (không nhốt bundle cũ).
    // - registerType 'autoUpdate': SW mới precache asset content-hashed mới rồi
    //   tự kích hoạt + reload → luôn lấy bundle mới nhất.
    // - navigateFallback index.html (offline SPA), denylist /api → KHÔNG trả
    //   index.html cho API; API KHÔNG cache → dữ liệu tài chính luôn tươi/không stale.
    // - cleanupOutdatedCaches: xoá precache cũ mỗi lần cập nhật.
    // - manifest: false → dùng public/manifest.json + icons đã có sẵn.
    VitePWA({
      // 'prompt': SW mới CHỜ người dùng bấm "Tải lại" (banner PwaReloadPrompt) thay vì
      // reload ngầm — hết cảnh kẹt bản cũ mà không biết. updateServiceWorker(true) sẽ
      // skipWaiting + reload khi user bấm.
      registerType: 'prompt',
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        // Nạp handler Web Push (push + notificationclick) vào SW sinh tự động.
        importScripts: ['/push-sw.js'],
        // Precache JS/CSS/HTML/icon nhỏ; KHÔNG precache ảnh nội dung lớn (aido-media/*) —
        // để runtime-cache (CacheFirst) tải khi cần, tránh phình gói cài PWA.
        globPatterns: ['**/*.{js,css,html,ico,woff2}', 'favicon*.png', 'icons/**'],
        globIgnores: ['**/aido-media/**', '**/lisa-avatar.*', '**/logo-picklefund*'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        // KHÔNG skipWaiting/clientsClaim: để SW mới CHỜ user bấm "Tải lại" (flow prompt).
        runtimeCaching: [
          {
            // Ảnh (banner AIDO, avatar, logo, ảnh nội dung) — cache khi dùng.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'pf-images',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Tách vendor lớn thành chunk riêng → cache tốt, giảm parse bundle chính.
        // Dạng HÀM (rolldown-vite chỉ nhận ManualChunksFunction). xlsx/jspdf/html2canvas-pro
        // KHÔNG gom ở đây — đã dynamic import (lib/export.ts, infographic.utils.ts) nên tự tách lazy.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor')) return 'vendor-charts'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('socket.io') || id.includes('engine.io')) return 'vendor-socket'
          if (id.includes('react-router') || id.includes('react-dom') || /node_modules\/react\//.test(id)) return 'vendor-react'
        },
      },
    },
  },
  server: {
    proxy: {
      // Backend dùng global prefix `/api` (setGlobalPrefix('api')), nên KHÔNG strip
      // `/api` khi proxy — giữ nguyên path để `/api/auth/login` -> backend `/api/auth/login`.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
