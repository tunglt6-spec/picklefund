/** Khai báo kiểu cho pdf-report-core.js (lõi báo cáo PDF vector dùng chung mọi CLB). */

export interface QuyReportSummary {
  clubName: string
  periodName: string
  totalIncome: number
  totalExpense: number
  balance: number
  memberCount: number
  sessionCount: number
  confirmedCount: number
  /** Ví dụ "22/7/2026" */
  exportedDateText: string
  /** Ví dụ "18:38:59 22/7/2026" */
  exportedAtText: string
}

export interface QuyReportRow {
  memberName: string
  attendedSessions: number
  totalSessions: number
  amountPaid: number
  contributionPaid: boolean
  courtCost: number
  livingCost: number
  totalCost: number
  balance: number
}

export interface PdfLogo {
  /** data:image/png|jpeg;base64,... */
  dataUrl: string
  /** Kích thước gốc (px) để giữ tỉ lệ khi vẽ */
  w: number
  h: number
}

export interface QuyReportBranding {
  name: string
  footer: string
  /** Logo CLB (tùy chọn) — vẽ chip trắng ở header */
  logo?: PdfLogo | null
}

export function buildQuyReportPDF(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: any
  fonts: { regular: string; bold: string }
  summary: QuyReportSummary
  rows: QuyReportRow[]
  branding: QuyReportBranding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any

export interface MiniReceiptInput {
  receiptNo?: number
  payerName: string
  incomeType: string
  amount: number
  paymentDate: string
  notes?: string
  clubName: string
  clubLocation?: string
  printedDateText: string
  printedAtText: string
}

export function buildMiniReceiptPDF(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: any
  fonts: { regular: string; bold: string }
  receipt: MiniReceiptInput
  branding: QuyReportBranding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any

export interface ExpenseReportSummary {
  clubName: string
  periodName: string
  totalAll: number
  totalCommon: number
  totalMini: number
  totalApproved: number
  totalPending: number
  count: number
  exportedDateText: string
  exportedAtText: string
}

export interface ExpenseReportRow {
  code: string
  description: string
  kindLabel: string
  dateText: string
  amount: number
  statusKey: 'approved' | 'pending' | 'paid' | 'rejected'
}

export function buildExpenseReportPDF(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: any
  fonts: { regular: string; bold: string }
  summary: ExpenseReportSummary
  rows: ExpenseReportRow[]
  branding: QuyReportBranding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any

export interface StandingsReportMeta {
  clubName: string
  tournamentName: string
  sportLabel: string
  formatLabel: string
  rankNote?: string
  exportedDateText: string
  exportedAtText: string
}

export interface StandingsReportColumn {
  key: string
  label: string
  w: number
  align: 'left' | 'center' | 'right'
  tone?: 'win' | 'loss' | 'points' | 'muted' | 'sign'
  bold?: boolean
}

export function buildStandingsReportPDF(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: any
  fonts: { regular: string; bold: string }
  meta: StandingsReportMeta
  columns: StandingsReportColumn[]
  rows: Record<string, string | number>[]
  stats?: { label: string; value: string | number }[]
  branding: QuyReportBranding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any
