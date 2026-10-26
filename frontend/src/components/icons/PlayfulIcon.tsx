import { forwardRef, useContext, useId, type SVGProps } from 'react'
import { playfulGlyphs, type PlayfulIconName } from './playfulGlyphs'
import { glassGlyphs } from './glassGlyphs'
import { GlassLineIcon } from './GlassLineIcon'
import { MobileIconContext, MobileIconThemeContext } from './MobileIconContext'

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
  const id = useId().replaceAll(':', '')
  const mobile = useContext(MobileIconContext)
  const theme = useContext(MobileIconThemeContext)
  if (mobile) return <GlassLineIcon ref={ref} {...props} name={name} size={size} theme={theme} colorMode={variant === 'mono' ? 'inherit' : 'palette'} />
  const solid = variant === 'on-color'
  const primary = variant === 'duotone' ? glyph.color : 'currentColor'
  const soft = variant === 'mono' ? 'none' : variant === 'on-color' ? '#FFFFFF' : glyph.soft
  // SVG opacity attributes work in browsers, PDF renderers and the exported asset pack.
  let body: string = glyph.body.replaceAll('{p}', primary).replaceAll('{s}', soft).replaceAll('{a}', soft)
  if (solid) {
    body = glassGlyphs[name]
      .replaceAll('{white}', `url(#${id}-white)`)
      .replaceAll('{accent}', `url(#${id}-accent)`)
      .replaceAll('{ink}', 'var(--pf-glyph-ink, #2373CB)')
  }
  const width = absoluteStrokeWidth && Number(size) > 0
    ? Number(strokeWidth) * 32 / Number(size)
    : strokeWidth
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 32 32" fill="none" stroke={primary} strokeWidth={width}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      data-pf-icon={name} data-pf-material={solid ? 'glass' : undefined} {...props}>
      {solid && <defs>
        <linearGradient id={`${id}-white`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FFFFFF" /><stop offset="1" stopColor="#DBF1FF" />
        </linearGradient>
        <linearGradient id={`${id}-accent`} x1="0" y1="0" x2="0.4" y2="1">
          <stop stopColor="#D6FFBE" /><stop offset="1" stopColor="#7DECB2" />
        </linearGradient>
      </defs>}
      <g dangerouslySetInnerHTML={{ __html: body }} />
      {children}
    </svg>
  )
})
