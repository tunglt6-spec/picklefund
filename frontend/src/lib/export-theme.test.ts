/* Chạy: node --test src/lib/export-theme.test.ts  (Node ≥ 22.6, type-stripping) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  THEME, MIN_PT, DEFAULT_BRAND_HEX, CONTENT_W_PORTRAIT, CONTENT_W_LANDSCAPE, contrast, makeBrand, fmt, hexToRgb, toHex, css,
} from './export-theme.js'

const C = THEME.color as Record<string, number[]>

test('token màu CHỮ đạt WCAG AA (≥ 4.5:1) trên trắng và trên surface2', () => {
  for (const k of ['ink', 'ink2', 'muted', 'pos', 'neg', 'warn', 'info']) {
    assert.ok(contrast(C[k], C.white) >= 4.5, `${k} trên trắng = ${contrast(C[k], C.white).toFixed(2)}`)
    assert.ok(contrast(C[k], C.surface2) >= 4.5, `${k} trên surface2 = ${contrast(C[k], C.surface2).toFixed(2)}`)
  }
})

test('màu semantic CHỮ khớp spec; muted KHÔNG còn #94A3B8; fill (chấm/thanh) ≥ 3:1', () => {
  assert.equal(toHex(C.ink), '#1E293B')
  assert.equal(toHex(C.ink2), '#475569')
  assert.equal(toHex(C.muted), '#5A6678')
  assert.equal(toHex(C.pos), '#15803D')
  assert.equal(toHex(C.neg), '#B91C1C')
  assert.equal(toHex(C.warn), '#B45309')
  assert.equal(toHex(C.info), '#0E7490')
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
  assert.equal(CONTENT_W_PORTRAIT, 186)
})

test('makeBrand: mặc định #6D5DFB → brandInk #4F46E5; hex sai/rỗng → mặc định', () => {
  const d = makeBrand(DEFAULT_BRAND_HEX)
  assert.equal(d.hex, '#6D5DFB')
  assert.equal(d.inkHex, '#4F46E5')
  for (const bad of [null, undefined, '', 'xyz', '#12', '123456789']) assert.equal(makeBrand(bad as string).hex, '#6D5DFB')
})

test('makeBrand: với MỌI màu CLB (kể cả rất nhạt) chữ TRẮNG trên brandInk ≥ 4.5 và brandInk trên brandSoft/trắng ≥ 4.5', () => {
  const samples = ['#FFFFFF', '#FFFF00', '#F59E0B', '#FACC15', '#A3E635', '#22D3EE', '#0F766E', '#6D5DFB', '#000000', '#E11D48', '#10B981', '#FDE68A']
  // + quét thô không gian màu để bắt trường hợp lạ
  for (let r = 0; r < 256; r += 51) for (let g = 0; g < 256; g += 51) for (let b = 0; b < 256; b += 51) samples.push(toHex([r, g, b]))
  for (const hex of samples) {
    const m = makeBrand(hex)
    assert.ok(contrast(C.white, m.brandInk) >= 4.5, `${hex}: trắng/brandInk = ${contrast(C.white, m.brandInk).toFixed(2)}`)
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
