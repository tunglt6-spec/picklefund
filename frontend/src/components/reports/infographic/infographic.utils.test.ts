/* Chạy: node --test src/components/reports/infographic/infographic.utils.test.ts  (Node ≥ 22.6, type-stripping) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fmtVND, buildFileName, safeCanvasScale, planPdfPages, mapToInfographicData, MAX_CANVAS_PX, makeInfographicPalette, monogramOf, contrastRatio, makeInfographicGlass, GLASS_ALPHA, rgbaOf, DEFAULT_INFOGRAPHIC_BRAND, INFOGRAPHIC_MIN_FONT_PX } from './infographic.utils.ts'

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

test('palette SINH ĐỘNG: token khớp spec app (tím #4F46E5 / xanh #16A34A / đỏ #DC2626 / viền indigo)', () => {
  const P = makeInfographicPalette(null)
  assert.equal(P.deep, '#4F46E5')
  assert.equal(P.soft, '#EEF2FF')
  assert.equal(P.softBorder, '#C7D2FE')
  assert.equal(P.badge, '#988CFC')
  assert.equal(P.posVivid, '#16A34A')
  assert.equal(P.negVivid, '#DC2626')
  assert.equal(P.orange, '#EA580C')
  assert.equal(P.pos, '#15803D')
  assert.equal(P.neg, '#B91C1C')
})

test('palette: SỐ ĐẬM cỡ lớn (vivid) ≥ 3:1 trên trắng/tint/soft; chữ phụ trắng/deep ≥ 4.5', () => {
  for (const c of [null, '#F59E0B', '#0F766E', '#DB2777', '#FFFFFF']) {
    const P = makeInfographicPalette(c)
    const ok3 = (fg: string, bg: string, name: string) =>
      assert.ok(contrastRatio(fg, bg) >= 3, `${c} ${name}: ${fg} on ${bg} = ${contrastRatio(fg, bg).toFixed(2)}`)
    ok3(P.posVivid, '#FFFFFF', 'posVivid/white'); ok3(P.posVivid, P.posTint, 'posVivid/posTint')
    ok3(P.negVivid, '#FFFFFF', 'negVivid/white'); ok3(P.negVivid, P.negTint, 'negVivid/negTint')
    ok3(P.orange, '#FFFFFF', 'orange/white'); ok3(P.orange, P.soft, 'orange/soft')
    ok3(P.cyan, '#FFFFFF', 'cyan/white'); ok3(P.cyan, P.soft, 'cyan/soft')
    ok3(P.negVivid, P.negTint, 'negVivid/negTint')
    assert.ok(contrastRatio(P.onDark, P.deep) >= 4.5, `${c} trắng/deep`)
    assert.ok(contrastRatio(P.onDarkMuted, P.dark) >= 4.5, `${c} phụ/dark`)
    assert.ok(contrastRatio(P.muted, P.posTint) >= 4.5 && contrastRatio(P.muted, P.negTint) >= 4.5, `${c} muted/tint`)
  }
})

test('palette: nền đậm vẫn mang sắc brand (không đen/xám) + không còn navy/vàng cố định, tối thiểu 14px', () => {
  const P = makeInfographicPalette(null)
  // kênh xanh dương vẫn trội → dark/darker/darkest là tím đậm, không phải xám/đen
  for (const h of [P.dark, P.darker, P.darkest]) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
    assert.ok(b > g + 20 && b >= r, `${h} phải ngả brand`)
  }
  const all = Object.values(makeInfographicPalette('#0F766E')).join(' ').toUpperCase()
  for (const old of ['#0B2A4A', '#FACC15', '#040E1C', '#020810', '#94A3B8']) assert.ok(!all.includes(old), old)
  assert.ok(INFOGRAPHIC_MIN_FONT_PX >= 14)
})

test('monogramOf: bỏ "CLB/Câu lạc bộ", tối đa 2 chữ', () => {
  assert.equal(monogramOf('CLB Pickleball Thăng Long'), 'PT')
  assert.equal(monogramOf('Câu lạc bộ Đống Đa'), 'ĐĐ')
  assert.equal(monogramOf(''), 'C')
})

test('Overlay A/B: LIQUID GLASS — không backdrop-filter (html2canvas), không emoji, không hex cứng (mọi màu đi qua palette)', async () => {
  const { readFileSync } = await import('node:fs')
  for (const f of ['InfographicOverlayA.tsx', 'InfographicOverlayB.tsx']) {
    const src = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    assert.ok(!/backdrop/i.test(src), `${f} backdrop-filter`)
    assert.ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(src), `${f} emoji`)
    const hex = [...src.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toUpperCase())
    assert.deepEqual(hex, [], `${f} hex cứng: ${hex.join(',')}`)
  }
})

/* ── LIQUID GLASS ── */
const over = (fg: string, a: number, bg: string) => {
  const f = [1, 3, 5].map((i) => parseInt(fg.slice(i, i + 2), 16)), b = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16))
  return '#' + f.map((v, i) => Math.round(b[i] + (v - b[i]) * a).toString(16).padStart(2, '0')).join('').toUpperCase()
}

test('glass: chữ trắng trên băng header (cả hai đầu gradient, + chip kính + bóng loáng) ≥ 4.5; chữ trên tối ≥ 4.5', () => {
  for (const c of [null, '#F59E0B', '#FACC15', '#FFFFFF', '#000000', '#0F766E', '#DB2777']) {
    const P = makeInfographicPalette(c), G = makeInfographicGlass(P)
    for (const end of [G.mastFrom, G.mastTo]) {
      assert.ok(contrastRatio('#FFFFFF', over('#FFFFFF', GLASS_ALPHA.chip, end)) >= 4.5, `${c} chip trên ${end}`)
    }
    assert.ok(contrastRatio('#FFFFFF', over('#FFFFFF', GLASS_ALPHA.gloss, G.mastFrom)) >= 4.5, `${c} gloss`)
  }
})

test('glass: chữ trên tấm kính / wash xấu nhất đạt AA; số đậm cỡ lớn ≥ 3', () => {
  for (const c of [null, '#F59E0B', '#0F766E', '#DB2777']) {
    const P = makeInfographicPalette(c)
    const washWorst = over(P.brand, GLASS_ALPHA.orb, P.soft)
    const card = over('#FFFFFF', GLASS_ALPHA.panelBottom, washWorst)
    for (const [n, fg] of [['text', P.text], ['text2', P.text2], ['muted', P.muted], ['ink', P.ink], ['pos', P.pos], ['neg', P.neg], ['warn', P.warn]] as const) {
      assert.ok(contrastRatio(fg, card) >= 4.5, `${c} ${n} trên kính ${contrastRatio(fg, card).toFixed(2)}`)
    }
    for (const [n, f] of [['pos', P.posVivid], ['neg', P.negVivid], ['orange', P.orange], ['cyan', P.cyan]] as const) {
      const tinted = over(f, GLASS_ALPHA.tone, over('#FFFFFF', GLASS_ALPHA.panelBottom, P.soft))
      assert.ok(contrastRatio(f, tinted) >= 3, `${c} ${n} vivid ${contrastRatio(f, tinted).toFixed(2)}`)
    }
    // chip trạng thái: chữ AA trên nền màu α.08 phủ kính
    for (const [t, f] of [[P.pos, P.posFill], [P.neg, P.negFill]] as const) assert.ok(contrastRatio(t, over(f, 0.08, '#FFFFFF')) >= 4.5, `${c} chip`)
    assert.ok(rgbaOf('#6D5DFB', 0.5).startsWith('rgba(109,93,251'))
  }
})
