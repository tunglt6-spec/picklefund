import assert from 'node:assert/strict'
import test from 'node:test'
import { workspaceForLocation } from './workspaceDesign'

const routes = {
  members: ['/members', '/thanh-vien', '/member-accounts', '/scoring', '/member/dashboard'],
  finance: ['/tai-chinh', '/fund-periods', '/contributions', '/expenses', '/payments', '/reports', '/debts', '/treasurer/dashboard', '/treasurer/so-quy', '/treasurer/reminders', '/member/receipt', '/member/contributions'],
  activity: ['/hoat-dong', '/schedule', '/attendance', '/session-registration', '/check-in', '/activity', '/member/hoat-dong', '/member/attendance'],
  compete: ['/thi-dau', '/minigames/123/schedule', '/member/thi-dau'],
  community: ['/community', '/m/cong-dong'],
  ai: ['/aido', '/lisa', '/admin/ai-manager/club-memory', '/admin/workflows', '/member/aido', '/member/lisa'],
  system: ['/he-thong', '/settings', '/billing', '/super/payments', '/super/users'],
} as const

for (const [family, paths] of Object.entries(routes)) {
  test(`workspace styling: ${family} routes`, () => {
    for (const path of paths) assert.equal(workspaceForLocation(path), family, path)
  })
}
test('personal subfunctions inherit their business family', () => {
  assert.equal(workspaceForLocation('/member/ca-nhan', '?tab=attend'), 'activity')
  for (const tab of ['receipt', 'debts', 'contributions']) assert.equal(workspaceForLocation('/member/ca-nhan', `?tab=${tab}`), 'finance')
  assert.equal(workspaceForLocation('/member/ca-nhan', '?tab=profile'), 'members')
})
