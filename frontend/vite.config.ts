import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Bundle chính ~2.8MB > mặc định 2MiB; nâng để precache đủ cho offline.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
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
