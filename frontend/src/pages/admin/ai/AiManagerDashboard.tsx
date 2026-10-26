import { useIsMobile } from '../../../hooks/useIsMobile'
import { WorkspaceMark } from '../../../components/mobile/WorkspaceMark'
import { useMemo, useState } from 'react'
import { mobileText } from '../../../lib/mobileText'
import { useNavigate } from 'react-router-dom'
import {
  Bot, ShieldCheck, Activity, AlertTriangle, Inbox, ClipboardList,
  CheckCircle2, Zap, Info, ChevronRight, BookOpen,
  Workflow, ClipboardCheck, Send, Bell, CalendarClock, Database, Gauge,
  ScrollText, LayoutGrid, ToggleRight, ToggleLeft, Copy, Timer, RefreshCw,
} from '../../../components/icons/mobileLucide'
import {
  useAiManager, AI_TEAM, type IntelSignal, type SignalLevel,
} from '../../../hooks/useAiManager'
import { useOperationsRuntime, type RuntimeSummary } from '../../../hooks/useOperationsRuntime'
import { useAuthStore } from '../../../store/authStore'
import { TileGrid } from '../../../components/mobile/HubParts'
import type { AppItem } from '../../../components/mobile/hubApps'

/** Các khu vực của AI Operations Center. Trạng thái:
 *  - 'here'   : chính trang hub này (không điều hướng).
 *  - 'active' : đã có, nối route thật.
 *  - 'soon'   : sẽ kích hoạt ở các pha kế tiếp (Scheduler/Alert/Data Monitor/KPI).
 *  KHÔNG đổi route backend/API — chỉ gom điều hướng UI (additive). */
interface OpsSection {
  key: string
  label: string
  desc: string
  icon: React.ReactNode
  to: string | null
  status: 'here' | 'active' | 'soon'
  group: string
}

/** Tên tiếng Việt cho lưới khu vực vận hành (mobile). */
const SECTION_VI: Record<string, string> = {
  workflow: 'Luật tự động hóa', approval: 'Hộp duyệt AI', dispatch: 'Nhật ký AI', notif: 'Trung tâm thông báo', scheduler: 'Lịch tác vụ',
  alert: 'Trung tâm cảnh báo', monitor: 'Giám sát dữ liệu', kpi: 'Chỉ số vận hành', memory: 'Bộ nhớ CLB', audit: 'Nhật ký kiểm toán',
}

const SECTION_ICON: Record<string, typeof Bot> = {
  hermes: Bot, workflow: Workflow, approval: ClipboardCheck, dispatch: Send, notif: Bell, scheduler: CalendarClock,
  alert: AlertTriangle, monitor: Database, kpi: Gauge, memory: BookOpen, audit: ScrollText,
}

function buildSections(isSuper: boolean): OpsSection[] {
  return [
    // ── Điều phối & Duyệt ──
    { key: 'hermes', label: 'Hermes (AI COO)', desc: 'Trung tâm điều phối — bạn đang ở đây', icon: <Bot size={18} />, to: null, status: 'here', group: 'Điều phối & Duyệt' },
    { key: 'workflow', label: 'Workflow Studio', desc: 'Tạo & quản lý luật tự động hóa', icon: <Workflow size={18} />, to: '/admin/workflows', status: 'active', group: 'Điều phối & Duyệt' },
    { key: 'approval', label: 'Approval Center', desc: 'Duyệt/từ chối hành động AI đề xuất', icon: <ClipboardCheck size={18} />, to: '/admin/ai-approvals', status: 'active', group: 'Điều phối & Duyệt' },
    { key: 'dispatch', label: 'Nhật ký AI', desc: 'Mít Đặc thực thi · Maika phân tích · Lisa hỏi–đáp', icon: <Send size={18} />, to: '/admin/ai-log', status: 'active', group: 'Điều phối & Duyệt' },
    // ── Thông báo & Lịch ──
    { key: 'notif', label: 'Notification Center', desc: 'Hộp thông báo đa kênh (in-app/email/Telegram)', icon: <Bell size={18} />, to: '/notifications', status: 'active', group: 'Thông báo & Lịch' },
    { key: 'scheduler', label: 'Scheduler', desc: 'Lịch cron & tác vụ định kỳ', icon: <CalendarClock size={18} />, to: '/admin/ai-scheduler', status: 'active', group: 'Thông báo & Lịch' },
    // ── Giám sát ──
    { key: 'alert', label: 'Alert Center', desc: 'Cảnh báo vận hành & lỗi hệ thống', icon: <AlertTriangle size={18} />, to: '/admin/ai-alerts', status: 'active', group: 'Giám sát' },
    { key: 'monitor', label: 'Data Monitor', desc: 'Chất lượng & toàn vẹn dữ liệu', icon: <Database size={18} />, to: '/admin/ai-data-monitor', status: 'active', group: 'Giám sát' },
    { key: 'kpi', label: 'KPI Monitor', desc: 'Sức khoẻ CLB & chỉ số vận hành', icon: <Gauge size={18} />, to: '/admin/ai-kpi', status: 'active', group: 'Giám sát' },
    // ── Tri thức & Nhật ký ──
    { key: 'memory', label: 'Club Memory', desc: 'Kho tri thức nền của CLB', icon: <BookOpen size={18} />, to: '/admin/ai-manager/club-memory', status: 'active', group: 'Tri thức & Nhật ký' },
    { key: 'audit', label: 'Audit Logs', desc: 'Nhật ký kiểm toán thao tác', icon: <ScrollText size={18} />, to: isSuper ? '/super/audit-logs' : '/admin/ai-audit-logs', status: 'active', group: 'Tri thức & Nhật ký' },
  ]
}

