/* ════════════════════════════════════════════════════════════════════════════════════
   EXCEL KIT — chuẩn "Luxury SaaS" cho MỌI file .xlsx xuất ra (xlsx-js-style).

   Module THUẦN (không DOM, không import export.ts) → test được bằng node.
   Gồm: token màu, makeBrand (brand → ink/soft có kiểm tra tương phản), mã tài liệu PF-{LOẠI}-yyMMdd-HHmm,
   bộ style (tiêu đề / header / thân / tổng), đo độ rộng cột trên CHUỖI ĐÃ ĐỊNH DẠNG, nhận diện cột
   số/ngày/trạng thái, và patchWorkbookXml (vá XML sau khi ghi: gridlines, tabColor, freeze, pageSetup,
   headerFooter, print titles) vì xlsx-js-style không ghi các phần này.

   LƯU Ý ĐỒNG BỘ: các hằng màu dưới đây TRÙNG GIÁ TRỊ với bảng token trong export_design_spec.md.
   Khi `export-theme.js` (PDF) có mặt, hợp nhất bằng cách import thay cho hằng cục bộ.
   ════════════════════════════════════════════════════════════════════════════════════ */

import { EXPORT_USE_CLUB_COLOR } from './export-theme.js'

/* ─── Token màu (hex không '#', dạng ARGB của xlsx) ─── */
export const XL_COLOR = {
  ink: '1E293B',
  ink2: '475569',
  muted: '5A6678',
  line: 'E2E8F0',
  surface2: 'F8FAFC',
  white: 'FFFFFF',
  /* Bản AA (chữ thường nhỏ trên nền trắng >= 4.5:1). */
  pos: '15803D',
  neg: 'B91C1C',
  warn: 'B45309',
  info: '0E7490',
  gray: '64748B',
} as const

/** Màu "sinh động" cho số/chip ĐẬM + nền nhạt tương ứng (khớp palette PDF/app). */
export const XL_VIVID = {
  pos: '16A34A', posBg: 'F0FDF4',
  neg: 'DC2626', negBg: 'FEF2F2',
  orange: 'EA580C', orangeBg: 'FFF7ED',
  info: '0891B2', infoBg: 'ECFEFF',
  warn: 'D97706', warnBg: 'FFFBEB',
} as const

/** Chữ số/chip dùng màu sinh động NẾU đạt >= 4.5:1 trên MỌI nền nó có thể đứng (tint kính #F8F9FF, brandSoft hàng tổng, nền chip), ngược lại hạ về bản AA cùng sắc. */
const firstPass = (cands: string[], bgs: string[]) => cands.find(c => bgs.every(bg => contrastRatio(c, bg) >= 4.5)) ?? cands[cands.length - 1]
const TEXT_BGS = ['F8F9FF', 'EEF2FF', 'FFFFFF']
export const XL_TEXT = {
  pos: firstPass([XL_VIVID.pos, XL_COLOR.pos, '166534'], [...TEXT_BGS, XL_VIVID.posBg]),
  neg: firstPass([XL_VIVID.neg, XL_COLOR.neg, '991B1B'], [...TEXT_BGS, XL_VIVID.negBg]),
  warn: firstPass([XL_VIVID.warn, XL_COLOR.warn, '92400E'], [...TEXT_BGS, XL_VIVID.warnBg]),
  info: firstPass([XL_VIVID.info, XL_COLOR.info, '155E75'], [...TEXT_BGS, XL_VIVID.infoBg]),
  orange: firstPass([XL_VIVID.orange, 'C2410C', '9A3412'], [...TEXT_BGS, XL_VIVID.orangeBg]),
} as const

export const XL_FONT = 'Calibri'
export const DEFAULT_BRAND_HEX = '6D5DFB'

