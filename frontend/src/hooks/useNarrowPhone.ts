import { useEffect, useState } from 'react'

/** Mobile toolbars cover phones and unfolded Fold; record grids keep their own breakpoints. */
export function useNarrowPhone() {
  const query = '(max-width: 1023.98px)'
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
