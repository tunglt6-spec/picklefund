/**
 * LoadingState (UDP-01) — skeleton mềm cho card/table. Không chặn layout.
 */
import { cn } from '../../lib/utils'

interface LoadingStateProps {
  /** Số skeleton rows/cards. */
  rows?: number
  variant?: 'cards' | 'list'
  className?: string
}

export function LoadingState({
  rows = 3,
  variant = 'list',
  className,
}: LoadingStateProps) {
  const items = Array.from({ length: rows })
  if (variant === 'cards') {
    return (
      <div
        className={cn(
          'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
          className,
        )}
      >
        {items.map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] animate-pulse"
          />
        ))}
      </div>
    )
  }
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {items.map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-2xl border [background:var(--pf-surface)] border-[color:var(--pf-border)] animate-pulse"
        />
      ))}
    </div>
  )
}
