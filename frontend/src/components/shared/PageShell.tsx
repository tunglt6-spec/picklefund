/**
 * PageShell (UDP-01) — nền trang sáng + container max-width + padding responsive.
 * Dùng bọc nội dung mỗi màn hình module để đồng nhất nền/khoảng trắng.
 */
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface PageShellProps {
  children: ReactNode
  className?: string
  /** max-width container (mặc định 1440 cho commercial layout). */
  maxWidth?: number
}

export function PageShell({ children, className, maxWidth = 1440 }: PageShellProps) {
  return (
    <div
      className="min-h-full w-full"
      style={{ background: 'var(--pf-bg)' }}
    >
      <div
        className={cn('mx-auto w-full px-4 py-4 sm:px-6 sm:py-6', className)}
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  )
}
