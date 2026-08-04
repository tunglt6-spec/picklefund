import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { DesktopHeader } from './DesktopHeader'
import { UserGuideModal } from '../help/UserGuideModal'
import { useApiSync } from '../../hooks/useApiSync'
import { useMinigameSync } from '../../hooks/useMinigameSync'
import { useApplyBranding } from '../../hooks/useApplyBranding'
import { useAuthStore } from '../../store/authStore'
import { useGuideStore } from '../../store/guideStore'

const LISA_ROUTES: Record<string, string> = {
  CLUB_ADMIN: '/lisa',
  CLUB_TREASURER: '/lisa',
  MEMBER_VIEW: '/member/lisa',
}

export function AppLayout() {
  useApiSync()
  useMinigameSync()
  useApplyBranding()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const { open: guideOpen, openGuide, closeGuide } = useGuideStore()

  // Tự bật tài liệu Hướng dẫn LẦN ĐẦU cho mỗi tài khoản trên trình duyệt này (đánh dấu đã xem
  // vào localStorage). Các lần sau người dùng tự mở qua nút "Hướng dẫn" trên header.
  useEffect(() => {
    if (!user) return
    const key = `pf_guide_seen_v1_${user.username ?? user.id ?? 'user'}`
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1')
      openGuide()
    }
  }, [user, openGuide])

  const lisaRoute = user ? LISA_ROUTES[user.role] : null
  const isOnLisa = lisaRoute ? location.pathname === lisaRoute : false
  // Mở màn con từ hub AI Operations Center (card đính ?from=aido) → hiện thanh quay lại cố định,
  // vị trí GIỐNG NHAU cho MỌI màn card (đặt 1 nơi ở AppLayout).
  const fromAido = new URLSearchParams(location.search).get('from') === 'aido'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex w-72 flex-col">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header — 64px */}
        <div className="md:hidden">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        </div>

        {/* Desktop header — tìm kiếm / chuông / toàn màn hình / avatar (mẫu v2.1) */}
        <DesktopHeader />

        {/* Page content — không còn bottom nav; chỉ chừa safe-area đáy */}
        <main className="flex-1 flex flex-col overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex-1 overflow-y-auto">
            {fromAido && (
              <button
                onClick={() => navigate('/aido?tab=ops-center')}
                className="sticky top-0 z-30 flex w-full items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold transition-colors sm:px-6"
                style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)', borderColor: 'var(--pf-border)' }}
              >
                <ArrowLeft size={16} /> Quay lại AI Operations Center
              </button>
            )}
            {/* Page transition (Elite): keyed theo pathname → replay hiệu ứng vào mỗi lần
                đổi route. Đổi ?tab= KHÔNG replay (chỉ đổi search) — tránh nháy khi chuyển tab. */}
            <div key={location.pathname} className="pf-page">
              <Outlet />
            </div>
          </div>
        </main>

        {/* Lisa AI floating button — CHỈ mobile (desktop đã có Lisa to trong sidebar); ẩn khi đang ở trang Lisa */}
        {lisaRoute && !isOnLisa && (
          <button
            onClick={() => navigate(lisaRoute)}
            className="md:hidden fixed z-40 active:scale-95 transition-transform shadow-xl"
            style={{
              right: 14,
              bottom: 'calc(16px + env(safe-area-inset-bottom))',
              width: 56,
              height: 56,
              borderRadius: 28,
              overflow: 'hidden',
              padding: 0,
              border: '2.5px solid #fff',
            }}
            aria-label="Hỏi Lisa AI"
          >
            <img src="/lisa-avatar.jpg?v=2" alt="Lisa AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </button>
        )}
      </div>

      {/* Tài liệu Hướng dẫn — render 1 lần, điều khiển qua guideStore (nút header + auto-open) */}
      <UserGuideModal open={guideOpen} onClose={closeGuide} />
    </div>
  )
}