/* ─── Màu: brand → { brand, ink, soft } ─── */
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function toHex(rgb: [number, number, number]): string {
  return rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()
}
function luminance(hex: string): number {
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  const [r, g, b] = parseHex(hex)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
/** Tỉ lệ tương phản WCAG 2.x. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
const mixWith = (hex: string, other: [number, number, number], t: number) =>
  toHex(parseHex(hex).map((v, i) => v * (1 - t) + other[i] * t) as [number, number, number])

export interface ExcelBrand {
  brand: string
  /** brandDark: chữ trên nền `soft` (>= 4.5:1) VÀ nền băng tiêu đề (chữ trắng >= 4.5:1). */
  ink: string
  soft: string
  /** Nền header bảng: brand đặc, tự tối nếu brand sáng để chữ trắng đạt >= 4.5:1. */
  head: string
  /** Viền nhạt cùng tông brand (indigo #C7D2FE với màu mặc định). */
  border: string
  /* ── Liquid Glass (mô phỏng): nền "wash" của sheet, nền zebra/phạm vi (kính mờ), đường kẻ hairline, cạnh sáng. ── */
  wash: string
  glass: string
  hair: string
  spec: string
}
/** `brand` = màu CLB. `ink` = brand tối 20%, tối thêm cho tới khi chữ trên nền `soft` đạt >= 4.5:1 và
 *  chữ trắng trên `ink` đạt >= 4.5:1. `soft` = brand pha 8% với trắng. `head` = brand (tối dần nếu cần).
 *  Mặc định #6D5DFB dùng bộ chuẩn: brandDark #4F46E5, soft #EEF2FF, border #C7D2FE. */
export function makeBrand(primaryHex?: string | null, allowCustom: boolean = EXPORT_USE_CLUB_COLOR): ExcelBrand {
  const raw = (allowCustom ? (primaryHex ?? '') : '').replace('#', '').trim().toUpperCase()
  const brand = /^[0-9A-F]{6}$/.test(raw) ? raw : DEFAULT_BRAND_HEX
  const glassTints = (b: string) => ({
    wash: b === DEFAULT_BRAND_HEX ? 'F1F4FF' : mixWith(b, [255, 255, 255], 0.93),
    glass: b === DEFAULT_BRAND_HEX ? 'F8F9FF' : mixWith(b, [255, 255, 255], 0.975),
    hair: b === DEFAULT_BRAND_HEX ? 'E3E8FB' : mixWith(b, [255, 255, 255], 0.86),
    spec: b === DEFAULT_BRAND_HEX ? 'A5B4FC' : mixWith(b, [255, 255, 255], 0.55),
  })
  if (brand === DEFAULT_BRAND_HEX) return { brand, ink: '4F46E5', soft: 'EEF2FF', head: brand, border: 'C7D2FE', ...glassTints(brand) }
  const soft = mixWith(brand, [255, 255, 255], 0.92)
  const border = mixWith(brand, [255, 255, 255], 0.7)
  let ink = mixWith(brand, [0, 0, 0], 0.2)
  for (let i = 0; i < 16 && (contrastRatio(ink, soft) < 4.5 || contrastRatio(ink, 'FFFFFF') < 4.5); i++) ink = mixWith(ink, [0, 0, 0], 0.12)
  let head = brand
  for (let i = 0; i < 16 && contrastRatio(head, 'FFFFFF') < 4.5; i++) head = mixWith(head, [0, 0, 0], 0.1)
  return { brand, ink, soft, head, border, ...glassTints(brand) }
}

