import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, DollarSign,
  CheckSquare, BarChart3, Building2, ScrollText,
  Receipt, ListOrdered, CreditCard, Bell,
  Menu, Settings, Trophy,
  Coins, CalendarDays, CalendarPlus, ClipboardCheck, Activity, History, Wallet, Award, Cpu,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import type { Role } from '../../types'

interface NavItem { label: string; icon: React.ReactNode; to: string }

const adminNav: NavItem[] = [
  { label: 'Tổng quan',  icon: <LayoutDashboard size={22} />, to: '/dashboard' },
  { label: 'Điểm danh',  icon: <CheckSquare size={22} />,     to: '/attendance' },
  { label: 'Thu chi',    icon: <DollarSign size={22} />,       to: '/thu-chi' },
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
  { label: 'Lịch chơi',  icon: <Calendar size={22} />,         to: '/member/attendance' },
  { label: 'Thông báo',  icon: <Bell size={22} />,             to: '/member/notifications' },
]

// Drawer "Thêm" — danh mục mở rộng theo role.
const moreItemsByRole: Partial<Record<Role, { label: string; icon: React.ReactNode; to: string }[]>> = {
  CLUB_ADMIN: [
    { label: 'Thành viên', icon: <Users size={20} />, to: '/members' },
    { label: 'Kỳ quỹ', icon: <Calendar size={20} />, to: '/fund-periods' },
    { label: 'Cài đặt', icon: <Settings size={20} />, to: '/settings' },
    { label: 'Thông báo', icon: <Bell size={20} />, to: '/notifications' },
    { label: 'Minigame', icon: <Trophy size={20} />, to: '/minigames' },
    { label: 'Chấm điểm', icon: <Award size={20} />, to: '/scoring' },
    { label: 'AI Digital Office', icon: <Cpu size={20} />, to: '/aido' },
  ],
  MEMBER_VIEW: [
    { label: 'Đóng quỹ', icon: <DollarSign size={20} />, to: '/member/contributions' },
    { label: 'Công nợ', icon: <Coins size={20} />, to: '/debts' },
    { label: 'Lịch sinh hoạt', icon: <CalendarDays size={20} />, to: '/schedule' },
    { label: 'Đăng ký buổi', icon: <CalendarPlus size={20} />, to: '/session-registration' },
    { label: 'Check-in', icon: <ClipboardCheck size={20} />, to: '/check-in' },
    { label: 'Hoạt động tuần', icon: <Activity size={20} />, to: '/activity' },
    { label: 'Minigame', icon: <Trophy size={20} />, to: '/minigames' },
    { label: 'Lịch sử thi đấu', icon: <History size={20} />, to: '/match-history' },
    // Nhóm xem tài chính toàn CLB (CHỈ XEM)
    { label: 'Tài chính', icon: <Wallet size={20} />, to: '/finance-dashboard' },
    { label: 'Kỳ quỹ', icon: <Calendar size={20} />, to: '/fund-periods' },
    { label: 'Thu quỹ', icon: <DollarSign size={20} />, to: '/contributions' },
    { label: 'Chi phí', icon: <CreditCard size={20} />, to: '/expenses' },
    { label: 'Báo cáo', icon: <BarChart3 size={20} />, to: '/reports' },
    { label: 'Chấm điểm', icon: <Award size={20} />, to: '/scoring' },
  ],
}

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
  MEMBER_VIEW: memberNav,
}

export function BottomNav() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [showMore, setShowMore] = useState(false)
  if (!user) return null

  const items = navByRole[user.role]
  const moreItems = moreItemsByRole[user.role] ?? []
  const hasMore = moreItems.length > 0

  return (
    <>
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
                      className="absolute top-1 left-1/2 -translate-x-1/2 h-8 w-14 rounded-full [background:var(--pf-primary-soft)]"
                    />
                  )}

                  {/* Icon */}
                  <span className={`relative z-10 transition-all duration-150 ${
                    isActive ? 'scale-105 [color:var(--pf-primary)]' : '[color:var(--pf-color-muted)]'
                  }`}>
                    {item.icon}
                  </span>

                  {/* Label */}
                  <span
                    className={`text-[11px] font-[600] leading-none ${isActive ? '[color:var(--pf-primary)]' : '[color:var(--pf-color-muted)]'}`}
                  >
                    {item.label}
                  </span>

                  {/* Active dot */}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full [background:var(--pf-primary)]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
          {hasMore && (
            <button
              onClick={() => setShowMore(true)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors text-slate-400"
            >
              <Menu size={22} />
              <span className="text-[10px] font-[600]">Thêm</span>
            </button>
          )}
        </div>
      </nav>

      {hasMore && showMore && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowMore(false)} />
          {/* Drawer */}
          <div className="fixed bottom-16 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-slate-100 p-4 pb-6">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="text-[12px] font-[700] text-slate-400 uppercase tracking-wider mb-3 px-1">
              Điều hướng
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map(item => (
                <button
                  key={item.to}
                  onClick={() => { navigate(item.to); setShowMore(false) }}
                  className="flex flex-col items-center gap-1.5 p-3 min-h-11 rounded-[14px] bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="[color:var(--pf-primary)]">{item.icon}</span>
                  <span className="text-[11px] font-[600] text-slate-700">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
