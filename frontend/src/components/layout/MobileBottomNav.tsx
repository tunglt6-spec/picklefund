import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, CalendarDays, Trophy, Users, ListOrdered, BadgeCheck, Bell, Building2, CreditCard, LayoutGrid,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/utils'
import { bottomTabsByRole, type BottomTab } from './navConfig'

const ICONS: Record<BottomTab['icon'], typeof Home> = {
  home: Home, calendar: CalendarDays, trophy: Trophy, community: Users, ledger: ListOrdered,
  approve: BadgeCheck, bell: Bell, club: Building2, users: Users, pay: CreditCard, apps: LayoutGrid,
}

/** Thanh điều hướng đáy của bản mobile (<1024px). Cao cố định BOTTOM_NAV_HEIGHT (+ safe-area) để trang chừa chỗ. */
export const BOTTOM_NAV_HEIGHT = 76

export function MobileBottomNav() {
  const user = useAuthStore((s) => s.user)
  const { pathname } = useLocation()
  if (!user) return null
  const tabs = bottomTabsByRole[user.role]
  if (!tabs) return null

  return (
    <nav
      aria-label="Điều hướng chính"
      className="pf-glass-bar fixed inset-x-0 bottom-0 z-30 border-t px-2 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', borderRadius: '24px 24px 0 0' }}
    >
      <ul className="mx-auto flex h-[64px] max-w-2xl items-stretch gap-1 py-1.5">
        {tabs.map((t) => {
          const Icon = ICONS[t.icon]
          const active = pathname === t.to || (t.to !== '/' && pathname.startsWith(`${t.to}/`))
          return (
            <li key={t.to} className="min-w-0 flex-1">
              <NavLink
                to={t.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-semibold leading-none transition-colors active:scale-[0.97]',
                  active ? '[color:var(--pf-primary)]' : '[color:var(--pf-color-muted)]',
                )}
                style={active ? { background: 'var(--pf-primary-soft)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--pf-primary) 18%, transparent)' } : undefined}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.9} />
                <span className="max-w-full truncate">{t.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
