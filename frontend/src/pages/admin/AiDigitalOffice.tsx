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
  LayoutGrid, ListChecks, BarChart3, Inbox, GitBranch, ShieldAlert, PieChart, CalendarDays,
} from 'lucide-react'
import api from '../../lib/api'
import type { AiActionSummary, AiActionListItem } from '../../hooks/useAiManager'
import {
  PageShell, PageHeader, MetricCard, ActionButton, ResponsiveTabs,
  LoadingState, ErrorState, type TabItem,
} from '../../components/shared'
import type { ModuleAccent } from '../../components/shared'
import { useAidoSocket } from '../../hooks/useAidoSocket'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { buildNotifications } from '../../lib/notifications'
// Gộp vào AIDO làm tab (tái dùng nguyên màn đã có — không đổi nghiệp vụ).
import { WorkflowRules } from './workflows/WorkflowRules'
import { MitDacExecutionLog } from './ai/MitDacExecutionLog'

// ── Kiểu dữ liệu nguồn ────────────────────────────────────────────────────────
interface HealthScore { score?: number; interpretation?: string }
interface RuntimeStatus { enabled?: boolean; interval?: number; lastTick?: string | null }
interface ChannelState { available?: boolean; mode?: string }
interface Channels { IN_APP?: ChannelState; EMAIL?: ChannelState; TELEGRAM?: ChannelState }
interface WorkflowRun {
  id: string
  triggerType?: string
  status?: string
  createdAt?: string
  startedAt?: string | null
  completedAt?: string | null
}

/** Màu/nhãn mức rủi ro của hành động AI. */
const RISK_META: Record<string, { label: string; color: string }> = {
  low: { label: 'Thấp', color: 'var(--pf-green)' },
  medium: { label: 'Trung bình', color: 'var(--pf-accent-amber, #F59E0B)' },
  high: { label: 'Cao', color: '#FB923C' },
  critical: { label: 'Nghiêm trọng', color: 'var(--pf-accent-rose, #EF4444)' },
}
/** Màu/nhãn trạng thái workflow run (Hermes). */
const RUN_STATUS_META: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: 'Hoàn tất', color: 'var(--pf-green)' },
  RUNNING: { label: 'Đang chạy', color: 'var(--pf-accent-sky, #3B82F6)' },
  PENDING: { label: 'Chờ', color: 'var(--pf-accent-amber, #F59E0B)' },
  FAILED: { label: 'Thất bại', color: 'var(--pf-accent-rose, #EF4444)' },
  CANCELLED: { label: 'Đã hủy', color: 'var(--pf-color-muted, #94A3B8)' },
}
const riskMeta = (r?: string) =>
  RISK_META[(r ?? '').toLowerCase()] ?? { label: r ?? '—', color: 'var(--pf-primary)' }
const runMeta = (s?: string) =>
  RUN_STATUS_META[(s ?? '').toUpperCase()] ?? { label: s ?? '—', color: 'var(--pf-color-muted, #94A3B8)' }

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

/**
 * Vị trí (% ngang) TÂM mỗi nhân vật trong banner office-banner.png (1837×802), dò CHÍNH XÁC
 * từ pixel (màu tóc). Dùng để đặt thẻ agent DOM + chấm trạng thái ngay trên đầu nhân vật.
 * Đầu nhân vật ~43% chiều cao ảnh. Mỗi agent 1 MÀU thương hiệu (viền chạy + header thẻ).
 */
