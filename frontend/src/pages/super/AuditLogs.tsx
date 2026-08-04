import { useState, useEffect } from 'react'
import { Search, ScrollText } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { ExportActions } from '../../components/shared'
import { useAuthStore } from '../../store/authStore'
import { exportGenericExcel, exportGenericTablePDF } from '../../lib/export'
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

  const doExportExcel = () => {
    exportGenericExcel('Audit_Log_He_Thong', 'Audit Log',
      ['Thời gian', 'Người dùng', 'Hành động', 'Chi tiết', 'CLB'],
      filtered.map((l) => [formatTime(l.createdAt), l.user?.username ?? '', l.action, l.detail ?? l.resource, l.club?.name ?? 'System']),
    )
    toast.success('Đã xuất Excel nhật ký')
  }
  const doExportPdf = () => {
    exportGenericTablePDF({
      fileBase: 'Audit_Log_He_Thong',
      title: 'Nhật Ký Kiểm Toán Hệ Thống',
      metaLeft: `${filtered.length} thao tác`,
      columns: [
        { header: 'Thời gian' }, { header: 'Người dùng' }, { header: 'Hành động', align: 'center' }, { header: 'Chi tiết' }, { header: 'CLB' },
      ],
      rows: filtered.map((l) => [formatTime(l.createdAt), l.user?.username ?? '—', l.action, l.detail ?? l.resource, l.club?.name ?? 'System']),
    })
    toast.success('Đã xuất PDF nhật ký')
  }

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-surface-muted)]">
      <PageHeader
        title="Audit Logs"
        subtitle={`${filtered.length} thao tác · Lịch sử hoạt động toàn hệ thống`}
        actions={filtered.length > 0 ? <ExportActions onExcel={doExportExcel} onPdf={doExportPdf} /> : undefined}
      />

      <div className="p-6 max-w-[1100px] mx-auto space-y-5">
        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo người dùng, mô tả, CLB..."
              className="input-base pl-9 w-full"
            />
          </div>
          <div className="flex gap-1 [background:var(--pf-surface)] rounded-lg border border-[color:var(--pf-border)] p-1 overflow-x-auto">
            {ACTION_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setAction(opt)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  action === opt ? '[background:var(--pf-primary)] text-white shadow-sm' : '[color:var(--pf-color-muted)] hover:[color:var(--pf-text)]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-[var(--shadow-card)] overflow-hidden">
          {loading ? (
            <div className="py-16 text-center [color:var(--pf-color-muted)] text-sm">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ScrollText size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm [color:var(--pf-color-muted)]">Chưa có log nào</p>
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
                    <td className="text-xs [color:var(--pf-color-muted)] whitespace-nowrap">{formatTime(log.createdAt)}</td>
                    <td className="[color:var(--pf-text)] text-xs font-mono">{log.user?.username ?? '—'}</td>
                    <td className="text-center">
                      <Badge variant={ACTION_COLORS[log.action] ?? 'gray'}>{log.action}</Badge>
                    </td>
                    <td className="[color:var(--pf-color-muted)] text-xs">{log.detail ?? `${log.resource}`}</td>
                    <td className="text-xs [color:var(--pf-color-muted)]">{log.club?.name ?? 'System'}</td>
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
