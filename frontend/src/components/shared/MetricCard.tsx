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
// Theme-aware: tint accent lên nền TOKEN (color-mix) → tự tối ở dark; chữ blend --pf-text để đọc rõ.
const mkTone = (bar: string, fg?: string) => ({
  bg: `linear-gradient(color-mix(in srgb, ${bar} 10%, transparent), color-mix(in srgb, ${bar} 10%, transparent)), var(--pf-glass-bg)`,
  border: `color-mix(in srgb, ${bar} 30%, var(--pf-surface))`,
  bar,
  fg: fg ?? `color-mix(in srgb, ${bar} 65%, var(--pf-text))`,
})
const TONE_PALETTE: Record<MetricTone, { bg: string; border: string; bar: string; fg: string }> = {
  success: mkTone('#059669'),
  warning: mkTone('#D97706'),
  danger: mkTone('#EF4444'),
  info: mkTone('#2563EB'),
  brand: mkTone('#6D5DFB'),
  neutral: mkTone('var(--pf-color-muted)', 'var(--pf-color-muted)'),
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
  /** Thu gọn (mobile 3 cột): ẩn icon, padding nhỏ, số vừa. */
  compact?: boolean
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
  compact,
}: MetricCardProps) {
  const a = accentVars(accent)
  const t = tone ? TONE_PALETTE[tone] : null
  return (
    <div
      className={cn(
        'pf-stat-card',
        'flex flex-col gap-3 rounded-[20px] p-5 pf-hover-lift',
        compact && 'max-sm:gap-1.5 max-sm:p-3',
        className,
      )}
      data-hi={tone === 'brand' ? '' : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide leading-tight [color:var(--pf-color-muted)]">
          {label}
        </span>
        {icon && (
          <span
            className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', compact && 'max-sm:hidden')}
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
