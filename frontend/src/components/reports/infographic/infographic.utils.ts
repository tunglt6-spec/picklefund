import type { InfographicReportData, InfographicMemberData } from './infographic.types'
import { EXPORT_USE_CLUB_COLOR } from '../../../lib/export-theme.js'

/* ── Format helpers ── */
/** Số tài chính ĐẦY ĐỦ theo vi-VN (không làm tròn "triệu" → không mất độ chính xác). NaN/undefined → "0 đ". */
export function fmtVND(amount: number | null | undefined): string {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '0 đ'
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ'
}

export function fmtVNDFull(amount: number | null | undefined): string {
  return fmtVND(amount)
}

export function fmtDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/* ── Palette Infographic SINH ĐỘNG (màu app: tím CLB + xanh thu / đỏ chi) ──
   Poster 1080x1920: bố cục FROZEN, chỉ đổi MÀU. Nền đặc = brand đậm (mặc định #4F46E5, tự tối cho chữ trắng ≥ 4.5:1);
   số lớn đậm dùng màu sinh động (xanh #16A34A / đỏ #DC2626, ≥ 3:1), chữ nhỏ dùng bản AA (≥ 4.5:1).
   Hàm thuần (không DOM) để node --test kiểm chứng. */
export const INFOGRAPHIC_MIN_FONT_PX = 14
export const DEFAULT_INFOGRAPHIC_BRAND = '#6D5DFB'
/** Nền đặc mặc định cho băng/header (chữ trắng 6.3:1). */
export const DEFAULT_INFOGRAPHIC_DEEP = '#4F46E5'

