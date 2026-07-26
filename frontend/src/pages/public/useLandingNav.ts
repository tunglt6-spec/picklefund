/** useLandingNav — điều hướng landing: "/#anchor" cuộn mượt tới section, else router navigate. */
import { useNavigate } from 'react-router-dom'

export function useLandingNav() {
  const navigate = useNavigate()
  return (href?: string) => {
    if (!href) return
    if (href.startsWith('/#')) {
      const id = href.slice(2)
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        history.replaceState(null, '', href)
        return
      }
    }
    navigate(href)
  }
}
