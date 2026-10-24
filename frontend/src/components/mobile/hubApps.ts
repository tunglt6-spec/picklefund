import {
  Users, MessageSquare, Cpu, Settings, Sparkles, LayoutDashboard, Building2, CreditCard,
  ScrollText, ListOrdered, BadgeCheck, Award, BellRing, Bell,
  ArrowDownCircle, ArrowUpCircle, } from 'lucide-react'
import { NAV_CATALOG } from './navCatalog'
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
      { key: 'members', label: NAV_CATALOG['mem.list'].label, to: '/thanh-vien?tab=list', icon: NAV_CATALOG['mem.list'].icon },
      { key: 'scoring', label: NAV_CATALOG['mem.scoring'].label, to: '/thanh-vien?tab=scoring', icon: NAV_CATALOG['mem.scoring'].icon },
      { key: 'accounts', label: NAV_CATALOG['mem.accounts'].label, to: '/thanh-vien?tab=accounts', icon: NAV_CATALOG['mem.accounts'].icon },
      { key: 'roles', label: NAV_CATALOG['mem.roles'].label, to: '/thanh-vien?tab=roles', icon: NAV_CATALOG['mem.roles'].icon },
      { key: 'history', label: NAV_CATALOG['mem.history'].label, to: '/thanh-vien?tab=activity', icon: NAV_CATALOG['mem.history'].icon },
    ] },
    { key: 'finance', title: 'Tài chính', items: [
      { key: 'fund', label: NAV_CATALOG['fin.periods'].label, to: '/tai-chinh?tab=periods', icon: NAV_CATALOG['fin.periods'].icon },
      { key: 'income', label: NAV_CATALOG['fin.income'].label, to: '/tai-chinh?tab=income', icon: NAV_CATALOG['fin.income'].icon },
      { key: 'expense', label: NAV_CATALOG['fin.expense'].label, to: '/tai-chinh?tab=expense', icon: NAV_CATALOG['fin.expense'].icon },
      { key: 'debts', label: NAV_CATALOG['fin.debts'].label, to: '/tai-chinh?tab=debts', icon: NAV_CATALOG['fin.debts'].icon },
      { key: 'reports', label: NAV_CATALOG['fin.reports'].label, to: '/tai-chinh?tab=reports', icon: NAV_CATALOG['fin.reports'].icon },
      { key: 'payments', label: NAV_CATALOG['fin.payments'].label, to: '/tai-chinh?tab=payments', icon: NAV_CATALOG['fin.payments'].icon },
    ] },
    { key: 'activity', title: 'Hoạt động', items: [
      { key: 'schedule', label: NAV_CATALOG['act.schedule'].label, to: '/hoat-dong?tab=schedule', icon: NAV_CATALOG['act.schedule'].icon },
      { key: 'registration', label: NAV_CATALOG['act.registration'].label, to: '/hoat-dong?tab=registration', icon: NAV_CATALOG['act.registration'].icon },
      { key: 'checkin', label: NAV_CATALOG['act.checkin'].label, to: '/hoat-dong?tab=checkin', icon: NAV_CATALOG['act.checkin'].icon },
      { key: 'attendance', label: NAV_CATALOG['act.attendance'].label, to: '/hoat-dong?tab=attendance', icon: NAV_CATALOG['act.attendance'].icon },
      { key: 'weekly', label: NAV_CATALOG['act.weekly'].label, to: '/hoat-dong?tab=weekly', icon: NAV_CATALOG['act.weekly'].icon },
    ] },
    { key: 'compete', title: 'Thi đấu', items: [
      { key: 'compete-overview', label: NAV_CATALOG['cmp.overview'].label, to: '/thi-dau?tab=overview', icon: NAV_CATALOG['cmp.overview'].icon },
      { key: 'tournaments', label: NAV_CATALOG['cmp.tournaments'].label, to: '/thi-dau?tab=tournaments', icon: NAV_CATALOG['cmp.tournaments'].icon },
      { key: 'matches', label: NAV_CATALOG['cmp.schedule'].label, to: '/thi-dau?tab=schedule', icon: NAV_CATALOG['cmp.schedule'].icon },
      { key: 'results', label: NAV_CATALOG['cmp.results'].label, to: '/thi-dau?tab=results', icon: NAV_CATALOG['cmp.results'].icon },
      { key: 'standings', label: NAV_CATALOG['cmp.standings'].label, to: '/thi-dau?tab=standings', icon: NAV_CATALOG['cmp.standings'].icon },
    ] },
    { key: 'community', title: 'Cộng đồng', items: [
      { key: 'feed', label: NAV_CATALOG['com.feed'].label, to: '/community?tab=feed', icon: NAV_CATALOG['com.feed'].icon },
      { key: 'matchmaking', label: NAV_CATALOG['com.match'].label, to: '/community?tab=matchmaking', icon: NAV_CATALOG['com.match'].icon },
      { key: 'moderation', label: NAV_CATALOG['com.moderation'].label, to: '/community?tab=moderation', icon: NAV_CATALOG['com.moderation'].icon },
    ] },
    { key: 'admin', title: 'Quản trị & AI', items: [
      { key: 'aido', label: 'AIDO', to: '/aido', icon: Cpu },
      { key: 'lisa', label: 'Lisa AI', to: '/lisa', icon: Sparkles },
      { key: 'notifications', label: NAV_CATALOG['sys.notifications'].label, to: '/he-thong?tab=notifications', icon: NAV_CATALOG['sys.notifications'].icon, badge: true },
      { key: 'billing', label: NAV_CATALOG['sys.billing'].label, to: '/he-thong?tab=billing', icon: NAV_CATALOG['sys.billing'].icon },
      { key: 'settings', label: NAV_CATALOG['sys.settings'].label, to: '/he-thong?tab=settings', icon: NAV_CATALOG['sys.settings'].icon },
    ] },
  ],
  MEMBER_VIEW: [
    { key: 'personal', title: 'Cá nhân', items: [
      { key: 'dashboard', label: 'Tổng quan cá nhân', to: '/member/dashboard', icon: LayoutDashboard },
      { key: 'receipt', label: NAV_CATALOG['me.receipt'].label, to: '/member/ca-nhan?tab=receipt', icon: NAV_CATALOG['me.receipt'].icon },
      { key: 'attend', label: NAV_CATALOG['me.attend'].label, to: '/member/ca-nhan?tab=attend', icon: NAV_CATALOG['me.attend'].icon },
      { key: 'mydebts', label: NAV_CATALOG['fin.debts'].label, to: '/member/ca-nhan?tab=debts', icon: NAV_CATALOG['fin.debts'].icon },
    ] },
    { key: 'finance', title: 'Tài chính CLB', items: [
      { key: 'fund', label: NAV_CATALOG['fin.periods'].label, to: '/member/tai-chinh?tab=periods', icon: NAV_CATALOG['fin.periods'].icon },
      { key: 'income', label: NAV_CATALOG['fin.income'].label, to: '/member/tai-chinh?tab=income', icon: NAV_CATALOG['fin.income'].icon },
      { key: 'expense', label: NAV_CATALOG['fin.expense'].label, to: '/member/tai-chinh?tab=expense', icon: NAV_CATALOG['fin.expense'].icon },
      { key: 'reports', label: NAV_CATALOG['fin.reports'].label, to: '/member/tai-chinh?tab=reports', icon: NAV_CATALOG['fin.reports'].icon },
    ] },
    { key: 'activity', title: 'Hoạt động', items: [
      { key: 'schedule', label: NAV_CATALOG['act.schedule'].label, to: '/member/hoat-dong?tab=schedule', icon: NAV_CATALOG['act.schedule'].icon },
      { key: 'registration', label: NAV_CATALOG['act.registration'].label, to: '/member/hoat-dong?tab=registration', icon: NAV_CATALOG['act.registration'].icon },
      { key: 'checkin', label: NAV_CATALOG['act.checkin'].label, to: '/member/hoat-dong?tab=checkin', icon: NAV_CATALOG['act.checkin'].icon },
      { key: 'weekly', label: NAV_CATALOG['act.weekly'].label, to: '/member/hoat-dong?tab=weekly', icon: NAV_CATALOG['act.weekly'].icon },
    ] },
    { key: 'compete', title: 'Thi đấu', items: [
      { key: 'tournaments', label: NAV_CATALOG['cmp.tournaments'].label, to: '/member/thi-dau?tab=tournaments', icon: NAV_CATALOG['cmp.tournaments'].icon },
      { key: 'matches', label: NAV_CATALOG['cmp.schedule'].label, to: '/member/thi-dau?tab=schedule', icon: NAV_CATALOG['cmp.schedule'].icon },
      { key: 'results', label: NAV_CATALOG['cmp.results'].label, to: '/member/thi-dau?tab=results', icon: NAV_CATALOG['cmp.results'].icon },
      { key: 'standings', label: NAV_CATALOG['cmp.standings'].label, to: '/member/thi-dau?tab=standings', icon: NAV_CATALOG['cmp.standings'].icon },
    ] },
    { key: 'community', title: 'Cộng đồng', items: [
      { key: 'feed', label: NAV_CATALOG['com.feed'].label, to: '/community?tab=feed', icon: NAV_CATALOG['com.feed'].icon },
      { key: 'matchmaking', label: NAV_CATALOG['com.match'].label, to: '/community?tab=matchmaking', icon: NAV_CATALOG['com.match'].icon },
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