/* ─── Mã tài liệu: PF-{LOẠI}-{yyMMdd}-{HHmm} ─── */
export interface ExportParts { dd: string; mm: string; yyyy: string; hh: string; mi: string }
export function makeDocCode(type: string, p: ExportParts): string {
  return `PF-${type}-${p.yyyy.slice(-2)}${p.mm}${p.dd}-${p.hh}${p.mi}`
}
/** Loại tài liệu suy từ tiền tố tên file (bảng loại trong spec §4.3); lạ → "BK" (bảng kê). */
export function docTypeFromFile(fileBase: string): string {
  const f = String(fileBase ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
  const table: [RegExp, string][] = [
    [/^bao_?cao_?dieu_?hanh/, 'EXEC'], [/^so[_ ]quy/, 'SQ'], [/^thu[_ ]quy|^khoan[_ ]thu|^dong[_ ]quy/, 'TQ'], [/^danh[_ ]sach[_ ]thanh[_ ]vien/, 'DSTV'],
    [/^bao[_ ]cao/, 'BCQ'], [/^chi[_ ]phi|^khoan[_ ]chi/, 'BCC'], [/^cong[_ ]no/, 'CN'], [/^ky[_ ]quy/, 'KQ'],
    [/^diem[_ ]danh/, 'DD'], [/^cham[_ ]diem/, 'CD'], [/^nhat[_ ]ky|^audit/, 'NK'],
    [/^cho[_ ]xac[_ ]nhan/, 'CXN'], [/^nhac[_ ]dong[_ ]quy/, 'NDQ'], [/^hoat[_ ]dong/, 'HD'], [/^giao[_ ]dich/, 'GD'],
    [/^danh[_ ]sach[_ ]clb/, 'DSCLB'], [/^bxh|^bang[_ ]xep[_ ]hang|^nhanh[_ ]dau|^lich[_ ]/, 'GIAI'],
  ]
  return table.find(([re]) => re.test(f))?.[1] ?? 'BK'
}

/* ─── Số / ngày / trạng thái ─── */
export const XL_NUM_INT = '#,##0;-#,##0;"–"'
export const XL_NUM_DEC = '#,##0.##;-#,##0.##;"–"'
export const XL_DATE = 'dd/mm/yyyy'

/** Chuỗi hiển thị gần đúng của số (nhóm nghìn) — chỉ để đo độ rộng cột. */
export function displayNumber(n: number): string {
  if (n === 0) return '–'
  const abs = Math.abs(n)
  const [ip, fp] = (Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/0+$/, '')).split('.')
  return `${n < 0 ? '-' : ''}${ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fp ? '.' + fp : ''}`
}

export type StatusTone = 'pos' | 'neg' | 'warn' | 'info'
const STATUS_WORDS: Record<StatusTone, string[]> = {
  pos: ['da dong', 'da xac nhan', 'hoat dong', 'dang hoat dong', 'da duyet', 'da chi', 'co mat', 'da thanh toan', 'hoan thanh', 'da hoan thanh',
    'dang mo', 'da thu', 'thanh cong', 'da nop', 'thu', 'khoan thu', 'xuat sac', 'tot', 'dong du', 'da nhan'],
  neg: ['chua dong', 'tu choi', 'vang', 'qua han', 'da huy', 'that bai', 'con no', 'no', 'chua nop', 'chi', 'khoan chi', 'het han', 'ngung hoat dong', 'da khoa'],
  warn: ['cho xac nhan', 'cho duyet', 'tam nghi', 'cho xu ly', 'sap het han', 'dang cho', 'cho thanh toan', 'canh bao', 'can quan tam'],
  info: ['quy phu', 'thong tin', 'dang dien ra', 'sap dien ra'],
}
const stripAccent = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim()
/** Chữ trạng thái chuẩn (khớp NGUYÊN CHUỖI, không phân biệt dấu/hoa-thường) → tông semantic. */
export function statusTone(text: string): StatusTone | null {
  const k = stripAccent(text)
  if (!k) return null
  for (const tone of Object.keys(STATUS_WORDS) as StatusTone[]) if (STATUS_WORDS[tone].includes(k)) return tone
  return null
}

/* ─── Tông tiền (số dương thu = xanh, chi/nợ/âm = đỏ) ─── */
export type SheetTone = 'income' | 'expense' | null
export type MoneyTone = 'pos' | 'neg' | 'warn' | null
/** Loại sheet suy từ tên sheet + loại tài liệu (TQ = thu, BCC = chi). */
export function inferSheetTone(sheetName: string, docType?: string): SheetTone {
  const n = stripAccent(sheetName)
  if (/^(khoan chi|chi phi|chi quy|chi thu quy)/.test(n)) return 'expense'
  if (/^(thu quy|khoan thu|dong quy)/.test(n)) return 'income'
  if (docType === 'BCC') return 'expense'
  if (docType === 'TQ') return 'income'
  return null
}
export const isIndexHeader = (h: string) => ['stt', 'hang', '#', 'tt'].includes(stripAccent(h))
/** Màu ngữ nghĩa của MỘT ô số: âm → neg; cột/dòng "chi, nợ" → neg; "thu, số dư, đã nộp…" → pos; không rõ → null (màu thường).
 *  Chỉ áp cho cột TIỀN (header có "VNĐ"/"Số tiền", hoặc cột "Giá trị" của dòng có đơn vị VNĐ). */
