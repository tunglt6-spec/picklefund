import {
  Users, Wallet, ClipboardCheck, BarChart3, Trophy, CalendarDays, FileCheck2, Medal,
  MessageSquare, Cpu, Settings, Sparkles, Receipt, LayoutDashboard, Building2, CreditCard,
  ScrollText, ListOrdered, BadgeCheck, Award, FileText, HandCoins, BellRing, Bell,
  LogIn, UserPlus, Swords, ShieldCheck, Newspaper, ArrowDownCircle, ArrowUpCircle, Zap, UserCog,
} from 'lucide-react'
import type { Role } from '../../types'

/** Một chức năng trên lưới tile của bản mobile. */
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

export interface AppGroup { key: string; title: string; items: AppItem[] }

/**
 * Chức năng của trang "Ứng dụng", NHÓM THEO NGHIỆP VỤ và theo vai trò (route/tab trùng Sidebar + module hiện có —
 * KHÔNG đổi nghiệp vụ). Mọi `to` đi THẲNG vào nội dung (kèm ?tab=), không qua màn menu trung gian.
 */
export const APP_GROUPS: Record<Role, AppGroup[]> = {
  CLUB_ADMIN: [
    { key: 'members', title: 'Thành viên', items: [
      { key: 'members', label: 'Thành viên', to: '/thanh-vien?tab=list', icon: Users },
      { key: 'scoring', label: 'Chấm điểm', to: '/thanh-vien?tab=scoring', icon: Award },
      { key: 'accounts', label: 'Tài khoản', to: '/thanh-vien?tab=accounts', icon: UserCog },
    ] },
    { key: 'finance', title: 'Tài chính', items: [
      { key: 'fund', label: 'Kỳ quỹ', to: '/tai-chinh?tab=periods', icon: Wallet },
      { key: 'income', label: 'Thu quỹ', to: '/tai-chinh?tab=income', icon: ArrowDownCircle },
      { key: 'expense', label: 'Chi phí', to: '/tai-chinh?tab=expense', icon: ArrowUpCircle },
      { key: 'debts', label: 'Công nợ', to: '/tai-chinh?tab=debts', icon: HandCoins },
      { key: 'reports', label: 'Báo cáo', to: '/tai-chinh?tab=reports', icon: FileText },
      { key: 'payments', label: 'Xác nhận nộp quỹ', to: '/tai-chinh?tab=payments', icon: BadgeCheck },
    ] },
    { key: 'activity', title: 'Hoạt động', items: [
      { key: 'schedule', label: 'Lịch', to: '/hoat-dong?tab=schedule', icon: CalendarDays },
      { key: 'registration', label: 'Đăng ký', to: '/hoat-dong?tab=registration', icon: UserPlus },
      { key: 'checkin', label: 'Check-in', to: '/hoat-dong?tab=checkin', icon: LogIn },
      { key: 'attendance', label: 'Điểm danh', to: '/hoat-dong?tab=attendance', icon: ClipboardCheck },
      { key: 'weekly', label: 'Hoạt động tuần', to: '/hoat-dong?tab=weekly', icon: BarChart3 },
    ] },
    { key: 'compete', title: 'Thi đấu', items: [
      { key: 'tournaments', label: 'Giải đấu', to: '/thi-dau?tab=tournaments', icon: Trophy },
      { key: 'matches', label: 'Lịch đấu', to: '/thi-dau?tab=schedule', icon: Swords },
      { key: 'results', label: 'Kết quả', to: '/thi-dau?tab=results', icon: FileCheck2 },
      { key: 'standings', label: 'Xếp hạng', to: '/thi-dau?tab=standings', icon: Medal },
    ] },
    { key: 'community', title: 'Cộng đồng', items: [
      { key: 'feed', label: 'Bảng tin', to: '/community', icon: Newspaper },
      { key: 'matchmaking', label: 'Tìm kèo', to: '/community?tab=matchmaking', icon: Swords },
      { key: 'moderation', label: 'Kiểm duyệt', to: '/community?tab=moderation', icon: ShieldCheck },
    ] },
    { key: 'admin', title: 'Quản trị & AI', items: [
      { key: 'aido', label: 'AIDO', to: '/aido', icon: Cpu },
      { key: 'lisa', label: 'Lisa AI', to: '/lisa', icon: Sparkles },
      { key: 'notifications', label: 'Thông báo', to: '/he-thong?tab=notifications', icon: Bell, badge: true },
      { key: 'billing', label: 'Gói dịch vụ', to: '/he-thong?tab=billing', icon: Zap },
      { key: 'settings', label: 'Cài đặt', to: '/he-thong?tab=settings', icon: Settings },
    ] },
  ],
  MEMBER_VIEW: [
    { key: 'personal', title: 'Cá nhân', items: [
      { key: 'dashboard', label: 'Tổng quan cá nhân', to: '/member/dashboard', icon: LayoutDashboard },
      { key: 'receipt', label: 'Phiếu thu', to: '/member/ca-nhan?tab=receipt', icon: Receipt },
      { key: 'attend', label: 'Lịch tham gia', to: '/member/ca-nhan?tab=attend', icon: ClipboardCheck },
      { key: 'mydebts', label: 'Công nợ', to: '/member/ca-nhan?tab=debts', icon: HandCoins },
    ] },
    { key: 'finance', title: 'Tài chính CLB', items: [
      { key: 'fund', label: 'Kỳ quỹ', to: '/member/tai-chinh?tab=periods', icon: Wallet },
      { key: 'income', label: 'Thu quỹ', to: '/member/tai-chinh?tab=income', icon: ArrowDownCircle },
      { key: 'expense', label: 'Chi phí', to: '/member/tai-chinh?tab=expense', icon: ArrowUpCircle },
      { key: 'reports', label: 'Báo cáo', to: '/member/tai-chinh?tab=reports', icon: FileText },
    ] },
    { key: 'activity', title: 'Hoạt động', items: [
      { key: 'schedule', label: 'Lịch', to: '/member/hoat-dong?tab=schedule', icon: CalendarDays },
      { key: 'registration', label: 'Đăng ký', to: '/member/hoat-dong?tab=registration', icon: UserPlus },
      { key: 'checkin', label: 'Check-in', to: '/member/hoat-dong?tab=checkin', icon: LogIn },
      { key: 'weekly', label: 'Hoạt động tuần', to: '/member/hoat-dong?tab=weekly', icon: BarChart3 },
    ] },
    { key: 'compete', title: 'Thi đấu', items: [
      { key: 'tournaments', label: 'Giải đấu', to: '/member/thi-dau?tab=tournaments', icon: Trophy },
      { key: 'matches', label: 'Lịch đấu', to: '/member/thi-dau?tab=schedule', icon: Swords },
      { key: 'results', label: 'Kết quả', to: '/member/thi-dau?tab=results', icon: FileCheck2 },
      { key: 'standings', label: 'Xếp hạng', to: '/member/thi-dau?tab=standings', icon: Medal },
    ] },
    { key: 'community', title: 'Cộng đồng', items: [
      { key: 'feed', label: 'Bảng tin', to: '/community', icon: Newspaper },
      { key: 'matchmaking', label: 'Tìm kèo', to: '/community?tab=matchmaking', icon: Swords },
    ] },
    { key: 'assistant', title: 'Trợ lý & thông báo', items: [
      { key: 'office', label: 'Văn phòng AI', to: '/member/aido', icon: Cpu },
      { key: 'lisa', label: 'Lisa AI', to: '/member/lisa', icon: Sparkles },
      { key: 'notifications', label: 'Thông báo', to: '/member/notifications', icon: Bell, badge: true },
    ] },
  ],
  CLUB_TREASURER: [
    { key: 'cashbook', title: 'Sổ quỹ', items: [
      { key: 'dashboard', label: 'Tổng quan quỹ', to: '/treasurer/dashboard', icon: LayoutDashboard },
      { key: 'income', label: 'Nhập thu', to: '/treasurer/so-quy?tab=income', icon: ArrowDownCircle },
      { key: 'expense', label: 'Nhập chi', to: '/treasurer/so-quy?tab=expense', icon: ArrowUpCircle },
      { key: 'ledger', label: 'Sổ quỹ', to: '/treasurer/so-quy?tab=ledger', icon: ListOrdered },
      { key: 'approve', label: 'Xác nhận nộp quỹ', to: '/payments', icon: BadgeCheck },
      { key: 'reminders', label: 'Nhắc nhở', to: '/treasurer/reminders', icon: BellRing },
    ] },
    { key: 'members', title: 'Thành viên', items: [
      { key: 'scoring', label: 'Chấm điểm', to: '/scoring', icon: Award },
    ] },
    { key: 'other', title: 'Khác', items: [
      { key: 'community', label: 'Cộng đồng', to: '/community', icon: MessageSquare },
      { key: 'lisa', label: 'Lisa AI', to: '/lisa', icon: Sparkles },
      { key: 'notifications', label: 'Thông báo', to: '/notifications', icon: Bell, badge: true },
    ] },
  ],
  SUPER_ADMIN: [
    { key: 'system', title: 'Quản trị hệ thống', items: [
      { key: 'dashboard', label: 'Tổng quan', to: '/super/dashboard', icon: LayoutDashboard },
      { key: 'clubs', label: 'Quản lý CLB', to: '/super/clubs', icon: Building2 },
      { key: 'users', label: 'Người dùng', to: '/super/users', icon: Users },
      { key: 'payments', label: 'Thanh toán gói', to: '/super/payments', icon: CreditCard },
      { key: 'audit', label: 'Audit Logs', to: '/super/audit-logs', icon: ScrollText },
      { key: 'settings', label: 'Cài đặt', to: '/super/settings', icon: Settings },
    ] },
  ],
}

