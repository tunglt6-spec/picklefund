import {
  LayoutDashboard, Users,
  Settings, Building2,
  Bell, ScrollText, Receipt, ListOrdered, CreditCard,
  Trophy, CalendarDays, Wallet, Award, Cpu, MessageSquare, BadgeCheck,
} from 'lucide-react'
import type { Role } from '../../types'

export interface NavItem {
  label: string
  icon: React.ReactNode
  to: string
  badge?: number
  /** Mô tả ngắn dưới tiêu đề (mẫu v2.1) — có desc ⇒ render thẻ số + tiêu đề + mô tả. */
  desc?: string
}

// Super Admin: AI toàn hệ thống đã nằm trong Trung tâm điều hành (/super/dashboard — khối AIDO
// AI Operations + Maika). Bỏ mục "AIDO" (màn /aido là AI Office THEO CLB — rỗng với super admin
// vì clubId=null). Không xóa tính năng /aido của Club Admin.
const superAdminNav: NavItem[] = [
  { label: 'Tổng quan',    icon: <LayoutDashboard size={18} />, to: '/super/dashboard', desc: 'Bảng điều khiển hệ thống' },
  { label: 'Quản lý CLB',  icon: <Building2 size={18} />,       to: '/super/clubs',     desc: 'Danh sách & chi tiết CLB' },
  { label: 'Người dùng',   icon: <Users size={18} />,           to: '/super/users',     desc: 'Tài khoản toàn hệ thống' },
  { label: 'Thanh toán gói', icon: <CreditCard size={18} />,    to: '/super/payments',  desc: 'Gia hạn & chi phí CLB' },
  { label: 'Audit Logs',   icon: <ScrollText size={18} />,      to: '/super/audit-logs', desc: 'Nhật ký kiểm toán' },
  { label: 'Cài đặt',     icon: <Settings size={18} />,         to: '/super/settings',  desc: 'Cấu hình hệ thống' },
]

// UI Consolidation v2.1 — 24 mục phẳng → 6 module, mỗi module dùng tab con (route giữ nguyên).
const clubAdminBaseNav: NavItem[] = [
  { label: 'AIDO',          icon: <Cpu size={18} />,          to: '/aido',        desc: 'AI Digital Office' },
  { label: 'Thành viên',    icon: <Users size={18} />,        to: '/thanh-vien',  desc: 'Quản lý thành viên & tài khoản' },
  { label: 'Tài chính',     icon: <Wallet size={18} />,       to: '/tai-chinh',   desc: 'Quỹ · Thu · Chi · Công nợ · Báo cáo' },
  { label: 'Hoạt động CLB', icon: <CalendarDays size={18} />, to: '/hoat-dong',   desc: 'Lịch · Đăng ký · Check-in · Điểm danh' },
  { label: 'Thi đấu',       icon: <Trophy size={18} />,       to: '/thi-dau',     desc: 'Giải đấu · Lịch đấu · Kết quả · Xếp hạng' },
  { label: 'Cộng đồng CLB', icon: <MessageSquare size={18} />, to: '/community',   desc: 'Bảng tin · Tương tác · Kiểm duyệt · Tìm kèo' },
  { label: 'Hệ thống',      icon: <Settings size={18} />,     to: '/he-thong',    desc: 'Thông báo · Gói dịch vụ · Cài đặt' },
]

// UI Consolidation v2.1 — thủ quỹ: gom Nhập Thu/Nhập Chi/Sổ Quỹ → module "Sổ quỹ" (tab con).
const treasurerNav: NavItem[] = [
  { label: 'Tổng quan', icon: <LayoutDashboard size={18} />, to: '/treasurer/dashboard', desc: 'Số dư & sổ quỹ tổng hợp' },
  { label: 'Sổ quỹ',   icon: <ListOrdered size={18} />,     to: '/treasurer/so-quy',   desc: 'Nhập thu · Nhập chi · Sổ quỹ' },
  { label: 'Chấm điểm', icon: <Award size={18} />,           to: '/scoring',            desc: 'Chấm điểm thành viên' },
  { label: 'Xác nhận nộp quỹ', icon: <BadgeCheck size={18} />, to: '/payments',        desc: 'Duyệt khoản thành viên báo đã nộp' },
  { label: 'Nhắc nhở',  icon: <Bell size={18} />,           to: '/treasurer/reminders', desc: 'Nhắc đóng quỹ & thông báo' },
]

