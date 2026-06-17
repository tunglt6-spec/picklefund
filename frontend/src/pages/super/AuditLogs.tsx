import { useState, useEffect } from 'react'
import { Search, ScrollText } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'

interface AuditLog {
  id: string
  createdAt: string
  user: { username: string }
  club?: { name: string } | null
  action: string
  resource: string
  detail?: string | null
}

const ACTION_COLORS: Record<string, 'green' | 'blue' | 'red' | 'purple' | 'orange'> = {
  CREATE: 'green', UPDATE: 'blue', DELETE: 'red', EXPORT: 'purple', LOCK: 'orange',
}
const ACTION_OPTIONS = ['Tất cả', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'LOCK']

export function AuditLogs() {
  const { accessToken } = useAuthStore()
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('Tất cả')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const isLocal = !accessToken || accessToken.startsWith('local-token-') || accessToken.startsWith('token-')

  useEffect(() => {
    if (isLocal) { setLoading(false); return }
    const params = new URLSearchParams()
    if (action !== 'Tất cả') params.set('action', action)
    if (search) params.set('search', search)
    params.set('limit', '200')

    setLoading(true)
    api.get(`/audit-logs?${params.toString()}`).then(res => {
      setLogs(res.data?.data ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [accessToken, action, search, isLocal])

  const filtered = isLocal
    ? []
    : logs

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Audit Logs"
        subtitle={`${filtered.length} thao tác · Lịch sử hoạt động toàn hệ thống`}
      />

      <div className="p-6 max-w-[1100px] mx-auto space-y-5">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo người dùng, mô tả, CLB..."
              className="input-base pl-9"
            />
          </div>
          <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1 flex-wrap">
            {ACTION_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setAction(opt)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  action === opt ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ScrollText size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">Chưa có log nào</p>
            </div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th className="w-36">Thời gian</th>
                  <th>Người dùng</th>
                  <th className="text-center w-20">Action</th>
                  <th>Chi tiết</th>
                  <th className="w-28">CLB</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id}>
                    <td className="text-xs text-slate-400 whitespace-nowrap">{formatTime(log.createdAt)}</td>
                    <td className="text-slate-700 text-xs font-mono">{log.user?.username ?? '—'}</td>
                    <td className="text-center">
                      <Badge variant={ACTION_COLORS[log.action] ?? 'gray'}>{log.action}</Badge>
                    </td>
                    <td className="text-slate-600 text-xs">{log.detail ?? `${log.resource}`}</td>
                    <td className="text-xs text-slate-500">{log.club?.name ?? 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
