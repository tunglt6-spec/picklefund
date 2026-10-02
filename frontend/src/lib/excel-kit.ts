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
  pos: '15803D',
  neg: 'B91C1C',
  warn: 'B45309',
  info: '0E7490',
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

export interface ExcelBrand { brand: string; ink: string; soft: string }
/** `brand` = màu CLB. `ink` = brand tối 20%, tối thêm cho tới khi chữ trên nền `soft` đạt >= 4.5:1.
 *  `soft` = brand pha 8% với trắng. Mặc định #6D5DFB dùng cặp chuẩn của spec (#4F46E5 / #EEF2FF). */
export function makeBrand(primaryHex?: string | null): ExcelBrand {
  const raw = (primaryHex ?? '').replace('#', '').trim().toUpperCase()
  const brand = /^[0-9A-F]{6}$/.test(raw) ? raw : DEFAULT_BRAND_HEX
  if (brand === DEFAULT_BRAND_HEX) return { brand, ink: '4F46E5', soft: 'EEF2FF' }
  const soft = mixWith(brand, [255, 255, 255], 0.92)
  let ink = mixWith(brand, [0, 0, 0], 0.2)
  for (let i = 0; i < 12 && contrastRatio(ink, soft) < 4.5; i++) ink = mixWith(ink, [0, 0, 0], 0.12)
  return { brand, ink, soft }
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
    [/^so[_ ]quy/, 'SQ'], [/^thu[_ ]quy|^khoan[_ ]thu|^dong[_ ]quy/, 'TQ'], [/^danh[_ ]sach[_ ]thanh[_ ]vien/, 'DSTV'],
    [/^bao[_ ]cao/, 'BCQ'], [/^chi[_ ]phi|^khoan[_ ]chi/, 'BCC'], [/^cong[_ ]no/, 'CN'], [/^ky[_ ]quy/, 'KQ'],
    [/^diem[_ ]danh/, 'DD'], [/^cham[_ ]diem/, 'CD'], [/^nhat[_ ]ky|^audit/, 'NK'],
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
  pos: ['da dong', 'da xac nhan', 'hoat dong', 'da duyet', 'da chi', 'co mat', 'da thanh toan', 'hoan thanh', 'dang mo', 'da thu', 'thanh cong'],
  neg: ['chua dong', 'tu choi', 'vang', 'qua han', 'da huy', 'that bai', 'con no', 'no'],
  warn: ['cho xac nhan', 'cho duyet', 'tam nghi', 'cho xu ly', 'sap het han', 'dang cho', 'cho thanh toan'],
  info: ['quy phu'],
}
const stripAccent = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim()
/** Chữ trạng thái chuẩn (khớp NGUYÊN CHUỖI, không phân biệt dấu/hoa-thường) → tông semantic. */
export function statusTone(text: string): StatusTone | null {
  const k = stripAccent(text)
  if (!k) return null
  for (const tone of Object.keys(STATUS_WORDS) as StatusTone[]) if (STATUS_WORDS[tone].includes(k)) return tone
  return null
}

/* ─── Bộ style ─── */
type Align = 'left' | 'right' | 'center'
const hair = { style: 'thin', color: { rgb: XL_COLOR.line } }

export function xlStyles(b: ExcelBrand) {
  const font = (sz: number, o: Record<string, unknown> = {}) => ({ name: XL_FONT, sz, color: { rgb: XL_COLOR.ink }, ...o })
  const solid = (rgb: string) => ({ patternType: 'solid', fgColor: { rgb } })
  const rule = { style: 'thin', color: { rgb: b.brand } }
  return {
    club: { font: font(9, { bold: true, color: { rgb: b.ink } }), alignment: { horizontal: 'left', vertical: 'center' } },
    title: { font: font(16, { bold: true }), alignment: { horizontal: 'left', vertical: 'center' } },
    scope: { font: font(10, { color: { rgb: XL_COLOR.ink2 } }), alignment: { horizontal: 'left', vertical: 'center' } },
    meta: {
      font: font(9, { color: { rgb: XL_COLOR.muted } }),
      alignment: { horizontal: 'left', vertical: 'center' },
      border: { bottom: { style: 'medium', color: { rgb: b.brand } } },
    },
    metaRule: { border: { bottom: { style: 'medium', color: { rgb: b.brand } } } },
    header: (a: Align) => ({
      font: font(10, { bold: true, color: { rgb: b.ink } }),
      fill: solid(b.soft),
      border: { bottom: rule },
      alignment: { horizontal: a, vertical: 'center', wrapText: true, indent: a === 'center' ? 0 : 1 },
    }),
    cell: (a: Align, o: { wrap?: boolean; zebra?: boolean; color?: string; bold?: boolean } = {}) => ({
      font: font(10, { color: { rgb: o.color ?? XL_COLOR.ink }, ...(o.bold ? { bold: true } : {}) }),
      border: { bottom: hair },
      ...(o.zebra ? { fill: solid(XL_COLOR.surface2) } : {}),
      alignment: { horizontal: a, vertical: 'center', wrapText: !!o.wrap, indent: a === 'center' ? 0 : 1 },
    }),
    total: (a: Align, o: { first?: boolean; color?: string; wrap?: boolean } = {}) => ({
      font: font(10, { bold: true, color: { rgb: o.color ?? XL_COLOR.ink } }),
      fill: solid(b.soft),
      border: { top: o.first ? rule : hair, bottom: hair },
      alignment: { horizontal: a, vertical: 'center', wrapText: !!o.wrap, indent: a === 'center' ? 0 : 1 },
    }),
    empty: {
      font: font(10, { italic: true, color: { rgb: XL_COLOR.muted } }),
      border: { bottom: hair },
      alignment: { horizontal: 'center', vertical: 'center' },
    },
  }
}

export const statusColor = (t: StatusTone) => XL_COLOR[t]

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
