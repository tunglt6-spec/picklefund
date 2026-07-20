/**
 * PageShell (UDP-01) — nền trang sáng + container max-width + padding responsive.
 * Dùng bọc nội dung mỗi màn hình module để đồng nhất nền/khoảng trắng.
 */
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface PageShellProps {
  children: ReactNode
  className?: string
  /**
   * max-width container. QUY ĐỊNH v2.1 (full viền): mặc định 1760 để lấp đầy khung nội dung
   * trên màn hình phổ biến (laptop/FHD) — không để khoảng trống thừa; vẫn có trần để không
   * kéo giãn vô hạn trên màn siêu rộng.
   */
  maxWidth?: number
}

export function PageShell({ children, className, maxWidth = 1760 }: PageShellProps) {
  return (
    <div
      className="min-h-full w-full"
      style={{ background: 'var(--pf-bg)' }}
    >
      <div
        className={cn('pf-center-x w-full px-4 py-4 sm:px-6 sm:py-6', className)}
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  )
}
