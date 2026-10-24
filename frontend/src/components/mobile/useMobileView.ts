import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useIsMobile } from '../../hooks/useIsMobile'

/**
 * Điều hướng "lưới chức năng ⇄ màn chức năng" cho trang đơn (mobile <1024px) — vd chi tiết giải đấu.
 * Chức năng đang mở nằm trên URL (`?view=`) nên nút Quay lại của máy/trình duyệt đúng nhóm. Desktop: `mobile=false`, không dùng.
 */
export function useMobileView<K extends string>(keys: readonly K[], param = 'view') {
  const mobile = useIsMobile(1024)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const raw = params.get(param)
  const view = (mobile && keys.includes(raw as K) ? raw : null) as K | null
  const qs = (p: URLSearchParams) => (p.toString() ? `?${p.toString()}` : '')

  const open = useCallback((key: K) => {
    const next = new URLSearchParams(params)
    next.set(param, key)
    navigate({ pathname: location.pathname, search: qs(next) }, { state: { pfMenu: true } })
  }, [params, param, navigate, location.pathname])

  const back = useCallback(() => {
    if ((location.state as { pfMenu?: boolean } | null)?.pfMenu) { navigate(-1); return }
    const next = new URLSearchParams(params)
    next.delete(param)
    navigate({ pathname: location.pathname, search: qs(next) }, { replace: true })
  }, [params, param, navigate, location])

  return { mobile, view, open, back }
}
