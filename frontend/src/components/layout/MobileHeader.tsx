import { useEffect, useState } from 'react'
import { Bell, ChevronLeft } from '../icons/mobileLucide'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useBrandingStore } from '../../store/brandingStore'
import { useNotifStore } from '../../store/notifStore'
import { BrandLogo } from '../ui/BrandLogo'
import { AvatarMenu } from './AvatarMenu'
import { APPS_ROUTE, LISA_ROUTES, notifRouteByRole } from './navConfig'

/** Màn chi tiết (không nằm trên thanh đáy/trang hub) → hiện nút Quay lại. */
const DETAIL_PATHS = [/^\/minigames\/.+/, /^\/super\/clubs\/.+/, /^\/admin\/.+/]

/**
 * Header mobile (<1024px) — cùng ngôn ngữ trang Ứng dụng (Modern Enterprise Super App):
 * thương hiệu bên trái; Lisa (tròn) + chuông (tròn) + avatar (tròn gradient) bên phải.
 * Hướng dẫn, giao diện sáng/tối, "Tất cả chức năng" nằm trong menu avatar. Không còn nút ☰
 * (đã có thanh đáy + trang Ứng dụng).
 */
export function MobileHeader() {
  const user = useAuthStore((s) => s.user)
  const branding = useBrandingStore((s) => s.branding)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Chuông dùng CHUNG nguồn backend (notifStore) với trang Thông báo → đọc hết là về 0.
  const unreadCount = useNotifStore((s) => s.unreadCount)
  // Header: nền rõ ở đầu trang → kính mờ khi nội dung đã cuộn (nghe sự kiện cuộn của vùng nội dung).
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = (e: Event) => { const t = e.target as HTMLElement | null; if (t && 'scrollTop' in t) setScrolled(t.scrollTop > 4) }
    document.addEventListener('scroll', on, true)
    return () => document.removeEventListener('scroll', on, true)
  }, [])

  if (!user) return null

  const lisaRoute = LISA_ROUTES[user.role]
  const isDetail = pathname !== '/admin/ai-manager' && DETAIL_PATHS.some((re) => re.test(pathname))
  const circle =
    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border [background:var(--pf-surface)] [border-color:var(--pf-border)] active:scale-95'

  return (
    <header
      data-scrolled={scrolled}
      className="lg-glass-head sticky top-0 z-40 px-4"
      style={{ minHeight: 60, paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex w-full max-w-2xl items-center gap-2">
      {isDetail && (
        <button
          onClick={() => { if ((window.history.state?.idx ?? 0) > 0) navigate(-1); else navigate(APPS_ROUTE) }}
          aria-label="Quay lại"
          className={`pf-global-back ${circle} [color:var(--pf-primary-text)]`}
          style={{ boxShadow: 'var(--pf-shadow-float)' }}
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <button
        onClick={() => navigate(APPS_ROUTE)}
        aria-label="Trang Ứng dụng"
        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-left"
      >
        <BrandLogo src={branding.logoUrl} size={32} />
        <span className="truncate text-[18px] font-[800] tracking-tight [color:var(--pf-text)]">
          {branding.shortName ?? branding.displayName ?? 'PickleFund'}
        </span>
      </button>

      {lisaRoute && pathname !== lisaRoute && (
        <button
          onClick={() => navigate(lisaRoute)}
          aria-label="Hỏi Lisa AI"
          className={`${circle} overflow-hidden p-0`}
          style={{ boxShadow: 'var(--pf-shadow-pill)', borderColor: 'var(--pf-primary-soft)' }}
        >
          <img src="/lisa-avatar.jpg?v=2" alt="" className="h-full w-full object-cover object-top" />
        </button>
      )}

      <button
        onClick={() => navigate(notifRouteByRole[user.role])}
        aria-label="Thông báo"
        className={`${circle} [color:var(--pf-primary-text)]`}
        style={{ boxShadow: 'var(--pf-shadow-float)' }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[color:var(--pf-surface)]" />
        )}
      </button>

      <AvatarMenu size={44} rounded="rounded-full" background="var(--pf-grad-brand)" extras />
      </div>
    </header>
  )
}
