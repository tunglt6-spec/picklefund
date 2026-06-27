import type { InfographicReportData, InfographicMemberData } from './infographic.types'

/* ── Format helpers ── */
export function fmtVND(amount: number): string {
  if (amount === 0) return '0 đ'
  const abs = Math.abs(amount)
  let s: string
  if (abs >= 1_000_000) {
    s = (abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1) + ' triệu'
  } else {
    s = new Intl.NumberFormat('vi-VN').format(abs) + ' đ'
  }
  return amount < 0 ? `-${s}` : s
}

export function fmtVNDFull(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ'
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

export function mapToInfographicData(src: ReportSource): InfographicReportData {
  const today = new Date()
  const expenseIncomeRatio = src.totalIncome > 0
    ? Math.round((src.totalExpenses / src.totalIncome) * 100)
    : 0

  const members: InfographicMemberData[] = src.memberBillRows.map((r, i) => ({
    id: `m-${i}`,
    name: r.memberName,
    attendedSessions: r.attendedSessions,
    totalSessions: r.totalSessions,
    attendanceRate: r.totalSessions > 0 ? Math.round((r.attendedSessions / r.totalSessions) * 100) : 0,
    paidAmount: r.amountPaid,
    isPaid: r.contributionPaid,
    courtFee: r.courtCost,
    livingFee: r.livingCost,
    totalCost: r.totalCost,
    balance: r.balance,
  }))

  return {
    clubName: src.clubName || 'CLB Pickleball',
    reportTitle: 'BÁO CÁO TÀI CHÍNH',
    periodLabel: src.periodLabel,
    exportDate: fmtDate(today),
    generatedAt: today.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    totalMembers: src.memberCount,
    totalSessions: src.sessionCount,
    paidMembers: src.confirmedCount,
    unpaidMembers: Math.max(0, src.memberCount - src.confirmedCount),
    totalIncome: src.totalIncome,
    totalExpense: src.totalExpenses,
    fundBalance: src.displayBalance,
    expenseIncomeRatio,
    members,
  }
}

/* ── Export PNG ── */
export async function exportInfographicAsPng(elementId: string, fileName: string): Promise<void> {
  const { default: html2canvas } = await import('html2canvas')
  const el = document.getElementById(elementId)
  if (!el) throw new Error('Element not found')

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: el.scrollWidth,
    height: el.scrollHeight,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  })

  const link = document.createElement('a')
  link.download = fileName
  link.href = canvas.toDataURL('image/png', 1.0)
  link.click()
}

/* ── Export PDF ── */
export async function exportInfographicAsPdf(elementId: string, fileName: string): Promise<void> {
  const { default: html2canvas } = await import('html2canvas')
  const { default: jsPDF } = await import('jspdf')
  const el = document.getElementById(elementId)
  if (!el) throw new Error('Element not found')

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: el.scrollWidth,
    height: el.scrollHeight,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  })

  const imgData = canvas.toDataURL('image/png', 1.0)
  const imgW = canvas.width
  const imgH = canvas.height

  // Use 9:16 custom page (mm) — 105 x 186.67mm ≈ A4-width × 16/9
  const pdfW = 105
  const pdfH = Math.round((imgH / imgW) * pdfW)

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfW, pdfH] })
  pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
  pdf.save(fileName)
}

/* ── Web Share API ── */
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share
}

export async function shareInfographic(elementId: string, title: string): Promise<void> {
  const { default: html2canvas } = await import('html2canvas')
  const el = document.getElementById(elementId)
  if (!el) throw new Error('Element not found')

  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false })
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error('Canvas to blob failed')), 'image/png', 1.0)
  )
  const file = new File([blob], `${title}.png`, { type: 'image/png' })
  await navigator.share({ title, files: [file] })
}

/* ── Filename builder ── */
export function buildFileName(clubName: string, periodLabel: string, ext: 'png' | 'pdf'): string {
  const slug = (s: string) => s.replace(/[^a-zA-Z0-9À-ỹ]/g, '_').replace(/_+/g, '_')
  return `PickleFund_${slug(clubName)}_${slug(periodLabel)}_Infographic.${ext}`
}
