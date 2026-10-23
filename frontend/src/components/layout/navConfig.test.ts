import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bottomTabsByRole, landingRoute, MOBILE_HOME, APPS_ROUTE, HUB_PATHS } from './navRoutes'
import { APPS, HOME_KEYS, homeApps, calendarApps, competeApps, communityApps } from '../mobile/hubApps'
import { fold } from '../../lib/fold'
import type { Role } from '../../types'

const ROLES: Role[] = ['CLUB_ADMIN', 'MEMBER_VIEW', 'CLUB_TREASURER', 'SUPER_ADMIN']

test('fold: bỏ dấu tiếng Việt và hạ chữ', () => {
  assert.equal(fold('Điểm danh'), 'diem danh')
  assert.equal(fold('ĐỖ'), 'do')
  assert.equal(fold('Trung tâm điều hành AI'), 'trung tam dieu hanh ai')
})

test('landingRoute: mobile → màn Tổng quan; desktop/lỗi → route gốc', () => {
  const g = globalThis as unknown as { window?: unknown }
  const prev = g.window
  g.window = { matchMedia: () => ({ matches: true }) }
  assert.equal(landingRoute('/aido'), MOBILE_HOME)
  g.window = { matchMedia: () => ({ matches: false }) }
  assert.equal(landingRoute('/aido'), '/aido')
  g.window = { matchMedia: () => { throw new Error('x') } }
  assert.equal(landingRoute('/aido'), '/aido')
  g.window = prev
})

test('thanh đáy: mỗi vai 5 tab, đường dẫn duy nhất, tab cuối là Ứng dụng', () => {
  for (const r of ROLES) {
    const tabs = bottomTabsByRole[r]
    assert.equal(tabs.length, 5, r)
    assert.equal(new Set(tabs.map((t) => t.to)).size, 5, r)
    assert.equal(tabs[4].to, APPS_ROUTE, r)
  }
})

test('hub: các đường dẫn hub nằm trong HUB_PATHS và thanh đáy admin/member trỏ vào hub', () => {
  for (const r of ['CLUB_ADMIN', 'MEMBER_VIEW'] as Role[]) {
    for (const t of bottomTabsByRole[r]) assert.ok(HUB_PATHS.includes(t.to), `${r} ${t.to}`)
  }
})

test('homeApps: đủ ô theo HOME_KEYS (không key sai) cho mọi vai', () => {
  for (const r of ROLES) {
    const items = homeApps(r)
    assert.equal(items.length, HOME_KEYS[r].length, `${r} thiếu key trong APPS`)
    assert.ok(items.every((i) => !!i.key && !!i.to), r)
  }
})

test('quyền theo vai: thủ quỹ không có Điểm danh; thành viên không có Điểm danh quản trị/Kiểm duyệt', () => {
  assert.ok(!APPS.CLUB_TREASURER.some((a) => a.key === 'attendance'))
  assert.ok(!calendarApps('MEMBER_VIEW').some((a) => a.key === 'attendance'))
  assert.ok(calendarApps('CLUB_ADMIN').some((a) => a.key === 'attendance'))
  assert.ok(!communityApps('CLUB_TREASURER').some((a) => a.key === 'moderation'))
  assert.ok(communityApps('CLUB_ADMIN').some((a) => a.key === 'moderation'))
})

test('đường dẫn module của thành viên đi vào /member/*, của quản trị không', () => {
  assert.ok(calendarApps('MEMBER_VIEW').every((a) => a.to.startsWith('/member/hoat-dong')))
  assert.ok(competeApps('MEMBER_VIEW').every((a) => a.to.startsWith('/member/thi-dau')))
  assert.ok(competeApps('CLUB_ADMIN').every((a) => a.to.startsWith('/thi-dau')))
})