const SIGNAL_STYLE: Record<SignalLevel, { bg: string; text: string; dot: string; label: string }> = {
  info: { bg: '[background:var(--pf-surface-muted)]', text: '[color:var(--pf-color-muted)]', dot: 'bg-slate-400', label: 'Thông tin' },
  attention: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Chú ý' },
  warning: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Cảnh báo' },
}

// Runtime health tone → dot color (runtime AI thật, KHÔNG phụ thuộc Club Memory).
const HEALTH_DOT: Record<'ok' | 'warn' | 'info', string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  info: 'bg-sky-500',
}

const RISK_STYLE: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

// Tông màu NHẸ theo NHÓM chức năng cho card Khu vực vận hành (phương án 1 đã duyệt) —
// đồng bộ ngôn ngữ tint + viền trên với hàng KPI. Chỉ light theme.
interface GroupTone { bg: string; border: string; bar: string; chip: string; fg: string }
// Theme-aware: tint accent lên nền TOKEN (color-mix) -> tự tối ở dark, sáng ở light; chữ blend --pf-text.
function tone(bar: string): GroupTone {
  return {
    bar,
    fg: `color-mix(in srgb, ${bar} 65%, var(--pf-text))`,
    bg: `color-mix(in srgb, ${bar} 10%, var(--pf-surface))`,
    border: `color-mix(in srgb, ${bar} 30%, var(--pf-surface))`,
    chip: `color-mix(in srgb, ${bar} 18%, var(--pf-surface))`,
  }
}
const GROUP_TONE: Record<string, GroupTone> = {
  'Điều phối & Duyệt': tone('#6D5DFB'),
  'Thông báo & Lịch': tone('#6D5DFB'),
  'Giám sát': tone('#6D5DFB'),
  'Tri thức & Nhật ký': tone('#6D5DFB'),
}

// Tông màu DÙNG CHUNG cho MỌI card Khu vực vận hành — 1 màu tím Hermes cho đồng nhất.
const HUB_TONE: GroupTone = GROUP_TONE['Điều phối & Duyệt']

// Màu nhận diện 5 agent — ĐỒNG BỘ với Office View ("Kết quả hôm nay của từng Agent").
const MOBILE_UI = typeof window !== 'undefined' && window.innerWidth < 1024
const AGENT_COLOR: Record<string, string> = MOBILE_UI
  // Mobile (Luxury SaaS): màu agent trầm, đủ tương phản (≥4.5:1) khi dùng làm chữ nhỏ.
  ? { maika: '#37307A', lisa: '#315E8A', hermes: '#176149', 'mit-dac': '#8A5D16', notification: '#6D4DA0' }
  : {
    maika: '#6D5DFB',
    lisa: '#2563EB',
    hermes: '#059669',
    'mit-dac': '#EA580C',
    notification: '#C026D3',
  }

// Nhãn tiếng Việt cho loại Club Memory (map đúng category schema thật, không bịa "Daily Brief").
const MEMORY_LABEL: Record<string, string> = {
  KNOWLEDGE: 'Kiến thức',
  OPERATIONAL_NOTE: 'Ghi chú AI',
  FACT: 'Sự kiện',
  RULE: 'Quy tắc',
  POLICY: 'Chính sách',
  PREFERENCE: 'Ưu tiên',
}

// Map endpoint ĐỌC (read-only GET) của đề xuất AI → route thật trong app để admin xem dữ liệu.
const READ_ROUTE_MAP: Record<string, string> = {
  members: '/members',
  'fund-periods': '/fund-periods',
  reports: '/reports',
  minigames: '/minigames',
}

function resolveReadRoute(endpoint: string): string | null {
  const seg = endpoint.replace(/^\//, '').split('/')[0]
  return READ_ROUTE_MAP[seg] ?? null
}

const fmtMs = (ms: number): string => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`)
/** Thời lượng (giây) → s/m/h gọn; 0/undefined → '—'. Dùng cho TG duyệt trung bình. */
const fmtDur = (s?: number): string =>
  !s || s <= 0 ? '—' : s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : `${(s / 3600).toFixed(1)}h`
const fmtTime = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'

// ── Card khu vực vận hành (dashboard hóa): icon + tên + mô tả + số liệu runtime THẬT ──
interface CardMetric { label: string; value: string | number }
function SectionCard({
  s, onGo, metrics, badge, palette,
}: {
  s: OpsSection
  onGo: (to: string) => void
  metrics?: CardMetric[]
  badge?: { text: string; tone: 'ok' | 'warn' | 'muted' } | null
  palette: GroupTone
}) {
  const clickable = s.status === 'active' && !!s.to
  const soon = s.status === 'soon'
  const badgeCls =
    badge?.tone === 'ok' ? 'bg-emerald-50 text-emerald-700'
      : badge?.tone === 'warn' ? 'bg-amber-50 text-amber-700'
        : '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]'
  // 'soon' (chưa dùng hiện tại) → xám mờ; còn lại tô theo tông NHÓM (tint + viền trên + icon chip).
  const cardStyle: React.CSSProperties = soon
    ? { background: 'var(--pf-surface-muted)', borderColor: 'var(--pf-border)', borderTop: '3px solid var(--pf-border)' }
    : ({ '--accent': palette.bar } as React.CSSProperties)
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onGo(s.to!)}
      style={cardStyle}
      data-hi={s.status === 'here' ? '' : undefined}
      className={`pf-stat-card @container group relative flex flex-col gap-2 rounded-xl p-3 text-left transition-all ${
        clickable ? 'hover:shadow-sm cursor-pointer' : 'cursor-default'
      } ${s.status === 'here' ? 'ring-1 ring-inset' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={soon ? { background: 'var(--pf-surface-muted)', color: 'var(--pf-color-muted)' } : { background: palette.chip, color: palette.fg }}
        >
          {s.icon}
        </span>
        <div className="flex items-center gap-1.5">
          {s.status === 'here' && (
            <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: palette.bar }}>Đang xem</span>
          )}
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeCls}`}>{badge.text}</span>
          )}
          {clickable && (
            <ChevronRight size={15} className="[color:var(--pf-color-muted)]" />
          )}
        </div>
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-semibold leading-tight ${soon ? '[color:var(--pf-color-muted)]' : '[color:var(--pf-text)]'}`}>{s.label}</p>
        <p className="mt-0.5 text-xs [color:var(--pf-color-muted)] leading-snug line-clamp-2">{s.desc}</p>
      </div>
      {metrics && metrics.length > 0 && (
        <div className="grid flex-1 grid-cols-6 auto-rows-fr content-start gap-1.5">
          {metrics.map((m, i) => (
            <MiniStat key={m.label} label={m.label} value={m.value} className={miniSpan(i, metrics.length)} />
          ))}
        </div>
      )}
    </button>
  )
}