// UI Consolidation v2.1 — member (CHỈ XEM) gom thành 6 module dùng tab con (như admin).
const memberNav: NavItem[] = [
  { label: 'Văn phòng AI', icon: <Cpu size={18} />,            to: '/member/aido',          desc: 'Xem đội ngũ AI đang làm việc' },
  { label: 'Tổng quan',   icon: <LayoutDashboard size={18} />, to: '/member/dashboard',     desc: 'Hồ sơ & số dư của bạn' },
  { label: 'Cá nhân',     icon: <Receipt size={18} />,         to: '/member/ca-nhan',       desc: 'Phiếu thu · Đóng quỹ · Tham gia · Công nợ' },
  { label: 'Tài chính',   icon: <Wallet size={18} />,          to: '/member/tai-chinh',     desc: 'Quỹ · Thu · Chi · Báo cáo (xem)' },
  { label: 'Hoạt động',   icon: <CalendarDays size={18} />,    to: '/member/hoat-dong',     desc: 'Lịch · Đăng ký · Check-in · Tuần' },
  { label: 'Thi đấu',     icon: <Trophy size={18} />,          to: '/member/thi-dau',       desc: 'Giải đấu · Lịch đấu · Kết quả · Xếp hạng' },
  { label: 'Cộng đồng CLB', icon: <MessageSquare size={18} />, to: '/community',            desc: 'Bảng tin · Tương tác · Tìm kèo' },
  { label: 'Thông báo',   icon: <Bell size={18} />,            to: '/member/notifications', desc: 'Tin & nhắc nhở' },
]

export const navByRole: Record<Role, NavItem[]> = {
  SUPER_ADMIN: superAdminNav,
  CLUB_ADMIN: clubAdminBaseNav,
  CLUB_TREASURER: treasurerNav,
  MEMBER_VIEW: memberNav,
}

export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  CLUB_ADMIN: 'Club Admin',
  CLUB_TREASURER: 'Thủ Quỹ',
  MEMBER_VIEW: 'Thành Viên',
}

/** Tab đáy của bản mobile (Modern Enterprise Super App): 4 tab theo vai trò + "Ứng dụng" (lưới toàn bộ chức năng). */
export interface BottomTab {
  label: string
  to: string
  icon: 'home' | 'calendar' | 'trophy' | 'community' | 'ledger' | 'approve' | 'bell' | 'club' | 'users' | 'pay' | 'apps'
  /** Các tiền tố đường dẫn thuộc tab này (tô sáng tab khi đang ở màn con). */
  match?: string[]
}

export const APPS_ROUTE = '/ung-dung'
/** Các màn hub mobile: header lớn + tìm kiếm + thẻ tóm tắt + lưới tile (cùng ngôn ngữ trang Ứng dụng). */
export const MOBILE_HOME = '/m/tong-quan'
export const MOBILE_CALENDAR = '/m/lich'
export const MOBILE_COMPETE = '/m/thi-dau'
export const MOBILE_COMMUNITY = '/m/cong-dong'
export const HUB_PATHS = [APPS_ROUTE, MOBILE_HOME, MOBILE_CALENDAR, MOBILE_COMPETE, MOBILE_COMMUNITY]