const HEX6 = /^#[0-9a-fA-F]{6}$/
const toRgb = (h: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
const toHex = (c: number[]): string =>
  '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()
const lum = (h: string): number => {
  const c = toRgb(h).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
/** Tương phản WCAG 2.x giữa hai màu hex #RRGGBB. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const mixHex = (a: string, b: string, t: number): string => {
  const x = toRgb(a)
  const y = toRgb(b)
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t))
}
const darkenUntil = (fg: string, bgs: string[], min = 4.5): string => {
  let c = fg
  for (let i = 0; i < 40 && bgs.some((bg) => contrastRatio(c, bg) < min); i++) c = mixHex(c, '#000000', 0.06)
  return c
}

export interface InfographicPalette {
  brand: string
  /** Nền đặc có chữ trắng (header): brand tối dần tới khi trắng/nền ≥ 4.5. */
  deep: string
  /** Chữ màu brand trên trắng / soft (≥ 4.5). */
  ink: string
  soft: string
  /** Viền của khối soft / thẻ nhấn (indigo nhạt). */
  softBorder: string
  /** Huy hiệu/đường trang trí trên nền deep (KHÔNG làm màu chữ). */
  badge: string
  /** 3 bậc nền (đậm dần từ deep, vẫn giữ sắc tím/brand) cho vùng tổng kết / chân / thanh đáy. */
  dark: string
  darker: string
  darkest: string
  /** Pill trên header (đặc, chữ trắng AA). */
  pill: string
  onDark: string
  onDarkMuted: string
  text: string
  text2: string
  muted: string
  line: string
  surface2: string
  pos: string
  neg: string
  warn: string
  posFill: string
  negFill: string
  warnFill: string
  /** Số ĐẬM cỡ lớn (≥ 3:1 trên trắng/tint): xanh thu, đỏ chi, cam. KHÔNG dùng cho chữ nhỏ. */
  posVivid: string
  negVivid: string
  orange: string
  cyan: string
  posTint: string
  negTint: string
  warnTint: string
  posBorder: string
  negBorder: string
  warnBorder: string
  posOnDark: string
  negOnDark: string
  warnOnDark: string
}

export function makeInfographicPalette(primary?: string | null, allowCustom: boolean = EXPORT_USE_CLUB_COLOR): InfographicPalette {
  const brand = allowCustom && typeof primary === 'string' && HEX6.test(primary.trim()) ? primary.trim().toUpperCase() : DEFAULT_INFOGRAPHIC_BRAND
  const isDefault = brand === DEFAULT_INFOGRAPHIC_BRAND
  const soft = isDefault ? '#EEF2FF' : mixHex(brand, '#FFFFFF', 0.92)
  const softBorder = isDefault ? '#C7D2FE' : mixHex(brand, '#FFFFFF', 0.75)
  const deep = isDefault ? DEFAULT_INFOGRAPHIC_DEEP : darkenUntil(brand, ['#FFFFFF'])
  const badge = isDefault ? '#988CFC' : mixHex(deep, '#FFFFFF', 0.35)
  const ink = isDefault ? '#4F46E5' : darkenUntil(mixHex(brand, '#000000', 0.2), ['#FFFFFF', soft])
  const dark = mixHex(deep, '#000000', 0.45)
  const darker = mixHex(deep, '#000000', 0.58)
  const darkest = mixHex(deep, '#000000', 0.7)
  let onDarkMuted = '#CBD5E1'
  for (let i = 0; i < 20 && contrastRatio(onDarkMuted, dark) < 4.5; i++) onDarkMuted = mixHex(onDarkMuted, '#FFFFFF', 0.15)
  return {
    brand,
    deep,
    ink,
    soft,
    softBorder,
    badge,
    dark,
    darker,
    darkest,
    pill: mixHex(deep, '#000000', 0.22),
    onDark: '#FFFFFF',
    onDarkMuted,
    text: '#1E293B',
    text2: '#475569',
    muted: '#5A6678',
    line: '#E2E8F0',
    surface2: '#F8FAFC',
    pos: '#15803D',
    neg: '#B91C1C',
    warn: '#B45309',
    posFill: '#16A34A',
    negFill: '#EF4444',
    warnFill: '#D97706',
    posVivid: '#16A34A',
    negVivid: '#DC2626',
    orange: '#EA580C',
    cyan: '#0891B2',
    posTint: '#F0FDF4',
    negTint: '#FEF2F2',
    warnTint: '#FFFBEB',
    posBorder: '#BBF7D0',
    negBorder: '#FECACA',
    warnBorder: '#FDE68A',
    posOnDark: '#4ADE80',
    negOnDark: '#FCA5A5',
    warnOnDark: '#FDBA74',
  }
}

/* ── LIQUID GLASS (html2canvas KHÔNG hỗ trợ backdrop-filter → giả kính bằng gradient + rgba + viền + bóng CSS).
   Chỉ dùng đúng màu palette ở các độ trong suốt khác nhau; bố cục/toạ độ FROZEN không đổi. ── */
export const rgbaOf = (hex: string, a: number): string => {
  const [r, g, b] = toRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
export const GLASS_ALPHA = { panelTop: 0.8, panelBottom: 0.64, rim: 0.9, ring: 0.18, tone: 0.05, accent: 0.14, accentRing: 0.35, shadow: 0.1, orb: 0.12, gloss: 0.16, chip: 0.14, chipRing: 0.4 } as const

export interface InfographicGlass {
  /** Nền trang: wash chéo + 2 orb mềm. */
  wash: string
  /** Đầu tối của băng header (deep pha ink) → deep; chữ trắng AA ở cả hai đầu kể cả sau lớp bóng loáng. */
  mastFrom: string
  /** Đầu sáng của băng = deep, tối thêm nếu cần để chữ trắng trên chip kính vẫn ≥ 4.5. */
  mastTo: string
  mast: string
  /** Nền tối (tổng kết/chân) dạng gradient dark → darker. */
  dark: string
  darker: string
  /** Tấm kính: tint = màu tông phủ rất nhẹ (tuỳ chọn); accent = tấm nhấn brand. */
  card: (tint?: string | null, accent?: boolean) => Record<string, string | number>
  /** Vòng viền trong brand + highlight cạnh trên (div con, vì html2canvas bỏ qua inset shadow). */
  ring: Record<string, string | number>
  chip: Record<string, string | number>
  /** Viên trạng thái kính: nền màu α + viền màu α (chữ AA tự chọn). */
  status: (hex: string) => Record<string, string | number>
}

export function makeInfographicGlass(P: InfographicPalette): InfographicGlass {
  const A = GLASS_ALPHA
  const w = (a: number) => `rgba(255,255,255,${a})`
  let mastTo = P.deep
  for (let i = 0; i < 30 && contrastRatio('#FFFFFF', mixHex(mastTo, '#FFFFFF', A.chip + 0.02)) < 4.5; i++) mastTo = mixHex(mastTo, '#000000', 0.05)
  const mastFrom = mixHex(mastTo, P.text, 0.35)
  const wash =
    `radial-gradient(circle at 88% 6%, ${rgbaOf(P.brand, A.orb)} 0, ${rgbaOf(P.brand, 0)} 560px),` +
    `radial-gradient(circle at 8% 64%, ${rgbaOf(P.cyan, A.orb)} 0, ${rgbaOf(P.cyan, 0)} 520px),` +
    `linear-gradient(150deg, ${P.soft} 0%, ${mixHex(P.soft, '#FFFFFF', 0.45)} 52%, ${mixHex(P.brand, '#FFFFFF', 0.92)} 100%)`
  return {
    wash,
    mastFrom,
    mastTo,
    mast: `radial-gradient(ellipse 85% 85% at 20% 0%, ${w(A.gloss)}, ${w(0)} 100%), linear-gradient(115deg, ${mastFrom} 0%, ${mastTo} 100%)`,
    dark: `linear-gradient(115deg, ${mixHex(P.dark, P.text, 0.2)} 0%, ${P.dark} 100%)`,
    darker: `linear-gradient(115deg, ${P.darker} 0%, ${P.dark} 100%)`,
    card: (tint, accent) => ({
      background: `${accent ? `linear-gradient(${rgbaOf(P.brand, A.accent)},${rgbaOf(P.brand, A.accent)}),` : tint ? `linear-gradient(${rgbaOf(tint, A.tone)},${rgbaOf(tint, A.tone)}),` : ''}linear-gradient(180deg, ${w(A.panelTop)}, ${w(A.panelBottom)})`,
      border: `2px solid ${w(A.rim)}`,
      boxShadow: `0 6px 18px ${rgbaOf(P.deep, A.shadow)}, 0 1px 0 ${w(0.6)}`,
    }),
    ring: { position: 'absolute', inset: 0, borderRadius: 'inherit', border: `1px solid ${rgbaOf(P.brand, A.ring)}`, borderTop: `2px solid ${w(0.95)}`, pointerEvents: 'none', boxSizing: 'border-box' },
    chip: { background: w(A.chip), border: `1px solid ${w(A.chipRing)}` },
    status: (hex) => ({ background: rgbaOf(hex, 0.08), border: `1px solid ${rgbaOf(hex, 0.4)}` }),
  }
}

/** Monogram từ tên CLB: tối đa 2 chữ cái đầu của từ có nghĩa (bỏ "CLB"/"Câu lạc bộ"), thiếu → "C". */
export function monogramOf(name: string): string {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean)
  const sig = words.filter((w) => !/^(clb|câu|lạc|bộ|club)$/i.test(w))
  const use = (sig.length ? sig : words).slice(0, 2)
  return use.map((w) => Array.from(w)[0]?.toUpperCase() ?? '').join('') || 'C'
}

/* ── Mapper from Reports.tsx data to InfographicReportData ── */
export interface ReportSource {
  clubName: string
  periodLabel: string
  totalIncome: number
  totalExpenses: number
  displayBalance: number
  memberCount: number
  sessionCount: number
  confirmedCount: number
  memberBillRows: Array<{
    memberName: string
    attendedSessions: number
    totalSessions: number
    amountPaid: number
    contributionPaid: boolean
    courtCost: number
    livingCost: number
    totalCost: number
    balance: number
  }>
}

/** Số hữu hạn hoặc 0 — chặn "NaN đ"/"undefined" lọt vào infographic. */
const fin = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0)

