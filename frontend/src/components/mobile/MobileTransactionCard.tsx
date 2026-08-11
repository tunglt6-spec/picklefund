import type { ReactNode } from 'react'

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
    <div className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] px-3 py-3 flex items-center gap-2 shadow-sm">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
        isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
      }`}>
        {isIncome ? '+' : '−'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-[600] [color:var(--pf-text)] truncate">{name}</div>
        <div className="text-[12px] [color:var(--pf-color-muted)] truncate">{description}{fundSource ? ` · ${fundSource}` : ''}</div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0 max-w-[100px]">
        <span className={`text-[14px] font-[700] tabular-nums ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
          {isIncome ? '+' : '−'}{formatted}
        </span>
        {status && (
          <span className="text-[11px] [color:var(--pf-color-muted)] mt-0.5 text-right leading-tight">{status}</span>
        )}
      </div>
      {actions && (
        <div className="flex flex-shrink-0 items-center gap-1 ml-1 border-l border-[color:var(--pf-border)] pl-2">
          {actions}
        </div>
      )}
    </div>
  )
}