/** Danh sách phẳng (dùng cho tìm kiếm chức năng, lối tắt, kiểm thử). */
export const APPS: Record<Role, AppItem[]> = {
  CLUB_ADMIN: APP_GROUPS.CLUB_ADMIN.flatMap((g) => g.items),
  MEMBER_VIEW: APP_GROUPS.MEMBER_VIEW.flatMap((g) => g.items),
  CLUB_TREASURER: APP_GROUPS.CLUB_TREASURER.flatMap((g) => g.items),
  SUPER_ADMIN: APP_GROUPS.SUPER_ADMIN.flatMap((g) => g.items),
}

/** Lối tắt quan trọng trên màn Tổng quan (chọn từ APPS theo key; thiếu key nào thì bỏ qua). Phần còn lại truy cập qua "Ứng dụng". */
export const HOME_KEYS: Record<Role, string[]> = {
  CLUB_ADMIN: ['attendance', 'members', 'fund', 'debts', 'aido', 'lisa'],
  MEMBER_VIEW: ['receipt', 'attend', 'fund', 'mydebts', 'office', 'lisa'],
  CLUB_TREASURER: ['income', 'expense', 'ledger', 'approve', 'reminders', 'lisa'],
  SUPER_ADMIN: ['clubs', 'users', 'payments', 'audit', 'settings', 'dashboard'],
}

export function homeApps(role: Role): AppItem[] {
  const all = APPS[role]
  return HOME_KEYS[role].map((k) => all.find((a) => a.key === k)).filter((a): a is AppItem => !!a)
}
