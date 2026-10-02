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
}
/** `brand` = màu CLB. `ink` = brand tối 20%, tối thêm cho tới khi chữ trên nền `soft` đạt >= 4.5:1 và
 *  chữ trắng trên `ink` đạt >= 4.5:1. `soft` = brand pha 8% với trắng. `head` = brand (tối dần nếu cần).
 *  Mặc định #6D5DFB dùng bộ chuẩn: brandDark #4F46E5, soft #EEF2FF, border #C7D2FE. */
export function makeBrand(primaryHex?: string | null): ExcelBrand {
  const raw = (primaryHex ?? '').replace('#', '').trim().toUpperCase()
  const brand = /^[0-9A-F]{6}$/.test(raw) ? raw : DEFAULT_BRAND_HEX
  if (brand === DEFAULT_BRAND_HEX) return { brand, ink: '4F46E5', soft: 'EEF2FF', head: brand, border: 'C7D2FE' }
  const soft = mixWith(brand, [255, 255, 255], 0.92)
  const border = mixWith(brand, [255, 255, 255], 0.7)
  let ink = mixWith(brand, [0, 0, 0], 0.2)
  for (let i = 0; i < 16 && (contrastRatio(ink, soft) < 4.5 || contrastRatio(ink, 'FFFFFF') < 4.5); i++) ink = mixWith(ink, [0, 0, 0], 0.12)
  let head = brand
  for (let i = 0; i < 16 && contrastRatio(head, 'FFFFFF') < 4.5; i++) head = mixWith(head, [0, 0, 0], 0.1)
  return { brand, ink, soft, head, border }
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

/* ─── Bộ style ─── */
type Align = 'left' | 'right' | 'center'
const hair = { style: 'thin', color: { rgb: XL_COLOR.line } }

export function xlStyles(b: ExcelBrand) {
  const font = (sz: number, o: Record<string, unknown> = {}) => ({ name: XL_FONT, sz, color: { rgb: XL_COLOR.ink }, ...o })
  const solid = (rgb: string) => ({ patternType: 'solid', fgColor: { rgb } })
  const WHITE = { rgb: XL_COLOR.white }
  const rule = { style: 'medium', color: { rgb: b.ink } }
  const band = solid(b.ink)
  const left = { horizontal: 'left', vertical: 'center', indent: 1 }
  const tone = (t: StatusTone) => ({
    pos: [XL_VIVID.pos, XL_VIVID.posBg], neg: [XL_VIVID.neg, XL_VIVID.negBg], warn: [XL_VIVID.warn, XL_VIVID.warnBg], info: [XL_VIVID.info, XL_VIVID.infoBg],
  })[t]
  return {
    /* Băng tiêu đề: tên CLB + tên tài liệu trên nền brandDark chữ trắng; phạm vi + xuất lúc trên nền brandSoft. */
    club: { font: font(10, { bold: true, color: WHITE }), fill: band, alignment: left },
    title: { font: font(16, { bold: true, color: WHITE }), fill: band, alignment: left },
    scope: { font: font(10, { bold: true, color: { rgb: b.ink } }), fill: solid(b.soft), alignment: left },
    meta: {
      font: font(9, { color: { rgb: b.ink } }), fill: solid(b.soft), alignment: left,
      border: { bottom: { style: 'medium', color: { rgb: b.brand } } },
    },
    metaRule: {
      fill: solid(b.soft), border: { bottom: { style: 'medium', color: { rgb: b.brand } } },
    },
    /* Văn bản thường (file mẫu / sheet hướng dẫn). */
    text: { font: font(10, { color: { rgb: XL_COLOR.ink2 } }), alignment: { horizontal: 'left', vertical: 'center', wrapText: true } },
    section: {
      font: font(10, { bold: true, color: { rgb: b.ink } }), fill: solid(b.soft),
      border: { bottom: { style: 'thin', color: { rgb: b.border } } }, alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    },
    header: (a: Align) => ({
      font: font(10, { bold: true, color: WHITE }),
      fill: solid(b.head),
      border: { bottom: { style: 'medium', color: { rgb: b.ink } }, left: { style: 'thin', color: { rgb: b.border } }, right: { style: 'thin', color: { rgb: b.border } } },
      alignment: { horizontal: a, vertical: 'center', wrapText: true, indent: a === 'center' ? 0 : 1 },
    }),
    cell: (a: Align, o: { wrap?: boolean; zebra?: boolean; color?: string; bold?: boolean } = {}) => ({
      font: font(10, { color: { rgb: o.color ?? XL_COLOR.ink }, ...(o.bold ? { bold: true } : {}) }),
      border: { bottom: hair },
      ...(o.zebra ? { fill: solid(XL_COLOR.surface2) } : {}),
      alignment: { horizontal: a, vertical: 'center', wrapText: !!o.wrap, indent: a === 'center' ? 0 : 1 },
    }),
    /** Chip trạng thái: nền nhạt + chữ đậm sinh động. */
    chip: (t: StatusTone) => {
      const [fg, bg] = tone(t)
      return {
        font: font(10, { bold: true, color: { rgb: fg } }), fill: solid(bg),
        border: { bottom: hair },
        alignment: { horizontal: 'center', vertical: 'center' },
      }
    },
    total: (a: Align, o: { first?: boolean; color?: string; wrap?: boolean } = {}) => ({
      font: font(10, { bold: true, color: { rgb: o.color ?? b.ink } }),
      fill: solid(b.soft),
      border: { top: o.first ? rule : { style: 'thin', color: { rgb: b.border } }, bottom: { style: 'thin', color: { rgb: b.border } } },
      alignment: { horizontal: a, vertical: 'center', wrapText: !!o.wrap, indent: a === 'center' ? 0 : 1 },
    }),
    empty: {
      font: font(10, { italic: true, color: { rgb: XL_COLOR.muted } }),
      border: { bottom: hair },
      alignment: { horizontal: 'center', vertical: 'center' },
    },
  }
}

/** Màu chữ số theo tông tiền (sinh động, dùng cùng chữ ĐẬM). */
export const moneyColor = (t: Exclude<MoneyTone, null>) => ({ pos: XL_VIVID.pos, neg: XL_VIVID.neg, warn: XL_VIVID.warn })[t]
/** Màu tab sheet: thu = xanh, chi = đỏ, còn lại = brand. */
export const tabColorFor = (tone: SheetTone, brand: string) => (tone === 'income' ? XL_VIVID.pos : tone === 'expense' ? XL_VIVID.neg : brand)

export const statusColor = (t: StatusTone) => XL_VIVID[t]

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

/** Vá TẤT CẢ sheet theo thứ tự (sheet1.xml ↔ patches[0]...). Lỗi vá → trả file gốc (mất định dạng in, KHÔNG mất dữ liệu). */
export async function patchWorkbookXml(bytes: Uint8Array, patches: SheetPatch[]): Promise<Uint8Array> {
  try {
    const { unzipSync, zipSync, strFromU8, strToU8 } = await import('fflate')
    const files = unzipSync(bytes)
    let patched = false
    for (let i = 0; i < patches.length; i++) {
      const key = `xl/worksheets/sheet${i + 1}.xml`
      if (!files[key]) continue
      const xml = strFromU8(files[key])
      const next = sheetXmlPatch(xml, patches[i])
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
