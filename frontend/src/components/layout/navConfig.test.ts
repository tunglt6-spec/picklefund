import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { bottomTabsByRole, landingRoute, pathOf, MOBILE_HOME, APPS_ROUTE, HUB_PATHS } from './navRoutes'
import { APP_GROUPS, APPS, HOME_KEYS, homeApps } from '../mobile/hubApps'
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

test('thanh đáy: mỗi vai 5 mục, đích duy nhất, mục cuối là Ứng dụng; Tổng quan + Ứng dụng là trang mobile riêng', () => {
  for (const r of ROLES) {
    const tabs = bottomTabsByRole[r]
    assert.equal(tabs.length, 5, r)
    assert.equal(new Set(tabs.map((t) => pathOf(t.to))).size, 5, r)
    assert.equal(tabs[4].to, APPS_ROUTE, r)
    assert.equal(tabs[0].to, MOBILE_HOME, r)
  }
  assert.deepEqual(HUB_PATHS, [APPS_ROUTE, MOBILE_HOME])
})

test('thanh đáy admin/member đi THẲNG vào nội dung (lịch, thi đấu, cộng đồng) — không qua trang menu', () => {
  for (const r of ['CLUB_ADMIN', 'MEMBER_VIEW'] as Role[]) {
    const [, cal, compete, community] = bottomTabsByRole[r]
    assert.ok(cal.to.includes('hoat-dong?tab=schedule'), r)
    assert.ok(compete.to.endsWith('thi-dau'), r)
    assert.equal(community.to, '/community')
  }
})

test('homeApps: đủ lối tắt theo HOME_KEYS (không key sai) cho mọi vai', () => {
  for (const r of ROLES) {
    const items = homeApps(r)
    assert.equal(items.length, HOME_KEYS[r].length, `${r} thiếu key trong APP_GROUPS`)
  }
})

test('nhóm Ứng dụng: key nhóm và key ô duy nhất trong từng vai; mọi đích bắt đầu bằng "/"', () => {
  for (const r of ROLES) {
    const groups = APP_GROUPS[r]
    assert.equal(new Set(groups.map((g) => g.key)).size, groups.length, r)
    const keys = groups.flatMap((g) => g.items.map((i) => i.key))
    assert.equal(new Set(keys).size, keys.length, `${r} trùng key ô`)
    assert.ok(APPS[r].every((a) => a.to.startsWith('/')), r)
  }
})

test('quyền theo vai: thủ quỹ không có Điểm danh/Kiểm duyệt; thành viên không có Điểm danh quản trị/Kiểm duyệt', () => {
  assert.ok(!APPS.CLUB_TREASURER.some((a) => a.key === 'attendance' || a.key === 'moderation'))
  assert.ok(!APPS.MEMBER_VIEW.some((a) => a.key === 'attendance' || a.key === 'moderation'))
  assert.ok(APPS.CLUB_ADMIN.some((a) => a.key === 'attendance'))
  assert.ok(APPS.CLUB_ADMIN.some((a) => a.key === 'moderation'))
})

test('đường dẫn của thành viên nằm trong /member/* hoặc trang chung; của quản trị không trỏ /member/*', () => {
  for (const a of APPS.MEMBER_VIEW) assert.ok(a.to.startsWith('/member/') || a.to.startsWith('/community'), a.to)
  for (const a of APPS.CLUB_ADMIN) assert.ok(!a.to.startsWith('/member/'), a.to)
})

// Chống lệch: mọi ?tab=… trong trang Ứng dụng phải tồn tại trong module tương ứng (đọc từ mã nguồn thật).
function tabKeys(file: string): string[] {
  const src = readFileSync(new URL(`../../pages/${file}`, import.meta.url), 'utf8')
  return [...src.matchAll(/key: '([a-z-]+)'/g)].map((m) => m[1])
}
const MODULES: Record<string, string[]> = {
  '/thanh-vien': tabKeys('admin/modules/MembersModule.tsx'),
  '/tai-chinh': tabKeys('admin/modules/FinanceModule.tsx'),
  '/hoat-dong': tabKeys('admin/modules/ActivityModule.tsx'),
  '/thi-dau': tabKeys('admin/modules/CompeteHub.tsx'),
  '/he-thong': tabKeys('admin/modules/SystemModule.tsx'),
  '/member/ca-nhan': tabKeys('member/modules/MemberPersonalModule.tsx'),
  '/member/tai-chinh': tabKeys('member/modules/MemberFinanceModule.tsx'),
  '/member/hoat-dong': tabKeys('member/modules/MemberActivityModule.tsx'),
  '/member/thi-dau': tabKeys('admin/modules/CompeteHub.tsx'),
  '/treasurer/so-quy': tabKeys('treasurer/modules/TreasurerCashbookModule.tsx'),
}

test('mọi ô trong Ứng dụng có ?tab= hợp lệ với module của nó (không có ô chết)', () => {
  for (const r of ROLES) {
    for (const a of APPS[r]) {
      const [path, query] = a.to.split('?')
      const tab = query?.match(/tab=([a-z-]+)/)?.[1]
      if (!tab || !(path in MODULES)) continue
      assert.ok(MODULES[path].includes(tab), `${r}: ${a.to} — module ${path} chỉ có [${MODULES[path].join(', ')}]`)
    }
  }
})
