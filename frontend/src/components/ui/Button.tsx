import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  // V2.2 brand primary — tím (token, không hard-code màu).
  primary:   'text-white shadow-sm [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] active:[background:var(--pf-primary-hover)]',
  secondary: '[background:var(--pf-color-muted-soft)] [color:var(--pf-text)] hover:bg-slate-200 active:bg-slate-300',
  danger:    'bg-red-500 text-white hover:bg-red-500 shadow-sm active:bg-red-500',
  ghost:     '[color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)] active:bg-slate-200',
  outline:   'border border-slate-300 [background:var(--pf-surface)] [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)] hover:border-slate-400 active:[background:var(--pf-color-muted-soft)]',
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
