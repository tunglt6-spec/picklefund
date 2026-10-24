import {
  Users, MessageSquare, Cpu, Settings, Sparkles, LayoutDashboard, Building2, CreditCard,
  ScrollText, ListOrdered, BadgeCheck, Award, BellRing, Bell,
  ArrowDownCircle, ArrowUpCircle, } from '../icons/mobileLucide'
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
  /** Phân hệ → màu icon (data-mod). Cùng chức năng luôn cùng màu ở mọi điểm truy cập. */
  module?: ModuleKey
}

export type ModuleKey = 'members' | 'finance' | 'activity' | 'compete' | 'community' | 'ai' | 'system'

export interface AppGroup { key: string; title: string; items: AppItem[] }

/**
 * Chức năng của trang "Ứng dụng", NHÓM THEO NGHIỆP VỤ và theo vai trò (route/tab trùng Sidebar + module hiện có —
 * KHÔNG đổi nghiệp vụ). Mọi `to` đi THẲNG vào nội dung (kèm ?tab=), không qua màn menu trung gian.
 */
export const APP_GROUPS: Record<Role, AppGroup[]> = {
  CLUB_ADMIN: [
    { key: 'members', title: 'Thành viên', items: [
      { key: 'members', label: NAV_CATALOG['mem.list'].label, to: '/thanh-vien?tab=list', icon: NAV_CATALOG['mem.list'].icon, module: NAV_CATALOG['mem.list'].module },
      { key: 'scoring', label: NAV_CATALOG['mem.scoring'].label, to: '/thanh-vien?tab=scoring', icon: NAV_CATALOG['mem.scoring'].icon, module: NAV_CATALOG['mem.scoring'].module },
      { key: 'accounts', label: NAV_CATALOG['mem.accounts'].label, to: '/thanh-vien?tab=accounts', icon: NAV_CATALOG['mem.accounts'].icon, module: NAV_CATALOG['mem.accounts'].module },
      { key: 'roles', label: NAV_CATALOG['mem.roles'].label, to: '/thanh-vien?tab=roles', icon: NAV_CATALOG['mem.roles'].icon, module: NAV_CATALOG['mem.roles'].module },
      { key: 'history', label: NAV_CATALOG['mem.history'].label, to: '/thanh-vien?tab=activity', icon: NAV_CATALOG['mem.history'].icon, module: NAV_CATALOG['mem.history'].module },
    ] },
    { key: 'finance', title: 'Tài chính', items: [
      { key: 'fund', label: NAV_CATALOG['fin.periods'].label, to: '/tai-chinh?tab=periods', icon: NAV_CATALOG['fin.periods'].icon, module: NAV_CATALOG['fin.periods'].module },
      { key: 'income', label: NAV_CATALOG['fin.income'].label, to: '/tai-chinh?tab=income', icon: NAV_CATALOG['fin.income'].icon, module: NAV_CATALOG['fin.income'].module },
      { key: 'expense', label: NAV_CATALOG['fin.expense'].label, to: '/tai-chinh?tab=expense', icon: NAV_CATALOG['fin.expense'].icon, module: NAV_CATALOG['fin.expense'].module },
      { key: 'debts', label: NAV_CATALOG['fin.debts'].label, to: '/tai-chinh?tab=debts', icon: NAV_CATALOG['fin.debts'].icon, module: NAV_CATALOG['fin.debts'].module },
      { key: 'reports', label: NAV_CATALOG['fin.reports'].label, to: '/tai-chinh?tab=reports', icon: NAV_CATALOG['fin.reports'].icon, module: NAV_CATALOG['fin.reports'].module },
      { key: 'payments', label: NAV_CATALOG['fin.payments'].label, to: '/tai-chinh?tab=payments', icon: NAV_CATALOG['fin.payments'].icon, module: NAV_CATALOG['fin.payments'].module },
    ] },
    { key: 'activity', title: 'Hoạt động', items: [
      { key: 'schedule', label: NAV_CATALOG['act.schedule'].label, to: '/hoat-dong?tab=schedule', icon: NAV_CATALOG['act.schedule'].icon, module: NAV_CATALOG['act.schedule'].module },
      { key: 'registration', label: NAV_CATALOG['act.registration'].label, to: '/hoat-dong?tab=registration', icon: NAV_CATALOG['act.registration'].icon, module: NAV_CATALOG['act.registration'].module },
      { key: 'checkin', label: NAV_CATALOG['act.checkin'].label, to: '/hoat-dong?tab=checkin', icon: NAV_CATALOG['act.checkin'].icon, module: NAV_CATALOG['act.checkin'].module },
      { key: 'attendance', label: NAV_CATALOG['act.attendance'].label, to: '/hoat-dong?tab=attendance', icon: NAV_CATALOG['act.attendance'].icon, module: NAV_CATALOG['act.attendance'].module },
      { key: 'weekly', label: NAV_CATALOG['act.weekly'].label, to: '/hoat-dong?tab=weekly', icon: NAV_CATALOG['act.weekly'].icon, module: NAV_CATALOG['act.weekly'].module },
    ] },
    { key: 'compete', title: 'Thi đấu', items: [
      { key: 'compete-overview', label: NAV_CATALOG['cmp.overview'].label, to: '/thi-dau?tab=overview', icon: NAV_CATALOG['cmp.overview'].icon, module: NAV_CATALOG['cmp.overview'].module },
      { key: 'tournaments', label: NAV_CATALOG['cmp.tournaments'].label, to: '/thi-dau?tab=tournaments', icon: NAV_CATALOG['cmp.tournaments'].icon, module: NAV_CATALOG['cmp.tournaments'].module },
      { key: 'matches', label: NAV_CATALOG['cmp.schedule'].label, to: '/thi-dau?tab=schedule', icon: NAV_CATALOG['cmp.schedule'].icon, module: NAV_CATALOG['cmp.schedule'].module },
      { key: 'results', label: NAV_CATALOG['cmp.results'].label, to: '/thi-dau?tab=results', icon: NAV_CATALOG['cmp.results'].icon, module: NAV_CATALOG['cmp.results'].module },
      { key: 'standings', label: NAV_CATALOG['cmp.standings'].label, to: '/thi-dau?tab=standings', icon: NAV_CATALOG['cmp.standings'].icon, module: NAV_CATALOG['cmp.standings'].module },
    ] },
    { key: 'community', title: 'Cộng đồng', items: [
      { key: 'feed', label: NAV_CATALOG['com.feed'].label, to: '/community?tab=feed', icon: NAV_CATALOG['com.feed'].icon, module: NAV_CATALOG['com.feed'].module },
      { key: 'matchmaking', label: NAV_CATALOG['com.match'].label, to: '/community?tab=matchmaking', icon: NAV_CATALOG['com.match'].icon, module: NAV_CATALOG['com.match'].module },
      { key: 'moderation', label: NAV_CATALOG['com.moderation'].label, to: '/community?tab=moderation', icon: NAV_CATALOG['com.moderation'].icon, module: NAV_CATALOG['com.moderation'].module },
    ] },
    { key: 'admin', title: 'Quản trị & AI', items: [
      { key: 'aido', label: 'AIDO', to: '/aido', icon: Cpu, module: 'ai' },
      { key: 'lisa', label: 'Lisa AI', to: '/lisa', icon: Sparkles, module: 'ai' },
      { key: 'notifications', label: NAV_CATALOG['sys.notifications'].label, to: '/he-thong?tab=notifications', icon: NAV_CATALOG['sys.notifications'].icon, module: NAV_CATALOG['sys.notifications'].module, badge: true },
      { key: 'billing', label: NAV_CATALOG['sys.billing'].label, to: '/he-thong?tab=billing', icon: NAV_CATALOG['sys.billing'].icon, module: NAV_CATALOG['sys.billing'].module },
      { key: 'settings', label: NAV_CATALOG['sys.settings'].label, to: '/he-thong?tab=settings', icon: NAV_CATALOG['sys.settings'].icon, module: NAV_CATALOG['sys.settings'].module },
    ] },
  ],
  MEMBER_VIEW: [
    { key: 'personal', title: 'Cá nhân', items: [
      { key: 'dashboard', label: 'Tổng quan cá nhân', to: '/member/dashboard', icon: LayoutDashboard, module: 'members' },
      { key: 'receipt', label: NAV_CATALOG['me.receipt'].label, to: '/member/ca-nhan?tab=receipt', icon: NAV_CATALOG['me.receipt'].icon, module: NAV_CATALOG['me.receipt'].module },
      { key: 'attend', label: NAV_CATALOG['me.attend'].label, to: '/member/ca-nhan?tab=attend', icon: NAV_CATALOG['me.attend'].icon, module: NAV_CATALOG['me.attend'].module },
      { key: 'mydebts', label: NAV_CATALOG['fin.debts'].label, to: '/member/ca-nhan?tab=debts', icon: NAV_CATALOG['fin.debts'].icon, module: NAV_CATALOG['fin.debts'].module },
    ] },
    { key: 'finance', title: 'Tài chính CLB', items: [
      { key: 'fund', label: NAV_CATALOG['fin.periods'].label, to: '/member/tai-chinh?tab=periods', icon: NAV_CATALOG['fin.periods'].icon, module: NAV_CATALOG['fin.periods'].module },
      { key: 'income', label: NAV_CATALOG['fin.income'].label, to: '/member/tai-chinh?tab=income', icon: NAV_CATALOG['fin.income'].icon, module: NAV_CATALOG['fin.income'].module },
      { key: 'expense', label: NAV_CATALOG['fin.expense'].label, to: '/member/tai-chinh?tab=expense', icon: NAV_CATALOG['fin.expense'].icon, module: NAV_CATALOG['fin.expense'].module },
      { key: 'reports', label: NAV_CATALOG['fin.reports'].label, to: '/member/tai-chinh?tab=reports', icon: NAV_CATALOG['fin.reports'].icon, module: NAV_CATALOG['fin.reports'].module },
    ] },
    { key: 'activity', title: 'Hoạt động', items: [
      { key: 'schedule', label: NAV_CATALOG['act.schedule'].label, to: '/member/hoat-dong?tab=schedule', icon: NAV_CATALOG['act.schedule'].icon, module: NAV_CATALOG['act.schedule'].module },
      { key: 'registration', label: NAV_CATALOG['act.registration'].label, to: '/member/hoat-dong?tab=registration', icon: NAV_CATALOG['act.registration'].icon, module: NAV_CATALOG['act.registration'].module },
      { key: 'checkin', label: NAV_CATALOG['act.checkin'].label, to: '/member/hoat-dong?tab=checkin', icon: NAV_CATALOG['act.checkin'].icon, module: NAV_CATALOG['act.checkin'].module },
      { key: 'weekly', label: NAV_CATALOG['act.weekly'].label, to: '/member/hoat-dong?tab=weekly', icon: NAV_CATALOG['act.weekly'].icon, module: NAV_CATALOG['act.weekly'].module },
    ] },
    { key: 'compete', title: 'Thi đấu', items: [
      { key: 'tournaments', label: NAV_CATALOG['cmp.tournaments'].label, to: '/member/thi-dau?tab=tournaments', icon: NAV_CATALOG['cmp.tournaments'].icon, module: NAV_CATALOG['cmp.tournaments'].module },
      { key: 'matches', label: NAV_CATALOG['cmp.schedule'].label, to: '/member/thi-dau?tab=schedule', icon: NAV_CATALOG['cmp.schedule'].icon, module: NAV_CATALOG['cmp.schedule'].module },
      { key: 'results', label: NAV_CATALOG['cmp.results'].label, to: '/member/thi-dau?tab=results', icon: NAV_CATALOG['cmp.results'].icon, module: NAV_CATALOG['cmp.results'].module },
      { key: 'standings', label: NAV_CATALOG['cmp.standings'].label, to: '/member/thi-dau?tab=standings', icon: NAV_CATALOG['cmp.standings'].icon, module: NAV_CATALOG['cmp.standings'].module },
    ] },
    { key: 'community', title: 'Cộng đồng', items: [
      { key: 'feed', label: NAV_CATALOG['com.feed'].label, to: '/community?tab=feed', icon: NAV_CATALOG['com.feed'].icon, module: NAV_CATALOG['com.feed'].module },
      { key: 'matchmaking', label: NAV_CATALOG['com.match'].label, to: '/community?tab=matchmaking', icon: NAV_CATALOG['com.match'].icon, module: NAV_CATALOG['com.match'].module },
    ] },
    { key: 'assistant', title: 'Trợ lý & thông báo', items: [
      { key: 'office', label: 'Văn phòng AI', to: '/member/aido', icon: Cpu, module: 'ai' },
      { key: 'lisa', label: 'Lisa AI', to: '/member/lisa', icon: Sparkles, module: 'ai' },
      { key: 'notifications', label: 'Thông báo', to: '/member/notifications', icon: Bell, badge: true, module: 'system' },
    ] },
  ],
  CLUB_TREASURER: [
    { key: 'cashbook', title: 'Sổ quỹ', items: [
      { key: 'dashboard', label: 'Tổng quan quỹ', to: '/treasurer/dashboard', icon: LayoutDashboard, module: 'members' },
      { key: 'income', label: 'Nhập thu', to: '/treasurer/so-quy?tab=income', icon: ArrowDownCircle, module: 'finance' },
      { key: 'expense', label: 'Nhập chi', to: '/treasurer/so-quy?tab=expense', icon: ArrowUpCircle, module: 'finance' },
      { key: 'ledger', label: 'Sổ quỹ', to: '/treasurer/so-quy?tab=ledger', icon: ListOrdered, module: 'finance' },
      { key: 'approve', label: 'Xác nhận nộp quỹ', to: '/payments', icon: BadgeCheck, module: 'finance' },
      { key: 'reminders', label: 'Nhắc nhở', to: '/treasurer/reminders', icon: BellRing, module: 'finance' },
    ] },
    { key: 'members', title: 'Thành viên', items: [
      { key: 'scoring', label: 'Chấm điểm', to: '/scoring', icon: Award, module: 'members' },
    ] },
    { key: 'other', title: 'Khác', items: [
      { key: 'community', label: 'Cộng đồng', to: '/community', icon: MessageSquare, module: 'community' },
      { key: 'lisa', label: 'Lisa AI', to: '/lisa', icon: Sparkles, module: 'ai' },
      { key: 'notifications', label: 'Thông báo', to: '/notifications', icon: Bell, badge: true, module: 'system' },
    ] },
  ],
  SUPER_ADMIN: [
    { key: 'system', title: 'Quản trị hệ thống', items: [
      { key: 'dashboard', label: 'Tổng quan', to: '/super/dashboard', icon: LayoutDashboard, module: 'members' },
      { key: 'clubs', label: 'Quản lý CLB', to: '/super/clubs', icon: Building2, module: 'system' },
      { key: 'users', label: 'Người dùng', to: '/super/users', icon: Users, module: 'system' },
      { key: 'payments', label: 'Thanh toán gói', to: '/super/payments', icon: CreditCard, module: 'system' },
      { key: 'audit', label: 'Audit Logs', to: '/super/audit-logs', icon: ScrollText, module: 'system' },
      { key: 'settings', label: 'Cài đặt', to: '/super/settings', icon: Settings, module: 'system' },
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
