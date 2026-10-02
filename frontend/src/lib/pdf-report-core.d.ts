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
  /** Thẻ dashboard bổ sung (tùy chọn — thiếu thì builder ẩn hàng thẻ bổ sung). */
  miniBalance?: number
  carryForward?: number
  totalAttendance?: number
  activeMemberCount?: number
  clubAssets?: number
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

export interface QuyReportExpenseRow {
  date: string
  description: string
  fundKey: 'COMMON' | 'MINI'
  fundLabel: string
  kindLabel: string
  amount: number
  statusKey: 'approved' | 'pending' | 'paid' | 'rejected'
  statusLabel: string
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
  /** Logo CLB (tùy chọn) — vẽ thẳng trên band màu ở header (không chip nền) */
  logo?: PdfLogo | null
}

export function buildQuyReportPDF(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: any
  fonts: { regular: string; bold: string }
  summary: QuyReportSummary
  rows: QuyReportRow[]
  expenseRows?: QuyReportExpenseRow[]
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
  /** Nhãn thẻ tổng đầu trang (mặc định 'TỔNG CHI') — đổi khi totalAll không phải tổng đã duyệt. */
  totalLabel?: string
  /** Nhãn dòng tổng cuối bảng (mặc định 'TỔNG CỘNG'). */
  totalRowLabel?: string
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
  /** Tiêu đề lớn ở header (mặc định 'BẢNG XẾP HẠNG'). Đặt 'LỊCH THI ĐẤU' khi tái dùng cho bảng lịch. */
  title?: string
  /** Tô nhẹ 3 dòng đầu (mặc định true). Đặt false cho bảng không xếp hạng (vd Lịch). */
  highlightTop3?: boolean
  /** Thông điệp khi bảng không có dòng nào (mặc định 'Không có dữ liệu'). */
  emptyText?: string
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
  /** Xuống dòng (tăng chiều cao hàng) thay vì cắt "…". Mặc định: true cho cột căn trái (trừ 'rank'). */
  wrap?: boolean
}

export function buildStandingsReportPDF(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: any
  fonts: { regular: string; bold: string }
  meta: StandingsReportMeta
  columns: StandingsReportColumn[]
  rows: Record<string, string | number>[]
  stats?: { label: string; value: string | number }[]
  /** Dòng tổng cuối bảng (key theo columns). Không truyền → không vẽ. */
  footerRow?: Record<string, string | number>
  branding: QuyReportBranding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any

export interface KnockoutReportRound {
  label: string
  matches: {
    teamA?: string
    teamB?: string
    scoreA?: number | string | null
    scoreB?: number | string | null
    winner: 'A' | 'B' | null
    walkover?: boolean
  }[]
}

export function buildKnockoutReportPDF(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: any
  fonts: { regular: string; bold: string }
  meta: {
    clubName: string
    tournamentName: string
    sportLabel: string
    championName?: string
    emptyText?: string
    exportedDateText: string
    exportedAtText: string
  }
  rounds: KnockoutReportRound[]
  branding: QuyReportBranding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any
