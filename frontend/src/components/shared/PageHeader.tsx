/**
 * PageHeader (UDP-01) — tiêu đề màn hình + mô tả ngắn + slot phụ (weather/next match)
 * + chuông thông báo + primary action. Responsive: action xuống dòng trên mobile.
 */
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Slot card phụ bên phải (vd weather, next match) — ẩn trên mobile hẹp nếu cần. */
  aside?: ReactNode
  /** Primary action (vd ActionButton) + chuông. */
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  aside,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1
          className="text-xl font-bold sm:text-2xl [color:var(--pf-text)]"
          style={{ letterSpacing: '-0.02em' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm [color:var(--pf-color-muted)]">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {aside && <div className="hidden sm:flex items-center gap-2">{aside}</div>}
        {actions}
      </div>
    </header>
  )
}