export function moneyTone(o: { header: string; value: number; rowTexts: string[]; sheetTone?: SheetTone; total?: boolean }): MoneyTone {
  const allRows = o.rowTexts.map(stripAccent).filter(Boolean)
  if (allRows.some(t => /^% thay doi/.test(t))) {
    // Dòng "% thay đổi so với kỳ trước": Chi giảm là tin tốt (xanh), Thu/Cân đối giảm là xấu (đỏ).
    if (o.value === 0) return null
    const isExpense = allRows.some(t => /^chi$/.test(t))
    return (o.value < 0) !== isExpense ? 'neg' : 'pos'
  }
  if (o.value < 0) return 'neg'
  if (o.value === 0) return null
  const h = stripAccent(o.header)
  const rows = o.rowTexts.map(stripAccent).filter(Boolean)
  const kvRow = /gia tri/.test(h) && rows.some(t => /^vnd\b/.test(t))
  if (!(/vnd|so tien/.test(h) || kvRow)) return null
  if (/(^| )(chi|con no|no|thieu|phat)( |$)|chi phi|sinh hoat/.test(h)) return 'neg'
  if (/so du|can doi|chenh lech|luy ke|da nop|da dong|muc dong|(^| )thu( |$)|tai san/.test(h)) return 'pos'
  if (o.total && rows.some(t => /^cho /.test(t))) return 'warn'
  if (rows.some(t => /^(khoan )?chi$|^(tong )?chi\b|\bchi$|^con no|^no$/.test(t))) return 'neg'
  if (rows.some(t => /^(khoan )?thu$|^(tong )?thu\b|\bthu$|tai san|can doi|so du/.test(t))) return 'pos'
  return o.sheetTone === 'expense' ? 'neg' : o.sheetTone === 'income' ? 'pos' : null
}

/* ─── Bộ style (Liquid Glass mô phỏng) ───
   Excel KHÔNG có kính thật (trong suốt/blur) và xlsx-js-style không ghi gradient → mô phỏng bằng:
   • nền sheet "wash" (patch XML: style cột) + tấm kính = ô trắng/tint với viền trắng dày (halo) + hairline brand nhạt;
   • băng tiêu đề + header bảng = gradientFill (vá XML sau khi ghi; trình đọc không hỗ trợ → rơi về màu đặc brandDark/brand);
   • cạnh sáng = viền mảnh màu `spec` dưới tiêu đề. ─── */
type Align = 'left' | 'right' | 'center'
/** Vị trí ô trong bảng: cột đầu/cuối nhận viền trắng dày (halo) ở mép ngoài. */
export type Edge = 'l' | 'r' | 'lr' | undefined
export const edgeOf = (c: number, maxCol: number): Edge => (maxCol <= 0 ? 'lr' : c === 0 ? 'l' : c === maxCol ? 'r' : undefined)

