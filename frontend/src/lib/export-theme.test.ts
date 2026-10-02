/* Chạy: node --test src/lib/export-theme.test.ts  (Node ≥ 22.6, type-stripping) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  THEME, MIN_PT, DEFAULT_BRAND_HEX, CONTENT_W_PORTRAIT, CONTENT_W_LANDSCAPE, contrast, makeBrand, fmt, hexToRgb, toHex, css, rgba, glassWorstBg,
} from './export-theme.js'

const C = THEME.color as Record<string, number[]>

test('token chữ bản AA (ink, ink2, muted, posText, negText, neg, warn, info) ≥ 4.5:1 trên trắng và trên surface2', () => {
  for (const k of ['ink', 'ink2', 'muted', 'posText', 'negText', 'neg', 'warn', 'info']) {
    assert.ok(contrast(C[k], C.white) >= 4.5, `${k} trên trắng = ${contrast(C[k], C.white).toFixed(2)}`)
    assert.ok(contrast(C[k], C.surface2) >= 4.4, `${k} trên surface2 = ${contrast(C[k], C.surface2).toFixed(2)}`)
  }
})

test('palette SINH ĐỘNG khớp spec; màu sinh động ≥ 3:1 (chỉ cho chữ ĐẬM ≥ 8.5pt); không còn #94A3B8', () => {
  const hex: Record<string, string> = {
    ink: '#1E293B', muted: '#64748B', line: '#E2E8F0', surface2: '#F8FAFC', lineSoft: '#F1F5F9',
    pos: '#16A34A', neg: '#DC2626', negFill: '#EF4444', orange: '#EA580C', cyan: '#0891B2', amber: '#D97706',
    posText: '#15803D', negText: '#B91C1C', posTint: '#F0FDF4', posEdge: '#BBF7D0', negTint: '#FEF2F2', negEdge: '#FECACA',
  }
  for (const [k, v] of Object.entries(hex)) assert.equal(toHex(C[k]), v, k)
  for (const k of ['pos', 'cyan', 'orange', 'amber']) assert.ok(contrast(C[k], C.white) >= 3, `${k} sinh động ≥ 3:1`)
  for (const k of ['posFill', 'negFill', 'warnFill', 'connector']) assert.ok(contrast(C[k], C.white) >= 3, `${k} phi văn bản ≥ 3:1`)
  const all = JSON.stringify(THEME.color).toLowerCase()
  assert.ok(!all.includes('[148,163,184]'), '#94A3B8 không còn trong token')
})

test('thang chữ 7 bậc, sàn 7pt, không bậc nào dưới sàn', () => {
  assert.equal(MIN_PT, 7)
  assert.deepEqual(THEME.type, { display: 22, h1: 16, kpi: 14, h2: 11, body: 8.5, cell: 8, label: 7, caption: 7 })
  for (const v of Object.values(THEME.type)) assert.ok(v >= MIN_PT)
})

test('lề/khổ: CONTENT_W suy ra từ THEME.page ở MỘT nơi', () => {
  assert.equal(CONTENT_W_PORTRAIT, THEME.page.portrait.w - 2 * THEME.page.margin)
  assert.equal(CONTENT_W_LANDSCAPE, THEME.page.landscape.w - 2 * THEME.page.margin)
  assert.equal(CONTENT_W_PORTRAIT, 182)
})

test('makeBrand: mặc định #6D5DFB → brandDark #4F46E5, brandSoft #EEF2FF, viền #C7D2FE, badge #988CFC; hex sai/rỗng → mặc định', () => {
  const d = makeBrand(DEFAULT_BRAND_HEX)
  assert.equal(d.hex, '#6D5DFB')
  assert.equal(d.inkHex, '#4F46E5')
  assert.equal(toHex(d.brandDark), '#4F46E5')
  assert.equal(toHex(d.brandSoft), '#EEF2FF')
  assert.equal(toHex(d.brandBorder), '#C7D2FE')
  assert.equal(toHex(d.badgeOnBrand), '#988CFC')
  assert.ok(contrast(d.brandMid, C.white) >= 4.5, 'brandMid (nền header bảng) chữ trắng ≥ 4.5')
  for (const bad of [null, undefined, '', 'xyz', '#12', '123456789']) assert.equal(makeBrand(bad as string).hex, '#6D5DFB')
})

test('makeBrand: với MỌI màu CLB (kể cả rất nhạt) chữ TRẮNG trên brandInk ≥ 4.5 và brandInk trên brandSoft/trắng ≥ 4.5', () => {
  const samples = ['#FFFFFF', '#FFFF00', '#F59E0B', '#FACC15', '#A3E635', '#22D3EE', '#0F766E', '#6D5DFB', '#000000', '#E11D48', '#10B981', '#FDE68A']
  // + quét thô không gian màu để bắt trường hợp lạ
  for (let r = 0; r < 256; r += 51) for (let g = 0; g < 256; g += 51) for (let b = 0; b < 256; b += 51) samples.push(toHex([r, g, b]))
  for (const hex of samples) {
    const m = makeBrand(hex)
    assert.ok(contrast(C.white, m.brandInk) >= 4.5, `${hex}: trắng/brandInk = ${contrast(C.white, m.brandInk).toFixed(2)}`)
    assert.ok(contrast(C.white, m.brandMid) >= 4.5, `${hex}: trắng/brandMid = ${contrast(C.white, m.brandMid).toFixed(2)}`)
    assert.deepEqual(m.brandDark, m.brandInk)
    assert.ok(contrast(m.brandInk, m.brandSoft) >= 4.5, `${hex}: brandInk/brandSoft = ${contrast(m.brandInk, m.brandSoft).toFixed(2)}`)
    // brandSoft thật sự nhạt (nền header bảng) và brand thô giữ nguyên màu CLB
    assert.ok(contrast(m.brandSoft, C.white) < 1.5)
    assert.equal(m.hex, hex.toUpperCase())
  }
})

test('makeBrand: brandInk của màu sáng được TỐI dần (amber → tối hơn amber)', () => {
  const m = makeBrand('#F59E0B')
  assert.ok(contrast(m.brand, C.white) < 4.5, 'brand thô amber không đạt (đúng như dự kiến)')
  assert.ok(contrast(m.brandInk, C.white) >= 4.5)
})

test('fmt.vnd / fmt.num: "1.234.567 đ", âm, 0, làm tròn, dấu phẩy thập phân', () => {
  assert.equal(fmt.vnd(1234567), '1.234.567 đ')
  assert.equal(fmt.vnd(-5000), '-5.000 đ')
  assert.equal(fmt.vnd(0), '0 đ')
  assert.equal(fmt.vnd(-0.4), '0 đ')
  assert.equal(fmt.vnd(999.6), '1.000 đ')
  assert.equal(fmt.vnd(NaN), '0 đ')
  assert.equal(fmt.num(1234567.5), '1.234.567,5')
  assert.equal(fmt.num(-5000), '-5.000')
  assert.equal(fmt.num(NaN), '')
})

test('fmt.docCode: PF-{LOẠI}-yyMMdd-HHmm theo giờ VN; fmt.dateTime: NGÀY trước giờ', () => {
  // 2026-10-02T03:15:00Z = 10:15 giờ VN
  const d = new Date('2026-10-02T03:15:00Z')
  assert.equal(fmt.docCode('bcq', d), 'PF-BCQ-261002-1015')
  assert.match(fmt.docCode('TQ'), /^PF-TQ-\d{6}-\d{4}$/)
  assert.equal(fmt.dateTime('2026-03-15T10:00:00Z'), '15/03/2026 17:00:00')
  assert.equal(fmt.dateTime('rác'), '—')
  assert.equal(fmt.dateTime(null), '—')
})

test('hexToRgb / toHex / css', () => {
  assert.deepEqual(hexToRgb('#0F766E'), [15, 118, 110])
  assert.equal(hexToRgb('0F766E')?.length, 3)
  assert.equal(hexToRgb('nope'), null)
  assert.equal(toHex([15, 118, 110]), '#0F766E')
  assert.equal(css([1, 2, 3]), 'rgb(1,2,3)')
})

test('LIQUID GLASS tokens: alpha ∈ (0,1], bóng 3 lớp giảm dần, nền kính ≥ 0.78 (giữ chữ nhỏ ≥ 4.5:1), rgba()', () => {
  const G = THEME.glass
  for (const k of ['tile', 'row', 'accent', 'accentEdge', 'edgeWhite', 'hair', 'highlight', 'zebra', 'sep', 'sepHair', 'box']) {
    const v = (G as unknown as Record<string, number>)[k]
    assert.ok(v > 0 && v <= 1, k)
  }
  assert.ok(G.tile >= 0.78 && G.row >= 0.78)
  assert.equal(G.shadow.length, 2)
  assert.ok(G.shadow[0] > G.shadow[1])
  assert.ok(G.orb.alpha <= 0.15 && G.mast.gloss <= 0.14)
  assert.equal(rgba([1, 2, 3], 0.5), 'rgba(1,2,3,0.5)')
})

test('makeBrand: wash 3 nút nhạt (mặc định #F7F9FF → trắng → #FAF9FF) + hai đầu gradient glassStart/glassEnd với mọi màu CLB', () => {
  const d = makeBrand(DEFAULT_BRAND_HEX)
  assert.equal(toHex(d.washA), '#F7F9FF')
  assert.equal(toHex(d.washB), '#FFFFFF')
  assert.equal(toHex(d.washC), '#FAF9FF')
  assert.equal(toHex(d.glassStart), '#4F46E5') // = brandDark
  assert.ok(contrast(d.glassEnd, C.white) >= 4.5)
  for (const hex of ['#0F766E', '#F59E0B', '#FFFFFF', '#000000', '#FACC15']) {
    const m = makeBrand(hex)
    assert.ok(contrast(m.brandDark, glassWorstBg(m, THEME.glass.tile)) >= 4.4, hex)
    assert.ok(contrast(C.white, m.washB) === 1)
  }
  // muted (#64748B) trên nền xấu nhất sau kính ≥ 4.5 với các màu thương hiệu thực tế
  for (const hex of ['#6D5DFB', '#0F766E', '#F59E0B']) assert.ok(contrast(C.muted, glassWorstBg(makeBrand(hex))) >= 4.5, hex)
})
