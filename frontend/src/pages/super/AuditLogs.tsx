/**
 * AuditLogs (Super Admin) — nhật ký kiểm toán toàn hệ thống. Elite 2026: PageShell + PageHeader
 * + FilterBar + DataTable + StatusBadge + Loading/Empty states (design-system UDP-01).
 */
import { useState, useEffect } from 'react'
import { ScrollText } from 'lucide-react'
import {
  PageShell, PageHeader, FilterBar, DataTable, StatusBadge, LoadingState, EmptyState, ErrorState,
  ExportActions, ChartCard, type Column, type StatusTone,
} from '../../components/shared'
import { useAuthStore } from '../../store/authStore'
import { exportGenericExcel, exportGenericTablePDF } from '../../lib/export'
import { useExportRunner } from '../../hooks/useExportRunner'
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

const ACTION_TONE: Record<string, StatusTone> = {
  CREATE: 'success', UPDATE: 'info', DELETE: 'danger', EXPORT: 'ai', LOCK: 'warning', BACKUP: 'ai', VIEW: 'neutral',
}
const ACTION_OPTIONS = ['Tất cả', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'LOCK']

/** Số bản ghi tối đa tải về (cũng là giới hạn của file export). */
const LOG_LIMIT = 200

export function AuditLogs() {
  const { accessToken } = useAuthStore()
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('Tất cả')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const isLocal = !accessToken || accessToken.startsWith('local-token-') || accessToken.startsWith('token-')

  useEffect(() => {
    if (isLocal) { setLoading(false); return }
    const params = new URLSearchParams()
    if (action !== 'Tất cả') params.set('action', action)
    if (search) params.set('search', search)
    params.set('limit', String(LOG_LIMIT))
    setLoading(true)
    setLoadError(false)
    api.get(`/audit-logs?${params.toString()}`)
      .then((res) => setLogs(res.data?.data ?? []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [accessToken, action, search, isLocal, reloadKey])

  const rows = isLocal ? [] : logs

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  }

  const { busy, run } = useExportRunner()
  // Export = ĐÚNG tập đang xem (lọc phía server theo hành động/tìm kiếm), tối đa LOG_LIMIT dòng gần nhất.
  const scopeParts = [action !== 'Tất cả' ? `hành động ${action}` : '', search ? `tìm "${search}"` : ''].filter(Boolean)
  const scopeText = scopeParts.length ? scopeParts.join(' · ') : 'tất cả hành động'
  const limitNote = `Giới hạn ${LOG_LIMIT} dòng gần nhất${rows.length >= LOG_LIMIT ? ' (đã chạm giới hạn — còn bản ghi cũ hơn chưa xuất)' : ''}`
  const doExportExcel = () => run(() => exportGenericExcel(
    'Audit_Log_He_Thong', 'Audit Log',
    ['Thời gian', 'Người dùng', 'Hành động', 'Chi tiết', 'CLB'],
    rows.map((l) => [formatTime(l.createdAt), l.user?.username ?? '', l.action, l.detail ?? l.resource, l.club?.name ?? 'System']),
    [`${rows.length} bản ghi · ${scopeText} · ${limitNote}`, '', '', '', ''],
  ), { success: 'Đã xuất Excel nhật ký', empty: rows.length === 0, emptyMsg: 'Không có bản ghi nào để xuất' })
  const doExportPdf = () => run(() => exportGenericTablePDF({
    fileBase: 'Audit_Log_He_Thong',
    title: 'Nhật Ký Kiểm Toán Hệ Thống',
    metaLeft: `${rows.length} thao tác · ${scopeText}`,
    columns: [{ header: 'Thời gian' }, { header: 'Người dùng' }, { header: 'Hành động', align: 'center' }, { header: 'Chi tiết' }, { header: 'CLB' }],
    rows: rows.map((l) => [formatTime(l.createdAt), l.user?.username ?? '—', l.action, l.detail ?? l.resource, l.club?.name ?? 'System']),
    summaryLabel: 'Phạm vi',
    summaryValue: limitNote,
  }), { success: 'Đã xuất PDF nhật ký', empty: rows.length === 0, emptyMsg: 'Không có bản ghi nào để xuất' })

  const columns: Column<AuditLog>[] = [
    { key: 'time', header: 'Thời gian', className: 'whitespace-nowrap text-xs [color:var(--pf-color-muted)]', render: (l) => formatTime(l.createdAt) },
    { key: 'user', header: 'Người dùng', className: 'font-mono text-xs', render: (l) => l.user?.username ?? '—' },
    { key: 'action', header: 'Hành động', align: 'center', render: (l) => <StatusBadge tone={ACTION_TONE[l.action] ?? 'neutral'}>{l.action}</StatusBadge> },
    { key: 'detail', header: 'Chi tiết', className: 'text-xs [color:var(--pf-color-muted)]', render: (l) => l.detail ?? l.resource },
    { key: 'club', header: 'CLB', className: 'text-xs [color:var(--pf-color-muted)]', render: (l) => l.club?.name ?? 'System' },
  ]

  return (
    <PageShell maxWidth={1760}>
      <PageHeader
        title="Nhật ký kiểm toán"
        subtitle={`${rows.length} thao tác · lịch sử hoạt động toàn hệ thống`}
        actions={rows.length > 0 ? <ExportActions onExcel={doExportExcel} onPdf={doExportPdf} disabled={busy} /> : undefined}
      />

      <div className="mb-4 flex flex-col gap-3">
        <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Tìm theo người dùng, mô tả, CLB…" />
        <div className="flex gap-1 overflow-x-auto rounded-full border p-1 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
          {ACTION_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setAction(opt)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                action === opt ? 'text-white shadow-sm [background:var(--pf-primary)]' : '[color:var(--pf-color-muted)] hover:[color:var(--pf-text)]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <ChartCard title="Timeline" subtitle={`${rows.length} sự kiện`} bodyClassName="!p-0">
        {loading ? (
          <LoadingState variant="table" rows={8} />
        ) : loadError ? (
          <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<ScrollText size={24} />} title="Chưa có nhật ký" description="Hoạt động quản trị sẽ xuất hiện tại đây." />
        ) : (
          <DataTable columns={columns} rows={rows} rowKey={(l) => l.id} />
        )}
      </ChartCard>
    </PageShell>
  )
}
