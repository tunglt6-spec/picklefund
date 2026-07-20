/**
 * ResponsiveTabs (UDP-01) — tabs cuộn ngang trên mobile, active pill green.
 */
import { cn } from '../../lib/utils'

export interface TabItem {
  key: string
  label: string
  badge?: number
}

interface ResponsiveTabsProps {
  tabs: TabItem[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export function ResponsiveTabs({
  tabs,
  active,
  onChange,
  className,
}: ResponsiveTabsProps) {
  return (
    <div
      className={cn(
        // Mẫu v2.1 — tab gạch chân, chữ to rõ; active primary + gạch chân primary.
        'flex gap-1 overflow-x-auto no-scrollbar border-b [border-color:var(--pf-border)]',
        className,
      )}
    >
      {tabs.map((t) => {
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              'relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors',
              isActive
                ? '[color:var(--pf-primary)]'
                : '[color:var(--pf-color-muted)] hover:[color:var(--pf-text)]',
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {t.label}
              {typeof t.badge === 'number' && t.badge > 0 && (
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {t.badge}
                </span>
              )}
            </span>
            {isActive && (
              <span
                className="absolute inset-x-3 -bottom-px h-0.5 rounded-full"
                style={{ background: 'var(--pf-primary)' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
