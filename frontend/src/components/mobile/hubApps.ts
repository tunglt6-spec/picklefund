import {
  Users, Wallet, ClipboardCheck, BarChart3, Trophy, CalendarDays, FileCheck2, Medal,
  MessageSquare, Cpu, Settings, Sparkles, Receipt, LayoutDashboard, Building2, CreditCard,
  ScrollText, ListOrdered, BadgeCheck, Award, FileText, HandCoins, BellRing, Bell,
  LogIn, UserPlus, Swords, ShieldCheck, Newspaper, LayoutList,
} from 'lucide-react'
import type { Role } from '../../types'

/** Một ứng dụng/chức năng trên lưới tile của bản mobile. */
export interface AppItem {
  key: string
  label: string
  to: string
  icon: typeof Users
  /** Hiện số thông báo chưa đọc (dùng chung notifStore). */
  badge?: boolean
  /** Hiện số đếm riêng của chức năng (vd. số tác vụ chờ duyệt). */
  badgeCount?: number
}

/**
 * Toàn bộ chức năng theo vai trò (trang Ứng dụng). Mỗi vai trò thấy đúng các chức năng mình được phép
 * (route/tab trùng Sidebar + module hiện có — KHÔNG đổi nghiệp vụ).
 */
export const APPS: Record<Role, AppItem[]> = {
  CLUB_ADMIN: [
    { key: 'members', label: 'Thành viên', to: '/thanh-vien', icon: Users },
    { key: 'fund', label: 'Quỹ CLB', to: '/tai-chinh', icon: Wallet },
    { key: 'attendance', label: 'Điểm danh', to: '/hoat-dong?tab=attendance', icon: ClipboardCheck },
    { key: 'weekly', label: 'Hoạt động', to: '/hoat-dong?tab=weekly', icon: BarChart3 },
    { key: 'tournaments', label: 'Giải đấu', to: '/thi-dau?tab=tournaments', icon: Trophy },
    { key: 'schedule', label: 'Lịch đấu', to: '/thi-dau?tab=schedule', icon: CalendarDays },
    { key: 'results', label: 'Kết quả', to: '/thi-dau?tab=results', icon: FileCheck2 },
    { key: 'standings', label: 'Xếp hạng', to: '/thi-dau?tab=standings', icon: Medal },
    { key: 'community', label: 'Cộng đồng', to: '/community', icon: MessageSquare },
    { key: 'notifications', label: 'Thông báo', to: '/he-thong?tab=notifications', icon: Bell, badge: true },
    { key: 'aido', label: 'AIDO', to: '/aido', icon: Cpu },
    { key: 'settings', label: 'Cài đặt', to: '/he-thong?tab=settings', icon: Settings },
    { key: 'debts', label: 'Công nợ', to: '/tai-chinh?tab=debts', icon: HandCoins },
    { key: 'reports', label: 'Báo cáo', to: '/tai-chinh?tab=reports', icon: FileText },
    { key: 'scoring', label: 'Chấm điểm', to: '/thanh-vien?tab=scoring', icon: Award },
    { key: 'lisa', label: 'Lisa AI', to: '/lisa', icon: Sparkles },
  ],
  MEMBER_VIEW: [
    { key: 'dashboard', label: 'Tổng quan', to: '/member/dashboard', icon: LayoutDashboard },
    { key: 'personal', label: 'Phiếu thu', to: '/member/ca-nhan', icon: Receipt },
    { key: 'fund', label: 'Quỹ CLB', to: '/member/tai-chinh', icon: Wallet },
    { key: 'attend', label: 'Điểm danh', to: '/member/ca-nhan?tab=attend', icon: ClipboardCheck },
    { key: 'activity', label: 'Hoạt động', to: '/member/hoat-dong', icon: BarChart3 },
    { key: 'tournaments', label: 'Giải đấu', to: '/member/thi-dau?tab=tournaments', icon: Trophy },
    { key: 'schedule', label: 'Lịch đấu', to: '/member/thi-dau?tab=schedule', icon: CalendarDays },
    { key: 'results', label: 'Kết quả', to: '/member/thi-dau?tab=results', icon: FileCheck2 },
    { key: 'standings', label: 'Xếp hạng', to: '/member/thi-dau?tab=standings', icon: Medal },
    { key: 'community', label: 'Cộng đồng', to: '/community', icon: MessageSquare },
    { key: 'notifications', label: 'Thông báo', to: '/member/notifications', icon: Bell, badge: true },
    { key: 'office', label: 'Văn phòng AI', to: '/member/aido', icon: Cpu },
    { key: 'debts', label: 'Công nợ', to: '/member/ca-nhan?tab=debts', icon: HandCoins },
    { key: 'reports', label: 'Báo cáo', to: '/member/tai-chinh?tab=reports', icon: FileText },
    { key: 'lisa', label: 'Lisa AI', to: '/member/lisa', icon: Sparkles },
  ],
  CLUB_TREASURER: [
    { key: 'dashboard', label: 'Tổng quan', to: '/treasurer/dashboard', icon: LayoutDashboard },
    { key: 'ledger', label: 'Sổ quỹ', to: '/treasurer/so-quy', icon: ListOrdered },
    { key: 'scoring', label: 'Chấm điểm', to: '/scoring', icon: Award },
    { key: 'approve', label: 'Xác nhận nộp quỹ', to: '/payments', icon: BadgeCheck },
    { key: 'reminders', label: 'Nhắc nhở', to: '/treasurer/reminders', icon: BellRing },
    { key: 'community', label: 'Cộng đồng', to: '/community', icon: MessageSquare },
    { key: 'notifications', label: 'Thông báo', to: '/notifications', icon: Bell, badge: true },
    { key: 'lisa', label: 'Lisa AI', to: '/lisa', icon: Sparkles },
  ],
  SUPER_ADMIN: [
    { key: 'dashboard', label: 'Tổng quan', to: '/super/dashboard', icon: LayoutDashboard },
    { key: 'clubs', label: 'Quản lý CLB', to: '/super/clubs', icon: Building2 },
    { key: 'users', label: 'Người dùng', to: '/super/users', icon: Users },
    { key: 'payments', label: 'Thanh toán gói', to: '/super/payments', icon: CreditCard },
    { key: 'audit', label: 'Audit Logs', to: '/super/audit-logs', icon: ScrollText },
    { key: 'settings', label: 'Cài đặt', to: '/super/settings', icon: Settings },
  ],
}

