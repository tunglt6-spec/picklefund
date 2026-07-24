import { useState, useRef, useEffect } from 'react'
import { Bell, LogOut, User, Menu, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useBrandingStore } from '../../store/brandingStore'
import { useNotifStore } from '../../store/notifStore'
import { PickleFundLogoMark } from '../ui/PickleFundLogoMark'
import { UserGuideModal } from '../help/UserGuideModal'

interface MobileHeaderProps {
  onMenuClick?: () => void
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', CLUB_ADMIN: 'Quản trị CLB',
  CLUB_TREASURER: 'Thủ quỹ', MEMBER_VIEW: 'Thành viên',
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const { user, logout } = useAuthStore()
  const branding = useBrandingStore(s => s.branding)
  const navigate = useNavigate()

  // Chuông dùng CHUNG nguồn backend (notifStore) với trang Thông báo → đọc hết là về 0.
  const unreadCount = useNotifStore((s) => s.unreadCount)
  const [open, setOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!user) return null

  const initials = user.username ? user.username.slice(0, 2).toUpperCase() : 'U'

  const notifRoute = user.role === 'MEMBER_VIEW'
    ? '/member/notifications'
    : user.role === 'SUPER_ADMIN'
      ? '/super/dashboard'
      : '/notifications'

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 flex items-center justify-between"
      style={{ height: 64, paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Left: Hamburger + Logo + Name */}
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
        <button
          onClick={onMenuClick}
          aria-label="Mở menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-600 active:bg-slate-100"
        >
          <Menu size={20} />
        </button>
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt={branding.displayName ?? 'Logo'} className="h-[26px] w-[26px] shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="shrink-0"><PickleFundLogoMark size={26} /></div>
        )}
        <span className="text-[18px] font-[800] text-slate-900 tracking-tight truncate">{branding.shortName ?? branding.displayName ?? 'PickleFund'}</span>
      </div>

      {/* Right: Hướng dẫn + Bell + Avatar */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setGuideOpen(true)}
          aria-label="Hướng dẫn sử dụng"
          className="flex h-9 w-9 items-center justify-center rounded-xl border [border-color:var(--pf-primary-soft)] [color:var(--pf-primary)] [background:var(--pf-primary-soft)] active:opacity-80"
        >
          <BookOpen size={18} />
        </button>
        <UserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
        <button
          onClick={() => navigate(notifRoute)}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-500 active:bg-slate-100"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
          )}
        </button>

        {/* Avatar with dropdown */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-[800] text-white active:opacity-80"
            style={{ background: 'var(--pf-primary)' }}
          >
            {initials}
          </button>

          {open && (
            <div className="absolute right-0 top-11 w-52 rounded-2xl bg-white border border-slate-100 shadow-xl shadow-slate-200/60 overflow-hidden z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-slate-50">
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center text-[11px] font-[800] text-white shrink-0"
                    style={{ background: 'var(--pf-primary)' }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{user.username}</div>
                    <div className="text-xs text-slate-400">{ROLE_LABEL[user.role] ?? user.role}</div>
                  </div>
                </div>
              </div>

              {/* Profile link */}
              <button
                onClick={() => { setOpen(false); navigate(user.role === 'MEMBER_VIEW' ? '/member/dashboard' : '/dashboard') }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 active:bg-slate-100"
              >
                <User size={15} className="text-slate-400" />
                Trang cá nhân
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 active:bg-red-100 border-t border-slate-50"
              >
                <LogOut size={15} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
