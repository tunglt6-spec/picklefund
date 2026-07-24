/**
 * DesktopHeader (mẫu v2.1) — thanh header trên cùng cho DESKTOP: ô tìm kiếm + chuông (badge
 * chưa đọc) + toàn màn hình + avatar CLB (dropdown: thông tin + đăng xuất). Đặt trong
 * AppLayout để MỌI màn đều có, đồng nhất. Ẩn trên mobile (đã có MobileHeader).
 */
import { useState, useRef, useEffect } from 'react'
import { Search, Bell, Maximize2, Minimize2, LogOut, User, ChevronDown, Zap, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore } from '../../store/clubDataStore'
import { useNotifStore } from '../../store/notifStore'
import { useGuideStore } from '../../store/guideStore'
import { cn } from '../../lib/utils'

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', CLUB_ADMIN: 'Quản trị CLB',
  CLUB_TREASURER: 'Thủ quỹ', MEMBER_VIEW: 'Thành viên',
}

// Điều hướng theo role (module gom v2.1).
const notifRouteByRole: Record<string, string> = {
  MEMBER_VIEW: '/member/notifications',
  CLUB_ADMIN: '/he-thong?tab=notifications',
  CLUB_TREASURER: '/treasurer/reminders',
  SUPER_ADMIN: '/super/dashboard',
}
const searchRouteByRole: Record<string, string> = {
  MEMBER_VIEW: '/member/dashboard',
  CLUB_ADMIN: '/thanh-vien',
  CLUB_TREASURER: '/treasurer/dashboard',
  SUPER_ADMIN: '/super/users',
}

export function DesktopHeader() {
  const { user, logout } = useAuthStore()
  const { getClubData } = useClubDataStore()
  // Chuông dùng CHUNG nguồn với trang Thông báo + Sidebar (backend Hermes qua notifStore) → đọc
  // hết trên trang (read-all) là chuông về 0. (Trước đây đếm buildNotifications client → lệch.)
  const unread = useNotifStore((s) => s.unreadCount)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [isFull, setIsFull] = useState(false)
  const openGuide = useGuideStore((s) => s.openGuide)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  useEffect(() => {
    const h = () => setIsFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  if (!user) return null

  const clubId = user.clubId ?? ''
  const data = getClubData(clubId)

  const code = data.settings?.code ?? data.settings?.name ?? user.username ?? 'CLB'
  const avatarText = String(code).replace(/\s+/g, '').slice(0, 3).toUpperCase() || 'CLB'

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors [border-color:var(--pf-border)] text-slate-500 hover:[color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)] hover:[border-color:var(--pf-primary-soft)]'

  return (
    <header className="hidden md:flex h-14 shrink-0 items-center justify-end gap-2 border-b bg-white px-6" style={{ borderColor: 'var(--pf-border)' }}>
      {/* Hướng dẫn sử dụng — hiện cho MỌI vai trò, đặt đầu nhóm để dễ thấy khi mới vào app */}
      <button
        onClick={openGuide}
        className="mr-1 flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-colors [border-color:var(--pf-primary-soft)] [color:var(--pf-primary)] [background:var(--pf-primary-soft)] hover:[background:var(--pf-primary)] hover:text-white"
        title="Hướng dẫn sử dụng app"
      >
        <BookOpen size={15} /> Hướng dẫn
      </button>
      {user.role === 'CLUB_ADMIN' && (
        <button
          onClick={() => navigate('/he-thong?tab=billing')}
          className="mr-1 flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-white transition-transform active:scale-95"
          style={{ background: 'linear-gradient(135deg,#6D5DFB,#5B4BE8)', boxShadow: '0 6px 16px -8px rgba(109,93,251,0.7)' }}
          title="Nâng cấp gói"
        >
          <Zap size={15} /> Nâng cấp gói
        </button>
      )}
      <button onClick={() => navigate(searchRouteByRole[user.role] ?? '/')} className={iconBtn} title="Tìm kiếm" aria-label="Tìm kiếm">
        <Search size={17} />
      </button>

      <button onClick={() => navigate(notifRouteByRole[user.role] ?? '/')} className={cn(iconBtn, 'relative')} title="Thông báo" aria-label="Thông báo">
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <button onClick={toggleFullscreen} className={iconBtn} title={isFull ? 'Thoát toàn màn hình' : 'Toàn màn hình'} aria-label="Toàn màn hình">
        {isFull ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
      </button>

      {/* Avatar CLB + dropdown */}
      <div className="relative ml-1" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 items-center gap-2.5 rounded-2xl py-1 pl-1.5 pr-2.5 text-white transition-transform active:scale-95"
          style={{ background: 'linear-gradient(135deg,#6D5DFB,#5B4BE8)' }}
          title={user.username ?? 'Tài khoản'}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 text-[13px] font-extrabold">
            {(user.username ?? avatarText).slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 text-left leading-tight">
            <p className="max-w-[150px] truncate text-[13px] font-bold">{user.username}</p>
            <p className="max-w-[150px] truncate text-[10px] font-medium text-white/75">
              {ROLE_LABEL[user.role] ?? user.role}{data.settings?.code ? ` · ${data.settings.code}` : ''}
            </p>
          </div>
          <ChevronDown size={15} className="shrink-0 text-white/70" />
        </button>

        {open && (
          <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border bg-white shadow-xl" style={{ borderColor: 'var(--pf-border)' }}>
            <div className="border-b px-4 py-3" style={{ borderColor: 'var(--pf-border-soft, #eef0f4)' }}>
              <div className="text-sm font-semibold text-slate-900 truncate">{user.username}</div>
              <div className="text-xs text-slate-400">{ROLE_LABEL[user.role] ?? user.role}</div>
            </div>
            <button
              onClick={() => { setOpen(false); navigate(user.role === 'MEMBER_VIEW' ? '/member/dashboard' : '/') }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"
            >
              <User size={15} className="text-slate-400" /> Trang chính
            </button>
            <button
              onClick={() => { setOpen(false); logout(); navigate('/login', { replace: true }) }}
              className="flex w-full items-center gap-3 border-t px-4 py-3 text-sm text-red-500 hover:bg-red-50"
              style={{ borderColor: 'var(--pf-border-soft, #eef0f4)' }}
            >
              <LogOut size={15} /> Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