/** Truy cập nhanh trên màn Tổng quan (chọn từ APPS theo key; thiếu key nào thì bỏ qua). */
export const HOME_KEYS: Record<Role, string[]> = {
  CLUB_ADMIN: ['aido', 'members', 'fund', 'attendance', 'debts', 'reports', 'notifications', 'lisa'],
  MEMBER_VIEW: ['dashboard', 'personal', 'fund', 'attend', 'debts', 'notifications', 'office', 'lisa'],
  CLUB_TREASURER: ['dashboard', 'ledger', 'approve', 'reminders', 'scoring', 'community', 'notifications', 'lisa'],
  SUPER_ADMIN: ['dashboard', 'clubs', 'users', 'payments', 'audit', 'settings'],
}

export function homeApps(role: Role): AppItem[] {
  const all = APPS[role]
  return HOME_KEYS[role].map((k) => all.find((a) => a.key === k)).filter((a): a is AppItem => !!a)
}

/** Tiles của màn "Lịch" (module Hoạt động) theo vai trò. Thủ quỹ không có module này. */
export function calendarApps(role: Role): AppItem[] {
  const base = role === 'MEMBER_VIEW' ? '/member/hoat-dong' : '/hoat-dong'
  const tiles: AppItem[] = [
    { key: 'schedule', label: 'Lịch', to: `${base}?tab=schedule`, icon: CalendarDays },
    { key: 'registration', label: 'Đăng ký', to: `${base}?tab=registration`, icon: UserPlus },
    { key: 'checkin', label: 'Check-in', to: `${base}?tab=checkin`, icon: LogIn },
  ]
  if (role !== 'MEMBER_VIEW') tiles.push({ key: 'attendance', label: 'Điểm danh', to: `${base}?tab=attendance`, icon: ClipboardCheck })
  tiles.push({ key: 'weekly', label: 'Hoạt động tuần', to: `${base}?tab=weekly`, icon: BarChart3 })
  return tiles
}

/** Tiles của màn "Thi đấu" (CompeteHub). */
export function competeApps(role: Role): AppItem[] {
  const base = role === 'MEMBER_VIEW' ? '/member/thi-dau' : '/thi-dau'
  return [
    { key: 'overview', label: 'Tổng quan', to: `${base}?tab=overview`, icon: LayoutList },
    { key: 'tournaments', label: 'Giải đấu', to: `${base}?tab=tournaments`, icon: Trophy },
    { key: 'schedule', label: 'Lịch đấu', to: `${base}?tab=schedule`, icon: Swords },
    { key: 'results', label: 'Kết quả', to: `${base}?tab=results`, icon: FileCheck2 },
    { key: 'standings', label: 'Xếp hạng', to: `${base}?tab=standings`, icon: Medal },
  ]
}

/** Tiles của màn "Cộng đồng". Kiểm duyệt chỉ dành cho quản trị. */
export function communityApps(role: Role): AppItem[] {
  const tiles: AppItem[] = [
    { key: 'feed', label: 'Bảng tin', to: '/community', icon: Newspaper },
    { key: 'matchmaking', label: 'Tìm kèo', to: '/community?tab=matchmaking', icon: Swords },
  ]
  if (role === 'CLUB_ADMIN' || role === 'SUPER_ADMIN') tiles.push({ key: 'moderation', label: 'Kiểm duyệt', to: '/community?tab=moderation', icon: ShieldCheck })
  return tiles
}
