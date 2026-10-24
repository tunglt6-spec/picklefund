import { forwardRef, type SVGProps } from 'react'
import { playfulGlyphs, type PlayfulIconName } from './playfulGlyphs'

type Props = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: PlayfulIconName
  size?: number | string
  strokeWidth?: number | string
  absoluteStrokeWidth?: boolean
  variant?: 'mono' | 'duotone' | 'on-color'
}

/** Original, local vector artwork. Markup comes exclusively from the static glyph registry. */
export const PlayfulIcon = forwardRef<SVGSVGElement, Props>(function PlayfulIcon({
  name, size = 24, variant = 'mono', strokeWidth = 1.8,
  absoluteStrokeWidth = false, children, ...props
}, ref) {
  const glyph = playfulGlyphs[name]
  const primary = variant === 'duotone' ? glyph.color : 'currentColor'
  const soft = variant === 'mono' ? 'none' : variant === 'on-color' ? '#FFFFFF' : glyph.soft
  // SVG opacity attributes work in browsers, PDF renderers and the exported asset pack.
  let body: string = glyph.body.replaceAll('{p}', primary).replaceAll('{s}', soft).replaceAll('{a}', soft)
  if (variant === 'on-color') {
    body = body.replaceAll('fill="#FFFFFF"', 'fill="#FFFFFF" fill-opacity="0.20"')
  }
  const width = absoluteStrokeWidth && Number(size) > 0
    ? Number(strokeWidth) * 32 / Number(size)
    : strokeWidth
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 32 32" fill="none" stroke={primary} strokeWidth={width}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      data-pf-icon={name} {...props}>
      <g dangerouslySetInnerHTML={{ __html: body }} />
      {children}
    </svg>
  )
})
