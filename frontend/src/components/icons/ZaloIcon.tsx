import { forwardRef } from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import { GlassLineIcon } from './GlassLineIcon'

/** Same open silhouette, stroke weight and translucent planes as the app icon family. */
export const ZaloIcon: LucideIcon = forwardRef<SVGSVGElement, LucideProps>(function ZaloIcon({ size = 24, ...props }, ref) {
  return <GlassLineIcon {...props} ref={ref} name="zalo" size={size} colorMode="palette" aria-hidden="true" />
})
