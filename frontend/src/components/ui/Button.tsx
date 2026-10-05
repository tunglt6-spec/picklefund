import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
type Size = 'sm' | 'md' | 'lg'

// Token-only + phản hồi hover/active THẬT (dark-safe): dùng brightness cho nền màu/đặc,
// token cho nền trong suốt. KHÔNG hard-code slate/red (tránh lệch + rò dark mode).
const variantClasses: Record<Variant, string> = {
  primary:   'text-white shadow-sm [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] active:brightness-95',
  secondary: '[background:var(--pf-color-muted-soft)] [color:var(--pf-text)] hover:brightness-95 active:brightness-90',
  danger:    'text-white shadow-sm [background:var(--pf-color-danger)] hover:brightness-95 active:brightness-90',
  ghost:     '[color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)] active:[background:var(--pf-border-soft)]',
  outline:   'border border-[color:var(--pf-border)] [background:var(--pf-glass-bg-strong)] [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)] hover:border-[color:var(--pf-text-muted)] active:brightness-95',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-sm gap-2',
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ variant = 'primary', size = 'md', className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-primary)] focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:pointer-events-none select-none',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})
