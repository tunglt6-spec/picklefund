import { useEffect, Suspense } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { DesktopHeader } from './DesktopHeader'
import { MobileBottomNav, BOTTOM_NAV_HEIGHT } from './MobileBottomNav'
import { LISA_ROUTES } from './navConfig'
import { UserGuideModal } from '../help/UserGuideModal'
import { PushEnableBanner } from '../member/PushEnableBanner'
import { useApiSync } from '../../hooks/useApiSync'
import { useMinigameSync } from '../../hooks/useMinigameSync'
import { useApplyBranding } from '../../hooks/useApplyBranding'
import { useAuthStore } from '../../store/authStore'
import { useGuideStore } from '../../store/guideStore'

export function AppLayout() {
  useApiSync()
  useMinigameSync()
  useApplyBranding()
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

  const lisaRoute = user ? LISA_ROUTES[user.role] ?? null : null
  const isOnLisa = lisaRoute ? location.pathname === lisaRoute : false
  // Mở màn con từ hub AI Operations Center (card đính ?from=aido) → hiện thanh quay lại cố định,
  // vị trí GIỐNG NHAU cho MỌI màn card (đặt 1 nơi ở AppLayout).
  // Màn chat Lisa toàn màn không có thanh đáy.
  const fromAido = new URLSearchParams(location.search).get('from') === 'aido'

  return (
    <div className="pf-wash flex h-[100dvh] overflow-hidden [background-color:var(--pf-bg)]">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header — 64px */}
        <div className="lg:hidden">
          <MobileHeader />
        </div>

        {/* Desktop header — tìm kiếm / chuông / toàn màn hình / avatar (mẫu v2.1) */}
        <DesktopHeader />

        {/* Page content — không còn bottom nav; chỉ chừa safe-area đáy */}
        <main className="flex-1 flex flex-col overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {fromAido && (
              <button
                onClick={() => navigate('/aido?tab=ops-center')}
                className="sticky top-0 z-30 flex w-full items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold transition-colors sm:px-6"
                style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)', borderColor: 'var(--pf-border)' }}
              >
                <ArrowLeft size={16} /> Quay lại AI Operations Center
              </button>
            )}
            {/* Nhắc member bật thông báo đẩy (Web Push opt-in theo thiết bị). */}
            <PushEnableBanner />
            {/* Page transition (Elite): keyed theo pathname → replay hiệu ứng vào mỗi lần
                đổi route. Đổi ?tab= KHÔNG replay (chỉ đổi search) — tránh nháy khi chuyển tab. */}
            <div key={location.pathname} className="pf-page">
              {/* Suspense NGAY TRONG khung app: khi chunk của màn con đang tải, header + thanh đáy vẫn hiện (không nháy cả màn). */}
              <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--pf-border)] border-t-[color:var(--pf-primary-text)]" /></div>}>
                <Outlet />
              </Suspense>
            </div>
            {!isOnLisa && <div className="lg:hidden" style={{ height: BOTTOM_NAV_HEIGHT + 20 }} aria-hidden />}
          </div>
        </main>

        {/* Thanh điều hướng đáy (mobile/Fold gập <1024px) */}
        {!isOnLisa && <MobileBottomNav />}

        {/* Lisa AI trên mobile: nút tròn trong MobileHeader (không còn nút nổi che nội dung); desktop: sidebar. */}
      </div>

      {/* Tài liệu Hướng dẫn — render 1 lần, điều khiển qua guideStore (nút header + auto-open) */}
      <UserGuideModal open={guideOpen} onClose={closeGuide} />
    </div>
  )
}
