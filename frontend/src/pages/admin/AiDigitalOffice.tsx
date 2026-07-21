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
  ListChecks, BarChart3, Inbox, GitBranch, ShieldAlert, PieChart, CalendarDays,
} from 'lucide-react'
import api from '../../lib/api'
import type { AiActionSummary, AiActionListItem } from '../../hooks/useAiManager'
import {
  PageShell, PageHeader, MetricCard, ActionButton, ResponsiveTabs,
  LoadingState, type TabItem,
} from '../../components/shared'
import type { ModuleAccent } from '../../components/shared'
import { OfficeBanner } from '../../components/aido/OfficeBanner'
import { useAidoSocket } from '../../hooks/useAidoSocket'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
// Gộp vào AIDO làm tab (tái dùng nguyên màn đã có — không đổi nghiệp vụ).
import { AiManagerDashboard } from './ai/AiManagerDashboard'

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

/** Kết quả công việc THẬT trong ngày của từng agent — /aido/agent-results. */
interface AgentResults {
  maika: { actionsToday: number; briefsToday: number; insightsToday: number; recentInsights: { type: string; title: string; createdAt: string }[] }
  lisa: { remindersToday: number; answeredToday: number }
  hermes: { runsToday: number; waitingApproval: number; running: number; completedToday: number; failedToday: number }
  mitDac: { executedToday: number; running: number; failedToday: number; averageExecutionMs: number }
  notification: { sentToday: number; byChannel: { IN_APP: number; EMAIL: number; TELEGRAM: number }; failedToday: number }
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
  // Trạng thái hoạt động THẬT của agent (busy khi đang xử lý) — từ /aido/agent-activity + WS.
  const [activity, setActivity] = useState<Record<string, { status: string; task?: string }>>({})
  // Nhịp nền (heartbeat) — Văn phòng AI đang sống; cập nhật liên tục qua WS, KHÔNG gọi API.
  const [beatAt, setBeatAt] = useState<number | null>(null)
  // Dữ liệu chi tiết cho Operations/Analytics (đều là endpoint THẬT sẵn có).
  const [pendingList, setPendingList] = useState<AiActionListItem[]>([])
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  // Cảnh báo vận hành THẬT (Maika) cho Office View.
  const [opsSignals, setOpsSignals] = useState<{ code?: string; level?: string; message?: string }[]>([])
  // Kết quả công việc THẬT trong ngày của từng agent (dải dưới banner) — /aido/agent-results.
  const [results, setResults] = useState<AgentResults | null>(null)

