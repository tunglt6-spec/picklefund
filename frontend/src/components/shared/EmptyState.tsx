/**
 * EmptyState (UDP-01) — trạng thái rỗng: icon mềm, tiêu đề, mô tả, action tuỳ chọn.
 */
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-center',
        className,
      )}
    >
      {icon && (
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'var(--pf-green-soft)', color: 'var(--pf-green)' }}
        >
          {icon}
        </div>
      )}
      <div>
        <p className="text-base font-semibold [color:var(--pf-text)]">{title}</p>
        {description && (
          <p className="mt-1 text-sm [color:var(--pf-color-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
