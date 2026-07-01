/**
 * StatusBadge (UDP-01) — pill trạng thái mềm. Màu semantic map qua Design Token
 * (--pf-color-*), KHÔNG hard-code màu.
 */
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export type StatusTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'ai'
  | 'neutral'

/** tone → (color var, soft-bg var). */
const TONE_VAR: Record<StatusTone, { color: string; soft: string }> = {
  success: { color: 'var(--pf-color-success)', soft: 'var(--pf-color-success-soft)' },
  warning: { color: 'var(--pf-color-warning)', soft: 'var(--pf-color-warning-soft)' },
  danger: { color: 'var(--pf-color-danger)', soft: 'var(--pf-color-danger-soft)' },
  info: { color: 'var(--pf-color-info)', soft: 'var(--pf-color-info-soft)' },
  ai: { color: 'var(--pf-color-ai)', soft: 'var(--pf-color-ai-soft)' },
  neutral: { color: 'var(--pf-color-muted)', soft: 'var(--pf-color-muted-soft)' },
}

interface StatusBadgeProps {
  tone?: StatusTone
  children: ReactNode
  className?: string
  dot?: boolean
}

export function StatusBadge({
  tone = 'neutral',
  children,
  className,
  dot,
}: StatusBadgeProps) {
  const t = TONE_VAR[tone]
  const style: CSSProperties = { background: t.soft, color: t.color }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
      style={style}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
