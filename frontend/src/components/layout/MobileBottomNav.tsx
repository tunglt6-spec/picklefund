import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home, CalendarDays, Trophy, Users, ListOrdered, BadgeCheck, Bell, Building2, CreditCard, LayoutGrid,
} from '../icons/mobileLucide'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/utils'
import { bottomTabsByRole, pathOf, type BottomTab } from './navConfig'
import { PlayfulIcon } from '../icons/PlayfulIcon'
import type { PlayfulIconName } from '../icons/playfulGlyphs'

const ICONS: Record<BottomTab['icon'], typeof Home> = {
  home: Home, calendar: CalendarDays, trophy: Trophy, community: Users, ledger: ListOrdered,
  approve: BadgeCheck, bell: Bell, club: Building2, users: Users, pay: CreditCard, apps: LayoutGrid,
}
const PLAYFUL_NAV: Record<BottomTab['icon'], PlayfulIconName> = {
  home: 'home', calendar: 'nav-calendar', trophy: 'nav-competition', community: 'nav-community',
  ledger: 'finance-report', approve: 'payment-approval', bell: 'notifications', club: 'club',
  users: 'members', pay: 'payment-settings', apps: 'apps',
}

/** Chiều cao thanh đáy (+ safe-area) — trang chừa chỗ để nội dung/nút cuối danh sách không bị che. */
export const BOTTOM_NAV_HEIGHT = 68

/** Điều hướng chính của bản mobile (<1024px): 5 mục. ≥1024px dùng Sidebar nên ẩn (lg:hidden). */
export function MobileBottomNav() {
  const user = useAuthStore((s) => s.user)
  const { pathname } = useLocation()
  // Bàn phím ảo: khi đang nhập liệu thì ẩn thanh đáy (iOS/Android không đẩy phần tử fixed lên đúng chỗ → che ô nhập/nút gửi).
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.isContentEditable || (el.matches?.('input, textarea, select') && !(el as HTMLInputElement).matches?.('[type=checkbox], [type=radio], [type=range], [type=button], [type=submit], [type=file]')))
    const on = (e: FocusEvent) => { if (isField(e.target)) setTyping(true) }
    const off = () => setTyping(false)
    document.addEventListener('focusin', on)
    document.addEventListener('focusout', off)
    return () => { document.removeEventListener('focusin', on); document.removeEventListener('focusout', off) }
  }, [])
  if (!user || typing) return null
  const tabs = bottomTabsByRole[user.role]
  if (!tabs) return null

  return (
    <nav
      aria-label="Điều hướng chính"
      className="lg-glass lg-glass-nav fixed inset-x-0 bottom-0 z-30 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex h-[60px] max-w-2xl items-stretch gap-1 px-1 py-1">
        {tabs.map((t) => {
          const Icon = ICONS[t.icon]
          const active = [pathOf(t.to), ...(t.match ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`))
          return (
            <li key={t.label} className="min-w-0 flex-1">
              <Link
                to={t.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-xs font-semibold leading-none transition-colors active:opacity-80',
                  active ? '[color:var(--pf-primary-text)]' : '[color:var(--pf-color-muted)]',
                )}
                style={active ? { background: 'var(--pf-primary-soft)' } : undefined}
              >
                {PLAYFUL_NAV[t.icon]
                  ? <PlayfulIcon name={PLAYFUL_NAV[t.icon]} size={24} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                  : <Icon size={22} strokeWidth={active ? 2.3 : 1.9} aria-hidden />}
                <span className="max-w-full truncate">{t.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
