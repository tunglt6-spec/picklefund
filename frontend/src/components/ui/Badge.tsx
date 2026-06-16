import { cn } from '../../lib/utils'

type Variant = 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'gray' | 'yellow' | 'indigo'

const cfg: Record<Variant, { bg: string; text: string; dot: string }> = {
  green:  { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  red:    { bg: 'bg-red-50',      text: 'text-red-600',     dot: 'bg-red-500' },
  orange: { bg: 'bg-orange-50',   text: 'text-orange-700',  dot: 'bg-orange-500' },
  blue:   { bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500' },
  purple: { bg: 'bg-purple-50',   text: 'text-purple-700',  dot: 'bg-purple-500' },
  gray:   { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400' },
  yellow: { bg: 'bg-yellow-50',   text: 'text-yellow-700',  dot: 'bg-yellow-500' },
  indigo: { bg: 'bg-indigo-50',   text: 'text-indigo-700',  dot: 'bg-indigo-500' },
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
