/**
 * THEME "Luxury SaaS · SINH ĐỘNG" — nguồn token DUY NHẤT cho mọi PDF vector / phiếu / PNG xuất từ FE.
 *
 * JS thuần (ESM) như pdf-report-core.js để chạy được cả trong app, cả harness/test Node.
 * Luật: mọi exporter ĐỌC token ở đây, không hard-code màu/cỡ chữ riêng.
 *  - Bản sắc = tím app (#6D5DFB / #4F46E5): băng masthead ĐẶC, header bảng ĐẶC, thẻ KPI nhấn tím nhạt.
 *  - Màu chữ SINH ĐỘNG (pos #16A34A, neg #DC2626, cyan, orange, amber, brandDark) chỉ cho chữ ĐẬM ≥ 8.5pt
 *    (≥ 3:1 — chuẩn chữ lớn WCAG). Chữ thường nhỏ dùng bản AA: ink / ink2 / muted / posText / negText / warn / info.
 *  - Tuyệt đối không dùng #94A3B8 làm màu chữ. Chữ trắng chỉ trên nền đặc đạt ≥ 4.5:1 (makeBrand tự tối).
 */

export const DEFAULT_BRAND_HEX = '#6D5DFB'

export const THEME = {
  /** RGB cho jsPDF. */
  color: {
    ink: [30, 41, 59], // #1E293B
    ink2: [71, 85, 105], // #475569
    muted: [100, 116, 139], // #64748B (gray — chữ nhỏ AA)
    line: [226, 232, 240], // #E2E8F0 (border)
    lineStrong: [203, 213, 225], // #CBD5E1 (đường ký, viền nhấn)
    lineSoft: [241, 245, 249], // #F1F5F9
    connector: [100, 116, 139], // #64748B (đường nối sơ đồ — phi văn bản ≥ 3:1)
    surface2: [248, 250, 252], // #F8FAFC (zebra)
    white: [255, 255, 255],
    // semantic SINH ĐỘNG (chữ ĐẬM ≥ 8.5pt / chấm / thanh)
    pos: [22, 163, 74], // #16A34A
    neg: [220, 38, 38], // #DC2626
    orange: [234, 88, 12], // #EA580C
    cyan: [8, 145, 178], // #0891B2
    amber: [217, 119, 6], // #D97706
    // semantic bản AA (chữ thường nhỏ ≥ 4.5:1)
    posText: [21, 128, 61], // #15803D
    negText: [185, 28, 28], // #B91C1C
    warn: [180, 83, 9], // #B45309
    info: [14, 116, 144], // #0E7490
    // semantic FILL (chấm/thanh/nền)
    posFill: [22, 163, 74], // #16A34A
    negFill: [239, 68, 68], // #EF4444
    warnFill: [217, 119, 6], // #D97706
    // semantic DEEP (chữ nhỏ trên viên/ô kính có nền màu α — cùng họ posText/negText/warn, đậm hơn một bậc)
    posDeep: [22, 101, 52], // #166534
    negDeep: [153, 27, 27], // #991B1B
    warnDeep: [146, 64, 14], // #92400E
    posTint: [240, 253, 244], // #F0FDF4
    posEdge: [187, 247, 208], // #BBF7D0
    negTint: [254, 242, 242], // #FEF2F2
    negEdge: [254, 202, 202], // #FECACA
    warnTint: [255, 251, 235], // #FFFBEB
    warnEdge: [253, 230, 138], // #FDE68A
    // top 3 BXH (nền nhẹ)
    goldTint: [254, 249, 195], // #FEF9C3
    silverTint: [241, 245, 249], // #F1F5F9
    bronzeTint: [255, 237, 213], // #FFEDD5
  },
  /** Thang chữ 7 bậc (pt). Sàn tuyệt đối = MIN_PT. */
  type: { display: 22, h1: 16, kpi: 14, h2: 11, body: 8.5, cell: 8, label: 7, caption: 7 },
  /** Thang khoảng cách (mm). */
  space: { xs: 2, s: 4, m: 8, l: 12, xl: 16, xxl: 24 },
  /** Khổ giấy + lề: CHUẨN HOÁ ở một nơi (CONTENT_W suy ra từ đây). */
  page: {
    portrait: { w: 210, h: 297 },
    landscape: { w: 297, h: 210 },
    margin: 14,
    /** vùng footer: vạch ở H - footerLine, chữ ở H - footerText; nội dung dừng ở H - bottomPad */
    footerLine: 15,
    footerText: 10.8,
    bottomPad: 19,
  },
  line: { hair: 0.2, border: 0.3, strong: 0.5, brandRule: 0.6 },
  radius: { card: 2, bar: 1 },
  row: { h: 8.8, lineH: 4.2, padX: 3.5 },
  /**
   * KHOẢNG THỞ CÂN BẰNG (mm) — lề 14 · gutter thẻ 4.5 · giữa hàng thẻ 4.5 · giữa section 9 · tiêu đề→nội dung 6 ·
   * padding trong thẻ 4.5. Trang phải ĐẦY ĐẶN (không để khoảng trắng lớn giữa thẻ / giữa trang).
   * mastH/contH = chiều cao băng masthead trang 1 / trang tiếp.
   */
  air: { gutter: 4.5, rowGap: 4.5, section: 9, titleGap: 6, cardPad: 4.5, afterMast: 7, billGutter: 5, billRowGap: 5, mastH: 30, contH: 16, kpi: { full: 22, plain: 18, compact: 15 } },
  /**
   * LIQUID GLASS — token hiệu ứng kính (alpha 0..1, mm). Mọi màu kính DẪN XUẤT từ palette app
   * (brand/brandDark/brandSoft/trắng + semantic) ở độ trong suốt khác nhau — không có màu mới.
   * Nền tấm kính đặt ≥ 0.78 để chữ nhỏ (muted/ink2) vẫn ≥ 4.5:1 trên nền XẤU NHẤT (wash tối nhất + orb).
   */
  glass: {
    tile: 0.82, // nền tấm kính (trắng α)
    row: 0.82, // nền hàng bảng (trắng α)
    accent: 0.14, // nền tấm nhấn (brand α)
    accentEdge: 0.35, // viền tấm nhấn (brand α)
    edgeWhite: 0.9, // viền ngoài trắng
    edgeWhiteW: 0.3,
    hair: 0.4, // viền trong brand: đậm hơn để thẻ nổi rõ trên nền
    hairW: 0.25,
    highlight: 1, // vạch sáng cạnh trên
    highlightW: 0.2,
    shadow: [0.07, 0.035], // 2 lớp bóng mềm (brandDark α) giảm dần — nhẹ, ít nhiễu
    shadowStep: 0.7,
    shadowDy: 0.9,
    radius: { panel: 3.5, band: 5, chip: 2.5, bar: 2.2 },
    mast: { gloss: 0.1, edge: 0.35, chip: 0.35, chipEdge: 0.4, ring: 0.9, ringGlass: 0.16 },
    orb: { alpha: 0.06, rings: 18 }, // nền nhạt: orb mờ để thẻ nổi
    zebra: 0.03, // zebra = brand α (mặc định TẮT vì hàng đã cao + có đường kẻ)
    sep: 0.8, // đường kẻ trắng
    sepHair: 0.2, // hairline brand (MỘT đường kẻ duy nhất giữa các hàng)
    chip: { base: 0.9, tint: 0.12, edge: 0.35 }, // viên trạng thái (chữ Deep)
    box: 0.08, // ô callout màu (chữ số sinh động) — tint α
  },
  /** Phông trong PNG/HTML (webfont nạp qua FontFace). */
  fontFamily: "'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif",
}

