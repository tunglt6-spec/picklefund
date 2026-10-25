import { useEffect, useState } from 'react'
import { syncSignal, type SyncSnapshot } from '../../lib/statusDesign'

export function DataFreshness(props: Omit<SyncSnapshot, 'now' | 'online'>) {
  const [clock, setClock] = useState(() => ({ now: Date.now(), online: typeof navigator === 'undefined' || navigator.onLine }))
  useEffect(() => {
    const tick = () => setClock({ now: Date.now(), online: navigator.onLine })
    const id = window.setInterval(tick, 15_000)
    window.addEventListener('online', tick)
    window.addEventListener('offline', tick)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(id); window.removeEventListener('online', tick); window.removeEventListener('offline', tick); document.removeEventListener('visibilitychange', tick) }
  }, [])
  const signal = syncSignal({ ...props, ...clock })
  const candidate = props.updatedAt != null ? new Date(props.updatedAt) : null
  const updated = candidate && Number.isFinite(candidate.getTime()) ? candidate : null
  return <span className="pf-data-freshness lg:hidden" data-pf-signal={signal.tone} role="status" aria-label={signal.label}>
    <span className="pf-signal-dot" aria-hidden />
    <span>{signal.label}</span>
    {updated && <time dateTime={updated.toISOString()} title={`Lần cập nhật cuối: ${updated.toLocaleString('vi-VN')}`} aria-hidden="true">{updated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>}
  </span>
}
