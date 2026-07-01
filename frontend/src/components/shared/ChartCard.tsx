/**
 * ChartCard (UDP-01) — khung card cho biểu đồ/nội dung: title + subtitle + actions + body.
 */
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface ChartCardProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function ChartCard({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
}: ChartCardProps) {
  return (
    <section
      className={cn(
        'rounded-[20px] border p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]',
        className,
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="text-sm font-semibold [color:var(--pf-text)]"
            style={{ letterSpacing: '-0.01em' }}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs [color:var(--pf-color-muted)]">{subtitle}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      <div className={cn('min-w-0', bodyClassName)}>{children}</div>
    </section>
  )
}
