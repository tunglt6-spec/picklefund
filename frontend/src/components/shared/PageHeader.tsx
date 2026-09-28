/**
 * PageHeader (UDP-01) — tiêu đề màn hình + mô tả ngắn + slot phụ (weather/next match)
 * + chuông thông báo + primary action. Responsive: action xuống dòng trên mobile.
 *
 * variant:
 *  - 'inline' (mặc định): khối tiêu đề inline (chữ lớn, không chrome) — chuẩn hiện đại,
 *    nằm trong padding nội dung trang.
 *  - 'bar': app-bar edge-to-edge (nền surface + viền dưới + px-6) — GIỮ tương thích 17 màn
 *    cũ từng dùng layout/PageHeader (nay là shim gọi variant="bar"). KHÔNG đổi render.
 */
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { useEmbedded } from './ModuleTabs'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Slot card phụ bên phải (vd weather, next match) — ẩn trên mobile hẹp nếu cần. */
  aside?: ReactNode
  /** Primary action (vd ActionButton) + chuông. */
  actions?: ReactNode
  className?: string
  /** Kiểu hiển thị: 'inline' (mặc định) hoặc 'bar' (app-bar viền dưới, tương thích cũ). */
  variant?: 'inline' | 'bar'
}

export function PageHeader({
  title,
  subtitle,
  aside,
  actions,
  className,
  variant = 'inline',
}: PageHeaderProps) {
  const embedded = useEmbedded()

  // ── Variant 'bar' — app-bar edge-to-edge (khớp layout/PageHeader cũ, zero render change) ──
  if (variant === 'bar') {
    if (embedded) {
      if (!subtitle && !actions && !aside) return null
      return (
        <div className={cn('[background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-6 py-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between', className)}>
          {subtitle ? <p className="text-xs [color:var(--pf-color-muted)] min-w-0 truncate">{subtitle}</p> : <span />}
          {(aside || actions) && (
            <div className="flex items-center gap-2 flex-wrap lg:justify-end">
              {aside && <div className="hidden sm:flex items-center gap-2">{aside}</div>}
              {actions}
            </div>
          )}
        </div>
      )
    }
    return (
      <div className={cn('[background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-6 py-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between', className)}>
        <div className="min-w-0">
          <h1 className="text-base font-bold [color:var(--pf-text)]">{title}</h1>
          {subtitle && <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">{subtitle}</p>}
        </div>
        {(aside || actions) && (
          <div className="flex items-center gap-2 flex-wrap lg:justify-end">
            {aside && <div className="hidden sm:flex items-center gap-2">{aside}</div>}
            {actions}
          </div>
        )}
      </div>
    )
  }

  // ── Variant 'inline' (mặc định) — tiêu đề hiện đại, chữ lớn, không chrome ──
  // Trong module (embedded): module + tab đã định danh → BỎ h1 trùng, GIỮ phụ đề + actions.
  if (embedded) {
    if (!subtitle && !actions && !aside) return null
    return (
      <header
        className={cn(
          'mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between',
          className,
        )}
      >
        {subtitle ? (
          <p className="text-sm [color:var(--pf-color-muted)]">{subtitle}</p>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2 flex-wrap lg:justify-end">
          {aside && <div className="hidden sm:flex items-center gap-2">{aside}</div>}
          {actions}
        </div>
      </header>
    )
  }

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
