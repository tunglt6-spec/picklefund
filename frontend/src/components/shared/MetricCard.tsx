/**
 * MetricCard (UDP-01) — KPI card: icon badge accent, title, value lớn, trend, sub.
 * Card trắng, radius lớn, border nhẹ, shadow mềm, hover nhẹ (desktop). Số âm → cảnh báo.
 */
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { accentVars, type ModuleAccent } from './tokens'

/**
 * Tông màu KPI theo NGUYÊN TẮC dùng chung (SaaS): nền tint nhạt + viền trên 3px + số/icon
 * theo màu. Màn hình quyết định tone theo GIÁ TRỊ (value-based): ô lỗi/cảnh báo = 0 → success
 * (xanh), > 0 → danger/warning. Chỉ áp khi prop `tone` được truyền (opt-in) — usage cũ không
 * truyền `tone` giữ nguyên giao diện.
 */
export type MetricTone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral'
const TONE_PALETTE: Record<MetricTone, { bg: string; border: string; bar: string; fg: string }> = {
  success: { bg: '#ECFDF5', border: '#D1FAE5', bar: '#059669', fg: '#059669' },
  warning: { bg: '#FFFBEB', border: '#FEF3C7', bar: '#D97706', fg: '#D97706' },
  danger: { bg: '#FEF2F2', border: '#FEE2E2', bar: '#EF4444', fg: '#EF4444' },
  info: { bg: '#EFF6FF', border: '#DBEAFE', bar: '#2563EB', fg: '#2563EB' },
  brand: { bg: '#F5F3FF', border: '#EDE9FE', bar: '#6D5DFB', fg: '#6D5DFB' },
  neutral: { bg: '#F8FAFC', border: '#E2E8F0', bar: '#94A3B8', fg: '#64748B' },
}

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
  /** Tông màu value-based (opt-in): nền tint + viền trên + số/icon theo màu. */
  tone?: MetricTone
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
  tone,
  className,
}: MetricCardProps) {
  const a = accentVars(accent)
  const t = tone ? TONE_PALETTE[tone] : null
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-[20px] border p-5 transition-shadow',
        '[background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)] hover:[box-shadow:var(--pf-shadow-hover)]',
        className,
      )}
      style={t ? { background: t.bg, borderColor: t.border, borderTop: `3px solid ${t.bar}` } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide leading-tight [color:var(--pf-color-muted)]">
          {label}
        </span>
        {icon && (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={t ? { background: t.border, color: t.fg } : { background: a.soft, color: a.color }}
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
            color: t ? t.fg : negative ? 'var(--pf-accent-rose)' : 'var(--pf-text)',
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