export function xlStyles(b: ExcelBrand) {
  const font = (sz: number, o: Record<string, unknown> = {}) => ({ name: XL_FONT, sz, color: { rgb: XL_COLOR.ink }, ...o })
  const solid = (rgb: string) => ({ patternType: 'solid', fgColor: { rgb } })
  const WHITE = { rgb: XL_COLOR.white }
  const halo = { style: 'medium', color: WHITE }
  const hair = { style: 'thin', color: { rgb: b.hair } }
  const edges = (e: Edge) => ({
    ...(e === 'l' || e === 'lr' ? { left: halo } : {}),
    ...(e === 'r' || e === 'lr' ? { right: halo } : {}),
  })
  const rule = { style: 'medium', color: { rgb: b.border } }
  const band = solid(b.ink) // gradientFill brandDark → brand (vá XML); rơi về brandDark đặc
  const left = { horizontal: 'left', vertical: 'center', indent: 1 }
  const tone = (t: StatusTone) => ({
    pos: [XL_TEXT.pos, XL_VIVID.posBg], neg: [XL_TEXT.neg, XL_VIVID.negBg], warn: [XL_TEXT.warn, XL_VIVID.warnBg], info: [XL_TEXT.info, XL_VIVID.infoBg],
  })[t]
  return {
    /* Băng tiêu đề: tên CLB + tên tài liệu trên gradient brandDark→brand chữ trắng; phạm vi + xuất lúc trên kính (tint) chữ brandDark. */
    club: (e?: Edge) => ({ font: font(10, { bold: true, color: WHITE }), fill: band, alignment: left, border: { top: halo, ...edges(e) } }),
    title: (e?: Edge) => ({ font: font(16, { bold: true, color: WHITE }), fill: band, alignment: left, border: { bottom: { style: 'thin', color: { rgb: b.spec } }, ...edges(e) } }),
    scope: (e?: Edge) => ({ font: font(10, { bold: true, color: { rgb: b.ink } }), fill: solid(b.glass), alignment: left, border: edges(e) }),
    meta: (e?: Edge) => ({
      font: font(9, { color: { rgb: b.ink } }), fill: solid(b.glass), alignment: left,
      border: { bottom: rule, ...edges(e) },
    }),
    metaRule: (e?: Edge) => ({ fill: solid(b.glass), border: { bottom: rule, ...edges(e) } }),
    /* Văn bản thường (file mẫu / sheet hướng dẫn). */
    text: { font: font(10, { color: { rgb: XL_COLOR.ink2 } }), fill: solid(XL_COLOR.white), alignment: { horizontal: 'left', vertical: 'center', wrapText: true } },
    section: {
      font: font(10, { bold: true, color: { rgb: b.ink } }), fill: solid(b.soft),
      border: { bottom: { style: 'thin', color: { rgb: b.border } }, top: halo }, alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    },
    header: (a: Align, e?: Edge) => ({
      font: font(10, { bold: true, color: WHITE }),
      fill: solid(b.head), // gradientFill dọc brand → brandDark (vá XML); rơi về brand đặc
      border: { bottom: halo, left: { style: 'thin', color: { rgb: mixWith(b.head, [255, 255, 255], 0.28) } }, right: { style: 'thin', color: { rgb: mixWith(b.head, [255, 255, 255], 0.28) } }, ...edges(e) },
      alignment: { horizontal: a, vertical: 'center', wrapText: true, indent: a === 'center' ? 0 : 1 },
    }),
    cell: (a: Align, o: { wrap?: boolean; zebra?: boolean; color?: string; bold?: boolean; edge?: Edge } = {}) => ({
      font: font(10, { color: { rgb: o.color ?? XL_COLOR.ink }, ...(o.bold ? { bold: true } : {}) }),
      fill: solid(o.zebra ? b.glass : XL_COLOR.white),
      border: { bottom: hair, ...edges(o.edge) },
      alignment: { horizontal: a, vertical: 'center', wrapText: !!o.wrap, indent: a === 'center' ? 0 : 1 },
    }),
    /** Chip trạng thái: nền rất nhạt + chữ đậm AA, không viền gắt. */
    chip: (t: StatusTone, o: { edge?: Edge } = {}) => {
      const [fg, bg] = tone(t)
      return {
        font: font(10, { bold: true, color: { rgb: fg } }), fill: solid(bg),
        border: { bottom: hair, ...edges(o.edge) },
        alignment: { horizontal: 'center', vertical: 'center' },
      }
    },
    total: (a: Align, o: { first?: boolean; color?: string; wrap?: boolean; edge?: Edge } = {}) => ({
      font: font(10, { bold: true, color: { rgb: o.color ?? b.ink } }),
      fill: solid(b.soft),
      border: { top: o.first ? rule : { style: 'thin', color: { rgb: b.border } }, bottom: halo, ...edges(o.edge) },
      alignment: { horizontal: a, vertical: 'center', wrapText: !!o.wrap, indent: a === 'center' ? 0 : 1 },
    }),
    empty: (e?: Edge) => ({
      font: font(10, { italic: true, color: { rgb: XL_COLOR.muted } }),
      fill: solid(XL_COLOR.white),
      border: { bottom: hair, ...edges(e) },
      alignment: { horizontal: 'center', vertical: 'center' },
    }),
  }
}