export function mapToInfographicData(src: ReportSource): InfographicReportData {
  const today = new Date()
  const totalIncome = fin(src.totalIncome)
  const totalExpenses = fin(src.totalExpenses)
  const expenseIncomeRatio = totalIncome > 0
    ? Math.round((totalExpenses / totalIncome) * 100)
    : 0

  const members: InfographicMemberData[] = src.memberBillRows.map((r, i) => ({
    id: `m-${i}`,
    name: r.memberName,
    attendedSessions: fin(r.attendedSessions),
    totalSessions: fin(r.totalSessions),
    attendanceRate: fin(r.totalSessions) > 0 ? Math.round((fin(r.attendedSessions) / fin(r.totalSessions)) * 100) : 0,
    paidAmount: fin(r.amountPaid),
    isPaid: r.contributionPaid,
    courtFee: fin(r.courtCost),
    livingFee: fin(r.livingCost),
    totalCost: fin(r.totalCost),
    balance: fin(r.balance),
  }))

  return {
    clubName: src.clubName || 'CLB',
    reportTitle: 'BÁO CÁO TÀI CHÍNH',
    periodLabel: src.periodLabel,
    exportDate: fmtDate(today),
    generatedAt: today.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    totalMembers: fin(src.memberCount),
    totalSessions: fin(src.sessionCount),
    paidMembers: fin(src.confirmedCount),
    unpaidMembers: Math.max(0, fin(src.memberCount) - fin(src.confirmedCount)),
    totalIncome,
    totalExpense: totalExpenses,
    fundBalance: fin(src.displayBalance),
    expenseIncomeRatio,
    members,
  }
}

