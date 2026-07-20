import { useEffect, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, DollarSign, CreditCard,
  BarChart3, Settings, LogOut, Building2,
  Bell, ScrollText, Receipt, ListOrdered, ChevronDown,
  Zap, Star, Trophy, Sparkles, Activity, CalendarPlus, ClipboardCheck, CalendarDays, Wallet, Coins, History, Award, Cpu,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore, DEMO_CLUB_ID } from '../../store/clubDataStore'
import { useBrandingStore } from '../../store/brandingStore'
import { cn, getActiveChungPeriod } from '../../lib/utils'
import type { Role } from '../../types'
import { PickleFundLogoMark } from '../ui/PickleFundLogoMark'
import api from '../../lib/api'
import { useNotifStore } from '../../store/notifStore'

interface NavItem {
  label: string
  icon: React.ReactNode
  to: string
  badge?: number
  /** Mô tả ngắn dưới tiêu đề (mẫu v2.1) — có desc ⇒ render thẻ số + tiêu đề + mô tả. */
  desc?: string
}

// UI Consolidation v2.1 — cụm AI (AIDO/Operations/Workflows/Nhật ký AI) gộp về 1 mục "AIDO".
const superAdminNav: NavItem[] = [
  { label: 'Tổng quan',    icon: <LayoutDashboard size={18} />, to: '/super/dashboard', desc: 'Bảng điều khiển hệ thống' },
  { label: 'Quản lý CLB',  icon: <Building2 size={18} />,       to: '/super/clubs',     desc: 'Danh sách & chi tiết CLB' },
  { label: 'Người dùng',   icon: <Users size={18} />,           to: '/super/users',     desc: 'Tài khoản toàn hệ thống' },
  { label: 'Audit Logs',   icon: <ScrollText size={18} />,      to: '/super/audit-logs', desc: 'Nhật ký kiểm toán' },
  { label: 'AIDO',         icon: <Cpu size={18} />,             to: '/aido',            desc: 'AI Digital Office' },
  { label: 'Cài đặt',     icon: <Settings size={18} />,         to: '/super/settings',  desc: 'Cấu hình hệ thống' },
]

// UI Consolidation v2.1 — 24 mục phẳng → 6 module, mỗi module dùng tab con (route giữ nguyên).
const clubAdminBaseNav: NavItem[] = [
  { label: 'AIDO',          icon: <Cpu size={18} />,          to: '/aido',        desc: 'AI Digital Office' },
  { label: 'Thành viên',    icon: <Users size={18} />,        to: '/thanh-vien',  desc: 'Quản lý thành viên & tài khoản' },
  { label: 'Tài chính',     icon: <Wallet size={18} />,       to: '/tai-chinh',   desc: 'Quỹ · Thu · Chi · Công nợ · Báo cáo' },
  { label: 'Hoạt động CLB', icon: <CalendarDays size={18} />, to: '/hoat-dong',   desc: 'Lịch · Đăng ký · Check-in · Điểm danh' },
  { label: 'Thi đấu',       icon: <Trophy size={18} />,       to: '/thi-dau',     desc: 'Xếp lịch đấu · Lịch sử · Bảng điểm' },
  { label: 'Hệ thống',      icon: <Settings size={18} />,     to: '/he-thong',    desc: 'Thông báo · Gói dịch vụ · Cài đặt' },
]

const treasurerNav: NavItem[] = [
  { label: 'Tổng quan', icon: <LayoutDashboard size={18} />, to: '/treasurer/dashboard' },
  { label: 'Nhập Thu',  icon: <DollarSign size={18} />,      to: '/treasurer/income' },
  { label: 'Nhập Chi',  icon: <CreditCard size={18} />,      to: '/treasurer/expense' },
  { label: 'Sổ Quỹ',   icon: <ListOrdered size={18} />,     to: '/treasurer/ledger' },
  { label: 'Chấm điểm', icon: <Award size={18} />,           to: '/scoring' },
  { label: 'Nhắc Nhở',  icon: <Bell size={18} />,           to: '/treasurer/reminders' },
]

const memberNav: NavItem[] = [
  { label: 'Tổng Quan',     icon: <LayoutDashboard size={18} />, to: '/member/dashboard' },
  { label: 'Phiếu Thu',     icon: <Receipt size={18} />,         to: '/member/receipt' },
  { label: 'Lịch sử Đóng',  icon: <DollarSign size={18} />,     to: '/member/contributions' },
  { label: 'Lịch Tham Gia', icon: <Calendar size={18} />,        to: '/member/attendance' },
  { label: 'Công nợ',      icon: <Coins size={18} />,            to: '/debts' },
  { label: 'Lịch sinh hoạt', icon: <CalendarDays size={18} />,  to: '/schedule' },
  { label: 'Đăng ký buổi', icon: <CalendarPlus size={18} />,    to: '/session-registration' },
  { label: 'Check-in',      icon: <ClipboardCheck size={18} />, to: '/check-in' },
  { label: 'Hoạt động tuần', icon: <Activity size={18} />,      to: '/activity' },
  { label: 'Minigame',      icon: <Trophy size={18} />,          to: '/minigames' },
  { label: 'Lịch sử thi đấu', icon: <History size={18} />,       to: '/match-history' },
  // Nhóm xem tài chính toàn CLB (CHỈ XEM — nút CRUD ẩn theo isMember trong từng trang)
  { label: 'Tài chính',     icon: <Wallet size={18} />,          to: '/finance-dashboard' },
  { label: 'Kỳ Quỹ',       icon: <Calendar size={18} />,        to: '/fund-periods' },
  { label: 'Thu Quỹ',      icon: <DollarSign size={18} />,      to: '/contributions' },
  { label: 'Chi Phí',      icon: <CreditCard size={18} />,      to: '/expenses' },
  { label: 'Báo Cáo',      icon: <BarChart3 size={18} />,       to: '/reports' },
  { label: 'Chấm điểm',    icon: <Award size={18} />,           to: '/scoring' },
  { label: 'Lisa AI',        icon: <Sparkles size={18} />,        to: '/member/lisa' },
  { label: 'Thông báo',     icon: <Bell size={18} />,            to: '/member/notifications' },
]

