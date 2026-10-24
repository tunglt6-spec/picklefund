import type { ReactNode } from 'react'

/** Nhãn nghiệp vụ cho mã nguồn quỹ (không hiện mã kỹ thuật COMMON/MINI). */
const FUND_LABEL: Record<string, string> = { COMMON: 'Quỹ Chính', MINI: 'Quỹ Phụ' }

interface MobileTransactionCardProps {
  name: string
  description: string
  amount: number
  type: 'income' | 'expense'
  fundSource?: string
  status?: string
  actions?: ReactNode
}

export function MobileTransactionCard({ name, description, amount, type, fundSource, status, actions }: MobileTransactionCardProps) {
  const isIncome = type === 'income'
  const formatted = new Intl.NumberFormat('vi-VN').format(Math.abs(amount)) + 'đ'

  return (
    <div className="pf-rowcard px-3 py-3 flex flex-wrap items-center gap-2">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
        isIncome ? '[background:var(--pf-green-soft)] [color:var(--pf-green)]' : '[background:var(--pf-color-danger-soft)] [color:var(--pf-color-danger)]'
      }`}>
        {isIncome ? '+' : '−'}
      </div>
      <div className="flex-1 basis-28 min-w-0">
        <div className="text-sm font-[600] [color:var(--pf-text)] break-words">{name}</div>
        <div className="text-xs [color:var(--pf-color-muted)] break-words">{description}{fundSource ? ` · ${FUND_LABEL[fundSource] ?? fundSource}` : ''}</div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0 max-w-[140px] min-[600px]:max-w-none">
        <span className={`text-sm font-[700] tabular-nums ${isIncome ? '[color:var(--pf-green)]' : '[color:var(--pf-text)]'}`}>
          {isIncome ? '+' : '−'}{formatted}
        </span>
        {status && (
          <span className="text-xs [color:var(--pf-color-muted)] mt-0.5 text-right leading-tight">{status}</span>
        )}
      </div>
      {actions && (
        <div className="flex flex-shrink-0 items-center gap-1 ml-0 w-full justify-end border-t border-[color:var(--pf-border)] pt-1">
          {actions}
        </div>
      )}
    </div>
  )
}