const BANNER_POS: Record<string, { left: string; color: string; dur: string }> = {
  LISA: { left: '11.8%', color: '#3B82F6', dur: '7.2s' },
  MAIKA: { left: '32.1%', color: '#7C5CFC', dur: '6.4s' },
  HERMES: { left: '50.2%', color: '#14B8A6', dur: '6.0s' },
  MIT_DAT: { left: '67.9%', color: '#F59E0B', dur: '7.6s' },
  NOTIFICATION: { left: '87%', color: '#EC4899', dur: '6.8s' },
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
  // Trạng thái hoạt động THẬT của agent (busy khi đang xử lý) — từ /aido/agent-activity + WS.
  const [activity, setActivity] = useState<Record<string, { status: string; task?: string }>>({})
  // Nhịp nền (heartbeat) — Văn phòng AI đang sống; cập nhật liên tục qua WS, KHÔNG gọi API.
  const [beatAt, setBeatAt] = useState<number | null>(null)
  // Dữ liệu chi tiết cho Operations/Analytics (đều là endpoint THẬT sẵn có).
  const [pendingList, setPendingList] = useState<AiActionListItem[]>([])
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  // Cảnh báo vận hành THẬT (Maika) cho Office View.
  const [opsSignals, setOpsSignals] = useState<{ code?: string; level?: string; message?: string }[]>([])

  // Lịch hôm nay + thông báo chưa đọc — tái dùng client store (đã sync), không gọi thêm API.
  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
  const clubData = useClubDataStore((s) => s.getClubData(clubId))
  const readNotifIds = useClubDataStore((s) => s.readNotifIds)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const [s, h, r, c, a, pq, wr, al] = await Promise.allSettled([
      api.get('/ai/actions/summary'),
      api.get('/maika/health-score'),
      api.get('/workflows/runtime/status'),
      api.get('/notification-runtime/channels'),
      api.get('/aido/agent-activity'),
      api.get('/ai/actions?status=PENDING_APPROVAL&limit=10'),
      api.get('/workflows/runs'),
      api.get('/ai/maika/operational-alerts'),
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
    if (a.status === 'fulfilled') setActivity(val(a) ?? {})
    if (pq.status === 'fulfilled') setPendingList(val(pq) ?? [])
    if (wr.status === 'fulfilled') setRuns(val(wr) ?? [])
    if (al.status === 'fulfilled') setOpsSignals(val(al) ?? [])
    setUpdatedAt(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(true), 30_000) // fallback polling (WebSocket là kênh chính)
    return () => clearInterval(id)
  }, [load])

  // Real-time: WS đẩy 'presence' (nhịp nền, không refetch), 'agent-activity' (busy/online → cập
  // nhật ngay), còn lại ('ai-action') → refetch.
  const { connected } = useAidoSocket((payload) => {
    if (payload?.type === 'presence') {
      setBeatAt(payload.at ?? Date.now())
    } else if (payload?.type === 'agent-activity' && payload.agent) {
      setActivity((prev) => ({ ...prev, [payload.agent!]: { status: payload.status ?? 'online', task: payload.task } }))
      setUpdatedAt(new Date())
    } else {
      void load(true)
    }
  })

  // "Sống" = có nhịp nền trong ~30s gần nhất (chứng minh backend AI đang chạy nền).
  const alive = connected && beatAt != null && Date.now() - beatAt < 30_000

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

  // Thông báo chưa đọc (client store, giống MobileHeader).
  const unreadNotif = useMemo(() => {
    const ids = new Set<string>(readNotifIds[clubId] ?? [])
    return buildNotifications(clubData).filter((n) => !ids.has(n.id)).length
  }, [clubData, readNotifIds, clubId])

  // Lịch hôm nay (buổi chơi trong ngày) — từ client store, giống ClubDashboard.
  const todaySessions = useMemo(() => {
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, '0')
    const tk = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    return (clubData.sessions ?? [])
      .filter((s: any) => (s.sessionDate ?? '').slice(0, 10) === tk)
      .sort((a: any, b: any) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  }, [clubData.sessions])

  // ── Suy ra 5 agent (từ dữ liệu thật) ────────────────────────────────────────
  const agents: AgentView[] = useMemo(() => {
    const hermesOn = runtime?.enabled === true
    const emailReady = channels?.EMAIL?.available === true
    const mitStatus: AgentStatus = running > 0 ? 'busy' : 'online'
    const base: AgentView[] = [
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
        // Hermes LUÔN sẵn sàng (chạy khi được gọi: run-now / dispatch / event). Timer scheduler
        // BẬT/TẮT chỉ là chi tiết phụ — KHÔNG đồng nghĩa agent offline. Khi đang dispatch thật
        // sẽ chuyển 'busy' qua cơ chế activity (override bên dưới).
        status: 'online',
        task: `Điều phối workflow · lịch tự động ${hermesOn ? 'BẬT' : 'TẮT (chạy thủ công)'}`,
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
    // Override bằng hoạt động THẬT: agent đang xử lý (từ WS/endpoint) → busy + task cụ thể.
    return base.map((a) => {
      const act = activity[a.key]
      return act?.status === 'busy'
        ? { ...a, status: 'busy' as AgentStatus, task: act.task ?? a.task }
        : a
    })
  }, [runtime, channels, health, running, executedToday, countByAi, activity])

  const statusCounts = useMemo(() => {
    const c: Record<AgentStatus, number> = { online: 0, busy: 0, waiting: 0, error: 0, offline: 0 }
    for (const a of agents) c[a.status]++
    return c
  }, [agents])

  const tabs: TabItem[] = [
    { key: 'office', label: 'Office View' },
    { key: 'operations', label: 'Operations View', badge: pending },
    { key: 'analytics', label: 'Analytics View' },
    { key: 'workflows', label: 'Workflows' },
    { key: 'ai-log', label: 'Nhật ký AI' },
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
            <span
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium [border-color:var(--pf-border)]"
              style={{ color: alive ? 'var(--pf-green)' : 'var(--pf-color-muted, #94A3B8)' }}
              title={beatAt ? `Nhịp nền lúc ${new Date(beatAt).toLocaleTimeString('vi-VN')}` : 'Chưa nhận nhịp nền'}
            >
              <LiveDot color={alive ? 'var(--pf-green)' : 'var(--pf-color-muted, #94A3B8)'} size={7} active={alive} />
              {alive ? 'AI nền: đang chạy' : 'AI nền: chờ…'}
            </span>
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
          {/* Office BANNER ngang (pixel-art) + phủ THẺ AGENT DOM trên mỗi nhân vật (mẫu v2.1) */}
          <div>
            <style>{`
              @property --aido-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
              @keyframes aido-spin { to { --aido-a: 360deg; } }
              .aido-card { position: relative; }
              .aido-card::before {
                content: ''; position: absolute; inset: 0; border-radius: 14px; padding: 2px;
                background: conic-gradient(from var(--aido-a), transparent 0 62%, var(--aido-c) 80%, transparent 92%);
                -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                -webkit-mask-composite: xor; mask-composite: exclude;
                animation: aido-spin var(--aido-dur, 6s) linear infinite; pointer-events: none;
              }
              @media (prefers-reduced-motion: reduce) { .aido-card::before { animation: none; } }
            `}</style>
            <div
              className="relative mx-auto w-full overflow-hidden rounded-[20px] border [border-color:var(--pf-border)] [box-shadow:var(--pf-shadow)]"
              style={{ maxWidth: 1837 }}
            >
              <img
                src="/aido/office-banner.png"
                alt="AIDO — Văn phòng AI"
                className="block w-full"
                style={{ aspectRatio: '1837 / 540' }}
              />

              {/* Badge REAL-TIME */}
              <div
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                style={{ background: 'rgba(17,24,39,0.72)' }}
              >
                <LiveDot color={connected ? 'var(--pf-green)' : 'var(--pf-accent-amber, #F59E0B)'} size={8} active={connected} />
                {connected ? 'REAL-TIME' : 'ĐỊNH KỲ'}{updatedAt ? ` · ${updatedAt.toLocaleTimeString('vi-VN')}` : ''}
              </div>

              {/* Thẻ agent DOM — đặt NGAY TRÊN đầu mỗi nhân vật (đầu ~43% ⇒ bottom 57%) */}
              {agents.filter((a) => BANNER_POS[a.key]).map((a) => {
                const pos = BANNER_POS[a.key]
                const st = STATUS_META[a.status]
                return (
                  <div
                    key={a.key}
                    className="absolute -translate-x-1/2"
                    style={{ left: pos.left, bottom: '67%', width: 'clamp(104px, 15%, 208px)' }}
                  >
                    <div
                      className="aido-card overflow-hidden rounded-[14px] border bg-white/95 shadow-lg backdrop-blur-sm [border-color:var(--pf-border)]"
                      style={{ ['--aido-c' as string]: pos.color, ['--aido-dur' as string]: pos.dur }}
                    >
                      <div className="px-2 py-1" style={{ background: pos.color }}>
                        <p className="truncate text-[11px] font-bold leading-tight text-white">{a.name}</p>
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="flex items-center gap-1 text-[10px] font-semibold leading-tight" style={{ color: st.color }}>
                          <LiveDot color={st.color} size={6} active={a.status !== 'offline'} />
                          <span className="truncate">{st.label}</span>
                        </p>
                        <ul className="mt-0.5 hidden space-y-px sm:block">
                          {a.bullets.slice(0, 3).map((b) => (
                            <li key={b} className="truncate text-[9px] leading-tight [color:var(--pf-color-muted)]">• {b}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {/* mũi nhọn chỉ xuống nhân vật */}
                    <div
                      className="mx-auto h-0 w-0"
                      style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `7px solid ${pos.color}` }}
                    />
                  </div>
                )
              })}
            </div>
            <p className="mt-1.5 text-center text-xs [color:var(--pf-color-muted)]">
              Văn phòng AI · thẻ trên mỗi nhân vật = trạng thái thật · viền chạy = đang làm việc
            </p>
          </div>

          {/* Dashboard số liệu thật (5 thẻ như mẫu) */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard icon={<Activity size={18} />} accent="violet" label="Tác vụ hôm nay" value={executedToday} sub="Đã thực thi" />
            <MetricCard icon={<PlayCircle size={18} />} accent="blue" label="Đang chạy" value={running} sub="Executor" />
            <MetricCard icon={<Clock size={18} />} accent="amber" label="Chờ duyệt" value={pending} sub="Approval queue" />
            <MetricCard icon={<AlertTriangle size={18} />} accent="rose" label="Thất bại" value={failed} sub="Tổng" negative={failed > 0} />
            <MetricCard icon={<Bell size={18} />} accent="teal" label="Thông báo chưa đọc" value={unreadNotif} sub="Chưa xem" />
          </div>

          {/* Trung tâm điều hành — 3 panel DỮ LIỆU THẬT (như mockup) */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Việc cần xử lý = hàng đợi duyệt AI */}
            <Panel icon={<Inbox size={16} />} title="Việc cần xử lý" sub={`${pending} chờ duyệt`}>
              {pendingList.length === 0 ? (
                <p className="text-sm [color:var(--pf-color-muted)]">Không có việc cần xử lý.</p>
              ) : (
                <div className="space-y-2">
                  {pendingList.slice(0, 5).map((p) => {
                    const rk = riskMeta(p.riskLevel)
                    return (
                      <button key={p.id} onClick={() => navigate('/admin/ai-approvals')}
                        className="flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors [border-color:var(--pf-border)] hover:[background:var(--pf-primary-soft)]">
                        <span className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ background: `color-mix(in srgb, ${rk.color} 16%, transparent)`, color: rk.color }}>{rk.label}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium [color:var(--pf-text)]">{p.title}</p>
                          <p className="truncate text-xs [color:var(--pf-color-muted)]">{p.requestedByAi} · {new Date(p.createdAt).toLocaleString('vi-VN')}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </Panel>

            {/* Lịch hôm nay = buổi chơi trong ngày (client store) */}
            <Panel icon={<CalendarDays size={16} />} title="Lịch hôm nay" sub="Buổi chơi trong ngày">
              {todaySessions.length === 0 ? (
                <p className="text-sm [color:var(--pf-color-muted)]">Hôm nay chưa có buổi chơi nào.</p>
              ) : (
                <div className="space-y-2">
                  {todaySessions.slice(0, 5).map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 [border-color:var(--pf-border)]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [background:var(--pf-primary-soft)] [color:var(--pf-primary)]"><Clock size={14} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium [color:var(--pf-text)]">{[s.startTime, s.endTime].filter(Boolean).join(' – ') || 'Buổi chơi'}</p>
                        <p className="truncate text-xs [color:var(--pf-color-muted)]">{s.courtName || 'Chưa rõ sân'}</p>
                      </div>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">{s._count?.attendanceRecords ?? 0} người</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Cảnh báo & lưu ý = tín hiệu vận hành Maika */}
            <Panel icon={<AlertTriangle size={16} />} title="Cảnh báo & lưu ý" sub="Tín hiệu vận hành">
              {opsSignals.length === 0 ? (
                <div className="flex items-start gap-2 rounded-xl border px-3 py-2.5 [border-color:var(--pf-border)]">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--pf-green)' }} />
                  <p className="text-sm [color:var(--pf-text)]">Hệ thống AI ổn định · {failed === 0 ? 'không có lỗi tồn đọng' : `${failed} tác vụ lỗi cần xem`}.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {opsSignals.slice(0, 6).map((sig, i) => {
                    const c = sig.level === 'warning'
                      ? 'var(--pf-accent-rose, #EF4444)'
                      : sig.level === 'attention'
                        ? 'var(--pf-accent-amber, #F59E0B)'
                        : 'var(--pf-accent-sky, #3B82F6)'
                    return (
                      <div key={sig.code ?? i} className="flex items-start gap-2 rounded-xl border px-3 py-2.5 [border-color:var(--pf-border)]">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />
                        <p className="text-sm [color:var(--pf-text)]">{sig.message}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>
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
            {/* Hàng đợi chờ duyệt — dữ liệu THẬT từ AI Action Center */}
            <Panel icon={<Inbox size={16} />} title="Hàng đợi chờ duyệt" sub={`${pending} hành động`}>
              {pendingList.length === 0 ? (
                <p className="text-sm [color:var(--pf-color-muted)]">Không có hành động nào chờ duyệt.</p>
              ) : (
                <div className="space-y-2">
                  {pendingList.slice(0, 8).map((p) => {
                    const rk = riskMeta(p.riskLevel)
                    return (
                      <button key={p.id} onClick={() => navigate('/admin/ai-approvals')}
                        className="flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors [border-color:var(--pf-border)] hover:[background:var(--pf-primary-soft)]">
                        <span className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ background: `color-mix(in srgb, ${rk.color} 16%, transparent)`, color: rk.color }}>{rk.label}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium [color:var(--pf-text)] truncate">{p.title}</p>
                          <p className="text-xs [color:var(--pf-color-muted)] truncate">
                            {p.requestedByAi} · {p.targetModule ?? '—'} · {new Date(p.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                  {pending > Math.min(pendingList.length, 8) && (
                    <button onClick={() => navigate('/admin/ai-approvals')}
                      className="mt-1 flex w-full items-center justify-center gap-1 text-xs font-semibold [color:var(--pf-primary)]">
                      Xem tất cả hàng đợi <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              )}
            </Panel>

            {/* Workflow runs gần đây — dữ liệu THẬT từ Hermes */}
            <Panel icon={<GitBranch size={16} />} title="Workflow runs gần đây" sub="Hermes">
              {runs.length === 0 ? (
                <p className="text-sm [color:var(--pf-color-muted)]">Chưa có workflow run nào.</p>
              ) : (
                <div className="space-y-2">
                  {runs.slice(0, 8).map((run) => {
                    const rs = runMeta(run.status)
                    return (
                      <div key={run.id} className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 [border-color:var(--pf-border)]">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: rs.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm [color:var(--pf-text)] truncate">{run.triggerType ?? 'workflow'}</p>
                          <p className="text-xs [color:var(--pf-color-muted)]">
                            {run.createdAt ? new Date(run.createdAt).toLocaleString('vi-VN') : '—'}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold" style={{ color: rs.color }}>{rs.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>
          </div>

          {/* Hoạt động gần đây */}
          <Panel icon={<ListChecks size={16} />} title="Hoạt động gần đây" sub="Từ AI Action Center">
            {(summary?.recentActivities ?? []).length === 0 ? (
              <p className="text-sm [color:var(--pf-color-muted)]">Chưa có hoạt động.</p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {(summary?.recentActivities ?? []).slice(0, 8).map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full [background:var(--pf-primary)]" />
                    <div className="min-w-0">
                      <p className="[color:var(--pf-text)] truncate">{ev.message ?? ev.type}</p>
                      <p className="text-xs [color:var(--pf-color-muted)]">{new Date(ev.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Điều hướng quản trị */}
          <Panel icon={<ArrowRight size={16} />} title="Quản trị vận hành" sub="Mở màn chi tiết">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
          </Panel>
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
            {/* Tác vụ theo Agent */}
            <Panel icon={<BarChart3 size={16} />} title="Tác vụ theo Agent" sub="Tổng số hành động">
              <div className="space-y-3">
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
            </Panel>

            {/* Phân bố theo mức rủi ro — dữ liệu THẬT (actionsByRisk) */}
            <Panel icon={<ShieldAlert size={16} />} title="Phân bố theo rủi ro" sub="Toàn bộ hành động">
              {(summary?.actionsByRisk ?? []).length === 0 ? (
                <p className="text-sm [color:var(--pf-color-muted)]">Chưa có dữ liệu.</p>
              ) : (
                <div className="space-y-3">
                  {(summary?.actionsByRisk ?? []).map((rk) => {
                    const meta = riskMeta(rk.risk)
                    const max = Math.max(1, ...(summary?.actionsByRisk ?? []).map(x => x.count))
                    return (
                      <div key={rk.risk}>
                        <div className="flex items-center justify-between text-sm [color:var(--pf-text)]">
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />{meta.label}
                          </span>
                          <span className="font-semibold tabular-nums">{rk.count}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full [background:var(--pf-color-muted-soft)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(rk.count / max) * 100}%`, background: meta.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Tổng quan hành động (tích lũy) — dữ liệu THẬT từ summary */}
            <Panel icon={<PieChart size={16} />} title="Tổng quan hành động" sub="Tích lũy">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Chờ duyệt', value: pending, color: 'var(--pf-accent-amber, #F59E0B)' },
                  { label: 'Đã duyệt', value: summary?.approvedActions ?? 0, color: 'var(--pf-accent-sky, #3B82F6)' },
                  { label: 'Từ chối', value: summary?.rejectedActions ?? 0, color: 'var(--pf-color-muted, #94A3B8)' },
                  { label: 'Thất bại', value: failed, color: 'var(--pf-accent-rose, #EF4444)' },
                ].map((it) => (
                  <div key={it.label} className="rounded-xl border px-3 py-3 [border-color:var(--pf-border)]">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
                      <span className="text-xs [color:var(--pf-color-muted)]">{it.label}</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold tabular-nums [color:var(--pf-text)]">{it.value}</p>
                  </div>
                ))}
              </div>
              {typeof summary?.averageApprovalTime === 'number' && summary.averageApprovalTime > 0 && (
                <p className="mt-3 text-xs [color:var(--pf-color-muted)]">
                  Thời gian duyệt trung bình: <span className="font-semibold [color:var(--pf-text)]">{fmtLatency(summary.averageApprovalTime)}</span>
                </p>
              )}
            </Panel>

            {/* Phân tích chi tiết */}
            <Panel icon={<ArrowRight size={16} />} title="Phân tích chi tiết" sub="Mở màn chuyên sâu">
              <div className="grid gap-2">
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
            </Panel>
          </div>
        </div>
      )}

      {/* Gộp từ menu cũ — tái dùng nguyên màn. Huỷ padding PageShell (âm margin) để màn con
          full-bleed, không bị đúp khung/lề. */}
      {tab === 'workflows' && (
        <div className="-mx-4 -my-4 sm:-mx-6 sm:-my-6">
          <WorkflowRules />
        </div>
      )}
      {tab === 'ai-log' && (
        <div className="-mx-4 -my-4 sm:-mx-6 sm:-my-6">
          <MitDacExecutionLog />
        </div>
      )}
    </PageShell>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
/** Đèn trạng thái nhấp nháy: chấm màu + vòng "ping" lan tỏa khi agent đang hoạt động. */
function LiveDot({ color, size = 10, active = true, ring }: { color: string; size?: number; active?: boolean; ring?: string }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {active && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
          style={{ background: color }}
        />
      )}
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size, height: size, background: color, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
      />
    </span>
  )
}

/** Khung panel dùng chung: tiêu đề + nội dung, đồng bộ với style card AIDO. */
function Panel({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border p-5 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
      <SectionTitle icon={icon} title={title} sub={sub} />
      <div className="mt-3">{children}</div>
    </div>
  )
}

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
            <span className="ml-auto flex items-center gap-1.5 text-xs font-medium" style={{ color: st.color }}>
              <LiveDot color={st.color} size={8} active={a.status !== 'offline'} />{st.label}
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
