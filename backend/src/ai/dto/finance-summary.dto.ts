/**
 * FinanceSummaryDTO — the READ-ONLY shape the AI layer consumes.
 *
 * IMPORTANT (Finance Isolation, Sprint 1.1):
 * The AI layer MUST NOT compute any financial figure. Every value here is
 * produced by the Finance Engine RC1 (FundPeriodsService.summary →
 * FinancialCalculatorService.calculate), which is the single source of truth.
 * This DTO only mirrors that engine output so the AI can read and explain it.
 */
export interface FinanceSummaryDTO {
  fundPeriodId: string;
  /** = Finance Engine commonFund.totalIncome (confirmed COMMON contributions) */
  totalIncome: number;
  /** = Finance Engine commonFund.totalExpense */
  totalExpenses: number;
  /** = Finance Engine commonFund.balance (income − expense) */
  balance: number;
  courtExpenses: number;
  livingExpenses: number;
  totalAttendance: number;
  costPerAttendance: number;
  miniIncome: number;
  miniExpense: number;
  miniBalance: number;
  /** Carry-forward from previous closed/finalized period (engine-derived) */
  carryForward: unknown;
  /** Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ (engine-derived) */
  clubAssets: unknown;
  unpaidCount: number;
  negativeBalanceCount: number;
  lowAttendanceCount: number;
  /** Per-member breakdown straight from the Finance Engine */
  members: unknown[];
}
