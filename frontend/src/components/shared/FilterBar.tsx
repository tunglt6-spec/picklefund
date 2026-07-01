/**
 * FilterBar (UDP-01) — search + slot filters + view toggle.
 * Desktop: hàng ngang. Mobile: search full width + nút "Bộ lọc" mở drawer (slot filtersMobile).
 */
import type { ReactNode } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils'

interface FilterBarProps {
  searchValue?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  /** Filters hiển thị ngang trên desktop. */
  filters?: ReactNode
  /** View toggle (grid/list) hoặc actions phải. */
  trailing?: ReactNode
  /** Mở filter drawer trên mobile. */
  onOpenFilters?: () => void
  className?: string
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm…',
  filters,
  trailing,
  onOpenFilters,
  className,
}: FilterBarProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex-1 min-w-0">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]"
        />
        <input
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-full border pl-9 pr-3 text-sm [background:var(--pf-surface)] [color:var(--pf-text)] placeholder:[color:var(--pf-color-muted)] border-[color:var(--pf-border)] focus:outline-none focus:[box-shadow:0_0_0_3px_var(--pf-focus-ring)] focus:[border-color:var(--pf-green)]"
        />
      </div>

      {/* Desktop filters */}
      {filters && <div className="hidden md:flex items-center gap-2">{filters}</div>}

      {/* Mobile: nút mở filter drawer */}
      {onOpenFilters && (
        <button
          onClick={onOpenFilters}
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-full border [background:var(--pf-surface)] [color:var(--pf-color-muted)] border-[color:var(--pf-border)]"
          aria-label="Bộ lọc"
        >
          <SlidersHorizontal size={16} />
        </button>
      )}

      {trailing}
    </div>
  )
}