/** Ô số liệu nhỏ THỐNG NHẤT (hub + đội ngũ AI): cùng chiều cao, cỡ chữ cố định (không co theo container), nhãn tối đa 2 dòng. */
/** Lưới 6 cột: hẹp = 2 ô/hàng, rộng (container ≥15rem) = 3 ô/hàng; ô lẻ cuối hàng tự giãn để KHÔNG chừa lỗ trống. */
function miniSpan(i: number, n: number): string {
  const narrow = n % 2 === 1 && i === n - 1 ? 'col-span-6' : 'col-span-3'
  const r = n % 3
  let wide = '@[15rem]:col-span-2'
  if (r === 1 && i === n - 1) wide = '@[15rem]:col-span-6'
  else if (r === 2 && i >= n - 2) wide = '@[15rem]:col-span-3'
  return `${narrow} ${wide}`
}

const MOBILE_STAT_LABELS: Record<string, string> = { Workflow: 'Luồng việc', Approval: 'Phê duyệt', Completed: 'Hoàn tất' }

function MiniStat({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) {
  const long = typeof value === 'string' && value.length > 7
  return (
    <div data-keep="" title={label} className={`pf-stat-cell flex min-h-[58px] max-h-[92px] min-w-0 flex-col items-center justify-center rounded-lg px-1.5 py-2 text-center ${className}`}>
      <div className="line-clamp-2 w-full text-[10px] font-semibold uppercase leading-tight tracking-wide [color:var(--pf-color-muted)]">{label}</div>
      <div className={`mt-1 w-full whitespace-nowrap font-bold leading-tight tabular-nums [color:var(--pf-text)] ${long ? 'text-xs' : 'text-base'}`}>{value}</div>
    </div>
  )
}

/** Mã hành động kiểm toán → nhãn ngắn dễ đọc (AI_ACTION_APPROVE → "AI duyệt"). */
function actionLabel(name: string): string {
  const MAP: Record<string, string> = {
    AI_ACTION_APPROVE: 'AI duyệt', AI_ACTION_REJECT: 'AI từ chối', AI_ACTION_CREATE: 'AI tạo', AI_ACTION_CREATED: 'AI tạo',
    AI_ACTION_EXECUTE: 'AI thực thi', AI_ACTION_EXECUTED: 'AI thực thi', AI_ACTION_EXPIRE: 'AI hết hạn',
  }
  if (MAP[name]) return MAP[name]
  const t = name.replace(/^AI_ACTION_/, 'AI ').replace(/_/g, ' ').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`pf-glass-strong rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  )
}

function PanelTitle({ icon, children, right }: { icon: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="pf-ai-panel-title flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="[color:var(--pf-color-muted)]">{icon}</span>
        <h3 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">{children}</h3>
      </div>
      {right}
    </div>
  )
}

// ── Hàng KPI runtime tổng quan (9 chỉ số) ──
// Phối màu NHẸ theo ngữ nghĩa (phương án A đã duyệt): nền tint rất nhạt + viền trên 3px +
// số/icon theo màu — đồng bộ với thẻ "Kết quả hôm nay" ở Office View. Chỉ light theme.
interface KpiPalette { bg: string; border: string; bar: string; fg: string }
const kpiTone = (bar: string, fg?: string): KpiPalette => ({
  bg: `color-mix(in srgb, ${bar} 10%, var(--pf-surface))`,
  border: `color-mix(in srgb, ${bar} 30%, var(--pf-surface))`,
  bar,
  fg: fg ?? `color-mix(in srgb, ${bar} 65%, var(--pf-text))`,
})
const KPI_COLORS: Record<'emerald' | 'slate' | 'violet' | 'sky' | 'amber' | 'red', KpiPalette> = {
  emerald: kpiTone('#059669'),
  slate: kpiTone('var(--pf-color-muted)', 'var(--pf-color-muted)'),
  violet: kpiTone('#6D5DFB'),
  sky: kpiTone('#2563EB'),
  amber: kpiTone('#D97706'),
  red: kpiTone('#EF4444'),
}
interface Kpi9Def { key: string; label: string; icon: React.ReactNode; color: keyof typeof KPI_COLORS; pick: (o: RuntimeSummary['overview']) => number }
const KPI9: Kpi9Def[] = [
  { key: 'activeRules', label: 'Rule đang bật', icon: <ToggleRight size={15} />, color: 'emerald', pick: (o) => o.activeRules },
  { key: 'inactiveRules', label: 'Rule đang tắt', icon: <ToggleLeft size={15} />, color: 'slate', pick: (o) => o.inactiveRules },
  { key: 'runsToday', label: 'Runs hôm nay', icon: <Workflow size={15} />, color: 'violet', pick: (o) => o.runsToday },
  { key: 'aiActionsCreatedToday', label: 'AI Action đã tạo', icon: <Zap size={15} />, color: 'sky', pick: (o) => o.aiActionsCreatedToday },
  { key: 'pendingApprovals', label: 'Chờ duyệt', icon: <Inbox size={15} />, color: 'amber', pick: (o) => o.pendingApprovals },
  { key: 'successfulToday', label: 'Thành công', icon: <CheckCircle2 size={15} />, color: 'emerald', pick: (o) => o.successfulToday },
  { key: 'failedToday', label: 'Lỗi', icon: <AlertTriangle size={15} />, color: 'red', pick: (o) => o.failedToday },
  { key: 'duplicateSkippedToday', label: 'Bỏ qua trùng', icon: <Copy size={15} />, color: 'slate', pick: (o) => o.duplicateSkippedToday },
  { key: 'cooldownBlockedToday', label: 'Bị chặn cooldown', icon: <Timer size={15} />, color: 'amber', pick: (o) => o.cooldownBlockedToday },
]

export function AiManagerDashboard({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate()
  // Mở màn con kèm cờ ?from=aido → màn đích hiện thanh "Quay lại AI Operations Center" (AppLayout).
  const goHub = (to: string) => navigate(to.includes('?') ? `${to}&from=aido` : `${to}?from=aido`)
  const role = useAuthStore(s => s.user?.role)
  const { policies, intel, summary, opsSignals, loading, availability } = useAiManager()
  const rt = useOperationsRuntime()
  const [teamFilter, setTeamFilter] = useState<'all' | 'active' | 'planned'>('all')
  const mobileLayout = useIsMobile(1024)
  const [moreKpi, setMoreKpi] = useState(false)

  const sections = useMemo(() => buildSections(role === 'SUPER_ADMIN'), [role])

  const riskSignals: IntelSignal[] = [
    ...opsSignals,
    ...(intel?.attentionSignals ?? []),
    ...(intel?.dataQualitySignals ?? []),
  ]

  // Sức khoẻ & Runtime AI — tín hiệu THẬT từ availability + executor (luôn có, không cần Club Memory).
  const ex = summary?.executor
  const implAgents = AI_TEAM.filter(t => t.implemented).length
  const runtimeHealth: { tone: 'ok' | 'warn' | 'info'; label: string; detail: string }[] = [
    { tone: availability.actions ? 'ok' : 'warn', label: 'AI Action Center', detail: availability.actions ? 'Kết nối' : 'Không khả dụng' },
    { tone: availability.intel ? 'ok' : 'warn', label: 'Maika Intelligence', detail: availability.intel ? 'Kết nối' : 'Không khả dụng' },
    // Chỉ báo TÌNH TRẠNG (không lặp lại số thực thi/TB — đã có ở card Mít Đặc mục Đội ngũ AI).
    { tone: (ex?.failedToday ?? 0) > 0 ? 'warn' : 'ok', label: 'Executor Mít Đặc', detail: !ex ? 'Chưa có hoạt động hôm nay' : ex.failedToday > 0 ? `${ex.failedToday} lỗi hôm nay` : 'Hoạt động ổn định' },
    { tone: 'info', label: 'Đội ngũ AI', detail: `${implAgents}/${AI_TEAM.length} agent hoạt động` },
  ]

  // ── Số liệu runtime nhúng vào từng card (từ runtime-summary + 3 endpoint tái dùng) ──
  const m = rt.summary?.modules
  const metricsFor = (key: string): { metrics?: CardMetric[]; badge?: { text: string; tone: 'ok' | 'warn' | 'muted' } | null } => {
    if (!rt.summary) return {}
    switch (key) {
      case 'hermes': {
        const h = m!.hermes
        return {
          metrics: [
            { label: 'Workflow', value: h.workflowToday },
            { label: 'Running', value: h.running },
            { label: 'Chờ duyệt', value: h.waitingApproval },
            { label: 'Hoàn tất', value: h.completedToday },
            { label: 'Lỗi', value: h.failedToday },
          ],
        }
      }
      case 'workflow': {
        const w = m!.workflowStudio
        return {
          badge: { text: w.health === 'warn' ? 'Cảnh báo' : 'Healthy', tone: w.health === 'warn' ? 'warn' : 'ok' },
          metrics: [
            { label: 'Tổng rule', value: w.totalRules },
            { label: 'Đang bật', value: w.activeRules },
            { label: 'Manual', value: w.manualRules },
            { label: 'Tắt', value: w.disabledRules },
            { label: 'Runs', value: w.runsToday },
          ],
        }
      }
      case 'approval': {
        const a = m!.approvalCenter
        return {
          metrics: [
            { label: 'AI Action', value: a.totalToday },
            { label: 'Chờ duyệt', value: a.pending },
            { label: 'Đã duyệt', value: a.approvedToday },
            { label: 'Từ chối', value: a.rejectedToday },
            { label: 'Hết hạn', value: a.expiredToday },
            { label: 'TG duyệt TB', value: fmtDur(summary?.averageApprovalTime) },
          ],
        }
      }
      case 'dispatch': {
        // Nhật ký AI: tóm tắt số bản ghi hôm nay theo agent (đồng nguồn với mục Đội ngũ AI) — tránh thẻ trống chiếm chỗ.
        const g = rt.summary.agents
        if (!g) return {}
        return {
          metrics: [
            { label: 'Maika phân tích', value: g.maika.analyses },
            { label: 'Lisa giải đáp', value: g.lisa.answered },
            { label: 'Mít Đặc thực thi', value: g.mitDac.executed },
          ],
        }
      }
      case 'notif': {
        const n = m!.notificationCenter
        return {
          metrics: [
            { label: 'Đã gửi', value: n.sentToday },
            { label: 'In-app', value: n.inApp },
            { label: 'Email', value: n.email },
            { label: 'Telegram', value: n.telegram },
            { label: 'Lỗi', value: n.failedToday },
          ],
        }
      }
      case 'scheduler': {
        const sc = m!.scheduler
        return {
          badge: { text: sc.autoEnabled ? 'Tự động' : 'Thủ công', tone: sc.autoEnabled ? 'ok' : 'muted' },
          metrics: [
            { label: 'Daily', value: sc.daily },
            { label: 'Weekly', value: sc.weekly },
            { label: 'Monthly', value: sc.monthly },
            { label: 'Manual', value: sc.manual },
          ],
        }
      }
      case 'alert': {
        if (!rt.alerts) return {}
        const a = rt.alerts
        return {
          badge: a.total > 0 ? { text: `${a.total} mở`, tone: 'warn' } : { text: 'Ổn định', tone: 'ok' },
          metrics: [
            { label: 'Tổng', value: a.total },
            { label: 'High', value: a.high },
            { label: 'Medium', value: a.medium },
            { label: 'Critical', value: a.critical },
          ],
        }
      }
      case 'monitor': {
        if (!rt.dataMonitor) return {}
        const d = rt.dataMonitor
        return {
          badge: { text: d.status === 'warn' ? 'Cảnh báo' : 'OK', tone: d.status === 'warn' ? 'warn' : 'ok' },
          metrics: [
            { label: 'Integrity', value: `${d.integrityPct}%` },
            { label: 'Vấn đề', value: d.issues },
            { label: 'Kiểm tra', value: d.checks },
          ],
        }
      }
      case 'kpi': {
        if (!rt.kpi || rt.kpi.score == null) return {}
        return {
          metrics: [
            { label: 'Health Score', value: `${rt.kpi.score}/100` },
            { label: 'Đánh giá', value: rt.kpi.score >= 70 ? 'Ổn định' : rt.kpi.score >= 50 ? 'Theo dõi' : 'Cần cải thiện' },
          ],
        }
      }
      case 'memory': {
        const c = m!.clubMemory
        const top = [...c.byType].sort((a, b) => b.count - a.count).slice(0, 3)
        return {
          metrics: [
            { label: 'Tổng memory', value: c.total },
            ...top.map((t) => ({ label: MEMORY_LABEL[t.type] ?? t.type, value: t.count })),
          ],
        }
      }
      case 'audit': {
        const a = m!.auditLogs
        const top = a.byAction.slice(0, 3)
        return {
          metrics: [
            { label: 'Tổng (hôm nay)', value: a.total },
            ...top.map((t) => ({ label: actionLabel(t.name), value: t.count })),
          ],
        }
      }
      default:
        return {}
    }
  }

  // ── Đội ngũ AI (5 agent) — số liệu runtime THẬT đúng nhiệm vụ từng agent ──
  const ag = rt.summary?.agents
  const rosterAll = useMemo(() => {
    const t = (iso: string | null) => `Cập nhật ${fmtTime(iso)}`
    const gen = rt.generatedAt
    return [
      {
        key: 'maika', name: 'Maika', role: 'Quản lý & Trí tuệ CLB', implemented: true,
        stats: ag ? [
          { l: 'Phân tích', v: ag.maika.analyses },
          { l: 'Cảnh báo', v: rt.alerts?.total ?? '—' },
          { l: 'Khuyến nghị', v: ag.maika.recommendations },
        ] : null,
        foot: t(gen),
      },
      {
        key: 'lisa', name: 'Lisa', role: 'Trợ lý thành viên & nhắc nhở', implemented: true,
        stats: ag ? [
          { l: 'Hỗ trợ', v: ag.lisa.support },
          { l: 'Giải đáp', v: ag.lisa.answered },
        ] : null,
        foot: t(gen),
      },
      {
        key: 'hermes', name: 'Hermes', role: 'Điều phối workflow & thông báo', implemented: true,
        stats: ag ? [
          { l: 'Workflow', v: ag.hermes.workflow },
          { l: 'Approval', v: ag.hermes.approval },
          { l: 'Completed', v: ag.hermes.completed },
        ] : null,
        foot: t(gen),
      },
      {
        key: 'mit-dac', name: 'Mít Đặc', role: 'Executor (thực thi hành động đã duyệt)', implemented: true,
        stats: ag ? [
          { l: 'Thực thi', v: ag.mitDac.executed },
          { l: 'Lỗi', v: ag.mitDac.errors },
          { l: 'TB thời gian', v: fmtMs(ag.mitDac.avgMs) },
        ] : null,
        foot: t(gen),
      },
      {
        key: 'notification', name: 'Notification AI', role: 'Gửi thông báo đa kênh', implemented: true,
        stats: ag ? [
          { l: 'Đã gửi', v: ag.notification.sent },
          { l: 'Lỗi', v: ag.notification.errors },
          { l: 'Tỷ lệ', v: `${ag.notification.successRate}%` },
        ] : null,
        foot: t(gen),
      },
    ]
  }, [ag, rt.alerts, rt.generatedAt])

  const hasPlannedAgents = rosterAll.some(agent => !agent.implemented)
  const roster = useMemo(() => {
    if (mobileLayout && !hasPlannedAgents) return rosterAll
    if (teamFilter === 'planned') return rosterAll.filter(r => !r.implemented)
    if (teamFilter === 'active') return rosterAll.filter(r => r.implemented)
    return rosterAll
  }, [rosterAll, teamFilter, mobileLayout, hasPlannedAgents])

  return (
    <div className="pf-ai-dashboard [background:var(--pf-bg)]">
      {/* Header — KHÔNG bọc scroll riêng (tránh scroll lồng cắt chân khi nhúng tab AIDO) và
          KHÔNG sticky (thanh tab AIDO đã sticky top-0; 2 sticky sẽ chồng nhau). */}
      <div className={`[background:var(--pf-surface)] border-b border-[color:var(--pf-border)] py-4 ${embedded ? 'max-lg:hidden' : ''}`}>
        <div className="pf-center-x w-full max-w-[1600px] px-4 sm:px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="hidden lg:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [background:var(--pf-primary-soft)]">
              <Bot size={20} className="[color:var(--pf-primary-text)]" />
            </span>
            <span className="lg:hidden"><WorkspaceMark title="Trung tâm điều hành AI" module="ai" /></span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold [color:var(--pf-text)]">{mobileText('AI Operations Center', 'Trung tâm điều hành AI')}</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium [background:var(--pf-primary-soft)] [color:var(--pf-primary-text)]">
                  <span className="h-1.5 w-1.5 rounded-full [background:var(--pf-primary)] animate-pulse" />
                  Hermes · AI COO
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pf-ai-workspace pf-center-x w-full max-w-[1600px] px-4 sm:px-6 py-5 space-y-6 max-lg:flex max-lg:flex-col max-lg:gap-5 max-lg:space-y-0">
        {/* ── HÀNG KPI RUNTIME TỔNG QUAN (9 chỉ số) — dữ liệu THẬT ── */}
        <div className="max-lg:-order-2">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide [color:var(--pf-color-muted)]">Tổng quan runtime hôm nay</p>
            <div className="flex items-center gap-2">
              {rt.stale && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Không thể cập nhật</span>
              )}
              {rt.generatedAt && !rt.stale && (
                <span className="hidden sm:inline text-xs [color:var(--pf-color-muted)]">Cập nhật {fmtTime(rt.generatedAt)}</span>
              )}
              <button
                onClick={rt.refresh}
                className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--pf-border)] px-2 py-1 text-xs font-medium [color:var(--pf-color-muted)] transition-colors hover:[background:var(--pf-surface-muted)]"
                title="Làm mới số liệu runtime"
              >
                <RefreshCw size={12} className={rt.loading ? 'animate-spin' : ''} /> Làm mới
              </button>
            </div>
          </div>
          {rt.loading && !rt.summary ? (
            <div className="pf-ai-runtime-grid grid grid-cols-3 gap-2.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-[74px] animate-pulse rounded-xl border border-[color:var(--pf-border)] [background:var(--pf-surface-muted)]" />
              ))}
            </div>
          ) : rt.error && !rt.summary ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs text-amber-800">Không tải được số liệu runtime — hệ thống sẽ tự thử lại.</p>
              <button onClick={rt.refresh} className="shrink-0 rounded-lg [background:var(--pf-surface)] px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">Thử lại</button>
            </div>
          ) : (
            <div className="pf-ai-runtime-grid grid grid-cols-3 gap-2.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
              {KPI9.map((k, ki) => {
                const c = KPI_COLORS[k.color]
                return (
                  <div
                    key={k.key}
                    className={`pf-stat-card rounded-xl p-3 ${ki >= 3 && !moreKpi ? 'max-lg:hidden' : ''}`}
                    title={k.label}
                  >
                    <span className="inline-flex" style={{ color: c.fg }}>{k.icon}</span>
                    <p className="mt-1.5 text-xl font-bold leading-none tabular-nums" style={{ color: c.fg }}>
                      {rt.summary ? k.pick(rt.summary.overview) : '—'}
                    </p>
                    <p className="mt-1 text-xs leading-tight [color:var(--pf-color-muted)] line-clamp-2">{k.label}</p>
                  </div>
                )
              })}
            </div>
          )}
          {rt.summary && (
            <button type="button" aria-expanded={moreKpi} onClick={() => setMoreKpi(v => !v)}
              className="mt-2 min-h-[44px] w-full rounded-xl border text-sm font-semibold [background:var(--pf-surface)] [border-color:var(--pf-border)] [color:var(--pf-primary-text)] lg:hidden">
              {moreKpi ? 'Thu gọn chỉ số' : 'Xem thêm chỉ số'}
            </button>
          )}
        </div>

        {/* Hub điều hướng — TẤT CẢ card trong 1 lưới gọn, 4 card/hàng từ ~1024px (laptop 1280 luôn
            thấy 4 cột), sát nhau, hết trống chỗ. Mọi card dùng CHUNG 1 tông tím Hermes cho đồng nhất. */}
        {/* Mobile: lưới icon chọn khu vực (cùng hệ thống trang Ứng dụng). */}
        <Card className="pf-ai-operations max-lg:-order-1 lg:hidden">
          <PanelTitle icon={<LayoutGrid size={16} />}>Khu Vực Vận Hành</PanelTitle>
          <TileGrid
            items={sections.filter(s => s.to).map((s): AppItem => ({
              key: s.key, label: SECTION_VI[s.key] ?? s.label, to: '', icon: SECTION_ICON[s.key] ?? LayoutGrid, module: 'ai',
              badgeCount: s.key === 'approval' ? rt.summary?.modules?.hermes?.waitingApproval : undefined,
            }))}
            onSelect={(it) => { const t = sections.find(x => x.key === it.key)?.to; if (t) goHub(t) }}
          />
        </Card>
        <Card className="max-lg:hidden">
          <PanelTitle icon={<LayoutGrid size={16} />}>Khu Vực Vận Hành</PanelTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sections.map(s => {
              const extra = metricsFor(s.key)
              return <SectionCard key={s.key} s={s} onGo={goHub} metrics={extra.metrics} badge={extra.badge} palette={HUB_TONE} />
            })}
          </div>
        </Card>

        {/* Backend status banner — trung thực */}
        <details data-pf-surface="card" className="lg:hidden order-last rounded-2xl border [border-color:var(--pf-border)] [background:var(--pf-surface)] px-4 py-3">
          <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold [color:var(--pf-text)]">Chi tiết kỹ thuật</summary>
          <p className="mt-1 text-xs leading-relaxed [color:var(--pf-color-muted)]">
            Hàng đợi, phê duyệt và cầu thực thi (Mít Đặc) đã hoạt động. Duyệt không tự thực thi: hành động đã duyệt được thực thi thủ công qua Mít Đặc (Hộp Duyệt). Cầu thực thi hiện chưa chạy nghiệp vụ thật. Chỉ số lấy từ dữ liệu thật.
          </p>
        </details>
        <div className="max-lg:hidden flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
          <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
          <p className="text-xs text-sky-800 leading-relaxed">
            Hàng đợi + phê duyệt + <b>Execution Bridge (Mít Đặc)</b> đã hoạt động. Duyệt KHÔNG tự thực thi —
            hành động <b>APPROVED</b> được thực thi thủ công qua Mít Đặc (Hộp Duyệt): APPROVED → EXECUTING → EXECUTED/FAILED.
            Bridge hiện là <b>no-op</b> (chưa chạy module nghiệp vụ thật). KPI dùng dữ liệu DB thật.
          </p>
        </div>

        {/* AI Team roster — số liệu runtime THẬT đúng nhiệm vụ từng agent */}
        <Card className="pf-ai-roster-panel">
          <PanelTitle
            icon={<Bot size={16} />}
            right={
              <div className={`flex items-center gap-1 rounded-lg [background:var(--pf-color-muted-soft)] p-0.5 text-xs ${!hasPlannedAgents ? 'max-lg:hidden' : ''}`}>
                {([['all', 'Tất cả'], ['active', 'Hoạt động'], ['planned', 'Dự kiến']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setTeamFilter(v)}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      teamFilter === v ? '[background:var(--pf-surface)] [color:var(--pf-text)] shadow-sm' : '[color:var(--pf-color-muted)] hover:[color:var(--pf-text)]'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            }
          >Đội Ngũ AI</PanelTitle>
          {roster.length === 0 ? (
            <p className="text-sm [color:var(--pf-color-muted)]">Không có agent nào ở bộ lọc này.</p>
          ) : (
            <div className="pf-ai-roster-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {roster.map(t => {
                const color = AGENT_COLOR[t.key] ?? 'var(--pf-primary)'
                return (
                <div
                  key={t.key}
                  className="pf-ai-agent pf-stat-card @container rounded-xl p-4 flex flex-col gap-2.5"
                  style={{ '--accent': color } as React.CSSProperties}
                >
                  <div className="pf-ai-agent-head flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
                      <Bot size={16} />
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Hoạt động
                    </span>
                  </div>
                  <div className="pf-ai-agent-identity" title={t.role}>
                    <p className="text-sm font-bold" style={{ color }}>{t.name}</p>
                    <p className="text-xs [color:var(--pf-color-muted)] leading-snug line-clamp-2">{t.role}</p>
                  </div>
                  {t.stats ? (
                    <div className="pf-ai-agent-stats grid grid-cols-6 auto-rows-fr gap-1.5" data-count={t.stats.length}>
                      {t.stats.map((s, i) => (
                        <MiniStat key={s.l} label={mobileLayout ? (MOBILE_STAT_LABELS[s.l] ?? s.l) : s.l} value={s.v} className={miniSpan(i, t.stats!.length)} />
                      ))}
                    </div>
                  ) : (
                    <div className="pf-ai-agent-stats grid grid-cols-3 gap-1" data-count="3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-[38px] animate-pulse rounded-lg [background:var(--pf-surface-muted)]" />
                      ))}
                    </div>
                  )}
                  <p className="pf-ai-agent-foot text-xs [color:var(--pf-color-muted)]">{t.foot}</p>
                </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-lg:contents">
          {/* Approval policy matrix — REAL */}
          <Card>
            <PanelTitle icon={<ShieldCheck size={16} />}>Chính Sách Duyệt Theo Rủi Ro</PanelTitle>
            {loading ? (
              <p className="text-sm [color:var(--pf-color-muted)]">Đang tải…</p>
            ) : !availability.policies ? (
              <p className="text-sm [color:var(--pf-color-muted)]">Không tải được chính sách duyệt (endpoint không khả dụng).</p>
            ) : (
              <div className="space-y-2">
                {policies.map(p => (
                  <div key={p.riskLevel} className="rounded-xl border border-[color:var(--pf-border)] p-3">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${RISK_STYLE[p.riskLevel] ?? '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]'}`}>
                        {p.riskLevel}
                      </span>
                      <span className="text-xs font-medium [color:var(--pf-color-muted)]">{p.requiredApprovalCount} phê duyệt</span>
                    </div>
                    <p className="text-xs [color:var(--pf-color-muted)] mt-1.5">{p.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.requiresSafetyCheck && (
                        <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">Safety check</span>
                      )}
                      {p.requiresManualConfirmation && (
                        <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Xác nhận thủ công</span>
                      )}
                      <span className="rounded-md [background:var(--pf-surface-muted)] px-2 py-0.5 text-xs font-medium [color:var(--pf-color-muted)]">
                        Vai trò: {p.requiredRoles.join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Risk / Warning — REAL from org-intelligence */}
          <Card className="max-lg:-order-3">
            <PanelTitle icon={<AlertTriangle size={16} />}>Rủi Ro & Cảnh Báo</PanelTitle>
            {loading ? (
              <p className="text-sm [color:var(--pf-color-muted)]">Đang tải…</p>
            ) : !availability.intel && riskSignals.length === 0 ? (
              <p className="text-sm [color:var(--pf-color-muted)]">Không tải được tín hiệu vận hành (endpoint không khả dụng).</p>
            ) : riskSignals.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 size={16} /> Không có cảnh báo — hệ thống ổn định.
              </div>
            ) : (
              <div className="space-y-2">
                {riskSignals.map((s, i) => {
                  const st = SIGNAL_STYLE[s.level]
                  return (
                    <div key={`${s.code}-${i}`} className={`rounded-xl px-3 py-2.5 ${st.bg}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold uppercase ${st.text}`}>{st.label}</span>
                        <span className="text-xs [color:var(--pf-color-muted)] max-lg:hidden">{s.code}</span>
                      </div>
                      <p className="text-xs [color:var(--pf-color-muted)] mt-1">{s.message}</p>
                      {s.code === 'DQ_NO_CLUB_MEMORY' && (
                        <button
                          onClick={() => navigate('/admin/ai-manager/club-memory?from=aido')}
                          className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${st.text} hover:underline`}
                        >
                          Bổ sung ngay <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Sức Khoẻ & Runtime AI — runtime THẬT (availability + executor), không cần Club Memory */}
          <Card>
            <PanelTitle icon={<Activity size={16} />}>Sức Khoẻ & Runtime AI</PanelTitle>
            {loading ? (
              <p className="text-sm [color:var(--pf-color-muted)]">Đang tải…</p>
            ) : (
              <div className="space-y-2.5">
                {/* Lưới 2×2 ô trạng thái — canh đều theo tọa độ (đồng bộ style Đội ngũ AI). */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {runtimeHealth.map((h, i) => (
                    <div key={`rt-${i}`} className="rounded-lg border border-[color:var(--pf-border)] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${HEALTH_DOT[h.tone]}`} />
                        <span className="text-xs font-medium [color:var(--pf-text)] truncate">{h.label}</span>
                      </div>
                      <p className="mt-0.5 pl-3.5 text-xs [color:var(--pf-color-muted)] truncate">{h.detail}</p>
                    </div>
                  ))}
                </div>
                {(intel?.healthSignals ?? []).map((s, i) => (
                  <div key={`hs-${i}`} className="flex items-start gap-2 border-t border-[color:var(--pf-border)] pt-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <p className="text-xs [color:var(--pf-color-muted)]">{s.message}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent AI activities — REAL suggested read actions / summary */}
          <Card>
            <PanelTitle icon={<ClipboardList size={16} />}>Hoạt Động & Đề Xuất AI</PanelTitle>
            {loading ? (
              <p className="text-sm [color:var(--pf-color-muted)]">Đang tải…</p>
            ) : !availability.intel ? (
              <p className="text-sm [color:var(--pf-color-muted)]">Không tải được hoạt động AI (endpoint không khả dụng).</p>
            ) : (
              <div className="space-y-3">
                {intel?.summary && <p className="text-xs [color:var(--pf-color-muted)] leading-relaxed">{intel.summary}</p>}
                <div className="space-y-2">
                  {(intel?.suggestedReadActions ?? []).slice(0, 6).map((a, i) => {
                    const route = resolveReadRoute(a.endpoint)
                    if (route) {
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => navigate(route)}
                          title={a.reason}
                          className="group flex w-full items-center justify-between rounded-lg border border-[color:var(--pf-border)] px-3 py-2 text-left transition-colors hover:[border-color:var(--pf-primary-soft)] hover:[background:var(--pf-primary-soft)]"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium [color:var(--pf-text)] truncate group-hover:[color:var(--pf-primary-text)]">{a.label}</p>
                            <p className="text-xs [color:var(--pf-color-muted)] truncate">{a.method} {a.endpoint}</p>
                          </div>
                          <ChevronRight size={14} className="[color:var(--pf-color-muted)] shrink-0 transition-colors group-hover:[color:var(--pf-primary-text)]" />
                        </button>
                      )
                    }
                    return (
                      <div key={i} title={a.reason} className="flex items-center justify-between rounded-lg border border-[color:var(--pf-border)] px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium [color:var(--pf-text)] truncate">{a.label}</p>
                          <p className="text-xs [color:var(--pf-color-muted)] truncate">{a.method} {a.endpoint}</p>
                        </div>
                        <span className="text-xs [color:var(--pf-color-muted)] shrink-0">chỉ đọc</span>
                      </div>
                    )
                  })}
                  {(intel?.suggestedReadActions?.length ?? 0) === 0 && (
                    <p className="text-sm [color:var(--pf-color-muted)]">Chưa có đề xuất đọc.</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