/* Ép LIGHT theme trên bản clone (html2canvas render ngoài màn) → ảnh/PDF luôn sáng-sạch
   chuẩn SaaS dù người dùng đang ở dark mode, KHÔNG gây nháy màn hình thật. */
const forceLightClone = (doc: Document) => {
  doc.documentElement.removeAttribute('data-theme')
  doc.documentElement.setAttribute('data-theme', 'light')
  doc.documentElement.setAttribute('data-glass', 'off')
  doc.documentElement.style.colorScheme = 'light'
}

/* ── Giới hạn kích thước canvas / trang PDF ──
   Canvas trình duyệt hỏng khi cạnh > ~16k-32k px; CLB đông ⇒ overlay hoá đơn (B) rất cao.
   Hạ scale để cạnh dài ≤ MAX_CANVAS_PX (chia trang PDF xử lý riêng khi quá cao). */
export const MAX_CANVAS_PX = 16000
/** Trang PDF tuỳ biến cao tối đa (mm) trước khi chia nhiều trang (jsPDF/viewer giới hạn ~5080mm). */
export const MAX_SINGLE_PDF_PAGE_MM = 1800
const PDF_PAGE_MM = 297

/** Scale html2canvas sao cho (cssHeight × scale) ≤ MAX_CANVAS_PX; không bao giờ > desired. */
export function safeCanvasScale(cssHeight: number, desired = 2, maxPx = MAX_CANVAS_PX): number {
  const h = Number(cssHeight)
  if (!Number.isFinite(h) || h <= 0) return desired
  const s = Math.min(desired, maxPx / h)
  return Math.max(0.1, Math.floor(s * 100) / 100)
}

export interface PdfPageSlice { srcY: number; srcH: number; destH: number }

