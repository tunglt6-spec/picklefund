import { useEffect, useState } from 'react'
import api from '../lib/api'

/** Số báo cáo nội dung cộng đồng đang chờ duyệt (chỉ gọi khi `enabled`; lỗi → 0, không chặn giao diện). */
export function useModerationPending(enabled: boolean): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    api.get('/community/reports', { params: { status: 'OPEN' } })
      .then((res) => {
        const data = res.data?.data ?? res.data ?? []
        if (alive) setN(Array.isArray(data) ? data.length : 0)
      })
      .catch(() => { if (alive) setN(0) })
    return () => { alive = false }
  }, [enabled])
  return n
}
