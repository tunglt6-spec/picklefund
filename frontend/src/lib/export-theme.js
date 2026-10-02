/**
 * THEME "Luxury SaaS" — nguồn token DUY NHẤT cho mọi PDF vector / phiếu / PNG xuất từ FE.
 *
 * JS thuần (ESM) như pdf-report-core.js để chạy được cả trong app, cả harness/test Node.
 * Luật: mọi exporter ĐỌC token ở đây, không hard-code màu/cỡ chữ riêng.
 *  - Chữ: chỉ dùng ink / ink2 / muted / pos / neg / warn / info / brandInk (đều ≥ 4.5:1 trên nền trắng).
 *  - Màu tươi (posFill/negFill/warnFill, brand thô) CHỈ cho chấm / thanh / vạch — không làm màu chữ.
 *  - Màu brand = màu CLB (mặc định #6D5DFB) qua makeBrand (tự tối dần để đạt tương phản).
 */

export const DEFAULT_BRAND_HEX = '#6D5DFB'

export const THEME = {
  /** RGB cho jsPDF. */
  color: {
    ink: [30, 41, 59], // #1E293B
    ink2: [71, 85, 105], // #475569
    muted: [90, 102, 120], // #5A6678
    line: [226, 232, 240], // #E2E8F0 (hairline — trang trí)
    lineStrong: [203, 213, 225], // #CBD5E1 (viền thẻ, đường ký)
    connector: [100, 116, 139], // #64748B (đường nối sơ đồ — phi văn bản ≥ 3:1)
    surface2: [248, 250, 252], // #F8FAFC
    white: [255, 255, 255],
    // semantic CHỮ
    pos: [21, 128, 61], // #15803D
    neg: [185, 28, 28], // #B91C1C
    warn: [180, 83, 9], // #B45309
    info: [14, 116, 144], // #0E7490
    // semantic FILL (chấm/thanh — KHÔNG làm màu chữ)
    posFill: [22, 163, 74], // #16A34A
    negFill: [239, 68, 68], // #EF4444
    warnFill: [217, 119, 6], // #D97706
    posTint: [240, 253, 244],
    negTint: [254, 242, 242],
    warnTint: [255, 251, 235],
  },
  /** Thang chữ 7 bậc (pt). Sàn tuyệt đối = MIN_PT. */
  type: { display: 22, h1: 16, kpi: 14, h2: 11, body: 8.5, cell: 8, label: 7, caption: 7 },
  /** Thang khoảng cách (mm). */
  space: { xs: 2, s: 4, m: 8, l: 12, xl: 16, xxl: 24 },
  /** Khổ giấy + lề: CHUẨN HOÁ ở một nơi (CONTENT_W suy ra từ đây). */
  page: {
    portrait: { w: 210, h: 297 },
    landscape: { w: 297, h: 210 },
    margin: 12,
    /** vùng footer: vạch ở H - footerLine, chữ ở H - footerText; nội dung dừng ở H - bottomPad */
    footerLine: 15,
    footerText: 10.8,
    bottomPad: 19,
  },
  line: { hair: 0.2, border: 0.3, strong: 0.5, brandRule: 0.6 },
  radius: { card: 2, bar: 1 },
  row: { h: 8, lineH: 3.8, padX: 3 },
  /** Phông trong PNG/HTML (webfont nạp qua FontFace). */
  fontFamily: "'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif",
}

/** Sàn cỡ chữ tuyệt đối (pt) cho mọi tài liệu in. */
export const MIN_PT = 7
export const CONTENT_W_PORTRAIT = THEME.page.portrait.w - THEME.page.margin * 2 // 186
export const CONTENT_W_LANDSCAPE = THEME.page.landscape.w - THEME.page.margin * 2 // 273

/* ── Tương phản WCAG 2.x ── */
const channel = (v) => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
export const luminance = (c) => 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2])
export function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

