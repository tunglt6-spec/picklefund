import { useState, useRef, useEffect } from 'react'
import { LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', CLUB_ADMIN: 'Quản trị CLB',
  CLUB_TREASURER: 'Thủ quỹ', MEMBER_VIEW: 'Thành viên',
}

/** Nút avatar + menu (Trang cá nhân / Đăng xuất) — dùng chung cho header mobile và trang Ứng dụng. */
export function AvatarMenu({ size = 44, rounded = 'rounded-xl', background = 'var(--pf-primary)' }: { size?: number; rounded?: string; background?: string }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
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

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Tài khoản"
        className={`flex items-center justify-center ${rounded} text-xs font-[800] text-white active:opacity-80`}
        style={{ background, width: size, height: size }}
      >
        {initials}
      </button>

      {open && (
        <div className="pf-glass-strong absolute right-0 top-[calc(100%+6px)] z-50 w-52 overflow-hidden rounded-2xl shadow-xl">
          <div className="border-b border-[color:var(--pf-border-soft)] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-[800] text-white"
                style={{ background: 'var(--pf-primary)' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold [color:var(--pf-text)]">{user.username}</div>
                <div className="text-xs [color:var(--pf-color-muted)]">{ROLE_LABEL[user.role] ?? user.role}</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setOpen(false); navigate(user.role === 'MEMBER_VIEW' ? '/member/dashboard' : '/dashboard') }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)] active:[background:var(--pf-color-muted-soft)]"
          >
            <User size={15} />
            Trang cá nhân
          </button>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 border-t border-[color:var(--pf-border-soft)] px-4 py-3 text-sm [color:var(--pf-color-danger)] hover:[background:var(--pf-color-danger-soft)] active:[background:var(--pf-color-danger-soft)]"
          >
            <LogOut size={15} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}
