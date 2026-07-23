/**
 * AlertCenterPage — AI Operations Center › Alert Center (Pha 3 Hermes v2).
 * Gom cảnh báo từ endpoint SẴN CÓ (FE-only, KHÔNG backend mới):
 *   GET /ai/maika/operational-alerts        — cảnh báo vận hành (quỹ/công nợ/chuyên cần)
 *   GET /ai/maika/organization-intelligence — attentionSignals + dataQualitySignals
 *   GET /workflows/runs?status=FAILED        — lỗi workflow
 *   GET /ai/actions?status=FAILED            — lỗi AI / thực thi (Mít Đặc)
 * V2.2 Clean Modern SaaS + loading/error/empty state.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ShieldAlert, Database, Workflow, Bot, CheckCircle2,
} from 'lucide-react'
import api from '../../../lib/api'
import type { IntelSignal, SignalLevel } from '../../../hooks/useAiManager'
import {
  PageShell, PageHeader, MetricCard, StatusBadge, LoadingState, ErrorState,
  type StatusTone,
} from '../../../components/shared'

interface FailedRun { id: string; triggerType: string; status: string; startedAt?: string; createdAt?: string }
interface FailedAction { id: string; title: string; actionType: string; status: string; createdAt: string; errorMessage?: string | null }

const LEVEL_TONE: Record<SignalLevel, StatusTone> = {
  warning: 'danger', attention: 'warning', info: 'info',
}
const LEVEL_LABEL: Record<SignalLevel, string> = {
  warning: 'Cảnh báo', attention: 'Chú ý', info: 'Thông tin',
}
const TRIGGER_LABEL: Record<string, string> = {
  DEBT_ESCALATION: 'Nhắc đóng quỹ', EVENT_REMINDER: 'Nhắc buổi tập', REPORT_DISPATCH: 'Gửi báo cáo',
}

function fmt(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN', { hour12: false })
}

/** Mức nghiêm trọng để đếm KPI: warning > attention > info. */
function severityRank(l: SignalLevel): number {
  return l === 'warning' ? 2 : l === 'attention' ? 1 : 0
}

