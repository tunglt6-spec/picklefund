import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, DollarSign, CreditCard,
  CheckSquare, BarChart3, Settings, LogOut, Building2,
  Bell, ScrollText, Receipt, ListOrdered, ChevronDown,
  Zap, Star, Trophy,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore, DEMO_CLUB_ID } from '../../store/clubDataStore'
import { cn } from '../../lib/utils'
import type { Role } from '../../types'
import { PickleFundLogoMark } from '../ui/PickleFundLogoMark'

interface NavItem {
  label: string
  icon: React.ReactNode
  to: string
  badge?: number
}

const superAdminNav: NavItem[] = [
  { label: 'Tổng quan',    icon: <LayoutDashboard size={18} />, to: '/super/dashboard' },
  { label: 'Quản lý CLB',  icon: <Building2 size={18} />,       to: '/super/clubs' },
  { label: 'Người dùng',   icon: <Users size={18} />,           to: '/super/users' },
  { label: 'Audit Logs',   icon: <ScrollText size={18} />,      to: '/super/audit-logs' },
  { label: 'Cài đặt',     icon: <Settings size={18} />,         to: '/super/settings' },
]

const clubAdminBaseNav: NavItem[] = [
  { label: 'Tổng quan',   icon: <LayoutDashboard size={18} />, to: '/dashboard' },
  { label: 'Thành viên',  icon: <Users size={18} />,           to: '/members' },
  { label: 'Kỳ Quỹ',     icon: <Calendar size={18} />,        to: '/fund-periods' },
  { label: 'Thu Quỹ',    icon: <DollarSign size={18} />,      to: '/contributions' },
  { label: 'Chi Phí',    icon: <CreditCard size={18} />,      to: '/expenses' },
  { label: 'Điểm Danh',  icon: <CheckSquare size={18} />,     to: '/attendance' },
  { label: 'Minigame',   icon: <Trophy size={18} />,           to: '/minigames' },
  { label: 'Báo Cáo',   icon: <BarChart3 size={18} />,        to: '/reports' },
  { label: 'Thông báo',  icon: <Bell size={18} />,            to: '/notifications' },
  { label: 'Cài đặt',   icon: <Settings size={18} />,         to: '/settings' },
]

const treasurerNav: NavItem[] = [
  { label: 'Tổng quan', icon: <LayoutDashboard size={18} />, to: '/treasurer/dashboard' },
  { label: 'Nhập Thu',  icon: <DollarSign size={18} />,      to: '/treasurer/income' },
  { label: 'Nhập Chi',  icon: <CreditCard size={18} />,      to: '/treasurer/expense' },
  { label: 'Sổ Quỹ',   icon: <ListOrdered size={18} />,     to: '/treasurer/ledger' },
  { label: 'Nhắc Nhở',  icon: <Bell size={18} />,           to: '/treasurer/reminders' },
]

const memberNav: NavItem[] = [
  { label: 'Tổng Quan',     icon: <LayoutDashboard size={18} />, to: '/member/dashboard' },
  { label: 'Phiếu Thu',     icon: <Receipt size={18} />,         to: '/member/receipt' },
  { label: 'Lịch sử Đóng',  icon: <DollarSign size={18} />,     to: '/member/contributions' },
  { label: 'Lịch Tham Gia', icon: <Calendar size={18} />,        to: '/member/attendance' },
  { label: 'Thông báo',     icon: <Bell size={18} />,            to: '/member/notifications' },
]

const navByRole: Record<Role, NavItem[]> = {
  SUPER_ADMIN: superAdminNav,
  CLUB_ADMIN: clubAdminBaseNav,
  CLUB_TREASURER: treasurerNav,
  CLUB_MEMBER: memberNav,
}

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  CLUB_ADMIN: 'Club Admin',
  CLUB_TREASURER: 'Thủ Quỹ',
  CLUB_MEMBER: 'Thành Viên',
}

const roleColors: Record<Role, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  CLUB_ADMIN:  'bg-indigo-100 text-indigo-700',
  CLUB_TREASURER: 'bg-emerald-100 text-emerald-700',
  CLUB_MEMBER: 'bg-slate-100 text-slate-600',
}

interface SidebarProps { onClose?: () => void }

