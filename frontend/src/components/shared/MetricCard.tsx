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
  success: mkTone('var(--pf-tone-success)'),
  warning: mkTone('var(--pf-tone-warning)'),
  danger: mkTone('var(--pf-tone-danger)'),
  info: mkTone('var(--pf-tone-info)'),
  brand: mkTone('var(--pf-tone-brand)'),
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
        'pf-stat-card @container',
        'flex flex-col gap-2 rounded-[20px] p-4 sm:gap-3 sm:p-5 pf-hover-lift',
        compact && 'max-sm:gap-1.5 max-sm:p-3',
        className,
      )}
      data-brand={tone === 'brand' ? '' : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="pf-metric-label text-xs font-semibold uppercase tracking-wide leading-tight [color:var(--pf-color-muted)]">
          {label}
        </span>
        {icon && (
          <span
            className={cn('pf-metric-icon hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl @[10rem]:flex sm:h-9 sm:w-9', compact && 'max-sm:hidden')}
            style={(t ? { '--chip-bg': t.border, '--chip-fg': t.fg } : { '--chip-bg': a.soft, '--chip-fg': a.color }) as React.CSSProperties}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="pf-metric-body min-w-0">
        <p
          className="text-[clamp(0.9rem,9.5cqw,1.5rem)] font-bold tabular-nums leading-tight whitespace-nowrap"
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
