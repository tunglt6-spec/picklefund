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

export interface QuyReportBranding {
  name: string
  footer: string
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
