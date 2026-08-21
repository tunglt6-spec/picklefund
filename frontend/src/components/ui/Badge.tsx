import { cn } from '../../lib/utils'

type Variant = 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'gray' | 'yellow' | 'indigo'

// Token semantic (`--pf-*`) — an toàn dark mode, đồng bộ StatusBadge. Không dùng palette Tailwind cứng.
const cfg: Record<Variant, { bg: string; text: string; dot: string }> = {
  green:  { bg: '[background:var(--pf-color-success-soft)]', text: '[color:var(--pf-color-success)]', dot: '[background:var(--pf-color-success)]' },
  red:    { bg: '[background:var(--pf-color-danger-soft)]',  text: '[color:var(--pf-color-danger)]',  dot: '[background:var(--pf-color-danger)]' },
  orange: { bg: '[background:var(--pf-color-warning-soft)]', text: '[color:var(--pf-color-warning)]', dot: '[background:var(--pf-color-warning)]' },
  blue:   { bg: '[background:var(--pf-color-info-soft)]',    text: '[color:var(--pf-color-info)]',    dot: '[background:var(--pf-color-info)]' },
  purple: { bg: '[background:var(--pf-primary-soft)]', text: '[color:var(--pf-primary)]', dot: '[background:var(--pf-primary)]' },
  gray:   { bg: '[background:var(--pf-color-muted-soft)]',   text: '[color:var(--pf-color-muted)]',   dot: '[background:var(--pf-color-muted)]' },
  yellow: { bg: '[background:var(--pf-color-warning-soft)]', text: '[color:var(--pf-color-warning)]', dot: '[background:var(--pf-color-warning)]' },
  indigo: { bg: '[background:var(--pf-primary-soft)]', text: '[color:var(--pf-primary)]', dot: '[background:var(--pf-primary)]' },
}

export function Badge({
  children,
  variant = 'gray',
  dot = false,
  className,
}: {
  children: React.ReactNode
  variant?: Variant
  dot?: boolean
  className?: string
}) {
  const c = cfg[variant]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
      c.bg, c.text, className
    )}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />}
      {children}
    </span>
  )
}
