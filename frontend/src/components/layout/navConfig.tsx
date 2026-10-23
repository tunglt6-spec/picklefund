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
export interface BottomTab { label: string; to: string; icon: 'home' | 'calendar' | 'trophy' | 'community' | 'ledger' | 'approve' | 'bell' | 'club' | 'users' | 'pay' | 'apps' }

export const APPS_ROUTE = '/ung-dung'

export const bottomTabsByRole: Record<Role, BottomTab[]> = {
  CLUB_ADMIN: [
    { label: 'Tổng quan', to: '/aido', icon: 'home' },
    { label: 'Lịch', to: '/hoat-dong', icon: 'calendar' },
    { label: 'Thi đấu', to: '/thi-dau', icon: 'trophy' },
    { label: 'Cộng đồng', to: '/community', icon: 'community' },
    { label: 'Ứng dụng', to: APPS_ROUTE, icon: 'apps' },
  ],
  MEMBER_VIEW: [
    { label: 'Tổng quan', to: '/member/dashboard', icon: 'home' },
    { label: 'Lịch', to: '/member/hoat-dong', icon: 'calendar' },
    { label: 'Thi đấu', to: '/member/thi-dau', icon: 'trophy' },
    { label: 'Cộng đồng', to: '/community', icon: 'community' },
    { label: 'Ứng dụng', to: APPS_ROUTE, icon: 'apps' },
  ],
  CLUB_TREASURER: [
    { label: 'Tổng quan', to: '/treasurer/dashboard', icon: 'home' },
    { label: 'Sổ quỹ', to: '/treasurer/so-quy', icon: 'ledger' },
    { label: 'Xác nhận', to: '/payments', icon: 'approve' },
    { label: 'Nhắc nhở', to: '/treasurer/reminders', icon: 'bell' },
    { label: 'Ứng dụng', to: APPS_ROUTE, icon: 'apps' },
  ],
  SUPER_ADMIN: [
    { label: 'Tổng quan', to: '/super/dashboard', icon: 'home' },
    { label: 'CLB', to: '/super/clubs', icon: 'club' },
    { label: 'Người dùng', to: '/super/users', icon: 'users' },
    { label: 'Thanh toán', to: '/super/payments', icon: 'pay' },
    { label: 'Ứng dụng', to: APPS_ROUTE, icon: 'apps' },
  ],
}

/** Trang chủ theo vai trò (dùng khi mở /ung-dung trên desktop → chuyển về trang chủ). */
export const homeByRole: Record<Role, string> = {
  CLUB_ADMIN: '/aido', MEMBER_VIEW: '/member/dashboard', CLUB_TREASURER: '/treasurer/dashboard', SUPER_ADMIN: '/super/dashboard',
}
