import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
