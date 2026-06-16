import { TrendingUp, TrendingDown } from 'lucide-react'
import { type ReactNode } from 'react'
import { cn, formatVND } from '../../lib/utils'

interface KpiCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  color?: 'indigo' | 'green' | 'red' | 'orange' | 'purple' | 'cyan' | 'yellow' | 'slate' | 'blue' | 'gray'
  isCurrency?: boolean
  trend?: number
  trendLabel?: string
  alert?: boolean
  badge?: string
  subtitle?: string
}

const iconBgMap: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  green:  'bg-emerald-50 text-emerald-600',
  red:    'bg-red-50 text-red-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-purple-50 text-purple-600',
  cyan:   'bg-cyan-50 text-cyan-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  slate:  'bg-slate-100 text-slate-600',
  blue:   'bg-blue-50 text-blue-600',
  gray:   'bg-gray-100 text-gray-600',
}

export function KpiCard({
  title, value, icon, color = 'indigo', isCurrency, trend, trendLabel,
  alert, badge, subtitle,
}: KpiCardProps) {
  const displayValue = isCurrency && typeof value === 'number' ? formatVND(value) : value
  const trendUp = (trend ?? 0) >= 0

  return (
    <div className={cn(
      'bg-white rounded-xl border border-slate-100 p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow',
      alert && 'border-red-200 ring-1 ring-red-100'
    )}>
      <div className="flex items-start justify-between mb-3">
        {icon ? (
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', iconBgMap[color])}>
            {icon}
          </div>
        ) : <div />}

        {trend !== undefined ? (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-xs font-semibold rounded-full px-1.5 py-0.5',
            trendUp ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'
          )}>
            {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </span>
        ) : badge ? (
          <span className="text-xs font-medium text-orange-600 bg-orange-50 rounded-full px-2 py-0.5">{badge}</span>
        ) : null}
      </div>

      <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{displayValue}</p>
      <p className="text-xs font-medium text-slate-500 mt-1.5 uppercase tracking-wide">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      {trendLabel && <p className="text-xs text-slate-400 mt-0.5">{trendLabel}</p>}
    </div>
  )
}
