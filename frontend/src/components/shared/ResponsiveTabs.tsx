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
        // Chuẩn v2.1 — tab dạng NÚT TO như sidebar: active nền tím gradient + chữ trắng.
        'flex flex-wrap gap-2',
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
              'whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200',
              isActive
                ? 'border-transparent text-white [box-shadow:0_8px_18px_-8px_rgba(109,93,251,0.6)]'
                : '[border-color:var(--pf-border)] [background:var(--pf-surface)] [color:var(--pf-color-muted)] hover:-translate-y-px hover:[color:var(--pf-primary)] hover:[border-color:var(--pf-primary-soft)] hover:[background:var(--pf-primary-soft)]',
            )}
            style={isActive ? { background: 'linear-gradient(135deg,#6D5DFB,#5B4BE8)' } : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              {t.label}
              {typeof t.badge === 'number' && t.badge > 0 && (
                <span className={cn(
                  'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
                  isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white',
                )}>
                  {t.badge}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
