/** useLandingNav — điều hướng landing: "/#anchor" cuộn mượt tới section (trừ chiều cao header
 *  sticky để không bị che), else router navigate. */
import { useNavigate } from 'react-router-dom'

/** Chiều cao header sticky (h-16 = 64px) + đệm nhỏ để section không nấp dưới header. */
const HEADER_OFFSET = 76

export function useLandingNav() {
  const navigate = useNavigate()
  return (href?: string) => {
    if (!href) return
    if (href.startsWith('/#')) {
      const id = href.slice(2)
      const el = document.getElementById(id)
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
        history.replaceState(null, '', href)
        return
      }
    }
    navigate(href)
  }
}