/** Sàn cỡ chữ tuyệt đối (pt) cho mọi tài liệu in. */
export const MIN_PT = 7
export const CONTENT_W_PORTRAIT = THEME.page.portrait.w - THEME.page.margin * 2 // 182
export const CONTENT_W_LANDSCAPE = THEME.page.landscape.w - THEME.page.margin * 2 // 265

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
 *  - brand      : màu thô (vạch/thanh/chấm/dải nhấn; mặc định #6D5DFB)
 *  - brandDark  : brand tối ~20% rồi tối dần cho tới khi (a) chữ TRẮNG trên brandDark ≥ 4.5 và
 *                 (b) brandDark trên brandSoft/trắng ≥ 4.5 → BĂNG MASTHEAD + chữ tiêu đề mục/link (mặc định #4F46E5)
 *  - brandMid   : màu giữa brand → brandDark, nhạt nhất mà chữ TRẮNG vẫn ≥ 4.5 → nền HEADER BẢNG
 *  - brandSoft  : nền thẻ nhấn / hàng tổng (mặc định #EEF2FF)
 *  - brandEdge  : viền thẻ nhấn (mặc định #C7D2FE) — alias brandBorder
 *  - badgeOnBrand: nền chip phụ trên băng đặc (mặc định #988CFC) — KHÔNG để chữ trắng lên (chỉ vật trang trí)
 *  brandInk = alias của brandDark (tương thích mã cũ). Hex không hợp lệ → màu mặc định.
 */
export function makeBrand(hex) {
  const rgb = hexToRgb(hex) || hexToRgb(DEFAULT_BRAND_HEX)
  const isDefault = toHex(rgb) === DEFAULT_BRAND_HEX
  const brandSoft = isDefault ? [238, 242, 255] : mix(rgb, THEME.color.white, 0.92)
  let ink = isDefault ? [79, 70, 229] : mix(rgb, [0, 0, 0], 0.2)
  // Liquid Glass: chữ brandDark còn phải ≥ 4.5 trên TẤM NHẤN ở nền xấu nhất (wash tối nhất + orb + kính trắng α + brand α).
  const G0 = THEME.glass
  const accentBg = mix(mix(mix(brandSoft, rgb, G0.orb.alpha), THEME.color.white, G0.tile), rgb, G0.accent)
  for (let k = 0; k < 40; k++) {
    if (contrast(ink, THEME.color.white) >= 4.5 && contrast(ink, brandSoft) >= 4.5 && contrast(ink, accentBg) >= 4.5) break
    ink = mix(ink, [0, 0, 0], 0.08)
  }
  let mid = ink
  for (let k = 0; k <= 10; k++) {
    const c = mix(rgb, ink, k / 10)
    if (contrast(c, THEME.color.white) >= 4.5) { mid = c; break }
  }
  const edge = isDefault ? [199, 210, 254] : mix(rgb, THEME.color.white, 0.7)
  /* LIQUID GLASS: hai đầu gradient băng/header bảng (chữ TRẮNG vẫn ≥ 4.6:1 SAU lớp bóng loáng) + 3 nút nền wash. */
  const gloss = THEME.glass.mast.gloss
  const okWhite = (c) => contrast(THEME.color.white, mix(c, THEME.color.white, gloss)) >= 4.6
  let glassStart = ink
  for (let k = 0; k < 40 && !okWhite(glassStart); k++) glassStart = mix(glassStart, [0, 0, 0], 0.08)
  let glassEnd = glassStart
  for (let k = 0; k <= 10; k++) {
    const c = mix(rgb, glassStart, k / 10)
    if (okWhite(c)) { glassEnd = c; break }
  }
  const washC = isDefault ? [250, 249, 255] : mix(rgb, THEME.color.white, 0.97)
  return {
    brand: rgb,
    glassStart,
    glassEnd,
    washA: mix(brandSoft, THEME.color.white, 0.55), // nền trang nhạt hơn brandSoft
    washB: THEME.color.white,
    washC,
    brandDark: ink,
    brandInk: ink,
    brandMid: mid,
    brandSoft,
    brandEdge: edge,
    brandBorder: edge,
    badgeOnBrand: isDefault ? [152, 140, 252] : mix(rgb, THEME.color.white, 0.3),
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

/** Màu nền XẤU NHẤT sau 1 tấm kính: wash tối nhất (brandSoft) + orb brand ở đậm nhất, rồi phủ kính trắng α `alpha`. */
export function glassWorstBg(brand, alpha = THEME.glass.tile) {
  const wash = mix(brand.washA, brand.brand, THEME.glass.orb.alpha)
  return mix(wash, THEME.color.white, alpha)
}

/** Chuỗi "rgba" CSS (PNG/HTML giả kính bằng gradient + rgba + box-shadow). */
export const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

/** Chuỗi "rgb" CSS từ mảng màu — dùng cho PNG/HTML để cùng token với PDF. */
export const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`
