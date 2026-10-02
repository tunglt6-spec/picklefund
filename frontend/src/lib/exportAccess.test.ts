/* Chạy: node --test src/lib/exportAccess.test.ts  (Node ≥ 22.6, type-stripping) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canExportOrgWideData } from './exportAccess.ts'

test('MEMBER_VIEW không được xuất dữ liệu toàn CLB', () => {
  assert.equal(canExportOrgWideData('MEMBER_VIEW'), false)
})
test('staff được xuất', () => {
  for (const r of ['SUPER_ADMIN', 'CLUB_ADMIN', 'CLUB_TREASURER']) assert.equal(canExportOrgWideData(r), true)
})
