/**
 * ActionButton (UDP-01) — primary action: solid green, rounded-full, icon, shadow nhẹ.
 * Màu qua Design Token (--pf-*). Variants: primary · secondary · ghost.
 *
 * Accessibility: nút icon-only BẮT BUỘC có accessible name.
 *  - iconOnly=true → phải truyền ariaLabel (hoặc aria-label). Thiếu → dev console.warn.
 *  - aria-label được set từ ariaLabel để đảm bảo accessible name.
 */
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode
  variant?: Variant
  fullWidth?: boolean
  /** Nút chỉ có icon (không label text) — bắt buộc kèm ariaLabel. */
  iconOnly?: boolean
  /** Accessible name (đặt vào aria-label). Bắt buộc khi iconOnly. */
  ariaLabel?: string
}

const VARIANT_STYLE: Record<Variant, CSSProperties> = {
  primary: { background: 'var(--pf-green)', color: 'var(--pf-text-on-primary)' },
  secondary: {
    background: 'var(--pf-surface)',
    color: 'var(--pf-text)',
    border: '1px solid var(--pf-border)',
  },
  ghost: { background: 'transparent', color: 'var(--pf-color-muted)' },
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'shadow-sm hover:shadow-md active:scale-[0.98] hover:[background:var(--pf-green-hover)]',
  secondary: 'hover:[background:var(--pf-color-muted-soft)]',
  ghost: 'hover:[background:var(--pf-color-muted-soft)]',
}

export function ActionButton({
  icon,
  variant = 'primary',
  fullWidth,
  iconOnly,
  ariaLabel,
  className,
  children,
  'aria-label': ariaLabelAttr,
  ...rest
}: ActionButtonProps) {
  const accessibleName = ariaLabel ?? ariaLabelAttr

  // Dev guard: icon-only phải có accessible name (không làm gãy build/prod).
  if (
    iconOnly &&
    !accessibleName &&
    typeof import.meta !== 'undefined' &&
    import.meta.env?.DEV
  ) {
    console.warn(
      '[ActionButton] iconOnly=true nhưng thiếu ariaLabel — nút icon-only phải có accessible name.',
    )
  }

  return (
    <button
      aria-label={accessibleName}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none',
        iconOnly ? 'h-10 w-10 p-0' : 'px-4 py-2',
        VARIANT_CLASS[variant],
        fullWidth && 'w-full',
        className,
      )}
      style={VARIANT_STYLE[variant]}
      {...rest}
    >
      {icon}
      {!iconOnly && children}
    </button>
  )
}
