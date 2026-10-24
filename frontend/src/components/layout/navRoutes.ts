import type { Role } from '../../types'

/** Tab đáy của bản mobile (Modern Enterprise Super App): 4 tab theo vai trò + "Ứng dụng" (lưới toàn bộ chức năng). */
export interface BottomTab {
  label: string
  to: string
  icon: 'home' | 'calendar' | 'trophy' | 'community' | 'ledger' | 'approve' | 'bell' | 'club' | 'users' | 'pay' | 'apps'
  /** Các tiền tố đường dẫn thuộc tab này (tô sáng tab khi đang ở màn con). */
  match?: string[]
}

export const APPS_ROUTE = '/ung-dung'
/** Màn Tổng quan của bản mobile/tablet (theo công việc: lịch hôm nay, việc cần xử lý, tài chính, lối tắt). */
export const MOBILE_HOME = '/m/tong-quan'
export const HUB_PATHS = [APPS_ROUTE, MOBILE_HOME]

/** Đường dẫn (bỏ ?query) của một đích điều hướng — dùng để so khớp tab đang chọn. */
export const pathOf = (to: string) => to.split('?')[0]

const HOME_MATCH = ['/dashboard', '/member/dashboard', '/treasurer/dashboard', '/super/dashboard']
const CAL_MATCH = ['/hoat-dong', '/member/hoat-dong', '/attendance', '/schedule', '/session-registration', '/check-in', '/activity']
const COMPETE_MATCH = ['/thi-dau', '/member/thi-dau', '/minigames']
// Các module không nằm trên thanh đáy → tô sáng tab "Ứng dụng" để người dùng luôn biết mình ở đâu.
// AIDO mở từ "Ứng dụng" nên cũng tô sáng tab Ứng dụng (không phải Tổng quan).
const APPS_MATCH = ['/aido', '/member/aido', '/admin/ai-alerts', '/admin/ai-approvals', '/admin/ai-audit-logs', '/admin/ai-data-monitor', '/admin/ai-kpi', '/admin/ai-log', '/admin/ai-manager', '/admin/ai-scheduler', '/admin/workflows', '/thanh-vien', '/tai-chinh', '/he-thong', '/scoring', '/payments', '/notifications', '/billing', '/settings',
  '/member/ca-nhan', '/member/tai-chinh', '/member/notifications', '/member/lisa', '/lisa', '/debts', '/expenses', '/contributions', '/reports', '/fund-periods', '/members', '/member-accounts']

export const bottomTabsByRole: Record<Role, BottomTab[]> = {
  CLUB_ADMIN: [
    { label: 'Tổng quan', to: MOBILE_HOME, icon: 'home', match: HOME_MATCH },
    { label: 'Lịch', to: '/hoat-dong?tab=schedule', icon: 'calendar', match: CAL_MATCH },
    { label: 'Thi đấu', to: '/thi-dau', icon: 'trophy', match: COMPETE_MATCH },
    { label: 'Cộng đồng', to: '/community', icon: 'community', match: ['/community'] },
    { label: 'Ứng dụng', to: APPS_ROUTE, icon: 'apps', match: APPS_MATCH },
  ],
  MEMBER_VIEW: [
    { label: 'Tổng quan', to: MOBILE_HOME, icon: 'home', match: HOME_MATCH },
    { label: 'Lịch', to: '/member/hoat-dong?tab=schedule', icon: 'calendar', match: CAL_MATCH },
    { label: 'Thi đấu', to: '/member/thi-dau', icon: 'trophy', match: COMPETE_MATCH },
    { label: 'Cộng đồng', to: '/community', icon: 'community', match: ['/community'] },
    { label: 'Ứng dụng', to: APPS_ROUTE, icon: 'apps', match: APPS_MATCH },
  ],
  CLUB_TREASURER: [
    { label: 'Tổng quan', to: MOBILE_HOME, icon: 'home', match: HOME_MATCH },
    { label: 'Sổ quỹ', to: '/treasurer/so-quy', icon: 'ledger', match: ['/treasurer/income', '/treasurer/expense', '/treasurer/ledger'] },
    { label: 'Xác nhận', to: '/payments', icon: 'approve' },
    { label: 'Nhắc nhở', to: '/treasurer/reminders', icon: 'bell' },
    { label: 'Ứng dụng', to: APPS_ROUTE, icon: 'apps', match: ['/scoring', '/notifications', '/community', '/lisa'] },
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