export function AlertCenterPage() {
  const navigate = useNavigate()
  const [ops, setOps] = useState<IntelSignal[]>([])
  const [attention, setAttention] = useState<IntelSignal[]>([])
  const [dataQuality, setDataQuality] = useState<IntelSignal[]>([])
  const [failedRuns, setFailedRuns] = useState<FailedRun[]>([])
  const [failedActions, setFailedActions] = useState<FailedAction[]>([])
  const [partial, setPartial] = useState<string[]>([]) // tên nguồn lỗi (partial-failure)
  const [level, setLevel] = useState<'all' | 'warning' | 'attention' | 'info'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    const [o, i, wr, aa] = await Promise.allSettled([
      api.get('/ai/maika/operational-alerts'),
      api.get('/ai/maika/organization-intelligence'),
      api.get('/workflows/runs?status=FAILED'),
      api.get('/ai/actions?status=FAILED&limit=50'),
    ])
    // Lỗi TẤT CẢ nguồn → coi như không tải được (tránh hiện "an toàn" giả).
    if ([o, i, wr, aa].every(r => r.status === 'rejected')) {
      setError(true); setLoading(false); return
    }
    // Ghi nhận nguồn lỗi CỤC BỘ → cảnh báo "thiếu dữ liệu một phần" (Reality Filter:
    // KHÔNG khẳng định "ổn định" nếu có nguồn cảnh báo chưa tải được).
    const failed: string[] = []
    if (o.status === 'rejected') failed.push('Cảnh báo vận hành')
    if (i.status === 'rejected') failed.push('Phân tích tổ chức')
    if (wr.status === 'rejected') failed.push('Workflow')
    if (aa.status === 'rejected') failed.push('Lỗi AI')
    setPartial(failed)
    const grab = <T,>(r: PromiseSettledResult<any>): T[] =>
      r.status === 'fulfilled' ? ((r.value.data?.data ?? r.value.data ?? []) as T[]) : []
    setOps(grab<IntelSignal>(o))
    const intel = i.status === 'fulfilled' ? (i.value.data?.data ?? null) : null
    setAttention((intel?.attentionSignals ?? []) as IntelSignal[])
    setDataQuality((intel?.dataQualitySignals ?? []) as IntelSignal[])
    setFailedRuns(grab<FailedRun>(wr))
    setFailedActions(grab<FailedAction>(aa))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const opsAll = [...ops, ...attention]
  const totalAlerts = opsAll.length + dataQuality.length + failedRuns.length + failedActions.length
  const highCount = opsAll.filter(s => s.level === 'warning').length + failedRuns.length + failedActions.length

  // Lọc theo mức: áp cho tín hiệu ops/dataQuality; lỗi workflow/AI xem như mức "cao"
  // (chỉ hiện khi lọc Tất cả hoặc Cảnh báo).
  const flt = (items: IntelSignal[]) => (level === 'all' ? items : items.filter(s => s.level === level))
  const showErrorSections = level === 'all' || level === 'warning'
  const LEVEL_TABS: { id: typeof level; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'warning', label: 'Cảnh báo' },
    { id: 'attention', label: 'Chú ý' },
    { id: 'info', label: 'Thông tin' },
  ]

  const SignalList = ({ items }: { items: IntelSignal[] }) => (
    <div className="space-y-2">
      {[...items].sort((a, b) => severityRank(b.level) - severityRank(a.level)).map((s, i) => (
        <div key={`${s.code}-${i}`} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm text-slate-700">{s.message}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.code}</p>
          </div>
          <StatusBadge tone={LEVEL_TONE[s.level]}>{LEVEL_LABEL[s.level]}</StatusBadge>
        </div>
      ))}
    </div>
  )

  return (
    <PageShell>
      <PageHeader
        title="Alert Center"
        subtitle="Cảnh báo vận hành, chất lượng dữ liệu & lỗi hệ thống"
      />

      {loading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState onRetry={() => void load()} />
      ) : (
        <div className="flex flex-col gap-6">
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label="Tổng cảnh báo" value={totalAlerts} icon={<AlertTriangle size={16} />} tone={totalAlerts > 0 ? 'warning' : 'success'} />
            <MetricCard label="Mức cao" value={highCount} icon={<ShieldAlert size={16} />} tone={highCount > 0 ? 'danger' : 'success'} />
            <MetricCard label="Lỗi Workflow" value={failedRuns.length} icon={<Workflow size={16} />} tone={failedRuns.length > 0 ? 'danger' : 'success'} />
            <MetricCard label="Lỗi AI / Thực thi" value={failedActions.length} icon={<Bot size={16} />} tone={failedActions.length > 0 ? 'danger' : 'success'} />
          </div>

          {/* Lọc theo mức */}
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit overflow-x-auto">
            {LEVEL_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setLevel(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  level === t.id ? '[background:var(--pf-primary)] text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Thiếu dữ liệu một phần — KHÔNG khẳng định ổn định khi có nguồn lỗi */}
          {partial.length > 0 && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>Thiếu dữ liệu một phần — không tải được: <b>{partial.join(', ')}</b>. Có thể còn cảnh báo chưa hiển thị; hãy thử lại.</span>
            </div>
          )}
          {totalAlerts === 0 && partial.length === 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={16} /> Không có cảnh báo — hệ thống đang ổn định.
            </div>
          )}

          {/* Cảnh báo vận hành */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-slate-400" /> Cảnh Báo Vận Hành
            </h3>
            {flt(opsAll).length === 0 ? (
              <p className="text-sm text-slate-400">Không có cảnh báo vận hành{level !== 'all' ? ' ở mức này' : ''}.</p>
            ) : <SignalList items={flt(opsAll)} />}
          </section>

          {/* Chất lượng dữ liệu */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Database size={16} className="text-slate-400" /> Chất Lượng Dữ Liệu
            </h3>
            {flt(dataQuality).length === 0 ? (
              <p className="text-sm text-slate-400">Không có vấn đề chất lượng dữ liệu{level !== 'all' ? ' ở mức này' : ''}.</p>
            ) : <SignalList items={flt(dataQuality)} />}
          </section>

          {/* Lỗi Workflow */}
          {showErrorSections && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <Workflow size={16} className="text-slate-400" /> Lỗi Workflow
              </h3>
              <button onClick={() => navigate('/admin/workflows?from=aido')} className="text-xs font-medium [color:var(--pf-primary)] hover:underline">Xem Workflow</button>
            </div>
            {failedRuns.length === 0 ? (
              <p className="text-sm text-slate-400">Không có workflow lỗi.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {failedRuns.slice(0, 20).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">{TRIGGER_LABEL[r.triggerType] ?? r.triggerType}</p>
                      <p className="text-[11px] text-slate-400">{fmt(r.startedAt ?? r.createdAt)}</p>
                    </div>
                    <StatusBadge tone="danger">Lỗi</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </section>
          )}

          {/* Lỗi AI / Thực thi */}
          {showErrorSections && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <Bot size={16} className="text-slate-400" /> Lỗi AI / Thực Thi
              </h3>
              <button onClick={() => navigate('/admin/execution-log?from=aido')} className="text-xs font-medium [color:var(--pf-primary)] hover:underline">Nhật ký thực thi</button>
            </div>
            {failedActions.length === 0 ? (
              <p className="text-sm text-slate-400">Không có hành động AI lỗi.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {failedActions.slice(0, 20).map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">{a.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">{a.errorMessage ?? a.actionType} · {fmt(a.createdAt)}</p>
                    </div>
                    <StatusBadge tone="danger">Thất bại</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </section>
          )}
        </div>
      )}
    </PageShell>
  )
}
