import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { Panel, Skeleton, ListRow, HubSectionTitle, type LoadState } from './HubParts'

/** Tóm tắt hệ thống cho Super Admin (mobile): số CLB + số người dùng — dùng đúng endpoint các màn Quản lý CLB / Người dùng đã gọi. */
export function SuperSummary() {
  const navigate = useNavigate()
  const [clubs, setClubs] = useState<number | null>(null)
  const [users, setUsers] = useState<{ total: number; active: number } | null>(null)
  const [state, setState] = useState<LoadState>('loading')

  useEffect(() => {
    let off = false
    Promise.allSettled([
      api.get('/clubs', { params: { limit: 500 } }),
      api.get('/users/summary'),
    ]).then(([c, u]) => {
      if (off) return
      if (c.status === 'fulfilled') {
        const d = c.value.data?.data
        setClubs(Array.isArray(d) ? d.length : Array.isArray(d?.items) ? d.items.length : null)
      }
      if (u.status === 'fulfilled') {
        const d = u.value.data?.data
        setUsers(d && typeof d.total === 'number' ? { total: d.total, active: Number(d.active ?? 0) } : null)
      }
      setState(c.status === 'rejected' && u.status === 'rejected' ? 'error' : 'ok')
    })
    return () => { off = true }
  }, [])

  return (
    <>
      <HubSectionTitle>Hệ thống</HubSectionTitle>
      <Panel className="mt-2 overflow-hidden">
        {state === 'loading' ? (
          <div className="space-y-2 p-4"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /></div>
        ) : state === 'error' ? (
          <p className="px-4 py-5 text-sm [color:var(--pf-color-muted)]">Không tải được số liệu hệ thống.</p>
        ) : (
          <ul className="divide-y [border-color:var(--pf-border)]">
            <ListRow title={`${clubs ?? '—'} câu lạc bộ`} sub="Xem và quản lý CLB trên hệ thống" onClick={() => navigate('/super/clubs')} />
            <ListRow title={`${users ? users.total : '—'} người dùng`} sub={users ? `${users.active} đang hoạt động` : 'Toàn hệ thống'} onClick={() => navigate('/super/users')} />
          </ul>
        )}
      </Panel>
    </>
  )
}
