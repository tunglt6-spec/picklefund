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
  /** Mã tài liệu (mặc định sinh PF-BCQ-yyMMdd-HHmm theo giờ VN). */
  docCode?: string
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
  /** Logo TRẮNG (mặc định PickleFund): vẽ thẳng trên băng brandDark (logo màu → chip trắng). */
  onDark?: boolean
}

export interface QuyReportBranding {
  name: string
  footer: string
  /** Logo CLB (tùy chọn) — vẽ ở masthead nền trắng (logo trắng → onDark: ô màu brand) */
  logo?: PdfLogo | null
  /** Màu chủ đạo CLB (#RRGGBB) — thiếu/sai → tím mặc định #6D5DFB. makeBrand tự tối dần để chữ đạt ≥ 4.5:1. */
  primaryColor?: string | null
  /** Chỉ test/bật lại có chủ đích: true → dùng primaryColor; mặc định (undefined) theo EXPORT_USE_CLUB_COLOR=false → bộ màu app chung. */
  allowCustomColor?: boolean
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
  docCode?: string
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
  /** Thông điệp khi bảng không có dòng nào (mặc định 'Chưa có dữ liệu trong phạm vi này'). */
  emptyText?: string
  /** Loại tài liệu trong mã TL PF-{LOẠI}-yyMMdd-HHmm (mặc định 'BXH'). */
  docType?: string
  /** Mã tài liệu đã dựng sẵn (ưu tiên hơn docType). */
  docCode?: string
  exportedDateText: string
  exportedAtText: string
}

export interface StandingsReportColumn {
  key: string
  label: string
  w: number
  align: 'left' | 'center' | 'right'
  /** status = chấm màu + chữ ink2 (Hoạt động / Đã đóng / Chờ xác nhận…). */
  tone?: 'win' | 'pos' | 'loss' | 'neg' | 'warn' | 'info' | 'points' | 'brand' | 'muted' | 'ink2' | 'sign' | 'status'
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
  stats?: { label: string; value: string | number; tone?: 'pos' | 'neg' | 'warn' | 'brand' }[]
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
    /** Tỉ số pen (vd "4-3"). Trận hoà tỉ số có winner: hiện "pen …" nếu có, ngược lại "đi tiếp". */
    pen?: string
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
    docCode?: string
    exportedDateText: string
    exportedAtText: string
  }
  rounds: KnockoutReportRound[]
  branding: QuyReportBranding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any

export interface MiniExpenseReceiptInput {
  receiptNo?: number
  receiverName: string
  expenseType: string
  amount: number
  expenseDate: string
  description: string
  notes?: string
  clubName: string
  clubLocation?: string
  printedDateText: string
  printedAtText: string
}

/** Phiếu chi Quỹ Phụ — PDF vector (thay HTML + html2canvas). */
export function buildMiniExpensePDF(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: any
  fonts: { regular: string; bold: string }
  receipt: MiniExpenseReceiptInput
  branding: QuyReportBranding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any

export interface PersonalReceiptInput {
  receiptNo?: number
  memberName: string
  loginName?: string
  periodName: string
  periodStartDate?: string
  periodEndDate?: string
  contributionAmount?: number
  clubName: string
  clubLocation?: string
  amountPaid: number
  paymentDate?: string
  attendedSessions: number
  totalSessions: number
  totalCourtFee?: number
  memberCountForSplit?: number
  courtCost: number
  totalOtherFee?: number
  livingCost: number
  totalCost: number
  balance: number
  isConfirmed: boolean
  printedDateText: string
  printedAtText: string
}

/** Phiếu thu cá nhân (đóng quỹ thành viên) — PDF vector. */
export function buildPersonalReceiptPDF(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: any
  fonts: { regular: string; bold: string }
  receipt: PersonalReceiptInput
  branding: QuyReportBranding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any

export interface BillingReceiptInput {
  clubName: string
  invoiceNumber: string
  orderCode: string
  planLabel: string
  cycleLabel: string
  amount: number
  discount?: number
  /** Thời điểm thanh toán đã định dạng (ngày trước giờ). */
  paidAtText?: string
  gateway: string
  billingInfo?: { buyerName?: string; taxCode?: string; address?: string } | null
  printedDateText: string
  printedAtText: string
}

/** Biên nhận thanh toán gói dịch vụ — PDF vector. */
export function buildBillingReceiptPDF(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: any
  fonts: { regular: string; bold: string }
  receipt: BillingReceiptInput
  branding: QuyReportBranding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any
