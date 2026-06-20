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
    <div className="bg-white rounded-[16px] border border-slate-100 px-3 py-3 flex items-center gap-2 shadow-sm">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
        isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
      }`}>
        {isIncome ? '+' : '−'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-[600] text-slate-900 truncate">{name}</div>
        <div className="text-[12px] text-slate-400 truncate">{description}{fundSource ? ` · ${fundSource}` : ''}</div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0 max-w-[100px]">
        <span className={`text-[14px] font-[700] tabular-nums ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
          {isIncome ? '+' : '−'}{formatted}
        </span>
        {status && (
          <span className="text-[11px] text-slate-400 mt-0.5 text-right leading-tight">{status}</span>
        )}
      </div>
      {actions && (
        <div className="flex flex-shrink-0 items-center gap-0.5 ml-1 border-l border-slate-100 pl-2">
          {actions}
        </div>
      )}
    </div>
  )
}
