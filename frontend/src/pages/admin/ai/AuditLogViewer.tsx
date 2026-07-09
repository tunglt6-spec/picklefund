/**
 * AuditLogViewer — AI Operations Center › Audit Logs (Pha 6 Hermes v2), CLUB_ADMIN.
 * Nối endpoint MỚI (read-only, tenant-safe): GET /audit-logs/club — clubId ÉP TỪ JWT
 * ở backend (client không override). Chỉ log của CLB mình. V2.2 shared-kit + trạng thái.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScrollText, ArrowLeft, Search } from 'lucide-react'
import api from '../../../lib/api'
import {
  PageShell, PageHeader, StatusBadge, LoadingState, ErrorState, EmptyState,
  ActionButton, type StatusTone,
} from '../../../components/shared'

interface AuditLog {
  id: string
  createdAt: string
  user?: { username: string } | null
  action: string
  resource: string
  resourceId?: string | null
  detail?: string | null
}

const ACTION_TONE: Record<string, StatusTone> = {
  CREATE: 'success', UPDATE: 'info', DELETE: 'danger', EXPORT: 'ai', LOCK: 'warning',
  approve_ai_action: 'success', reject_ai_action: 'danger', execute_ai_action: 'info',
}
const ACTION_OPTIONS = ['Tất cả', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'LOCK']

function fmt(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN', { hour12: false })
}

export function AuditLogViewer() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('Tất cả')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams()
      if (action !== 'Tất cả') params.set('action', action)
      if (search.trim()) params.set('search', search.trim())
      params.set('limit', '200')
      const res = await api.get(`/audit-logs/club?${params.toString()}`)
      setLogs((res.data?.data ?? res.data ?? []) as AuditLog[])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [action, search])

  useEffect(() => { void load() }, [load])

  return (
    <PageShell>
      <PageHeader
        title="Audit Logs"
        subtitle="Nhật ký kiểm toán — các thao tác trong CLB của bạn"
        actions={
          <ActionButton variant="ghost" icon={<ArrowLeft size={15} />} onClick={() => navigate('/admin/ai-manager')}>
            AI Operations Center
          </ActionButton>
        }
      />

      <div className="flex flex-col gap-4">
        {/* Bộ lọc */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo người dùng, mô tả, tài nguyên…"
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]"
            />
          </div>
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 overflow-x-auto">
            {ACTION_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setAction(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  action === opt ? '[background:var(--pf-primary)] text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingState rows={6} />
        ) : error ? (
          <ErrorState onRetry={() => void load()} />
        ) : logs.length === 0 ? (
          <EmptyState icon={<ScrollText size={28} />} title="Chưa có nhật ký" description="Các thao tác của CLB sẽ được ghi nhận tại đây." />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] text-slate-500 uppercase">
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Thời gian</th>
                    <th className="text-left px-4 py-3 font-semibold">Người dùng</th>
                    <th className="text-center px-4 py-3 font-semibold">Hành động</th>
                    <th className="text-left px-4 py-3 font-semibold">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{fmt(log.createdAt)}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-slate-700">{log.user?.username ?? '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge tone={ACTION_TONE[log.action] ?? 'neutral'}>{log.action}</StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{log.detail ?? log.resource}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