/** Màu chữ số theo tông tiền (sinh động nếu đạt AA, cùng chữ ĐẬM). */
export const moneyColor = (t: Exclude<MoneyTone, null>) => ({ pos: XL_TEXT.pos, neg: XL_TEXT.neg, warn: XL_TEXT.warn })[t]
/** Màu tab sheet: thu = xanh, chi = đỏ, còn lại = brand. */
export const tabColorFor = (tone: SheetTone, brand: string) => (tone === 'income' ? XL_VIVID.pos : tone === 'expense' ? XL_VIVID.neg : brand)

export const statusColor = (t: StatusTone) => XL_TEXT[t]

/* ─── Độ rộng cột: đo trên chuỗi ĐÃ định dạng; clamp 10..48; header ×1.15 (bold) ─── */
export const COL_MIN = 10
export const COL_MAX = 48
export function columnWidth(headerLen: number, maxBodyLen: number): number {
  const w = Math.max(Math.min(headerLen, 24) * 1.15 * 1.1 + 2, maxBodyLen * 1.1 + 2)
  return Math.min(Math.max(Math.ceil(w), COL_MIN), COL_MAX)
}
/** Số dòng ước lượng của ô chữ (wrap) trong cột rộng `wch` — thận trọng (hệ số 0.9). */
export function estimateLines(text: string, wch: number): number {
  const perLine = Math.max(1, Math.floor((wch - 2) * 0.9))
  return String(text).split('\n').reduce((s, seg) => s + Math.max(1, Math.ceil(seg.length / perLine)), 0)
}

/* ─── Vá XML sau khi ghi ─── */
export interface SheetPatch {
  /** Số hàng đóng băng (đến hết header cột). */
  freezeRows: number
  /** Số cột đóng băng (0 hoặc 1). */
  freezeCols: number
  landscape: boolean
  /** Footer in trái: "{CLB} · {Tên tài liệu}". */
  footerLeft: string
  docCode: string
  /** Hàng header (1-based) → lặp ở mỗi trang in (0 = không lặp). */
  headerRow: number
  tabRgb: string
}

const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** Chuỗi trong mã header/footer: & → && (rồi escape XML); chữ số đầu dòng cần dấu cách sau mã cỡ chữ. */
const hfText = (s: string) => { const t = s.slice(0, 110).replace(/&/g, '&&'); return xmlEsc(/^\d/.test(t) ? ' ' + t : t) }

