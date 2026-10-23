import { useEffect, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore, DEMO_CLUB_ID } from '../../store/clubDataStore'
import { useBrandingStore } from '../../store/brandingStore'
import { cn, getActiveChungPeriod } from '../../lib/utils'
import type { Role } from '../../types'
import { navByRole, roleLabels, type NavItem } from './navConfig'
import { PickleFundLogoMark } from '../ui/PickleFundLogoMark'
import api from '../../lib/api'
import { useNotifStore } from '../../store/notifStore'
import { visibleInterval } from '../../lib/visibleInterval'

interface SidebarProps { onClose?: () => void }

function useHermesUnreadCount(user: any) {
  const { unreadCount, setUnreadCount } = useNotifStore()
  const sync = useCallback(async () => {
    if (!user) return
    try {
      const res = await api.get('/hermes/notifications?limit=1')
      const data = res.data?.data ?? res.data
      setUnreadCount(Math.min(data?.unreadCount ?? 0, 9))
    } catch { /* noop */ }
  }, [user, setUnreadCount])
  useEffect(() => {
    sync()
    return visibleInterval(sync, 30000)
  }, [sync])
  return unreadCount
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user } = useAuthStore()
  const { getClubData } = useClubDataStore()
  const branding = useBrandingStore(s => s.branding)
  const navigate = useNavigate()

  // Must call all hooks before any conditional return
  const clubId = user?.clubId ?? DEMO_CLUB_ID
  const adminUnread = useHermesUnreadCount(user)
  const clubData = getClubData(clubId)

  if (!user) return null

  const activePeriod = getActiveChungPeriod(clubData.fundPeriods)

  // Badge thông báo: member → mục thông báo riêng; admin → module Hệ thống (chứa tab Thông báo).
  const notifPath = user.role === 'MEMBER_VIEW' ? '/member/notifications' : '/he-thong'
  const navItems: NavItem[] = navByRole[user.role].map(item => {
    if (item.to === notifPath && adminUnread > 0) {
      return { ...item, badge: adminUnread }
    }
    return item
  })

  // Lisa AI route theo role (super admin không có Lisa) — hiển thị nút Lisa nổi bật ở sidebar.
  const LISA_ROUTES: Partial<Record<Role, string>> = {
    CLUB_ADMIN: '/lisa', CLUB_TREASURER: '/lisa', MEMBER_VIEW: '/member/lisa',
  }
  const lisaRoute = LISA_ROUTES[user.role]

  return (
    <aside className="pf-glass-bar flex h-[100dvh] w-60 flex-col" style={{ borderRight: '1px solid var(--pf-glass-edge)' }}>

      {/* ── Logo (branding trắng nhãn — EPIC10B) ── */}
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt={branding.displayName ?? 'Logo'} className="h-[30px] w-[30px] shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="shrink-0"><PickleFundLogoMark size={30} /></div>
        )}
        <div className="leading-tight min-w-0 flex-1">
          <p className="text-sm font-bold [color:var(--pf-text)] truncate">{branding.displayName ?? 'PickleFund'}</p>
          <p className="text-xs font-medium [color:var(--pf-color-muted)] truncate">{branding.shortName ?? 'Sports Community Platform'}</p>
        </div>
      </div>

      {/* ── CLB card ── */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
        <div className="rounded-xl px-3 py-2.5 [background:var(--pf-surface-muted)]" style={{ border: '1px solid var(--color-border-soft)' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #6D5DFB, #5B4BE8)' }}>
              {(clubData.settings?.name ?? user.username ?? 'C').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold [color:var(--pf-text)] truncate leading-tight">
                {clubData.settings?.name || user.username || 'CLB của tôi'}
              </p>
              {clubData.settings?.code ? (
                <p className="text-xs mt-0.5 [color:var(--pf-color-muted)]">Mã CLB: {clubData.settings.code}</p>
              ) : (
                <span className="inline-block text-xs rounded-full px-1.5 py-px font-medium mt-0.5 [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]">
                  {roleLabels[user.role]}
                </span>
              )}
            </div>
          </div>
          {activePeriod && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs truncate [color:var(--pf-color-muted)]">Kỳ Quỹ {activePeriod.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ── (mẫu v2.1)
          Có desc ⇒ THẺ: số thứ tự + icon + tiêu đề + mô tả; active nền tím gradient, chữ
          trắng. Không desc ⇒ dòng gọn (member/treasurer nhiều mục). Glow khi hover. */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {navItems.map((item, i) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) => cn(
              'group relative flex items-center gap-2.5 rounded-2xl transition-all duration-200',
              item.desc ? 'px-2.5 py-2.5' : 'px-3 py-2.5',
              isActive
                ? 'text-white'
                : 'hover:-translate-y-px hover:[background:var(--pf-surface)] hover:ring-1 hover:ring-[color:var(--pf-primary-soft)] hover:[box-shadow:0_10px_24px_-10px_rgba(109,93,251,0.4)]'
            )}
            style={({ isActive }) => isActive
              ? { background: 'var(--pf-grad-brand)', boxShadow: '0 10px 22px -10px rgba(109,93,251,0.7)' }
              : undefined}
          >
            {({ isActive }) => (
              <>
                {/* Số thứ tự (chỉ thẻ có desc) */}
                {item.desc && (
                  <span className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs font-extrabold',
                    isActive ? 'bg-white/20 text-white' : '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] group-hover:[color:var(--pf-primary-text)]'
                  )}>
                    {i + 1}
                  </span>
                )}
                {/* Icon */}
                <span className={cn('shrink-0 transition-colors', isActive ? 'text-white' : '[color:var(--pf-color-muted)] group-hover:[color:var(--pf-primary-text)]')}>
                  {item.icon}
                </span>
                {/* Tiêu đề + mô tả */}
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm font-semibold leading-tight', isActive ? 'text-white' : '[color:var(--pf-text)]')}>
                    {item.label}
                  </p>
                  {item.desc && (
                    <p className={cn('mt-0.5 truncate text-xs leading-tight', isActive ? 'text-white/70' : '[color:var(--pf-color-muted)]')}>
                      {item.desc}
                    </p>
                  )}
                </div>
                {item.badge && (
                  <span className={cn(
                    'flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold',
                    isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white'
                  )}>
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Lisa AI (nổi bật) — chuyển từ nút nổi vào sidebar, to & dễ thấy ── */}
      {lisaRoute && (
        <div className="px-3 pb-3 pt-1" style={{ borderTop: '1px solid var(--color-border-soft)' }}>
          <button
            onClick={() => { navigate(lisaRoute); onClose?.() }}
            className="group mt-3 flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-all duration-200 hover:-translate-y-px"
            style={{ background: 'linear-gradient(135deg, var(--pf-primary-soft), var(--pf-surface))', border: '1px solid var(--pf-primary-soft)' }}
          >
            <img
              src="/lisa-avatar.jpg?v=2"
              alt="Lisa AI"
              className="h-12 w-12 shrink-0 rounded-full object-cover"
              style={{ border: '2px solid var(--pf-surface)', boxShadow: '0 6px 16px -6px rgba(109,93,251,0.65)' }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight [color:var(--pf-primary-text)]">Lisa AI</p>
              <p className="truncate text-xs leading-tight [color:var(--pf-color-muted)]">Trợ lý AI · hỏi đáp nhanh</p>
            </div>
            <Sparkles size={16} className="shrink-0 [color:var(--pf-primary-text)]" />
          </button>
        </div>
      )}
    </aside>
  )
}
