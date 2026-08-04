/**
 * LoadingState (UDP-01 · Elite) — skeleton SHIMMER khớp layout thật (card/list/table).
 * Không chặn layout. Dùng .pf-skeleton (vệt sáng chạy) thay 'pulse' mờ dần.
 */
import { cn } from '../../lib/utils'

interface LoadingStateProps {
  /** Số skeleton rows/cards. */
  rows?: number
  variant?: 'cards' | 'list' | 'table'
  className?: string
}

/** Thanh skeleton shimmer. */
function Bar({ className }: { className?: string }) {
  return <div className={cn('pf-skeleton rounded-md', className)} />
}

export function LoadingState({
  rows = 3,
  variant = 'list',
  className,
}: LoadingStateProps) {
  const items = Array.from({ length: rows })

  // ── KPI cards (khớp MetricCard: label + icon badge + value + sub) ──
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
            className="flex flex-col gap-3 rounded-[20px] border p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)]"
          >
            <div className="flex items-center justify-between">
              <Bar className="h-3 w-20" />
              <div className="pf-skeleton h-9 w-9 rounded-xl" />
            </div>
            <Bar className="h-7 w-28" />
            <Bar className="h-3 w-24" />
          </div>
        ))}
      </div>
    )
  }

  // ── Bảng (header + hàng có avatar + 2 dòng + 2 cột số) ──
  if (variant === 'table') {
    return (
      <div
        className={cn(
          'overflow-hidden rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)]',
          className,
        )}
      >
        <div className="flex items-center gap-4 border-b px-5 py-3.5 border-[color:var(--pf-border)]">
          <Bar className="h-3 w-32" />
          <Bar className="ml-auto h-3 w-16" />
          <Bar className="h-3 w-16" />
        </div>
        {items.map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b px-5 py-4 last:border-0 border-[color:var(--pf-border-soft)]"
          >
            <div className="pf-skeleton h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bar className="h-3.5 w-40 max-w-[60%]" />
              <Bar className="h-3 w-24 max-w-[40%]" />
            </div>
            <Bar className="h-3 w-14 shrink-0" />
            <Bar className="h-3 w-16 shrink-0" />
          </div>
        ))}
      </div>
    )
  }

  // ── List (mặc định): hàng có avatar tròn + 2 dòng ──
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {items.map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 [background:var(--pf-surface)] border-[color:var(--pf-border)]"
        >
          <div className="pf-skeleton h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bar className="h-3.5 w-1/3" />
            <Bar className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
