/**
 * Badge — pill trạng thái theo `variant` (API cũ, 11 màn đang dùng). Nay là WRAPPER mỏng
 * bọc shared StatusBadge (một nguồn màu semantic --pf-color-*). variant → tone map 1-1,
 * MÀU GIỮ Y HỆT (green→success, red→danger, orange/yellow→warning, blue→info,
 * purple/indigo→ai(=primary #6D5DFB), gray→neutral). Zero render change.
 */
import type { ReactNode } from 'react'
import { StatusBadge, type StatusTone } from '../shared/StatusBadge'

type Variant = 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'gray' | 'yellow' | 'indigo'

const VARIANT_TONE: Record<Variant, StatusTone> = {
  green: 'success',
  red: 'danger',
  orange: 'warning',
  yellow: 'warning',
  blue: 'info',
  purple: 'ai',
  indigo: 'ai',
  gray: 'neutral',
}

export function Badge({
  children,
  variant = 'gray',
  dot = false,
  className,
}: {
  children: ReactNode
  variant?: Variant
  dot?: boolean
  className?: string
}) {
  return (
    <StatusBadge tone={VARIANT_TONE[variant]} dot={dot} className={className}>
      {children}
    </StatusBadge>
  )
}
