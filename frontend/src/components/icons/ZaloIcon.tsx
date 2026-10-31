import { forwardRef } from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react'

/** Own vector mark: blue conversation bubble stays legible on the light mobile surface. */
export const ZaloIcon: LucideIcon = forwardRef<SVGSVGElement, LucideProps>(function ZaloIcon({ size = 24, children, ...props }, ref) {
  return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
    <rect x="3" y="3" width="42" height="42" rx="13" fill="#0068FF" />
    <path d="M13 13h22v17H23l-8 6v-6h-2z" fill="white" />
    <path d="M18 18h12l-12 8h12" stroke="#0068FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {children}
  </svg>
})
