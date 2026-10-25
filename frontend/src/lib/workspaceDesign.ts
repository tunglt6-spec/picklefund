import type { ModuleKey } from '../components/mobile/hubApps'
import type { PlayfulIconName } from '../components/icons/playfulGlyphs'

export const WORKSPACE_DESIGN: Record<ModuleKey, { label: string; icon: PlayfulIconName }> = {
  members: { label: 'Thành viên', icon: 'members' },
  finance: { label: 'Tài chính', icon: 'wallet' },
  activity: { label: 'Hoạt động', icon: 'calendar' },
  compete: { label: 'Thi đấu', icon: 'tournament' },
  community: { label: 'Cộng đồng', icon: 'nav-community' },
  ai: { label: 'Văn phòng AI', icon: 'aido' },
  system: { label: 'Hệ thống', icon: 'settings' },
}

/** Presentation only: every authenticated route inherits its family's design tokens. */
export function workspaceForLocation(pathname: string, search = ''): ModuleKey {
  if (/^\/(aido|lisa|executive-report)(\/|$)|^\/admin\/|^\/member\/(aido|lisa)(\/|$)/.test(pathname)) return 'ai'
  if (/^\/super\//.test(pathname)) return 'system'
  if (/\/member\/(ca-nhan|personal)/.test(pathname)) {
    const tab = new URLSearchParams(search).get('tab')
    return tab === 'attend' ? 'activity' : tab === 'receipt' || tab === 'debts' || tab === 'contributions' ? 'finance' : 'members'
  }
  if (/tai-chinh|fund-period|contribution|expense|debt|payment-approval|cashbook|so-quy|ledger|receipt|^\/payments$|^\/reports$|\/treasurer\/(dashboard|income|expense|reminders)/.test(pathname)) return 'finance'
  if (/hoat-dong|attendance|registration|check-in|checkin|^\/schedule$|^\/activity$|schedule-calendar|weekly-activity/.test(pathname)) return 'activity'
  if (/thi-dau|minigame/.test(pathname)) return 'compete'
  if (/community|cong-dong|matchmaking/.test(pathname)) return 'community'
  if (/thanh-vien|^\/members$|^\/scoring$|member-account|roles-permissions|member-activity|\/member\/(dashboard|office)/.test(pathname)) return 'members'
  return 'system'
}
