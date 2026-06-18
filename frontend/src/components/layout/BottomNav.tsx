import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, DollarSign,
  CheckSquare, BarChart3, Building2, ScrollText,
  Receipt, ListOrdered, Bell, CreditCard,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import type { Role } from '../../types'

interface NavItem { label: string; icon: React.ReactNode; to: string }

const adminNav: NavItem[] = [
  { label: 'Tổng quan',  icon: <LayoutDashboard size={22} />, to: '/dashboard' },
  { label: 'Thành viên', icon: <Users size={22} />,           to: '/members' },
  { label: 'Điểm danh',  icon: <CheckSquare size={22} />,     to: '/attendance' },
  { label: 'Thu chi',    icon: <DollarSign size={22} />,       to: '/contributions' },
  { label: 'Báo cáo',   icon: <BarChart3 size={22} />,        to: '/reports' },
]

const treasurerNav: NavItem[] = [
  { label: 'Tổng quan', icon: <LayoutDashboard size={22} />, to: '/treasurer/dashboard' },
  { label: 'Nhập thu',  icon: <DollarSign size={22} />,      to: '/treasurer/income' },
  { label: 'Nhập chi',  icon: <CreditCard size={22} />,      to: '/treasurer/expense' },
  { label: 'Sổ quỹ',   icon: <ListOrdered size={22} />,     to: '/treasurer/ledger' },
]

const memberNav: NavItem[] = [
  { label: 'Tổng quan',   icon: <LayoutDashboard size={22} />, to: '/member/dashboard' },
  { label: 'Phiếu thu',   icon: <Receipt size={22} />,         to: '/member/receipt' },
  { label: 'Đóng quỹ',   icon: <DollarSign size={22} />,      to: '/member/contributions' },
  { label: 'Lịch chơi',  icon: <Calendar size={22} />,         to: '/member/attendance' },
  { label: 'Thông báo',  icon: <Bell size={22} />,             to: '/member/notifications' },
]

const superNav: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={22} />, to: '/super/dashboard' },
  { label: 'CLB',       icon: <Building2 size={22} />,       to: '/super/clubs' },
  { label: 'Users',     icon: <Users size={22} />,           to: '/super/users' },
  { label: 'Logs',      icon: <ScrollText size={22} />,      to: '/super/audit-logs' },
]

const navByRole: Record<Role, NavItem[]> = {
  SUPER_ADMIN: superNav,
  CLUB_ADMIN: adminNav,
  CLUB_TREASURER: treasurerNav,
  CLUB_MEMBER: memberNav,
}

export function BottomNav() {
  const { user } = useAuthStore()
  if (!user) return null

  const items = navByRole[user.role]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch" style={{ height: 60 }}>
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
          >
            {({ isActive }) => (
              <>
                {/* Active pill */}
                {isActive && (
                  <span
                    className="absolute top-1 left-1/2 -translate-x-1/2 h-8 w-14 rounded-full"
                    style={{ background: 'linear-gradient(135deg,rgba(79,70,229,0.12),rgba(6,182,212,0.12))' }}
                  />
                )}

                {/* Icon */}
                <span className={`relative z-10 transition-all duration-150 ${
                  isActive ? 'scale-105' : ''
                }`} style={{ color: isActive ? '#4F46E5' : '#94A3B8' }}>
                  {item.icon}
                </span>

                {/* Label */}
                <span
                  className="text-[11px] font-[600] leading-none"
                  style={{ color: isActive ? '#4F46E5' : '#94A3B8' }}
                >
                  {item.label}
                </span>

                {/* Active dot */}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: '#4F46E5' }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