function useUnreadCount(clubId: string) {
  const { getClubData, readNotifIds } = useClubDataStore()
  const data = getClubData(clubId)
  const readIds = new Set<string>(readNotifIds[clubId] ?? [])

  const activePeriod = data.fundPeriods.find(p => p.status === 'active')

  const unconfirmedCount = data.contributions
    .filter(c => !c.isConfirmed && !readIds.has(`pay-${c.id}`))
    .length

  const upcomingUnread = data.sessions
    .filter(s => s.status === 'scheduled' && !readIds.has(`sess-${s.id}`))
    .length

  const periodWarning = activePeriod && !readIds.has(`warn-period-${activePeriod.id}`) ? 1 : 0

  return Math.min(unconfirmedCount + (upcomingUnread > 0 ? 1 : 0) + periodWarning, 9)
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const { getClubData } = useClubDataStore()
  const navigate = useNavigate()

  // Must call all hooks before any conditional return
  const clubId = user?.clubId ?? DEMO_CLUB_ID
  const adminUnread = useUnreadCount(clubId)
  const clubData = getClubData(clubId)

  if (!user) return null

  const activePeriod = clubData.fundPeriods.find(p => p.status === 'active')

  const navItems: NavItem[] = navByRole[user.role].map(item => {
    if (item.to === '/notifications' && user.role === 'CLUB_ADMIN' && adminUnread > 0) {
      return { ...item, badge: adminUnread }
    }
    return item
  })

  const initials = user.username?.slice(0, 2).toUpperCase() ?? 'U'

  const handleLogout = () => {
    logout()
    navigate('/login')
    onClose?.()
  }

  return (
    <aside className="flex h-screen w-60 flex-col bg-white border-r border-slate-100">

      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <PickleFundLogoMark size={30} />
        <div className="leading-tight">
          <p className="text-sm font-bold text-slate-900">PickleFund</p>
          <p className="text-[10px] text-slate-400 font-medium">Sports Community Platform</p>
        </div>
      </div>

      {/* ── CLB card ── */}
      <div className="px-3 py-3 border-b border-slate-100">
        <div className="rounded-xl px-3 py-2.5" style={{ background: 'linear-gradient(135deg, #4F46E510, #06B6D415)', border: '1px solid #4F46E520' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)' }}>
              {(clubData.settings?.name ?? user.username ?? 'C').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                {clubData.settings?.name || user.username || 'CLB của tôi'}
              </p>
              {clubData.settings?.code ? (
                <p className="text-[10px] text-slate-400 mt-0.5">Mã CLB: {clubData.settings.code}</p>
              ) : (
                <span className={cn('inline-block text-[10px] rounded-full px-1.5 py-px font-medium mt-0.5', roleColors[user.role])}>
                  {roleLabels[user.role]}
                </span>
              )}
            </div>
          </div>
          {activePeriod && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-500 truncate">Kỳ Quỹ {activePeriod.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
              isActive
                ? 'text-white shadow-sm shadow-indigo-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
            style={({ isActive }: { isActive: boolean }) => isActive ? {
              background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
              borderLeft: '3px solid #06B6D4',
            } : {}}
          >
            {({ isActive }) => (
              <>
                <span className={cn('shrink-0 transition-colors', isActive ? 'text-white' : 'text-slate-400')}>
                  {item.icon}
                </span>
                <span className="flex-1 leading-none">{item.label}</span>
                {item.badge && !isActive && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Plan info ── */}
      <div className="mx-3 mb-3 rounded-xl p-3.5 text-white" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Star size={13} className="text-yellow-300" />
          <span className="text-xs font-semibold">Gói Professional</span>
        </div>
        <p className="text-[10px] text-indigo-200 mb-2.5">Còn 245 ngày sử dụng</p>
        <button className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors py-1.5 text-xs font-semibold">
          <Zap size={12} />Nâng cấp gói
        </button>
      </div>

      {/* ── User profile + Logout ── */}
      <div className="border-t border-slate-100 p-3 space-y-1">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer group">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white text-xs font-bold select-none">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{user.username}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.email ?? `admin@pbh.vn`}</p>
          </div>
          <ChevronDown size={13} className="text-slate-300 shrink-0 group-hover:text-slate-500" />
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} />
          <span className="text-xs">Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}
