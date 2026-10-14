import { useEffect, useRef } from 'react'

/**
 * Làm mới dữ liệu "gần thời gian thực" cho các màn số liệu tài chính: gọi `refresh` mỗi `intervalMs`
 * (mặc định 30s) CHỈ khi tab đang hiển thị, và gọi ngay khi tab hiện lại/được focus.
 * `refresh` nên là bản ÂM THẦM (không bật skeleton) để số tiền + màu cập nhật mượt, không nháy.
 */
export function useLiveRefresh(refresh: () => void | Promise<unknown>, enabled = true, intervalMs = 30_000) {
  const ref = useRef(refresh)
  ref.current = refresh
  useEffect(() => {
    if (!enabled) return
    const run = () => { if (document.visibilityState === 'visible') void ref.current() }
    const id = setInterval(run, intervalMs)
    document.addEventListener('visibilitychange', run)
    window.addEventListener('focus', run)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', run)
      window.removeEventListener('focus', run)
    }
  }, [enabled, intervalMs])
}