/** Chia canvas (imgW×imgH px) thành các trang PDF rộng pdfW mm. Đủ thấp → 1 trang; quá cao → nhiều trang. */
export function planPdfPages(imgW: number, imgH: number, pdfW = 105): PdfPageSlice[] {
  if (!(imgW > 0) || !(imgH > 0)) return []
  const fullH = (imgH / imgW) * pdfW
  if (fullH <= MAX_SINGLE_PDF_PAGE_MM) return [{ srcY: 0, srcH: imgH, destH: fullH }]
  const pagePx = Math.floor((imgW * PDF_PAGE_MM) / pdfW)
  const pages: PdfPageSlice[] = []
  for (let y = 0; y < imgH; y += pagePx) {
    const srcH = Math.min(pagePx, imgH - y)
    pages.push({ srcY: y, srcH, destH: (srcH / imgW) * pdfW })
  }
  return pages
}

async function renderCanvas(elementId: string, allowTaint = true) {
  const { default: html2canvas } = await import('html2canvas-pro')
  const el = document.getElementById(elementId)
  if (!el) throw new Error('Element not found')
  return html2canvas(el, {
    scale: safeCanvasScale(el.scrollHeight),
    useCORS: true,
    allowTaint,
    backgroundColor: '#ffffff',
    logging: false,
    width: el.scrollWidth,
    height: el.scrollHeight,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
    onclone: (doc) => forceLightClone(doc),
  })
}

/* ── Export PNG ── */
export async function exportInfographicAsPng(elementId: string, fileName: string): Promise<void> {
  const canvas = await renderCanvas(elementId)
  const link = document.createElement('a')
  link.download = fileName
  link.href = canvas.toDataURL('image/png', 1.0)
  link.click()
}

/* ── Export PDF ── */
export async function exportInfographicAsPdf(elementId: string, fileName: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const canvas = await renderCanvas(elementId)
  const imgW = canvas.width
  const imgH = canvas.height

  // Trang tuỳ biến rộng 105mm; quá cao → chia nhiều trang (tránh vượt giới hạn trang PDF/canvas).
  const pdfW = 105
  const slices = planPdfPages(imgW, imgH, pdfW)
  if (slices.length === 0) throw new Error('Canvas rỗng')

  let pdf: InstanceType<typeof jsPDF> | null = null
  for (const sl of slices) {
    let data: string
    if (slices.length === 1) {
      data = canvas.toDataURL('image/png', 1.0)
    } else {
      const part = document.createElement('canvas')
      part.width = imgW
      part.height = sl.srcH
      const ctx = part.getContext('2d')
      if (!ctx) throw new Error('Không tạo được canvas phụ')
      ctx.drawImage(canvas, 0, sl.srcY, imgW, sl.srcH, 0, 0, imgW, sl.srcH)
      data = part.toDataURL('image/png', 1.0)
    }
    if (!pdf) pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfW, sl.destH] })
    else pdf.addPage([pdfW, sl.destH], 'portrait')
    pdf.addImage(data, 'PNG', 0, 0, pdfW, sl.destH)
  }
  pdf?.save(fileName)
}

/* ── Web Share API ── */
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share
}

export async function shareInfographic(elementId: string, title: string): Promise<void> {
  // Share: không allowTaint (toBlob sẽ ném SecurityError nếu canvas bị taint bởi ảnh cross-origin).
  const canvas = await renderCanvas(elementId, false)
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error('Canvas to blob failed')), 'image/png', 1.0)
  )
  const file = new File([blob], `${title}.png`, { type: 'image/png' })
  await navigator.share({ title, files: [file] })
}

/* ── Filename builder ── */
const slugPart = (s: string) => s.replace(/[^a-zA-Z0-9À-ỹ]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')

/** Tên file theo CLB (không hard-code "PickleFund_" khi có tên CLB); thiếu tên → "PickleFund". */
export function buildFileName(clubName: string, periodLabel: string, ext: 'png' | 'pdf', now: Date = new Date()): string {
  const club = slugPart(clubName || '') || 'PickleFund'
  const period = slugPart(periodLabel || '')
  // Ngày xuất (dd-mm-yyyy) — thống nhất với exportFileName của lib/export.
  const stamp = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`
  return `${club}${period ? `_${period}` : ''}_Infographic_${stamp}.${ext}`
}
