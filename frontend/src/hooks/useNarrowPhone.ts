import { useEffect, useState } from 'react'

/** Match the phone toolbar CSS, including fractional widths near the Fold breakpoint. */
export function useNarrowPhone() {
  const query = '(max-width: 599.98px)'
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setPhone(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return phone
}
