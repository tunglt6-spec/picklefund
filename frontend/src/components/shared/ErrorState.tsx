/**
 * ErrorState (UDP-01) — trạng thái lỗi: icon cảnh báo (đỏ), tiêu đề, mô tả, nút Thử lại.
 * Dùng cho màn/khu vực tải dữ liệu thất bại. Token-based (V2.2 Clean Modern SaaS).
 */
import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface ErrorStateProps {
  /** Tiêu đề ngắn (mặc định "Đã xảy ra lỗi"). */
  title?: string
  /** Mô tả thân thiện (không lộ chi tiết kỹ thuật/secret). */
  description?: string
  /** Callback khi bấm "Thử lại" — nếu có sẽ hiện nút. */
  onRetry?: () => void
  /** Nhãn nút thử lại. */
  retryLabel?: string
  /** Icon tuỳ biến (mặc định AlertTriangle). */
  icon?: ReactNode
  className?: string
}

export function ErrorState({
  title = 'Đã xảy ra lỗi',
  description = 'Không tải được dữ liệu. Vui lòng thử lại.',
  onRetry,
  retryLabel = 'Thử lại',
  icon,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-center',
        className,
      )}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background: 'var(--pf-color-danger-soft)',
          color: 'var(--pf-color-danger)',
        }}
      >
        {icon ?? <AlertTriangle size={24} />}
      </div>
      <div>
        <p className="text-base font-semibold [color:var(--pf-text)]">{title}</p>
        {description && (
          <p className="mt-1 text-sm [color:var(--pf-color-muted)]">{description}</p>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
          style={{ background: 'var(--pf-primary)', color: 'var(--pf-primary-on)' }}
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