export const mix = (c, target, k) => c.map((v, i) => Math.round(v + (target[i] - v) * k))
export const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim())
  if (!m) return null
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16))
}

/**
 * Từ màu CLB → bộ màu brand cho tài liệu:
 *  - brand     : màu thô (CHỈ vạch/thanh/chấm/viền thẻ — không làm màu chữ)
 *  - brandInk  : brand tối ~20% rồi tối dần cho tới khi (a) chữ TRẮNG trên brandInk ≥ 4.5 và
 *                (b) brandInk trên brandSoft/trắng ≥ 4.5 → dùng làm màu chữ + nền logo + thẻ nhãn
 *  - brandSoft : brand pha 8% với trắng (nền header bảng / hàng tổng / thẻ nhấn)
 *  - brandEdge : brand pha 60% với trắng (viền thẻ nhấn)
 * Hex không hợp lệ → màu mặc định.
 */
export function makeBrand(hex) {
  const rgb = hexToRgb(hex) || hexToRgb(DEFAULT_BRAND_HEX)
  const isDefault = toHex(rgb) === DEFAULT_BRAND_HEX
  const brandSoft = mix(rgb, THEME.color.white, 0.92)
  // Mặc định giữ indigo-600 (#4F46E5) theo spec; CLB tự chọn màu → tối 20%.
  let ink = isDefault ? [79, 70, 229] : mix(rgb, [0, 0, 0], 0.2)
  for (let k = 0; k < 40; k++) {
    if (contrast(ink, THEME.color.white) >= 4.5 && contrast(ink, brandSoft) >= 4.5) break
    ink = mix(ink, [0, 0, 0], 0.08)
  }
  return {
    brand: rgb,
    brandInk: ink,
    brandSoft,
    brandEdge: mix(rgb, THEME.color.white, 0.6),
    hex: toHex(rgb),
    inkHex: toHex(ink),
    softHex: toHex(brandSoft),
  }
}

/* ── Định dạng dùng chung (thay formatVND / vnd / money / VND) ── */
function hcmParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(d)
  const get = (t) => parts.find((p) => p.type === t)?.value ?? ''
  const hh = get('hour')
  return { dd: get('day'), mm: get('month'), yyyy: get('year'), hh: hh === '24' ? '00' : hh, mi: get('minute'), ss: get('second') }
}

export const fmt = {
  /** 1234567 → "1.234.567 đ"; âm → "-5.000 đ". Deterministic (không phụ thuộc ICU). */
  vnd(n) {
    const r = Math.round(Number(n) || 0)
    return `${r < 0 ? '-' : ''}${String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} đ`
  },
  /** Số thường kiểu VN: 1234567 → "1.234.567", 1.5 → "1,5". */
  num(n) {
    if (!Number.isFinite(n)) return ''
    const abs = Math.abs(n)
    const [ip, fp] = (Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/0+$/, '')).split('.')
    return `${n < 0 ? '-' : ''}${ip.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${fp ? ',' + fp : ''}`
  },
  /** ISO/Date → "dd/MM/yyyy HH:mm:ss" (giờ VN, NGÀY trước giờ); không hợp lệ → "—". */
  dateTime(v) {
    const d = v instanceof Date ? v : new Date(v ?? '')
    if (Number.isNaN(d.getTime())) return '—'
    const p = hcmParts(d)
    return `${p.dd}/${p.mm}/${p.yyyy} ${p.hh}:${p.mi}:${p.ss}`
  },
  /** Mã tài liệu PF-{LOẠI}-yyMMdd-HHmm (giờ VN). */
  docCode(type, d = new Date()) {
    const p = hcmParts(d)
    return `PF-${String(type || 'TL').toUpperCase()}-${p.yyyy.slice(2)}${p.mm}${p.dd}-${p.hh}${p.mi}`
  },
}

/** Chuỗi "rgb" CSS từ mảng màu — dùng cho PNG/HTML để cùng token với PDF. */
export const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`