const navByRole: Record<Role, NavItem[]> = {
  SUPER_ADMIN: superAdminNav,
  CLUB_ADMIN: clubAdminBaseNav,
  CLUB_TREASURER: treasurerNav,
  MEMBER_VIEW: memberNav,
}

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  CLUB_ADMIN: 'Club Admin',
  CLUB_TREASURER: 'Thủ Quỹ',
  MEMBER_VIEW: 'Thành Viên',
}


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
    const id = setInterval(sync, 30000)
    return () => clearInterval(id)
  }, [sync])
  return unreadCount
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
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

  const initials = user.username?.slice(0, 2).toUpperCase() ?? 'U'

  const handleLogout = () => {
    logout()
    navigate('/login')
    onClose?.()
  }

  return (
    <aside className="flex h-screen w-60 flex-col bg-white" style={{ borderRight: '1px solid var(--color-border)', boxShadow: '1px 0 0 0 rgba(15,23,42,0.02)' }}>

      {/* ── Logo (branding trắng nhãn — EPIC10B) ── */}
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt={branding.displayName ?? 'Logo'} className="h-[30px] w-[30px] shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="shrink-0"><PickleFundLogoMark size={30} /></div>
        )}
        <div className="leading-tight min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 truncate">{branding.displayName ?? 'PickleFund'}</p>
          <p className="text-[10px] font-medium text-slate-400 truncate">{branding.shortName ?? 'Sports Community Platform'}</p>
        </div>
      </div>

      {/* ── CLB card ── */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
        <div className="rounded-xl px-3 py-2.5 bg-slate-50" style={{ border: '1px solid var(--color-border-soft)' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #6D5DFB, #5B4BE8)' }}>
              {(clubData.settings?.name ?? user.username ?? 'C').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                {clubData.settings?.name || user.username || 'CLB của tôi'}
              </p>
              {clubData.settings?.code ? (
                <p className="text-[10px] mt-0.5 text-slate-400">Mã CLB: {clubData.settings.code}</p>
              ) : (
                <span className="inline-block text-[10px] rounded-full px-1.5 py-px font-medium mt-0.5 bg-slate-100 text-slate-500">
                  {roleLabels[user.role]}
                </span>
              )}
            </div>
          </div>
          {activePeriod && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] truncate text-slate-500">Kỳ Quỹ {activePeriod.name}</span>
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
                ? 'text-white [background:linear-gradient(135deg,#6D5DFB,#5B4BE8)] [box-shadow:0_10px_22px_-10px_rgba(109,93,251,0.7)]'
                : 'hover:-translate-y-px hover:[background:var(--pf-surface)] hover:ring-1 hover:ring-[color:var(--pf-primary-soft)] hover:[box-shadow:0_10px_24px_-10px_rgba(109,93,251,0.4)]'
            )}
          >
            {({ isActive }) => (
              <>
                {/* Số thứ tự (chỉ thẻ có desc) */}
                {item.desc && (
                  <span className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold',
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400 group-hover:[color:var(--pf-primary)]'
                  )}>
                    {i + 1}
                  </span>
                )}
                {/* Icon */}
                <span className={cn('shrink-0 transition-colors', isActive ? 'text-white' : 'text-slate-400 group-hover:[color:var(--pf-primary)]')}>
                  {item.icon}
                </span>
                {/* Tiêu đề + mô tả */}
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm font-semibold leading-tight', isActive ? 'text-white' : 'text-slate-700')}>
                    {item.label}
                  </p>
                  {item.desc && (
                    <p className={cn('mt-0.5 truncate text-[11px] leading-tight', isActive ? 'text-white/70' : 'text-slate-400')}>
                      {item.desc}
                    </p>
                  )}
                </div>
                {item.badge && (
                  <span className={cn(
                    'flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold',
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

      {/* ── Plan info (pastel) ── */}
      <div className="mx-3 mb-3 rounded-xl p-3.5" style={{ background: 'var(--color-primary-light)', border: '1px solid #E0E7FF' }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Star size={13} className="text-amber-500" />
          <span className="text-xs font-semibold [color:var(--pf-primary)]">Gói Professional</span>
        </div>
        <p className="text-[10px] mb-2.5 [color:var(--pf-primary)]">Còn 245 ngày sử dụng</p>
        <button className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-white [color:var(--pf-primary)] border [border-color:var(--pf-primary-soft)] hover:[background:var(--pf-primary)] hover:text-white hover:[border-color:var(--pf-primary)] transition-colors py-1.5 text-xs font-semibold">
          <Zap size={12} />Nâng cấp gói
        </button>
      </div>

      {/* ── User profile + Logout ── */}
      <div className="p-3 space-y-1" style={{ borderTop: '1px solid var(--color-border-soft)' }}>
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--pf-primary)] to-[var(--pf-primary-hover)] text-white text-xs font-bold select-none">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{user.username}</p>
            <p className="text-[10px] truncate text-slate-400">{user.email ?? 'admin@pbh.vn'}</p>
          </div>
          <ChevronDown size={13} className="shrink-0 text-slate-300" />
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} />
          <span className="text-xs">Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}
