import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PwaReloadPrompt } from './components/PwaReloadPrompt'
import { useThemeStore } from './store/themeStore'
import { initPwaInstall } from './store/pwaInstallStore'
import { PwaInstallModal } from './components/help/PwaInstallModal'

// Áp theme đã lưu + theo dõi OS (khi 'system'). No-flash script trong index.html đã set
// data-theme lúc đầu; init() giữ store đồng bộ.
useThemeStore.getState().init()
// Bắt sớm sự kiện cài PWA (beforeinstallprompt) để nút "Cài đặt PWA" ở header dùng được hộp thoại gốc.
initPwaInstall()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <PwaReloadPrompt />
    {/* Modal cài PWA gắn toàn cục: dùng được cả ở trang đăng nhập lẫn trong app */}
    <PwaInstallModal />
  </StrictMode>,
)
