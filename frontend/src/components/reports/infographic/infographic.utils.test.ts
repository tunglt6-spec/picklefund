/* Chạy: node --test src/components/reports/infographic/infographic.utils.test.ts  (Node ≥ 22.6, type-stripping) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fmtVND, buildFileName, safeCanvasScale, planPdfPages, mapToInfographicData, MAX_CANVAS_PX } from './infographic.utils.ts'

const nbsp = (s: string) => s.replace(/\u00a0/g, ' ')

test('fmtVND giữ độ chính xác đầy đủ (không làm tròn triệu)', () => {
  assert.equal(nbsp(fmtVND(1_249_999)), '1.249.999 đ')
  assert.equal(nbsp(fmtVND(1_300_000)), '1.300.000 đ')
  assert.equal(nbsp(fmtVND(-350_000)), '-350.000 đ')
  assert.equal(fmtVND(0), '0 đ')
})

test('fmtVND chặn NaN/undefined/null', () => {
  assert.equal(fmtVND(NaN), '0 đ')
  assert.equal(fmtVND(undefined), '0 đ')
  assert.equal(fmtVND(null), '0 đ')
  assert.equal(fmtVND(Infinity), '0 đ')
})

test('buildFileName dùng tên CLB, fallback PickleFund', () => {
  assert.equal(buildFileName('CLB Sao Mai', 'Tháng 7/2026_TổngQuan', 'png'), 'CLB_Sao_Mai_Tháng_7_2026_TổngQuan_Infographic.png')
  assert.equal(buildFileName('', 'Q1', 'pdf'), 'PickleFund_Q1_Infographic.pdf')
  assert.ok(!buildFileName('Sao Mai', 'Q1', 'pdf').startsWith('PickleFund_'))
})

test('safeCanvasScale hạ scale khi quá cao, giữ 2 khi thấp', () => {
  assert.equal(safeCanvasScale(1920), 2)
  const s = safeCanvasScale(40_000)
  assert.ok(s < 1 && 40_000 * s <= MAX_CANVAS_PX)
  assert.equal(safeCanvasScale(NaN), 2)
})

test('planPdfPages: thấp → 1 trang; quá cao → nhiều trang phủ kín', () => {
  const one = planPdfPages(2160, 3840)
  assert.equal(one.length, 1)
  const many = planPdfPages(2160, 120_000)
  assert.ok(many.length > 1)
  assert.equal(many.reduce((s, p) => s + p.srcH, 0), 120_000)
  assert.deepEqual(planPdfPages(0, 100), [])
})

test('mapToInfographicData chặn NaN', () => {
  const d = mapToInfographicData({
    clubName: '', periodLabel: 'K', totalIncome: NaN, totalExpenses: 10, displayBalance: undefined as unknown as number,
    memberCount: 3, sessionCount: 2, confirmedCount: 1, memberBillRows: [],
  })
  assert.equal(d.fundBalance, 0)
  assert.equal(d.expenseIncomeRatio, 0)
  assert.equal(d.unpaidMembers, 2)
  assert.equal(d.clubName, 'CLB Pickleball')
})
