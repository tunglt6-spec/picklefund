import { forwardRef, useId, type SVGProps } from 'react'
import type { PlayfulIconName } from './playfulGlyphs'
import { glassLineMarkup } from './glassLineIcons'

type Props = Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> & {
  name: PlayfulIconName
  size?: number | string
  theme?: 'light' | 'dark'
  colorMode?: 'palette' | 'inherit'
}
/** Function tiles use the reviewed palette; controls inherit their accessible foreground color. */
export const GlassLineIcon = forwardRef<SVGSVGElement, Props>(function GlassLineIcon({ name, size = 40, theme = 'light', colorMode = 'palette', ...props }, ref) {
  const id = useId()
  return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={size} height={size}
    viewBox="-2 -2 36 36" fill="none" aria-hidden={props['aria-label'] ? undefined : true}
    data-pf-icon={name} data-pf-material="glass-line" {...props}
    dangerouslySetInnerHTML={{ __html: glassLineMarkup(name, id, theme === 'dark', colorMode === 'inherit') }} />
})