export function sheetXmlPatch(xml: string, p: SheetPatch): string {
  const colL = (n: number) => String.fromCharCode(65 + n) // freezeCols <= 1 → chỉ cần 'A'/'B'
  const topLeft = `${colL(p.freezeCols)}${p.freezeRows + 1}`
  const pane = p.freezeCols > 0 ? 'bottomRight' : 'bottomLeft'
  const frozen = p.freezeRows > 0 || p.freezeCols > 0
  const sheetViews =
    `<sheetViews><sheetView showGridLines="0" zoomScale="100" zoomScaleNormal="100" workbookViewId="0">` +
    (frozen
      ? `<pane${p.freezeCols > 0 ? ` xSplit="${p.freezeCols}"` : ''}${p.freezeRows > 0 ? ` ySplit="${p.freezeRows}"` : ''} topLeftCell="${topLeft}" activePane="${pane}" state="frozen"/>` +
        `<selection pane="${pane}" activeCell="${topLeft}" sqref="${topLeft}"/>`
      : '') +
    `</sheetView></sheetViews>`
  const sheetPr = `<sheetPr><tabColor rgb="FF${p.tabRgb}"/><pageSetUpPr fitToPage="1"/></sheetPr>`
  const printBlock =
    `<printOptions horizontalCentered="1"/>` +
    `<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.65" header="0.3" footer="0.3"/>` +
    `<pageSetup paperSize="9" orientation="${p.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>` +
    `<headerFooter><oddFooter>&amp;L&amp;8${hfText(p.footerLeft)}&amp;C&amp;8${hfText(p.docCode)}&amp;R&amp;8Trang &amp;P / &amp;N</oddFooter></headerFooter>`
  let out = xml
    .replace(/<sheetPr\b[^>]*\/>|<sheetPr\b[\s\S]*?<\/sheetPr>/g, '')
    .replace(/<printOptions\b[^>]*\/>/g, '')
    .replace(/<pageMargins\b[^>]*\/>/g, '')
    .replace(/<pageSetup\b[^>]*\/>/g, '')
    .replace(/<headerFooter\b[\s\S]*?<\/headerFooter>/g, '')
  out = out.replace(/(<worksheet\b[^>]*>)/, `$1${sheetPr}`)
  out = /<sheetViews>[\s\S]*?<\/sheetViews>/.test(out)
    ? out.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/, sheetViews)
    : out.replace(/(<dimension\b[^>]*\/>)/, `$1${sheetViews}`)
  // Thứ tự CT_Worksheet: ... mergeCells → printOptions → pageMargins → pageSetup → headerFooter → ... → ignoredErrors
  // → drawing/legacyDrawing/tableParts. Chèn TRƯỚC phần tử đầu tiên trong nhóm "sau" (SheetJS ghi ignoredErrors).
  const after = /<(rowBreaks|colBreaks|customProperties|cellWatches|ignoredErrors|smartTags|drawing|legacyDrawing|legacyDrawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b/.exec(out)
  return after ? out.slice(0, after.index) + printBlock + out.slice(after.index) : out.replace('</worksheet>', `${printBlock}</worksheet>`)
}

export function workbookXmlPatch(xml: string, sheetNames: string[], patches: SheetPatch[]): string {
  const defs = patches.map((p, i) => {
    if (p.headerRow <= 0) return ''
    const q = `'${(sheetNames[i] ?? `Sheet${i + 1}`).replace(/'/g, "''")}'`
    return `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${xmlEsc(q)}!$${p.headerRow}:$${p.headerRow}</definedName>`
  }).join('')
  if (!defs) return xml
  if (/<definedNames>/.test(xml)) return xml.replace(/<definedNames>/, `<definedNames>${defs}`)
  return xml.replace('</sheets>', `</sheets><definedNames>${defs}</definedNames>`)
}

/* ─── Liquid Glass: vá styles.xml (gradientFill + xf nền wash) và <cols> (nền wash toàn sheet) ─── */
export interface GlassPatch {
  /** Nền wash toàn sheet (style cột phủ mọi ô chưa có style riêng). */
  wash: string
  /** Gradient: ô có fill đặc `match` → gradientFill `stops` (degree 0 = trái→phải, 90 = trên→dưới). */
  gradients: { match: string; stops: [string, string]; degree: number }[]
}
/** Bộ vá glass cho một brand: băng tiêu đề brandDark→brand (ngang), header bảng brand→brandDark (dọc). Cả hai đầu đều cho chữ trắng >= 4.5:1. */
export const glassPatchFor = (b: ExcelBrand): GlassPatch => ({
  wash: b.wash,
  gradients: [
    { match: b.ink, stops: [b.ink, b.head], degree: 0 },
    { match: b.head, stops: [b.head, b.ink], degree: 90 },
  ],
})

