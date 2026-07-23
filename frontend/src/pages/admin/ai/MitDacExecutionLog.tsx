/**
 * MitDacExecutionLog (33) — Nhật ký thực thi của Mít Đặc. Read-only.
 * Đọc GET /ai/actions?status=EXECUTED|FAILED|RETRY_PENDING (endpoint có sẵn, không backend mới).
 * V2.2 Clean Modern SaaS. Có loading/error/empty state.
 */
import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, XCircle, RotateCcw, Cog } from 'lucide-react'
import api from '../../../lib/api'
import type { AiActionListItem, AiActionStatus } from '../../../hooks/useAiManager'
import {
  PageShell, PageHeader, MetricCard, StatusBadge, EmptyState, LoadingState, ErrorState,
  type StatusTone,
} from '../../../components/shared'

const STATUS_META: Record<string, { tone: StatusTone; label: string }> = {
  EXECUTED: { tone: 'success', label: 'Đã thực thi' },
  FAILED: { tone: 'danger', label: 'Thất bại' },
  RETRY_PENDING: { tone: 'warning', label: 'Chờ chạy lại' },
  EXECUTING: { tone: 'info', label: 'Đang thực thi' },
}

function fmt(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN', { hour12: false })
}

export function MitDacExecutionLog() {
  const [items, setItems] = useState<AiActionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const statuses: AiActionStatus[] = ['EXECUTED', 'FAILED', 'RETRY_PENDING']
      const results = await Promise.all(
        statuses.map((st) => api.get(`/ai/actions?status=${st}&limit=50`)),
      )
      const merged = results
        .flatMap((r) => (r.data?.data ?? []) as AiActionListItem[])
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      setItems(merged)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const executed = items.filter((i) => i.status === 'EXECUTED').length
  const failed = items.filter((i) => i.status === 'FAILED').length
  const pending = items.filter((i) => i.status === 'RETRY_PENDING').length

  return (
    <PageShell>
      <PageHeader
        title="Mít Đặc — Nhật ký thực thi"
        subtitle="Lịch sử các hành động AI đã được duyệt và thực thi"
      />

      {loading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Cog size={24} />}
          title="Chưa có hành động nào được thực thi"
          description="Khi hành động AI được duyệt và thực thi, chúng sẽ xuất hiện tại đây."
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <MetricCard icon={<CheckCircle2 size={18} />} label="Đã thực thi" value={executed} tone="success" />
            <MetricCard icon={<XCircle size={18} />} label="Thất bại" value={failed} tone={failed > 0 ? 'danger' : 'success'} />
            <MetricCard icon={<RotateCcw size={18} />} label="Chờ chạy lại" value={pending} tone={pending > 0 ? 'warning' : 'success'} />
          </div>

          <div className="flex flex-col gap-2">
            {items.map((a) => {
              const meta = STATUS_META[a.status] ?? { tone: 'neutral' as StatusTone, label: a.status }
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border p-4 [background:var(--pf-surface)] [border-color:var(--pf-border)] [box-shadow:var(--pf-shadow)]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold [color:var(--pf-text)]">{a.title}</p>
                      {a.retryCount > 0 && (
                        <span className="text-[11px] [color:var(--pf-color-muted)]">· thử lại {a.retryCount}×</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] [color:var(--pf-color-muted)]">
                      {a.actionType} · {fmt(a.createdAt)}
                    </p>
                  </div>
                  <StatusBadge tone={meta.tone} dot>{meta.label}</StatusBadge>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </PageShell>
  )
}
