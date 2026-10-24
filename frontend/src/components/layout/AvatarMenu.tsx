import { useState, useRef, useEffect } from 'react'
import { LogOut, User, LayoutGrid, BookOpen, Moon, Sun } from '../icons/mobileLucide'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useGuideStore } from '../../store/guideStore'
import { useThemeStore } from '../../store/themeStore'
import { APPS_ROUTE } from './navConfig'

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', CLUB_ADMIN: 'Quản trị CLB',
  CLUB_TREASURER: 'Thủ quỹ', MEMBER_VIEW: 'Thành viên',
}

const ITEM = 'flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-sm active:[background:var(--pf-color-muted-soft)]'

interface AvatarMenuProps {
  size?: number
  rounded?: string
  background?: string
  /** Thêm: Tất cả chức năng · Hướng dẫn · Giao diện sáng/tối (dùng ở header mobile). */
  extras?: boolean
}

/** Nút avatar + menu (Trang cá nhân / Đăng xuất) — dùng chung cho header mobile và trang Ứng dụng. */
export function AvatarMenu({ size = 44, rounded = 'rounded-xl', background = 'var(--pf-primary)', extras = false }: AvatarMenuProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const openGuide = useGuideStore((s) => s.openGuide)
  const { theme, setTheme } = useThemeStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
      document.removeEventListener('keydown', onKey)
    }
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
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Tài khoản"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center justify-center ${rounded} text-xs font-[800] text-white active:opacity-80`}
        style={{ background, width: size, height: size, boxShadow: 'var(--pf-shadow-pill)' }}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu" className="pf-glass-strong absolute right-0 top-[calc(100%+6px)] z-50 w-60 overflow-y-auto overflow-x-hidden rounded-2xl shadow-xl"
          style={{ maxHeight: 'calc(100dvh - 96px)' }}
        >
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

          {extras && (
            <>
              <button onClick={() => { setOpen(false); navigate(APPS_ROUTE) }} className={`${ITEM} [color:var(--pf-text)]`}>
                <LayoutGrid size={16} className="[color:var(--pf-primary-text)]" />
                Tất cả chức năng
              </button>
              <button onClick={() => { setOpen(false); openGuide() }} className={`${ITEM} [color:var(--pf-text)]`}>
                <BookOpen size={16} className="[color:var(--pf-primary-text)]" />
                Hướng dẫn sử dụng
              </button>
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`${ITEM} [color:var(--pf-text)]`}>
                {theme === 'dark'
                  ? <Sun size={16} className="[color:var(--pf-primary-text)]" />
                  : <Moon size={16} className="[color:var(--pf-primary-text)]" />}
                {theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
              </button>
            </>
          )}

          <button
            onClick={() => { setOpen(false); navigate(user.role === 'MEMBER_VIEW' ? '/member/dashboard' : '/dashboard') }}
            className={`${ITEM} [color:var(--pf-color-muted)]`}
          >
            <User size={15} />
            Trang cá nhân
          </button>

          <button
            onClick={handleLogout}
            className={`${ITEM} border-t border-[color:var(--pf-border-soft)] [color:var(--pf-color-danger)]`}
          >
            <LogOut size={15} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}