export function stylesXmlPatch(xml: string, g: GlassPatch): { xml: string; washXf: number } | null {
  const fills = /<fills count="(\d+)">([\s\S]*?)<\/fills>/.exec(xml)
  const xfs = /<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/.exec(xml)
  if (!fills || !xfs) return null
  const done = new Set<string>()
  let body = fills[2]
  for (const gr of g.gradients) {
    if (done.has(gr.match)) continue // brand tối: ink = head → chỉ một kiểu
    done.add(gr.match)
    const re = new RegExp(`<fill><patternFill patternType="solid"><fgColor rgb="FF${gr.match}"/>(?:<bgColor[^>]*/>)?</patternFill></fill>`, 'g')
    body = body.replace(re, `<fill><gradientFill degree="${gr.degree}"><stop position="0"><color rgb="FF${gr.stops[0]}"/></stop><stop position="1"><color rgb="FF${gr.stops[1]}"/></stop></gradientFill></fill>`)
  }
  const washFill = `<fill><patternFill patternType="solid"><fgColor rgb="FF${g.wash}"/><bgColor indexed="64"/></patternFill></fill>`
  const fillId = +fills[1]
  const washXf = +xfs[1]
  const xfXml = `<xf numFmtId="0" fontId="0" fillId="${fillId}" borderId="0" xfId="0" applyFill="1"/>`
  const out = xml
    .replace(fills[0], `<fills count="${fillId + 1}">${body}${washFill}</fills>`)
    .replace(xfs[0], `<cellXfs count="${washXf + 1}">${xfs[2]}${xfXml}</cellXfs>`)
  return { xml: out, washXf }
}

/** Gắn style wash vào mọi <col> hiện có, thêm một <col> phủ phần còn lại tới cột cuối (XFD) để nền wash phủ toàn sheet. */
export function colsWashPatch(xml: string, washXf: number): string {
  const m = /<cols>([\s\S]*?)<\/cols>/.exec(xml)
  const wide = (min: number) => `<col min="${min}" max="16384" width="9.140625" style="${washXf}"/>`
  if (!m) return xml.replace('<sheetData', `<cols>${wide(1)}</cols><sheetData`)
  let maxEnd = 0
  const cols = m[1].replace(/<col\b([^>]*?)\/>/g, (_all, attrs: string) => {
    const mx = /\bmax="(\d+)"/.exec(attrs)
    if (mx) maxEnd = Math.max(maxEnd, +mx[1])
    return `<col${attrs.replace(/\sstyle="\d+"/, '')} style="${washXf}"/>`
  })
  return xml.replace(m[0], `<cols>${cols}${maxEnd < 16384 ? wide(maxEnd + 1) : ''}</cols>`)
}

/** Vá TẤT CẢ sheet theo thứ tự (sheet1.xml ↔ patches[0]...). `glass` (tuỳ chọn) bật gradient + nền wash.
 *  Lỗi vá → trả file gốc (mất định dạng in/glass, KHÔNG mất dữ liệu). */
export async function patchWorkbookXml(bytes: Uint8Array, patches: SheetPatch[], glass?: GlassPatch): Promise<Uint8Array> {
  try {
    const { unzipSync, zipSync, strFromU8, strToU8 } = await import('fflate')
    const files = unzipSync(bytes)
    let patched = false
    let washXf = -1
    if (glass && files['xl/styles.xml']) {
      const st = stylesXmlPatch(strFromU8(files['xl/styles.xml']), glass)
      if (st) { files['xl/styles.xml'] = strToU8(st.xml); washXf = st.washXf; patched = true }
    }
    for (let i = 0; i < patches.length; i++) {
      const key = `xl/worksheets/sheet${i + 1}.xml`
      if (!files[key]) continue
      const xml = strFromU8(files[key])
      let next = sheetXmlPatch(xml, patches[i])
      if (washXf >= 0) next = colsWashPatch(next, washXf)
      if (next !== xml) { files[key] = strToU8(next); patched = true }
    }
    if (files['xl/workbook.xml']) {
      const wbXml = strFromU8(files['xl/workbook.xml'])
      const names = [...wbXml.matchAll(/<sheet\b[^>]*\bname="([^"]*)"/g)].map(m =>
        m[1].replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))
      const next = workbookXmlPatch(wbXml, names, patches)
      if (next !== wbXml) { files['xl/workbook.xml'] = strToU8(next); patched = true }
    }
    return patched ? zipSync(files) : bytes
  } catch {
    return bytes
  }
}
