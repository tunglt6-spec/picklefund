/**
 * MaikaInsightsLog — Nhật ký phân tích của Maika (đọc TOÀN VĂN). Read-only.
 * Đọc GET /aido/maika-insights (bảng maika_insights, Phase 2). V2.2 Clean Modern SaaS.
 */
import { useCallback, useEffect, useState } from 'react'
import { Brain, FileText, TrendingUp, AlertTriangle, Activity } from 'lucide-react'
import api from '../../../lib/api'
import {
  PageShell, PageHeader, MetricCard, StatusBadge, EmptyState, LoadingState, ErrorState,
  type StatusTone,
} from '../../../components/shared'

interface MaikaInsight {
  id: string
  type: string
  title: string
  content: string
  severity?: string | null
  score?: number | null
  createdAt: string
}

const TYPE_META: Record<string, { tone: StatusTone; label: string; icon: React.ReactNode }> = {
  daily_brief: { tone: 'info', label: 'Daily Brief', icon: <FileText size={14} /> },
  weekly_report: { tone: 'info', label: 'Weekly Report', icon: <TrendingUp size={14} /> },
  anomaly: { tone: 'warning', label: 'Bất thường', icon: <AlertTriangle size={14} /> },
  health_score: { tone: 'success', label: 'Sức khỏe', icon: <Activity size={14} /> },
}

function fmt(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN', { hour12: false })
}

export function MaikaInsightsLog() {
  const [items, setItems] = useState<MaikaInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get('/aido/maika-insights?limit=50')
      setItems((res.data?.data ?? []) as MaikaInsight[])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const briefs = items.filter((i) => i.type === 'daily_brief' || i.type === 'weekly_report').length
  const anomalies = items.filter((i) => i.type === 'anomaly').length

  return (
    <PageShell>
      <PageHeader
        title="Maika — Nhật ký phân tích"
        subtitle="Toàn văn báo cáo, phân tích và cảnh báo bất thường Maika đã tạo"
      />

      {loading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Brain size={24} />}
          title="Chưa có phân tích nào"
          description="Khi Maika chạy Daily Brief / Weekly Report / quét bất thường (theo lịch hoặc chạy thủ công), nội dung sẽ lưu và hiển thị tại đây."
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <MetricCard icon={<FileText size={18} />} label="Báo cáo" value={briefs} tone="brand" />
            <MetricCard icon={<AlertTriangle size={18} />} label="Cảnh báo bất thường" value={anomalies} tone={anomalies > 0 ? 'warning' : 'success'} />
          </div>

          <div className="flex flex-col gap-3">
            {items.map((it) => {
              const meta = TYPE_META[it.type] ?? { tone: 'neutral' as StatusTone, label: it.type, icon: <Brain size={14} /> }
              return (
                <div
                  key={it.id}
                  className="rounded-2xl border p-4 [background:var(--pf-surface)] [border-color:var(--pf-border)] [box-shadow:var(--pf-shadow)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold [color:var(--pf-text)]">{it.title}</p>
                      <p className="mt-0.5 text-[11px] [color:var(--pf-color-muted)]">
                        {fmt(it.createdAt)}{it.score != null ? ` · sức khỏe ${it.score}/100` : ''}
                      </p>
                    </div>
                    <StatusBadge tone={meta.tone} dot>{meta.label}</StatusBadge>
                  </div>
                  <p className="mt-2.5 whitespace-pre-line border-t pt-2.5 text-sm leading-relaxed [color:var(--pf-text)] [border-color:var(--pf-border)]">
                    {it.content}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </PageShell>
  )
}
