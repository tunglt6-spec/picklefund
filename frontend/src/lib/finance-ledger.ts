/**
 * Logic THUẦN cho Sổ Quỹ / export tài chính (không phụ thuộc React/store → test được bằng node).
 * Quy tắc canonical (khớp backend financial-calculator):
 *  • Thu = khoản ĐÃ xác nhận (isConfirmed)
 *  • Chi = status approved | paid (pending/rejected KHÔNG trừ quỹ)
 *  • Sổ Quỹ chính = CHỈ Quỹ Chính (fundSource COMMON) của kỳ đang chọn; Quỹ Phụ KHÔNG gộp
 *  • Số dư mở đầu = số dư chuyển kỳ (summary.carryForward.balance)
 */
export interface LedgerContribInput {
  id: string
  fundSource?: string
  fundPeriodId?: string
  isConfirmed?: boolean
  paymentDate: string
  amount: number
  member?: { fullName?: string }
  payerName?: string
}
export interface LedgerExpenseInput {
  id: string
  fundSource?: string
  fundPeriodId?: string
  status?: string
  expenseDate: string
  description: string
  amount: number
}
export interface LedgerEntry {
  id: string
  date: string
  type: 'Thu' | 'Chi'
  desc: string
  /** Thu dương, Chi âm. */
  amount: number
  balance: number
}
export interface LedgerResult {
  rows: LedgerEntry[]
  openingBalance: number
  totalIncome: number
  totalExpense: number
  /** opening + Thu − Chi (Quỹ Chính, kỳ đang chọn). */
  closingBalance: number
}

export const isCommonFund = (fundSource?: string) => (fundSource ?? 'COMMON') === 'COMMON'
/** Khoản chi được tính vào quỹ (khớp backend). */
export const isEffectiveExpense = (status?: string) => {
  const s = status ?? 'pending'
  return s === 'approved' || s === 'paid'
}

export function buildLedgerRows(
  contribs: LedgerContribInput[],
  expenses: LedgerExpenseInput[],
  periodId: string | undefined,
  openingBalance = 0,
  periodName?: string,
): LedgerResult {
  const inPeriod = (id?: string) => !periodId || id === periodId
  const incomes = contribs
    .filter(c => c.isConfirmed && isCommonFund(c.fundSource) && inPeriod(c.fundPeriodId))
    .map(c => ({
      id: c.id,
      date: c.paymentDate,
      type: 'Thu' as const,
      desc: `${c.member?.fullName ?? c.payerName ?? 'Thành viên'} đóng quỹ${periodName ? ` ${periodName}` : ''}`,
      amount: c.amount,
    }))
  const outs = expenses
    .filter(e => isEffectiveExpense(e.status) && isCommonFund(e.fundSource) && inPeriod(e.fundPeriodId))
    .map(e => ({
      id: e.id,
      date: e.expenseDate,
      type: 'Chi' as const,
      desc: e.description,
      amount: -e.amount,
    }))
  // sort ổn định: cùng ngày thì Thu trước Chi để số dư chạy không âm giả
  const merged = [...incomes, ...outs].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.type === b.type ? 0 : a.type === 'Thu' ? -1 : 1),
  )
  let balance = openingBalance
  const rows = merged.map(r => {
    balance += r.amount
    return { ...r, balance }
  })
  const totalIncome = incomes.reduce((s, r) => s + r.amount, 0)
  const totalExpense = outs.reduce((s, r) => s - r.amount, 0)
  return { rows, openingBalance, totalIncome, totalExpense, closingBalance: openingBalance + totalIncome - totalExpense }
}

/** Nhãn trạng thái khoản chi — dùng chung cho Excel/PDF/UI (đủ 4 trạng thái). */
export const EXPENSE_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  paid: 'Đã chi',
  rejected: 'Từ chối',
}

/** Bỏ dấu '.'/',' phân cách nghìn khi đọc số tiền nhập từ Excel ("300.000" → 300000). */
export function parseMoney(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v ?? '').replace(/[^\d-]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}
