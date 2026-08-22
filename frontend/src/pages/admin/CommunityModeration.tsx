import { useCallback, useEffect, useState } from 'react'
import {
  ShieldAlert,
  Flag,
  Trash2,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  FileText,
  User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import {
  PageShell,
  PageHeader,
  MetricCard,
  EmptyState,
  LoadingState,
  ErrorState,
  StatusBadge,
  ActionButton,
  ResponsiveTabs,
  type TabItem,
} from '../../components/shared'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import api from '../../lib/api'

type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED'
type TargetType = 'POST' | 'COMMENT'

interface Report {
  id: string
  targetType: TargetType
  targetId: string
  reason: string | null
  status: ReportStatus
  createdAt: string
  reporter: string
  preview: string
  contentAuthor: string
  contentDeleted: boolean
}

type ReportAction = 'resolve' | 'dismiss'

/** "Vừa xong" / "5 phút trước" / "2 giờ trước" / "3 ngày trước" / dd/mm/yyyy. */
function timeAgo(dateStr: string): string {
  const t = new Date(dateStr).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const s = Math.floor(diff / 1000)
  if (s < 45) return 'Vừa xong'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} ngày trước`
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

const TABS: TabItem[] = [
  { key: 'OPEN', label: 'Chờ duyệt' },
  { key: 'RESOLVED', label: 'Đã xử lý' },
  { key: 'DISMISSED', label: 'Đã bỏ qua' },
]

export function CommunityModeration({ embedded }: { embedded?: boolean } = {}) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<ReportStatus>('OPEN')
  const [rows, setRows] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Report | null>(null)

  const load = useCallback(async (status: ReportStatus) => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get('/community/reports', { params: { status } })
      const data: Report[] = res.data?.data ?? res.data ?? []
      setRows(Array.isArray(data) ? data : [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(tab)
  }, [load, tab])

  const patchReport = async (r: Report, action: ReportAction, deleteContent?: boolean) => {
    setBusyId(r.id)
    try {
      await api.patch(`/community/reports/${r.id}`, { action, deleteContent })
      toast.success(
        action === 'resolve'
          ? 'Đã xử lý báo cáo' + (deleteContent ? ' và xóa nội dung' : '')
          : 'Đã bỏ qua báo cáo (giữ nội dung)',
      )
      setRows((list) => list.filter((x) => x.id !== r.id))
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message ?? 'Thao tác thất bại')
    } finally {
      setBusyId(null)
    }
  }

  const onConfirmDelete = async () => {
    const r = confirmDelete
    if (!r) return
    setConfirmDelete(null)
    await patchReport(r, 'resolve', true)
  }

  const body = (
    <>
      {!embedded && (
        <PageHeader title="Kiểm Duyệt Nội Dung" subtitle="Duyệt các báo cáo nội dung cộng đồng" />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Báo cáo đang chờ"
          value={`${tab === 'OPEN' ? rows.length : '—'}`}
          accent="amber"
          icon={<Flag size={18} />}
        />
        <MetricCard
          label="Đang xem"
          value={TABS.find((t) => t.key === tab)?.label ?? ''}
          accent="blue"
          icon={<ShieldAlert size={18} />}
        />
      </div>

      <div className="mt-4">
        <ResponsiveTabs
          tabs={TABS}
          active={tab}
          onChange={(k) => setTab(k as ReportStatus)}
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <LoadingState variant="list" />
        ) : error ? (
          <ErrorState onRetry={() => load(tab)} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={22} />}
            title="Không có báo cáo"
            description="Chưa có báo cáo nội dung nào trong mục này."
          />
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const isPost = r.targetType === 'POST'
              const busy = busyId === r.id
              return (
                <div
                  key={r.id}
                  className="rounded-2xl border p-4 [border-color:var(--pf-border)] [background:var(--pf-surface)] shadow-[var(--pf-shadow)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={isPost ? 'info' : 'ai'}>
                      {isPost ? <FileText size={12} /> : <MessageSquare size={12} />}
                      {isPost ? 'Bài viết' : 'Bình luận'}
                    </StatusBadge>
                    {r.contentDeleted && <StatusBadge tone="danger">Đã xóa</StatusBadge>}
                    <span className="ml-auto text-[11.5px] [color:var(--pf-color-muted)]">
                      {timeAgo(r.createdAt)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">
                      <User size={14} />
                    </span>
                    <p className="min-w-0 truncate text-[13px] [color:var(--pf-color-muted)]">
                      Người báo cáo:{' '}
                      <span className="font-semibold [color:var(--pf-text)]">{r.reporter}</span>
                    </p>
                  </div>

                  {r.reason && (
                    <p className="mt-2 text-[12.5px] [color:var(--pf-color-muted)]">
                      Lý do: <span className="[color:var(--pf-text)]">{r.reason}</span>
                    </p>
                  )}

                  <div className="mt-2 rounded-xl border p-3 [border-color:var(--pf-border)] [background:var(--pf-bg)]">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide [color:var(--pf-color-muted)]">
                      Nội dung bị báo cáo
                    </p>
                    <p className="whitespace-pre-wrap break-words text-[14px] font-medium [color:var(--pf-text)]">
                      {r.preview || '(Không có nội dung xem trước)'}
                    </p>
                    <p className="mt-2 text-[12px] [color:var(--pf-color-muted)]">
                      Tác giả: <span className="[color:var(--pf-text)]">{r.contentAuthor}</span>
                    </p>
                  </div>

                  {(r.status === 'OPEN' || isPost) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.status === 'OPEN' && !r.contentDeleted && (
                        <ActionButton
                          variant="secondary"
                          className="min-h-11 [color:var(--pf-color-danger)] [border-color:var(--pf-color-danger-soft)]"
                          onClick={() => setConfirmDelete(r)}
                          disabled={busy}
                        >
                          <Trash2 size={15} /> Xóa nội dung
                        </ActionButton>
                      )}
                      {r.status === 'OPEN' && (
                        <ActionButton
                          variant="secondary"
                          className="min-h-11"
                          onClick={() => patchReport(r, 'dismiss')}
                          disabled={busy}
                        >
                          <ShieldCheck size={15} /> Giữ lại (bỏ qua)
                        </ActionButton>
                      )}
                      {isPost && (
                        <ActionButton
                          variant="ghost"
                          className="min-h-11"
                          onClick={() => navigate(`/community?post=${r.targetId}`)}
                          disabled={busy}
                        >
                          <ExternalLink size={15} /> Xem bài
                        </ActionButton>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Xóa nội dung bị báo cáo?"
        message="Nội dung sẽ bị xóa và báo cáo được đánh dấu đã xử lý. Hành động này không thể khôi phục."
        confirmLabel="Xóa nội dung"
        variant="danger"
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  )

  return embedded ? body : <PageShell maxWidth={1100}>{body}</PageShell>
}

export default CommunityModeration