const HOME_MATCH = ['/aido', '/dashboard', '/member/dashboard', '/member/aido', '/treasurer/dashboard', '/super/dashboard']
const CAL_MATCH = ['/hoat-dong', '/member/hoat-dong', '/attendance', '/schedule', '/session-registration', '/check-in', '/activity']
const COMPETE_MATCH = ['/thi-dau', '/member/thi-dau', '/minigames']

export const bottomTabsByRole: Record<Role, BottomTab[]> = {
  CLUB_ADMIN: [
    { label: 'Tổng quan', to: MOBILE_HOME, icon: 'home', match: HOME_MATCH },
    { label: 'Lịch', to: MOBILE_CALENDAR, icon: 'calendar', match: CAL_MATCH },
    { label: 'Thi đấu', to: MOBILE_COMPETE, icon: 'trophy', match: COMPETE_MATCH },
    { label: 'Cộng đồng', to: MOBILE_COMMUNITY, icon: 'community', match: ['/community'] },
    { label: 'Ứng dụng', to: APPS_ROUTE, icon: 'apps' },
  ],
  MEMBER_VIEW: [
    { label: 'Tổng quan', to: MOBILE_HOME, icon: 'home', match: HOME_MATCH },
    { label: 'Lịch', to: MOBILE_CALENDAR, icon: 'calendar', match: CAL_MATCH },
    { label: 'Thi đấu', to: MOBILE_COMPETE, icon: 'trophy', match: COMPETE_MATCH },
    { label: 'Cộng đồng', to: MOBILE_COMMUNITY, icon: 'community', match: ['/community'] },
    { label: 'Ứng dụng', to: APPS_ROUTE, icon: 'apps' },
  ],
  CLUB_TREASURER: [
    { label: 'Tổng quan', to: MOBILE_HOME, icon: 'home', match: HOME_MATCH },
    { label: 'Sổ quỹ', to: '/treasurer/so-quy', icon: 'ledger' },
    { label: 'Xác nhận', to: '/payments', icon: 'approve' },
    { label: 'Nhắc nhở', to: '/treasurer/reminders', icon: 'bell' },
    { label: 'Ứng dụng', to: APPS_ROUTE, icon: 'apps' },
  ],
  SUPER_ADMIN: [
    { label: 'Tổng quan', to: MOBILE_HOME, icon: 'home', match: HOME_MATCH },
    { label: 'CLB', to: '/super/clubs', icon: 'club' },
    { label: 'Người dùng', to: '/super/users', icon: 'users' },
    { label: 'Thanh toán', to: '/super/payments', icon: 'pay' },
    { label: 'Ứng dụng', to: APPS_ROUTE, icon: 'apps' },
  ],
}

/** Trang đích sau đăng nhập / mở "/": mobile (<1024px) → màn Tổng quan kiểu Ứng dụng; desktop → trang chủ theo vai trò. */
export function landingRoute(desktopRoute: string): string {
  try {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) return MOBILE_HOME
  } catch { /* noop */ }
  return desktopRoute
}

/** Lối vào Lisa AI theo vai trò (Super Admin không có Lisa). */
export const LISA_ROUTES: Partial<Record<Role, string>> = {
  CLUB_ADMIN: '/lisa',
  CLUB_TREASURER: '/lisa',
  MEMBER_VIEW: '/member/lisa',
}

/** Trang thông báo/nhắc nhở mở từ chuông, theo vai trò. */
export const notifRouteByRole: Record<Role, string> = {
  MEMBER_VIEW: '/member/notifications',
  CLUB_ADMIN: '/he-thong?tab=notifications',
  CLUB_TREASURER: '/treasurer/reminders',
  SUPER_ADMIN: '/notifications',
}

/** Trang chủ theo vai trò (dùng khi mở /ung-dung trên desktop → chuyển về trang chủ). */
export const homeByRole: Record<Role, string> = {
  CLUB_ADMIN: '/aido', MEMBER_VIEW: '/member/dashboard', CLUB_TREASURER: '/treasurer/dashboard', SUPER_ADMIN: '/super/dashboard',
}
