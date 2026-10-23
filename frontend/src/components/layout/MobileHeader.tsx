import { Bell, Menu, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useBrandingStore } from '../../store/brandingStore'
import { useNotifStore } from '../../store/notifStore'
import { useGuideStore } from '../../store/guideStore'
import { PickleFundLogoMark } from '../ui/PickleFundLogoMark'
import { ThemeToggle } from '../shared/ThemeToggle'
import { AvatarMenu } from './AvatarMenu'

interface MobileHeaderProps {
  onMenuClick?: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const user = useAuthStore((s) => s.user)
  const branding = useBrandingStore(s => s.branding)
  const navigate = useNavigate()

  // Chuông dùng CHUNG nguồn backend (notifStore) với trang Thông báo → đọc hết là về 0.
  const unreadCount = useNotifStore((s) => s.unreadCount)
  const openGuide = useGuideStore((s) => s.openGuide)

  if (!user) return null

  const notifRoute = user.role === 'MEMBER_VIEW'
    ? '/member/notifications'
    : '/notifications'

  return (
    <header
      className="pf-glass-bar sticky top-0 z-40 border-b px-3 flex items-center justify-between"
      style={{ height: 64, paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Left: Hamburger + Logo + Name */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
        <button
          onClick={onMenuClick}
          aria-label="Mở menu"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl [background:var(--pf-surface-muted)] border border-[color:var(--pf-border)] [color:var(--pf-color-muted)] active:[background:var(--pf-color-muted-soft)]"
        >
          <Menu size={20} />
        </button>
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt={branding.displayName ?? 'Logo'} className="h-[26px] w-[26px] shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="shrink-0"><PickleFundLogoMark size={26} /></div>
        )}
        <span className="text-[15px] font-[800] [color:var(--pf-text)] tracking-tighter truncate">{branding.shortName ?? branding.displayName ?? 'PickleFund'}</span>
      </div>

      {/* Right: Hướng dẫn + Bell + Avatar */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={openGuide}
          aria-label="Hướng dẫn sử dụng"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white active:opacity-80"
          style={{ background: 'var(--pf-grad-brand)', boxShadow: '0 6px 16px -8px rgba(109,93,251,0.7)' }}
        >
          <BookOpen size={18} />
        </button>
        <ThemeToggle className="border border-[color:var(--pf-border)] [background:var(--pf-surface-muted)]" />
        <button
          onClick={() => navigate(notifRoute)}
          className="relative flex h-11 w-11 items-center justify-center rounded-xl [background:var(--pf-surface-muted)] border border-[color:var(--pf-border)] [color:var(--pf-color-muted)] active:[background:var(--pf-color-muted-soft)]"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
          )}
        </button>

        <AvatarMenu />
      </div>
    </header>
  )
}
