export { FundSummaryCard } from './FundSummaryCard'
export type { FundSummaryCardProps } from './FundSummaryCard'
export { FinanceKpiGrid } from './FinanceKpiGrid'
export { FinanceFormula } from './FinanceFormula'
export { FinanceStatusBadge } from './FinanceStatusBadge'
export { FinanceLegend } from './FinanceLegend'

export const FUND_COLORS = {
  chinh: { from: '#059669', to: '#0D9488' },
  phu:   { from: '#7C3AED', to: '#6D5DFB' },
  carry: { from: '#D97706', to: '#EA580C' },
  total: { from: '#2563EB', to: '#5B4BE8' },
} as const

export const FUND_LABELS = {
  chinh: 'Quỹ Chính',
  phu:   'Quỹ Phụ',
  carry: 'Số dư chuyển kỳ',
  total: 'Tổng tài sản CLB',
} as const
