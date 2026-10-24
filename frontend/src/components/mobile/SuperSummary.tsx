import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Users } from 'lucide-react'
import api from '../../lib/api'
import { SummaryCard } from './HubParts'

/** Thẻ tóm tắt cho Super Admin (mobile): số CLB + số người dùng toàn hệ thống — dùng đúng endpoint các màn Quản lý CLB / Người dùng đã gọi. */
export function SuperSummary() {
  const navigate = useNavigate()
  const [clubs, setClubs] = useState<number | null>(null)
  const [users, setUsers] = useState<{ total: number; active: number } | null>(null)

  useEffect(() => {
    let off = false
    api.get('/clubs', { params: { limit: 500 } })
      .then((r) => {
        if (off) return
        const d = r.data?.data
        setClubs(Array.isArray(d) ? d.length : Array.isArray(d?.items) ? d.items.length : null)
      })
      .catch(() => { if (!off) setClubs(null) })
    api.get('/users/summary')
      .then((r) => {
        if (off) return
        const d = r.data?.data
        setUsers(d && typeof d.total === 'number' ? { total: d.total, active: Number(d.active ?? 0) } : null)
      })
      .catch(() => { if (!off) setUsers(null) })
    return () => { off = true }
  }, [])

  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <SummaryCard
        icon={<Building2 size={18} />}
        title="Câu lạc bộ"
        onOpen={() => navigate('/super/clubs')}
        value={clubs === null ? '—' : String(clubs)}
        sub="trên hệ thống"
        cta="Quản lý CLB"
      />
      <SummaryCard
        icon={<Users size={18} />}
        title="Người dùng"
        onOpen={() => navigate('/super/users')}
        value={users ? String(users.total) : '—'}
        sub={users ? `${users.active} đang hoạt động` : 'toàn hệ thống'}
        cta="Xem danh sách"
        outline
      />
    </div>
  )
}
