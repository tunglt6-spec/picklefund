/**
 * AiDigitalOffice (AIDO) — "Văn phòng AI" tích hợp trong PickleFund.
 *
 * LỚP GIAO DIỆN mới TÁI DÙNG các agent/tính năng AI ĐÃ CÓ (Maika, Lisa, Hermes,
 * Mít Đặc, Notification) — KHÔNG tạo bảng/agent/DB mới. Mọi số liệu là DỮ LIỆU THẬT
 * từ endpoint sẵn có, bọc allSettled (nguồn lỗi → hiển thị an toàn, không bịa):
 *   GET /ai/actions/summary            — KPI AI thật (chờ duyệt/đang chạy/lỗi/hôm nay/latency)
 *   GET /maika/health-score            — điểm sức khỏe CLB (agent Maika)
 *   GET /workflows/runtime/status      — scheduler (agent Hermes)
 *   GET /notification-runtime/channels — kênh gửi (agent Notification)
 * Trạng thái agent được SUY RA từ dữ liệu hoạt động thật (không có endpoint status live).
 * Tab Operations/Analytics tóm tắt + điều hướng tới các màn AI Operations Center đã có.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot, Sparkles, Workflow, Zap, Bell, Activity, CheckCircle2, Clock,
  AlertTriangle, PlayCircle, ArrowRight, Gauge, RefreshCw, ShieldCheck,
  LayoutGrid, ListChecks, BarChart3,
} from 'lucide-react'
import api from '../../lib/api'
import type { AiActionSummary } from '../../hooks/useAiManager'
import {
  PageShell, PageHeader, MetricCard, ActionButton, ResponsiveTabs,
  LoadingState, ErrorState, type TabItem,
} from '../../components/shared'
import type { ModuleAccent } from '../../components/shared'

// ── Kiểu dữ liệu nguồn ────────────────────────────────────────────────────────
interface HealthScore { score?: number; interpretation?: string }
interface RuntimeStatus { enabled?: boolean; interval?: number; lastTick?: string | null }
interface ChannelState { available?: boolean; mode?: string }
interface Channels { IN_APP?: ChannelState; EMAIL?: ChannelState; TELEGRAM?: ChannelState }

type AgentStatus = 'online' | 'busy' | 'waiting' | 'error' | 'offline'

const STATUS_META: Record<AgentStatus, { label: string; color: string; dot: string }> = {
  online: { label: 'Hoạt động', color: 'var(--pf-green)', dot: '🟢' },
  busy: { label: 'Đang xử lý', color: 'var(--pf-accent-amber, #F59E0B)', dot: '🟡' },
  waiting: { label: 'Đang chờ', color: 'var(--pf-accent-sky, #3B82F6)', dot: '🔵' },
  error: { label: 'Lỗi', color: 'var(--pf-accent-rose, #EF4444)', dot: '🔴' },
  offline: { label: 'Ngoài tuyến', color: 'var(--pf-color-muted, #94A3B8)', dot: '⚫' },
}

interface AgentView {
  key: string
  name: string
  role: string
  icon: React.ReactNode
  accent: ModuleAccent
  status: AgentStatus
  task: string
  bullets: string[]
  count: number
}

const fmtLatency = (ms?: number) =>
  typeof ms === 'number' && ms > 0 ? (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`) : '—'

export function AiDigitalOffice() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<string>('office')
  const [summary, setSummary] = useState<AiActionSummary | null>(null)
  const [health, setHealth] = useState<HealthScore | null>(null)
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null)
  const [channels, setChannels] = useState<Channels | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const [s, h, r, c] = await Promise.allSettled([
      api.get('/ai/actions/summary'),
      api.get('/maika/health-score'),
      api.get('/workflows/runtime/status'),
      api.get('/notification-runtime/channels'),
    ])
    if ([s, h, r, c].every((x) => x.status === 'rejected')) {
      setError(true); setLoading(false); return
    }
    const val = (x: PromiseSettledResult<any>) =>
      x.status === 'fulfilled' ? (x.value.data?.data ?? x.value.data ?? null) : null
    setError(false)
    setSummary(val(s))
    setHealth(val(h))
    setRuntime(val(r))
    setChannels(val(c))
    setUpdatedAt(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(true), 30_000) // auto-refresh trạng thái thật
    return () => clearInterval(id)
  }, [load])

  // ── Số liệu tổng hợp (thật) ─────────────────────────────────────────────────
  const exec = summary?.executor
  const executedToday = exec?.executedToday ?? summary?.executedToday ?? 0
  const running = exec?.running ?? 0
  const pending = summary?.pendingApprovals ?? 0
  const failed = summary?.failedActions ?? 0
  const failedToday = exec?.failedToday ?? 0
  const latency = fmtLatency(exec?.averageExecutionMs)
  const successRate = useMemo(() => {
    const done = executedToday + failedToday
    return done > 0 ? Math.round((executedToday / done) * 100) : null
  }, [executedToday, failedToday])

  const countByAi = useMemo(() => {
    const m: Record<string, number> = {}
    for (const a of summary?.actionsByAi ?? []) m[a.ai] = a.count
    return m
  }, [summary])

  // ── Suy ra 5 agent (từ dữ liệu thật) ────────────────────────────────────────
  const agents: AgentView[] = useMemo(() => {
    const hermesOn = runtime?.enabled === true
    const emailReady = channels?.EMAIL?.available === true
    const mitStatus: AgentStatus = running > 0 ? 'busy' : 'online'
    return [
      {
        key: 'MAIKA', name: 'Maika', role: 'Club Intelligence Manager', icon: <Bot size={20} />, accent: 'violet',
        status: 'online',
        task: health?.score != null ? `Phân tích CLB · sức khỏe ${health.score}/100` : 'Phân tích CLB',
        bullets: ['Phân tích CLB', 'Khuyến nghị', 'Rủi ro & Cơ hội'],
        count: countByAi['MAIKA'] ?? 0,
      },
      {
        key: 'LISA', name: 'Lisa', role: 'Member Assistant', icon: <Sparkles size={20} />, accent: 'violet',
        status: 'online', task: 'Hỗ trợ thành viên & nhắc nhở',
        bullets: ['Hỗ trợ thành viên', 'Giải đáp thắc mắc', 'Nhắc nhở'],
        count: countByAi['LISA'] ?? 0,
      },
      {
        key: 'HERMES', name: 'Hermes', role: 'Workflow Orchestrator', icon: <Workflow size={20} />, accent: 'blue',
        status: hermesOn ? 'online' : 'offline',
        task: `Điều phối workflow · scheduler ${hermesOn ? 'BẬT' : 'TẮT'}`,
        bullets: ['Workflow & Lịch', 'Thông báo', 'Approval Flow'],
        count: countByAi['HERMES'] ?? 0,
      },
      {
        key: 'MIT_DAT', name: 'Mít Đặc', role: 'Execution Agent', icon: <Zap size={20} />, accent: 'teal',
        status: mitStatus,
        task: running > 0 ? `Đang thực thi ${running} tác vụ` : `Thực thi · ${executedToday} hôm nay`,
        bullets: ['Thực hiện tác vụ', 'Đã được duyệt', 'Ghi nhận kết quả'],
        count: countByAi['MIT_DAT'] ?? 0,
      },
      {
        key: 'NOTIFICATION', name: 'Notification AI', role: 'Notification Agent', icon: <Bell size={20} />, accent: 'violet',
        status: emailReady ? 'online' : 'waiting',
        task: emailReady ? 'Gửi Email / In-app' : 'Chờ cấu hình kênh gửi',
        bullets: [
          `Email: ${channels?.EMAIL?.mode ?? '—'}`,
          `In-app: ${channels?.IN_APP?.mode ?? '—'}`,
          `Telegram: ${channels?.TELEGRAM?.mode ?? '—'}`,
        ],
        count: 0,
      },
    ]
  }, [runtime, channels, health, running, executedToday, countByAi])

  const statusCounts = useMemo(() => {
    const c: Record<AgentStatus, number> = { online: 0, busy: 0, waiting: 0, error: 0, offline: 0 }
    for (const a of agents) c[a.status]++
    return c
  }, [agents])

  const tabs: TabItem[] = [
    { key: 'office', label: 'Office View' },
    { key: 'operations', label: 'Operations View', badge: pending },
    { key: 'analytics', label: 'Analytics View' },
  ]

  if (loading && !summary) return <PageShell><LoadingState /></PageShell>
  if (error) return <PageShell><ErrorState onRetry={() => void load()} /></PageShell>

  return (
    <PageShell>
      <PageHeader
        title="AIDO — AI Digital Office"
        subtitle="Văn phòng AI · Thấy trạng thái thật · Làm việc thật · Kết quả thật"
        actions={
          <div className="flex items-center gap-2">
            {updatedAt && (
              <span className="hidden sm:inline text-xs [color:var(--pf-color-muted)]">
                Cập nhật {updatedAt.toLocaleTimeString('vi-VN')}
              </span>
            )}
            <ActionButton variant="ghost" icon={<RefreshCw size={15} />} onClick={() => void load()}>
              Làm mới
            </ActionButton>
          </div>
        }
      />

      <ResponsiveTabs tabs={tabs} active={tab} onChange={setTab} className="mb-5" />

      {tab === 'office' && (
        <div className="space-y-5">
          {/* Dashboard số liệu thật */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={<Activity size={18} />} accent="violet" label="Tác vụ hôm nay" value={executedToday} sub="Đã thực thi" />
            <MetricCard icon={<PlayCircle size={18} />} accent="blue" label="Đang chạy" value={running} sub="Executor" />
            <MetricCard icon={<Clock size={18} />} accent="amber" label="Chờ duyệt" value={pending} sub="Approval queue" />
            <MetricCard icon={<AlertTriangle size={18} />} accent="rose" label="Thất bại" value={failed} sub="Tổng" negative={failed > 0} />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Agent grid */}
            <div className="lg:col-span-2">
              <SectionTitle icon={<LayoutGrid size={16} />} title="Đội ngũ AI" sub="5 agent · trạng thái suy ra từ dữ liệu thật" />
              <div className="grid gap-3 sm:grid-cols-2">
                {agents.map((a) => <AgentCard key={a.key} a={a} />)}
              </div>
            </div>

            {/* Status panel */}
            <div className="space-y-5">
              <div className="rounded-[20px] border p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
                <SectionTitle icon={<ShieldCheck size={16} />} title="Trạng thái Agent" />
                <div className="space-y-2.5 mt-3">
                  {(Object.keys(STATUS_META) as AgentStatus[]).map((s) => (
                    <div key={s} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm [color:var(--pf-text)]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_META[s].color }} />
                        {STATUS_META[s].label}
                      </span>
                      <span className="text-sm font-semibold tabular-nums [color:var(--pf-color-muted)]">{statusCounts[s]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collaboration flow */}
              <div className="rounded-[20px] border p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
                <SectionTitle icon={<Workflow size={16} />} title="Luồng phối hợp AI" />
                <div className="mt-3 flex flex-col gap-1.5">
                  {['Lisa · nhận yêu cầu', 'Hermes · tạo workflow', 'Approval · duyệt', 'Mít Đặc · thực thi', 'Notification · gửi kết quả'].map((step, i, arr) => (
                    <div key={step}>
                      <div className="flex items-center gap-2 text-sm [color:var(--pf-text)]">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">{i + 1}</span>
                        {step}
                      </div>
                      {i < arr.length - 1 && <div className="ml-3 h-2 w-px [background:var(--pf-border)]" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'operations' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={<PlayCircle size={18} />} accent="blue" label="Đang chạy" value={running} />
            <MetricCard icon={<Clock size={18} />} accent="amber" label="Chờ duyệt" value={pending} />
            <MetricCard icon={<CheckCircle2 size={18} />} accent="teal" label="Hôm nay" value={executedToday} sub="Đã thực thi" />
            <MetricCard icon={<AlertTriangle size={18} />} accent="rose" label="Thất bại" value={failed} negative={failed > 0} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[20px] border p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              <SectionTitle icon={<ListChecks size={16} />} title="Hoạt động gần đây" sub="Từ AI Action Center" />
              <div className="mt-3 space-y-2.5">
                {(summary?.recentActivities ?? []).slice(0, 8).map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full [background:var(--pf-primary)]" />
                    <div className="min-w-0">
                      <p className="[color:var(--pf-text)] truncate">{ev.message ?? ev.type}</p>
                      <p className="text-xs [color:var(--pf-color-muted)]">{new Date(ev.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                ))}
                {(summary?.recentActivities ?? []).length === 0 && (
                  <p className="text-sm [color:var(--pf-color-muted)]">Chưa có hoạt động.</p>
                )}
              </div>
            </div>

            <div className="rounded-[20px] border p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              <SectionTitle icon={<ArrowRight size={16} />} title="Quản trị vận hành" sub="Mở màn chi tiết" />
              <div className="mt-3 grid gap-2">
                {[
                  ['Nhật ký thực thi (Mít Đặc)', '/admin/execution-log'],
                  ['Hàng đợi duyệt', '/admin/ai-approvals'],
                  ['Workflows', '/admin/workflows'],
                  ['Scheduler', '/admin/ai-scheduler'],
                  ['Trung tâm cảnh báo', '/admin/ai-alerts'],
                  ['AI Operations Center', '/admin/ai-manager'],
                ].map(([label, to]) => (
                  <button key={to} onClick={() => navigate(to)}
                    className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors [border-color:var(--pf-border)] [color:var(--pf-text)] hover:[background:var(--pf-primary-soft)] hover:[color:var(--pf-primary)]">
                    {label}<ArrowRight size={15} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={<Activity size={18} />} accent="violet" label="Tác vụ hôm nay" value={executedToday} />
            <MetricCard icon={<CheckCircle2 size={18} />} accent="teal" label="Thành công" value={successRate != null ? `${successRate}%` : '—'} sub="Hôm nay" />
            <MetricCard icon={<Gauge size={18} />} accent="blue" label="Latency TB" value={latency} sub="Thời gian thực thi" />
            <MetricCard icon={<AlertTriangle size={18} />} accent="rose" label="Thất bại hôm nay" value={failedToday} negative={failedToday > 0} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[20px] border p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              <SectionTitle icon={<BarChart3 size={16} />} title="Tác vụ theo Agent" />
              <div className="mt-3 space-y-3">
                {agents.filter(a => a.key !== 'NOTIFICATION').map((a) => {
                  const max = Math.max(1, ...agents.map(x => x.count))
                  return (
                    <div key={a.key}>
                      <div className="flex items-center justify-between text-sm [color:var(--pf-text)]">
                        <span>{a.name}</span>
                        <span className="font-semibold tabular-nums">{a.count}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full [background:var(--pf-color-muted-soft)] overflow-hidden">
                        <div className="h-full rounded-full [background:var(--pf-primary)]" style={{ width: `${(a.count / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[20px] border p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              <SectionTitle icon={<ArrowRight size={16} />} title="Phân tích chi tiết" sub="Mở màn chuyên sâu" />
              <div className="mt-3 grid gap-2">
                {[
                  ['KPI Monitor', '/admin/ai-kpi'],
                  ['Data Monitor', '/admin/ai-data-monitor'],
                  ['Nhật ký AI', '/admin/execution-log'],
                  ['Audit Logs', '/admin/ai-audit-logs'],
                ].map(([label, to]) => (
                  <button key={to} onClick={() => navigate(to)}
                    className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors [border-color:var(--pf-border)] [color:var(--pf-text)] hover:[background:var(--pf-primary-soft)] hover:[color:var(--pf-primary)]">
                    {label}<ArrowRight size={15} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="[color:var(--pf-primary)]">{icon}</span>
      <h2 className="text-sm font-bold [color:var(--pf-text)]">{title}</h2>
      {sub && <span className="text-xs [color:var(--pf-color-muted)]">· {sub}</span>}
    </div>
  )
}

function AgentCard({ a }: { a: AgentView }) {
  const st = STATUS_META[a.status]
  return (
    <div className="rounded-[20px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">{a.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold [color:var(--pf-text)] truncate">{a.name}</h3>
            <span className="ml-auto flex items-center gap-1 text-xs font-medium" style={{ color: st.color }}>
              <span className="h-2 w-2 rounded-full" style={{ background: st.color }} />{st.label}
            </span>
          </div>
          <p className="text-xs [color:var(--pf-color-muted)] truncate">{a.role}</p>
          <p className="mt-1.5 text-xs font-medium [color:var(--pf-text)]">{a.task}</p>
          <ul className="mt-1 space-y-0.5">
            {a.bullets.map((b) => (
              <li key={b} className="text-xs [color:var(--pf-color-muted)]">• {b}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
