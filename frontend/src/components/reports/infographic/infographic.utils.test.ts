/* Chạy: node --test src/components/reports/infographic/infographic.utils.test.ts  (Node ≥ 22.6, type-stripping) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fmtVND, buildFileName, safeCanvasScale, planPdfPages, mapToInfographicData, MAX_CANVAS_PX, makeInfographicPalette, monogramOf, contrastRatio, DEFAULT_INFOGRAPHIC_BRAND, INFOGRAPHIC_MIN_FONT_PX } from './infographic.utils.ts'

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

/* ── Palette Infographic (brand CLB, AA) ── */
test('makeInfographicPalette: mặc định khi rỗng/sai định dạng', () => {
  assert.equal(makeInfographicPalette(null).brand, DEFAULT_INFOGRAPHIC_BRAND)
  assert.equal(makeInfographicPalette('red').brand, DEFAULT_INFOGRAPHIC_BRAND)
  assert.equal(makeInfographicPalette('#6d5dfb').ink, '#4F46E5')
})

test('makeInfographicPalette: mọi cặp chữ/nền dùng thật đạt ≥ 4.5:1 với nhiều màu CLB (kể cả sáng/trắng/đen)', () => {
  for (const c of [null, '#F59E0B', '#FACC15', '#FFFFFF', '#000000', '#0F766E', '#22D3EE', '#EEEEEE', '#DB2777']) {
    const P = makeInfographicPalette(c)
    const ok = (fg: string, bg: string, name: string) =>
      assert.ok(contrastRatio(fg, bg) >= 4.5, `${c} ${name}: ${fg} on ${bg} = ${contrastRatio(fg, bg).toFixed(2)}`)
    ok(P.onDark, P.deep, 'trắng/deep (header)')
    ok(P.onDark, P.pill, 'trắng/pill')
    ok(P.onDark, P.dark, 'trắng/dark')
    ok(P.onDark, P.darker, 'trắng/darker')
    ok(P.onDark, P.darkest, 'trắng/darkest')
    ok(P.onDarkMuted, P.dark, 'phụ/dark')
    ok(P.onDarkMuted, P.darker, 'phụ/darker')
    ok(P.onDarkMuted, P.darkest, 'phụ/darkest')
    ok(P.posOnDark, P.dark, 'pos/dark'); ok(P.negOnDark, P.dark, 'neg/dark'); ok(P.warnOnDark, P.dark, 'warn/dark')
    ok(P.ink, '#FFFFFF', 'ink/white'); ok(P.ink, P.soft, 'ink/soft')
    for (const bg of ['#FFFFFF', P.surface2]) {
      ok(P.text, bg, 'text'); ok(P.muted, bg, 'muted'); ok(P.pos, bg, 'pos'); ok(P.neg, bg, 'neg'); ok(P.warn, bg, 'warn')
    }
    ok(P.pos, P.posTint, 'pos/tint'); ok(P.neg, P.negTint, 'neg/tint'); ok(P.warn, P.warnTint, 'warn/tint')
    ok(P.muted, P.soft, 'muted/soft')
  }
})

test('palette: không còn navy/vàng cố định, tối thiểu 14px', () => {
  const P = makeInfographicPalette('#0F766E')
  const all = Object.values(P).join(' ').toUpperCase()
  for (const old of ['#0B2A4A', '#FACC15', '#040E1C', '#020810', '#94A3B8']) assert.ok(!all.includes(old), old)
  assert.ok(INFOGRAPHIC_MIN_FONT_PX >= 14)
})

test('monogramOf: bỏ "CLB/Câu lạc bộ", tối đa 2 chữ', () => {
  assert.equal(monogramOf('CLB Pickleball Thăng Long'), 'PT')
  assert.equal(monogramOf('Câu lạc bộ Đống Đa'), 'ĐĐ')
  assert.equal(monogramOf(''), 'C')
})
