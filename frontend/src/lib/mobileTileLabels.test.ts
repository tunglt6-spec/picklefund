import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mobileTileLabel, matchesMobileTile } from './mobileTileLabels'

test('short captions preserve descriptive and visible search terms, including unaccented input', () => {
  assert.equal(mobileTileLabel('Hoạt động tuần'), 'Theo tuần')
  assert.equal(matchesMobileTile('Hoạt động tuần', 'theo tuan'), true)
  assert.equal(matchesMobileTile('Hoạt động tuần', 'hoat dong'), true)
  assert.equal(matchesMobileTile('Vai trò & phân quyền', 'vai tro'), true)
  assert.equal(matchesMobileTile('Vai trò & phân quyền', 'phan quyen'), true)
  assert.equal(matchesMobileTile('Danh sách thành viên', 'tai chinh'), false)
})

test('unmapped captions remain meaningful instead of automatic truncation', () => {
  assert.equal(mobileTileLabel('Lịch & Kết quả'), 'Lịch & Kết quả')
  assert.equal(mobileTileLabel('Danh sách thành viên'), 'Thành viên')
  assert.equal(mobileTileLabel('Xác nhận thu/chi từ Zalo'), 'Thu/chi Zalo')
})
