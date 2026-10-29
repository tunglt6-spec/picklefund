import type { Role } from '../types'

const admin: Record<string, string> = {
  '/dashboard': '/m/tong-quan', '/members': '/thanh-vien?tab=list',
  '/member-accounts': '/thanh-vien?tab=accounts', '/scoring': '/thanh-vien?tab=scoring',
  '/fund-periods': '/tai-chinh?tab=periods', '/contributions': '/tai-chinh?tab=income',
  '/expenses': '/tai-chinh?tab=expense', '/debts': '/tai-chinh?tab=debts', '/reports': '/tai-chinh?tab=reports',
  '/payments': '/tai-chinh?tab=payments', '/attendance': '/hoat-dong?tab=attendance',
  '/schedule': '/hoat-dong?tab=schedule', '/session-registration': '/hoat-dong?tab=registration',
  '/check-in': '/hoat-dong?tab=checkin', '/activity': '/hoat-dong?tab=weekly',
  '/minigames': '/thi-dau?tab=tournaments', '/notifications': '/he-thong?tab=notifications',
  '/billing': '/he-thong?tab=billing', '/settings': '/he-thong?tab=settings',
  '/admin/execution-log': '/admin/ai-log?tab=mitdac',
}
const member: Record<string, string> = {
  '/member/aido': '/ung-dung',
  '/member/receipt': '/member/ca-nhan?tab=receipt', '/member/contributions': '/member/ca-nhan?tab=contrib',
  '/member/attendance': '/member/ca-nhan?tab=attend', '/debts': '/member/ca-nhan?tab=debts',
  '/fund-periods': '/member/tai-chinh?tab=periods', '/contributions': '/member/tai-chinh?tab=income',
  '/expenses': '/member/tai-chinh?tab=expense', '/reports': '/member/tai-chinh?tab=reports',
  '/schedule': '/member/hoat-dong?tab=schedule', '/session-registration': '/member/hoat-dong?tab=registration',
  '/check-in': '/member/hoat-dong?tab=checkin', '/activity': '/member/hoat-dong?tab=weekly',
  '/minigames': '/member/thi-dau?tab=tournaments',
}
const treasurer: Record<string, string> = {
  '/treasurer/income': '/treasurer/so-quy?tab=income',
  '/treasurer/expense': '/treasurer/so-quy?tab=expense',
  '/treasurer/ledger': '/treasurer/so-quy?tab=ledger',
}
const aliases: Partial<Record<Role, Record<string, string>>> = { CLUB_ADMIN: admin, MEMBER_VIEW: member, CLUB_TREASURER: treasurer }

/** Called only for mobile. Old bookmarks stay valid without maintaining a second screen. */
export function canonicalMobileRoute(role: Role | undefined, pathname: string, search = '', hash = ''): string | null {
  if (!role) return null
  const params = new URLSearchParams(search)
  if ((role === 'CLUB_ADMIN' && pathname === '/thi-dau') || (role === 'MEMBER_VIEW' && pathname === '/member/thi-dau')) {
    const section = params.get('tab')
    if (section === 'schedule' || section === 'results' || section === 'standings') {
      params.set('tab', 'tournaments'); params.set('section', section)
      return `${pathname}?${params}${hash}`
    }
  }
  if ((role === 'CLUB_ADMIN' || role === 'SUPER_ADMIN') && pathname === '/aido' && ['office', 'ops-center'].includes(params.get('tab') ?? '')) {
    params.delete('tab'); params.delete('from')
    return `/admin/ai-manager${params.size ? `?${params}` : ''}${hash}`
  }
  const target = aliases[role]?.[pathname]
  if (!target) return null
  const [path, query] = target.split('?')
  const targetParams = new URLSearchParams(query)
  // Existing nested selections (settings/scoring) use `view`; keep filters and anchors.
  if (params.has('tab') && targetParams.has('tab') && !params.has('view')) params.set('view', params.get('tab')!)
  targetParams.forEach((value, key) => params.set(key, value))
  return `${path}${params.size ? `?${params}` : ''}${hash}`
}
