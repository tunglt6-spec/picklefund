/**
 * AuditLogViewer — AI Operations Center › Audit Logs (Pha 6 Hermes v2), CLUB_ADMIN.
 * Nối endpoint MỚI (read-only, tenant-safe): GET /audit-logs/club — clubId ÉP TỪ JWT
 * ở backend (client không override). Chỉ log của CLB mình. V2.2 shared-kit + trạng thái.
 */
import { useCallback, useEffect, useState } from 'react'
import { ScrollText, Search, ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import { exportGenericExcel, exportGenericTablePDF } from '../../../lib/export'
import {
  PageShell, PageHeader, StatusBadge, LoadingState, ErrorState, EmptyState, ActionButton,
  type StatusTone,
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
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('Tất cả')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    setPage(1) // đổi bộ lọc → về trang đầu
    try {
      const params = new URLSearchParams()
      if (action !== 'Tất cả') params.set('action', action)
      if (search.trim()) params.set('search', search.trim())
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      params.set('limit', '500')
      const res = await api.get(`/audit-logs/club?${params.toString()}`)
      setLogs((res.data?.data ?? res.data ?? []) as AuditLog[])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [action, search, from, to])

  useEffect(() => { void load() }, [load])

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const paged = logs.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  const doExportExcel = () => {
    exportGenericExcel('Audit_Log_CLB', 'Audit Log',
      ['Thời gian', 'Người dùng', 'Hành động', 'Tài nguyên', 'Chi tiết'],
      logs.map((l) => [fmt(l.createdAt), l.user?.username ?? '', l.action, l.resource, l.detail ?? '']),
    )
    toast.success('Đã xuất Excel nhật ký')
  }
  const doExportPdf = () => {
    exportGenericTablePDF({
      fileBase: 'Audit_Log_CLB',
      title: 'Nhật Ký Kiểm Toán',
      metaLeft: `${logs.length} bản ghi`,
      columns: [
        { header: 'Thời gian' }, { header: 'Người dùng' }, { header: 'Hành động', align: 'center' }, { header: 'Chi tiết' },
      ],
      rows: logs.map((l) => [fmt(l.createdAt), l.user?.username ?? '—', l.action, l.detail ?? l.resource]),
    })
    toast.success('Đã xuất PDF nhật ký')
  }

  return (
    <PageShell>
      <PageHeader
        title="Audit Logs"
        subtitle="Nhật ký kiểm toán — các thao tác trong CLB của bạn"
        actions={logs.length > 0 ? (
          <>
            <ActionButton variant="secondary" iconOnly ariaLabel="Xuất Excel nhật ký" icon={<FileSpreadsheet size={16} />} onClick={doExportExcel} />
            <ActionButton variant="secondary" iconOnly ariaLabel="Xuất PDF nhật ký" icon={<FileText size={16} />} onClick={doExportPdf} />
          </>
        ) : undefined}
      />

      <div className="flex flex-col gap-4">
        {/* Bộ lọc */}
        <div className="flex flex-col gap-2">
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
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Từ ngày</span>
            <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" />
            <span>đến</span>
            <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" />
            {(from || to) && (
              <button onClick={() => { setFrom(''); setTo('') }} className="[color:var(--pf-primary)] hover:underline font-medium">Xoá lọc ngày</button>
            )}
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
                  {paged.map(log => (
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
            {/* Phân trang */}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
              <span className="text-[11px] text-slate-400">
                {logs.length} bản ghi · Trang {pageSafe}/{totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pageSafe <= 1}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
                  aria-label="Trang trước"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={pageSafe >= totalPages}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
                  aria-label="Trang sau"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
