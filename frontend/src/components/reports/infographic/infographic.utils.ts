import type { InfographicReportData, InfographicMemberData } from './infographic.types'

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
    clubName: src.clubName || 'CLB Pickleball',
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
export function buildFileName(clubName: string, periodLabel: string, ext: 'png' | 'pdf'): string {
  const club = slugPart(clubName || '') || 'PickleFund'
  const period = slugPart(periodLabel || '')
  return `${club}${period ? `_${period}` : ''}_Infographic.${ext}`
}
