import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mobilePeriodLabel } from './mobilePresentation'
import { tileIconName } from '../components/icons/tileIconMap'

test('mobile chart distinguishes recurring quarters by year without truncating the shared prefix', () => {
  assert.equal(mobilePeriodLabel('ThePing_Quý 4', 0, '2026-10-01'), 'Q4/26')
  assert.equal(mobilePeriodLabel('ThePing_Quý 4', 1, '2025-10-01'), 'Q4/25')
  assert.equal(mobilePeriodLabel('Quý 2/2026', 2), 'Q2/26')
})
test('monthly/custom periods retain useful distinct mobile labels', () => {
  assert.equal(mobilePeriodLabel('Quỹ Tháng 10', 0, '2026-10-01'), 'T10/26')
  assert.equal(mobilePeriodLabel('Mini', 1), 'Mini')
  assert.equal(mobilePeriodLabel('Một tên kỳ rất dài', 0), 'Kỳ 1')
  assert.equal(mobilePeriodLabel('Một tên kỳ rất dài', 1), 'Kỳ 2')
})
test('deep tournament menu resolves both icons to the solid glass registry', () => {
  assert.equal(tileIconName({key:'schedule',label:'Lịch & Kết quả',module:'compete'}), 'fixtures')
  assert.equal(tileIconName({key:'standings',label:'Bảng xếp hạng',module:'compete'}), 'ranking')
})

test('scoreboard menu resolves to the approved palette icon instead of an inherited white control glyph', () => {
  assert.equal(tileIconName({key:'scoreboard',label:'Bảng điểm',module:'members'}), 'ranking')
})
