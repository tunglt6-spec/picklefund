import { Bell } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useBrandingStore } from '../../store/brandingStore'
import { useNotifStore } from '../../store/notifStore'
import { PickleFundLogoMark } from '../ui/PickleFundLogoMark'
import { AvatarMenu } from './AvatarMenu'
import { APPS_ROUTE, LISA_ROUTES, notifRouteByRole } from './navConfig'

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

  if (!user) return null

  const lisaRoute = LISA_ROUTES[user.role]
  const circle =
    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border [background:var(--pf-surface)] [border-color:var(--pf-border)] active:scale-95'

  return (
    <header
      className="pf-glass-bar sticky top-0 z-40 flex items-center gap-2 border-b px-4"
      style={{ minHeight: 60, paddingTop: 'env(safe-area-inset-top)' }}
    >
      <button
        onClick={() => navigate(APPS_ROUTE)}
        aria-label="Trang Ứng dụng"
        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-left"
      >
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="shrink-0"><PickleFundLogoMark size={32} /></span>
        )}
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
        className={`${circle} [color:var(--pf-primary)]`}
        style={{ boxShadow: 'var(--pf-shadow-float)' }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[color:var(--pf-surface)]" />
        )}
      </button>

      <AvatarMenu size={44} rounded="rounded-full" background="var(--pf-grad-brand)" extras />
    </header>
  )
}
