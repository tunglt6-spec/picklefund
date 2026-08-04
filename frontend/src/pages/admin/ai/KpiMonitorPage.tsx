/**
 * KpiMonitorPage — AI Operations Center › KPI Monitor (Pha 5 Hermes v2).
 * FE-only, nối endpoint SẴN CÓ (allSettled → graceful từng nguồn):
 *   GET /maika/health-score       — điểm sức khỏe CLB + breakdown
 *   GET /maika/snapshot           — thành viên & tài chính
 *   GET /ai/actions/summary       — KPI AI (duyệt/thực thi/lỗi)
 *   GET /workflows/runs           — KPI workflow (đếm theo trạng thái)
 * KHÔNG bịa: chỉ render field có thật; nguồn lỗi → hiển thị "—".
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Gauge, Users, Wallet, Workflow, Bot, HeartPulse, TrendingUp, Activity,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../../../lib/api'
import type { AiActionSummary } from '../../../hooks/useAiManager'
import {
  PageShell, PageHeader, MetricCard, LoadingState, ErrorState,
} from '../../../components/shared'

interface HealthScore {
  score: number
  label?: string
  breakdown?: Record<string, number>
}
interface Snapshot {
  clubName?: string
  totalMembers?: number
  activeMembers?: number
  unpaidCount?: number
  totalAssets?: number
  commonIncome?: number
  commonExpense?: number
}
interface WfRun { status: string; startedAt?: string; createdAt?: string }
interface AiRun { createdAt?: string }

const vnd = (n?: number) => (typeof n === 'number' ? `${n.toLocaleString('vi-VN')}đ` : '—')
const num = (n?: number) => (typeof n === 'number' ? n : '—')

const BREAKDOWN_LABEL: Record<string, string> = {
  financial: 'Tài chính', engagement: 'Gắn kết', activity: 'Hoạt động (chuyên cần)',
  goal: 'Mục tiêu', issue: 'Vấn đề',
}

export function KpiMonitorPage() {
  const [health, setHealth] = useState<HealthScore | null>(null)
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [aiSummary, setAiSummary] = useState<AiActionSummary | null>(null)
  const [runs, setRuns] = useState<WfRun[]>([])
  const [actions, setActions] = useState<AiRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    const [h, s, a, w, act] = await Promise.allSettled([
      api.get('/maika/health-score'),
      api.get('/maika/snapshot'),
      api.get('/ai/actions/summary'),
      api.get('/workflows/runs'),
      api.get('/ai/actions?limit=200'),
    ])
    if ([h, s, a, w, act].every(r => r.status === 'rejected')) {
      setError(true); setLoading(false); return
    }
    const val = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? (r.value.data?.data ?? r.value.data ?? null) : null
    setHealth(val(h))
    setSnap(val(s))
    setAiSummary(val(a))
    setRuns((val(w) as WfRun[]) ?? [])
    setActions((val(act) as AiRun[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const wfDone = runs.filter(r => r.status === 'COMPLETED').length
  const wfFailed = runs.filter(r => r.status === 'FAILED').length
  const wfWaiting = runs.filter(r => r.status === 'WAITING_APPROVAL').length

  const breakdown = health?.breakdown ?? {}
  const healthTone = (health?.score ?? 0) >= 75 ? 'emerald' : (health?.score ?? 0) >= 50 ? 'amber' : 'red'

  // Xu hướng 14 ngày: đếm workflow run + AI action theo NGÀY (bucket client-side từ dữ liệu thật).
  const DAYS = 14
  const trend = (() => {
    const today0 = new Date(); today0.setHours(0, 0, 0, 0)
    const buckets = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(today0); d.setDate(d.getDate() - (DAYS - 1 - i))
      return { key: d.toISOString().slice(0, 10), label: `${d.getDate()}/${d.getMonth() + 1}`, workflow: 0, ai: 0 }
    })
    const idx = new Map(buckets.map((b, i) => [b.key, i]))
    for (const r of runs) {
      const k = (r.startedAt ?? r.createdAt ?? '').slice(0, 10)
      const i = idx.get(k); if (i != null) buckets[i].workflow++
    }
    for (const a of actions) {
      const k = (a.createdAt ?? '').slice(0, 10)
      const i = idx.get(k); if (i != null) buckets[i].ai++
    }
    return buckets
  })()
  const hasTrend = trend.some(b => b.workflow > 0 || b.ai > 0)

  return (
    <PageShell>
      <PageHeader
        title="KPI Monitor"
        subtitle="Chỉ số vận hành & sức khỏe CLB"
      />

      {loading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState onRetry={() => void load()} />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Health score */}
          <section className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5">
            <h3 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide mb-4 flex items-center gap-2">
              <HeartPulse size={16} className="[color:var(--pf-color-muted)]" /> Sức Khỏe CLB
            </h3>
            {!health ? (
              <p className="text-sm [color:var(--pf-color-muted)]">Không tải được điểm sức khỏe.</p>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex items-center gap-4 shrink-0">
                  <div className={`flex h-20 w-20 flex-col items-center justify-center rounded-2xl ${
                    healthTone === 'emerald' ? 'bg-emerald-50' : healthTone === 'amber' ? 'bg-amber-50' : 'bg-red-50'
                  }`}>
                    <span className={`text-3xl font-bold ${
                      healthTone === 'emerald' ? 'text-emerald-600' : healthTone === 'amber' ? 'text-amber-600' : 'text-red-600'
                    }`}>{health.score}</span>
                    <span className="text-[10px] [color:var(--pf-color-muted)]">/100</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold [color:var(--pf-text)]">{health.label ?? '—'}</p>
                    <p className="text-[11px] [color:var(--pf-color-muted)]">Điểm tổng hợp</p>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(breakdown).map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-[color:var(--pf-border)] px-3 py-2">
                      <p className="text-[11px] [color:var(--pf-color-muted)]">{BREAKDOWN_LABEL[k] ?? k}</p>
                      <p className="text-lg font-bold [color:var(--pf-text)]">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Member KPI */}
          <section>
            <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide mb-2 flex items-center gap-1.5"><Users size={13} /> Thành viên</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricCard label="Đang hoạt động" value={num(snap?.activeMembers)} icon={<Users size={16} />} sub={`${num(snap?.totalMembers)} tổng`} tone="info" />
              <MetricCard label="Chưa đóng quỹ (kỳ mở)" value={num(snap?.unpaidCount)} icon={<Users size={16} />} tone={(snap?.unpaidCount ?? 0) > 0 ? 'warning' : 'success'} />
              <MetricCard label="Tỷ lệ hoạt động" value={snap?.totalMembers ? `${Math.round((snap.activeMembers ?? 0) / snap.totalMembers * 100)}%` : '—'} icon={<TrendingUp size={16} />} tone="info" />
            </div>
          </section>

          {/* Finance KPI */}
          <section>
            <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide mb-2 flex items-center gap-1.5"><Wallet size={13} /> Tài chính</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <MetricCard label="Tổng tài sản" value={vnd(snap?.totalAssets)} icon={<Wallet size={16} />} tone={(snap?.totalAssets ?? 0) < 0 ? 'danger' : 'success'} />
              <MetricCard label="Thu (Quỹ Chính)" value={vnd(snap?.commonIncome)} icon={<TrendingUp size={16} />} tone="success" />
              <MetricCard label="Chi (Quỹ Chính)" value={vnd(snap?.commonExpense)} icon={<Wallet size={16} />} tone="info" />
            </div>
          </section>

          {/* Workflow + AI KPI */}
          <section>
            <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide mb-2 flex items-center gap-1.5"><Workflow size={13} /> Workflow & AI</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard label="Workflow hoàn tất" value={wfDone} icon={<Workflow size={16} />} sub={`${runs.length} lượt chạy`} tone="success" />
              <MetricCard label="Workflow lỗi" value={wfFailed} icon={<Workflow size={16} />} tone={wfFailed > 0 ? 'danger' : 'success'} sub={`${wfWaiting} chờ duyệt`} />
              <MetricCard label="AI chờ duyệt" value={num(aiSummary?.pendingApprovals)} icon={<Bot size={16} />} sub={`${num(aiSummary?.executedToday)} thực thi hôm nay`} tone={(aiSummary?.pendingApprovals ?? 0) > 0 ? 'warning' : 'info'} />
              <MetricCard label="AI thất bại" value={num(aiSummary?.failedActions)} icon={<Bot size={16} />} tone={(aiSummary?.failedActions ?? 0) > 0 ? 'danger' : 'success'} />
            </div>
          </section>

          {/* Xu hướng hoạt động 14 ngày */}
          <section className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5">
            <h3 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide mb-4 flex items-center gap-2">
              <Activity size={16} className="[color:var(--pf-color-muted)]" /> Xu Hướng Hoạt Động (14 ngày)
            </h3>
            {!hasTrend ? (
              <p className="text-sm [color:var(--pf-color-muted)]">Chưa đủ dữ liệu hoạt động để vẽ xu hướng.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--pf-color-muted)' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid var(--pf-border)' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="workflow" name="Workflow" fill="var(--pf-primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ai" name="Hành động AI" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <p className="text-[11px] [color:var(--pf-color-muted)] px-1 flex items-center gap-1.5">
            <Gauge size={12} /> Số liệu tài chính đọc từ Finance Engine (nguồn tài chính duy nhất) — read-only, không tự tính.
          </p>
        </div>
      )}
    </PageShell>
  )
}
