/**
 * MetricCard (UDP-01) — KPI card: icon badge accent, title, value lớn, trend, sub.
 * Card trắng, radius lớn, border nhẹ, shadow mềm, hover nhẹ (desktop). Số âm → cảnh báo.
 */
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { accentVars, type ModuleAccent } from './tokens'

interface MetricCardProps {
  icon?: ReactNode
  label: string
  value: ReactNode
  sub?: string
  accent?: ModuleAccent
  /** Xu hướng: số (%) hoặc text; dương = xanh, âm = đỏ. */
  trend?: { value: string; positive?: boolean }
  /** Đánh dấu giá trị âm/cảnh báo. */
  negative?: boolean
  className?: string
}

export function MetricCard({
  icon,
  label,
  value,
  sub,
  accent = 'green',
  trend,
  negative,
  className,
}: MetricCardProps) {
  const a = accentVars(accent)
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-[20px] border p-5 transition-shadow',
        '[background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)] hover:[box-shadow:var(--pf-shadow-hover)]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide leading-tight [color:var(--pf-color-muted)]">
          {label}
        </span>
        {icon && (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: a.soft, color: a.color }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p
          className="text-2xl font-bold tabular-nums leading-tight break-words"
          style={{
            letterSpacing: '-0.02em',
            color: negative ? 'var(--pf-accent-rose)' : 'var(--pf-text)',
          }}
        >
          {value}
        </p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {sub && <span className="text-xs [color:var(--pf-color-muted)]">{sub}</span>}
          {trend && (
            <span
              className="text-xs font-semibold"
              style={{
                color: trend.positive
                  ? 'var(--pf-green)'
                  : 'var(--pf-accent-rose)',
              }}
            >
              {trend.value}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