  // Lịch hôm nay + thông báo chưa đọc — tái dùng client store (đã sync), không gọi thêm API.
  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
  const clubData = useClubDataStore((s) => s.getClubData(clubId))

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    // Timeout mỗi request để nhịp trễ không "treo" cả màn; nguồn phụ hỏng vẫn hiển thị an toàn.
    const fetchAll = () => Promise.allSettled([
      api.get('/ai/actions/summary', { timeout: 12_000 }),
      api.get('/maika/health-score', { timeout: 12_000 }),
      api.get('/workflows/runtime/status', { timeout: 12_000 }),
      api.get('/notification-runtime/channels', { timeout: 12_000 }),
      api.get('/aido/agent-activity', { timeout: 12_000 }),
      api.get('/ai/actions?status=PENDING_APPROVAL&limit=10', { timeout: 12_000 }),
      api.get('/workflows/runs', { timeout: 12_000 }),
      api.get('/ai/maika/operational-alerts', { timeout: 12_000 }),
      api.get('/aido/agent-results', { timeout: 12_000 }),
    ])
    const coreDown = (rs: PromiseSettledResult<any>[]) =>
      [rs[0], rs[1], rs[2], rs[3]].every((x) => x.status === 'rejected')
    // 4 request cốt lõi cùng rớt thường là blip nhất thời (đua token/nghẽn nhịp) → thử lại 1 lần
    // trước khi báo lỗi, để refresh không "chập chờn" ra ErrorState.
    let settled = await fetchAll()
    if (coreDown(settled)) {
      await new Promise((r) => setTimeout(r, 900))
      settled = await fetchAll()
    }
    const [s, h, r, c, a, pq, wr, al, ar] = settled
    if (coreDown(settled)) {
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
    if (ar.status === 'fulfilled') setResults(val(ar))
    setUpdatedAt(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(true), 30_000) // fallback polling (WebSocket là kênh chính)
    return () => clearInterval(id)
  }, [load])

  // Đang lỗi → tự thử lại nhanh (6s) để tự lành sau blip, không bắt user bấm "Thử lại".
  useEffect(() => {
    if (!error) return
    const id = setTimeout(() => void load(true), 6_000)
    return () => clearTimeout(id)
  }, [error, load])

  // Quay lại app (chuyển tab/app khác rồi mở lại): mobile "đóng băng" request nền → lúc resume
  // dữ liệu có thể lỗi/hết hạn. Tự TẢI LẠI ngay khi tab hiển thị lại / cửa sổ focus → không kẹt
  // ở màn lỗi. (focus phủ cả trường hợp trình duyệt không bắn visibilitychange.)
  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState === 'visible') void load(true)
    }
    document.addEventListener('visibilitychange', onResume)
    window.addEventListener('focus', onResume)
    return () => {
      document.removeEventListener('visibilitychange', onResume)
      window.removeEventListener('focus', onResume)
    }
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

  // ── Dải "Kết quả hôm nay" của 5 agent (dưới banner) — SỐ THẬT từ /aido/agent-results.
  // Màu khớp banner (MAIKA violet · LISA blue · HERMES green · MIT_DAT orange · NOTIFICATION magenta).
  // Maika: sức khỏe + cảnh báo lấy sẵn từ health/opsSignals (đã tải). Lisa: hiện chỉ đếm được nhắc
  // nhở (hội thoại chưa lưu) — nêu trung thực.
  const resultCards = useMemo(() => {
    const r = results
    return [
      {
        key: 'MAIKA', name: 'Maika', color: '#6D5DFB',
        value: health?.score != null ? String(health.score) : '—',
        unit: health?.score != null ? '/100' : '',
        headline: 'Sức khỏe CLB',
        details: [
          `${opsSignals.length} cảnh báo · ${r?.maika.insightsToday ?? 0} phân tích hôm nay`,
          r?.maika.recentInsights?.[0]
            ? `Gần nhất: ${r.maika.recentInsights[0].title}`
            : `${r?.maika.briefsToday ?? 0} báo cáo · ${r?.maika.actionsToday ?? 0} đề xuất`,
        ],
      },
      {
        key: 'LISA', name: 'Lisa', color: '#2563EB',
        value: String(r?.lisa.answeredToday ?? 0), unit: 'lượt',
        headline: 'Lisa trả lời hôm nay',
        details: [
          `${r?.lisa.remindersToday ?? 0} nhắc nhở đã gửi`,
          'Hỗ trợ thành viên & giải đáp',
        ],
      },
      {
        key: 'HERMES', name: 'Hermes', color: '#059669',
        value: String(r?.hermes.runsToday ?? 0), unit: 'workflow',
        headline: 'Điều phối hôm nay',
        details: [
          `${r?.hermes.waitingApproval ?? 0} chờ duyệt · ${r?.hermes.completedToday ?? 0} hoàn tất`,
          `${r?.hermes.failedToday ?? 0} lỗi`,
        ],
      },
      {
        key: 'MIT_DAT', name: 'Mít Đặc', color: '#EA580C',
        value: String(r?.mitDac.executedToday ?? executedToday), unit: 'tác vụ',
        headline: 'Đã thực thi hôm nay',
        details: [
          `${r?.mitDac.running ?? running} đang chạy · ${r?.mitDac.failedToday ?? 0} lỗi`,
          `Thời gian TB ${fmtLatency(r?.mitDac.averageExecutionMs)}`,
        ],
      },
      {
        key: 'NOTIFICATION', name: 'Notification', color: '#C026D3',
        value: String(r?.notification.sentToday ?? 0), unit: 'đã gửi',
        headline: 'Thông báo gửi hôm nay',
        details: [
          `In-app ${r?.notification.byChannel.IN_APP ?? 0} · Email ${r?.notification.byChannel.EMAIL ?? 0}`,
          `Telegram ${r?.notification.byChannel.TELEGRAM ?? 0} (thử) · ${r?.notification.failedToday ?? 0} lỗi`,
        ],
      },
    ]
  }, [results, health, opsSignals, executedToday, running])

  const tabs: TabItem[] = [
    { key: 'office', label: 'Office View' },
    { key: 'operations', label: 'Operations View', badge: pending },
    { key: 'analytics', label: 'Analytics View' },
    { key: 'ops-center', label: 'AI Operations Center' },
  ]

  if (loading && !summary) return <PageShell><LoadingState /></PageShell>
  // Lỗi tải dữ liệu vận hành → VẪN giữ Office View (banner không cần API) + báo lỗi gọn + thử
  // lại, thay vì xoá trắng cả màn (tránh cảm giác "chập chờn" khi refresh gặp blip mạng).
  if (error) return (
    <PageShell>
      <PageHeader title="AIDO — AI Digital Office" subtitle="Văn phòng AI của câu lạc bộ" />
      <div className="space-y-4">
        <OfficeBanner caption="Viền chạy quanh thẻ = agent đang làm việc" />
        <div
          className="mx-auto flex w-full max-w-2xl flex-col items-center gap-2 rounded-2xl border p-5 text-center [border-color:var(--pf-border)]"
          style={{ background: 'var(--pf-surface)' }}
        >
          <p className="text-sm font-medium [color:var(--pf-color)]">Không tải được dữ liệu vận hành</p>
          <p className="text-xs [color:var(--pf-color-muted)]">Kết nối đang chập chờn — bảng số liệu tạm thời chưa hiện. Hệ thống sẽ tự thử lại.</p>
          <ActionButton onClick={() => void load()}>Thử lại</ActionButton>
        </div>
      </div>
    </PageShell>
  )

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
          {/* Office BANNER — 1 ảnh hero tĩnh (thẻ agent vẽ sẵn trong ảnh). Chỉ scale w-full ⇒
              đồng bộ hoàn toàn desktop/tablet/mobile, KHÔNG phủ thẻ DOM (hết đè/cắt/lệch).
              Trạng thái THẬT hiển thị ở KPI + 3 panel + Đội ngũ AI bên dưới. */}
          <OfficeBanner
            caption="Văn phòng AI · viền chạy quanh thẻ = agent đang làm việc · trạng thái THẬT ở bảng dưới"
            badge={
              <div
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                style={{ background: 'rgba(17,24,39,0.72)' }}
              >
                <LiveDot color={connected ? 'var(--pf-green)' : 'var(--pf-accent-amber, #F59E0B)'} size={8} active={connected} />
                {connected ? 'REAL-TIME' : 'ĐỊNH KỲ'}{updatedAt ? ` · ${updatedAt.toLocaleTimeString('vi-VN')}` : ''}
              </div>
            }
          />

          {/* Kết quả công việc THẬT hôm nay của từng agent — xếp thẳng dưới 5 nhân vật trên banner. */}
          <div>
            <h3 className="mb-2 text-sm font-semibold [color:var(--pf-text)]">Kết quả hôm nay của từng Agent</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {resultCards.map((c) => (
                <div
                  key={c.key}
                  className="rounded-2xl border p-3.5"
                  style={{
                    background: `color-mix(in srgb, ${c.color} 7%, var(--pf-surface))`,
                    borderColor: `color-mix(in srgb, ${c.color} 22%, var(--pf-border))`,
                    borderTop: `3px solid ${c.color}`,
                  }}
                >
                  <span className="text-[13px] font-semibold" style={{ color: c.color }}>{c.name}</span>
                  <p className="mt-1 text-2xl font-bold leading-none" style={{ color: c.color }}>
                    {c.value}
                    {c.unit && <span className="ml-1 text-xs font-medium [color:var(--pf-color-muted)]">{c.unit}</span>}
                  </p>
                  <p className="mt-1 text-[11px] font-medium [color:var(--pf-color-muted)]">{c.headline}</p>
                  <div className="mt-2 space-y-0.5 border-t pt-2" style={{ borderColor: `color-mix(in srgb, ${c.color} 15%, var(--pf-border))` }}>
                    {c.details.map((d, i) => (
                      <p key={i} className="text-[11px] leading-snug [color:var(--pf-color-muted)]">{d}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trung tâm điều hành — giữ "Lịch hôm nay" + "Cảnh báo & lưu ý" (KHÔNG trùng Operations
              Center). Dải KPI + hàng đợi duyệt + Đội ngũ/Trạng thái/Luồng đã bỏ khỏi Office View
              (trùng lặp) — xem đầy đủ ở tab Operations/Analytics + /admin/ai-manager. */}
          <div className="grid gap-5 lg:grid-cols-2">
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

          <div>
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
          </div>
        </div>
      )}

      {/* AI Operations Center — hub đầy đủ (Workflows, Nhật ký AI, Duyệt, Scheduler, Cảnh báo,
          KPI, Data, Audit... đều là card trong hub). Full-bleed để hết đúp lề. */}
      {tab === 'ops-center' && (
        <div className="-mx-4 -my-4 sm:-mx-6 sm:-my-6">
          <AiManagerDashboard />
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


