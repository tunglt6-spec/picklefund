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
        'flex gap-1 overflow-x-auto no-scrollbar border-b border-[color:var(--pf-border)]',
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
              'relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? '[color:var(--pf-green)]'
                : '[color:var(--pf-color-muted)] hover:[color:var(--pf-text)]',
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {t.label}
              {typeof t.badge === 'number' && t.badge > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]">
                  {t.badge}
                </span>
              )}
            </span>
            {isActive && (
              <span
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                style={{ background: 'var(--pf-green)' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
