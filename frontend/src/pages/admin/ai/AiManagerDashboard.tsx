import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot, ShieldCheck, Activity, AlertTriangle, Inbox, ClipboardList,
  CheckCircle2, Zap, Info, ChevronRight, BookOpen,
  Workflow, ClipboardCheck, Send, Bell, CalendarClock, Database, Gauge,
  ScrollText, LayoutGrid, ToggleRight, ToggleLeft, Copy, Timer, RefreshCw,
} from 'lucide-react'
import {
  useAiManager, AI_TEAM, type IntelSignal, type SignalLevel,
} from '../../../hooks/useAiManager'
import { useOperationsRuntime, type RuntimeSummary } from '../../../hooks/useOperationsRuntime'
import { useAuthStore } from '../../../store/authStore'

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

/** Thứ tự cụm hiển thị trong hub. */
const GROUP_ORDER = ['Điều phối & Duyệt', 'Thông báo & Lịch', 'Giám sát', 'Tri thức & Nhật ký'] as const

function buildSections(isSuper: boolean): OpsSection[] {
  return [
    // ── Điều phối & Duyệt ──
    { key: 'hermes', label: 'Hermes (AI COO)', desc: 'Trung tâm điều phối — bạn đang ở đây', icon: <Bot size={18} />, to: null, status: 'here', group: 'Điều phối & Duyệt' },
    { key: 'workflow', label: 'Workflow Studio', desc: 'Tạo & quản lý luật tự động hoá', icon: <Workflow size={18} />, to: '/admin/workflows', status: 'active', group: 'Điều phối & Duyệt' },
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
  info: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Thông tin' },
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
const GROUP_TONE: Record<string, GroupTone> = {
  'Điều phối & Duyệt': { bg: '#F5F3FF', border: '#EDE9FE', bar: '#6D5DFB', chip: '#EDE9FE', fg: '#6D5DFB' },
  'Thông báo & Lịch': { bg: '#EFF6FF', border: '#DBEAFE', bar: '#2563EB', chip: '#DBEAFE', fg: '#2563EB' },
  'Giám sát': { bg: '#FFFBEB', border: '#FEF3C7', bar: '#D97706', chip: '#FEF3C7', fg: '#D97706' },
  'Tri thức & Nhật ký': { bg: '#ECFDF5', border: '#D1FAE5', bar: '#059669', chip: '#D1FAE5', fg: '#059669' },
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

// ── Card khu vực vận hành (dashboard hoá): icon + tên + mô tả + số liệu runtime THẬT ──
interface CardMetric { label: string; value: string | number }
function SectionCard({
  s, onGo, metrics, badge, progress, palette,
}: {
  s: OpsSection
  onGo: (to: string) => void
  metrics?: CardMetric[]
  badge?: { text: string; tone: 'ok' | 'warn' | 'muted' } | null
  progress?: number | null
  palette: GroupTone
}) {
  const clickable = s.status === 'active' && !!s.to
  const soon = s.status === 'soon'
  const badgeCls =
    badge?.tone === 'ok' ? 'bg-emerald-50 text-emerald-700'
      : badge?.tone === 'warn' ? 'bg-amber-50 text-amber-700'
        : 'bg-slate-100 text-slate-500'
  // 'soon' (chưa dùng hiện tại) → xám mờ; còn lại tô theo tông NHÓM (tint + viền trên + icon chip).
  const cardStyle: React.CSSProperties = soon
    ? { background: '#F8FAFC', borderColor: '#E2E8F0', borderTop: '3px solid #E2E8F0' }
    : { background: palette.bg, borderColor: palette.border, borderTop: `3px solid ${palette.bar}` }
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onGo(s.to!)}
      style={cardStyle}
      className={`group relative flex flex-col gap-2.5 rounded-xl border p-4 text-left transition-all ${
        clickable ? 'hover:shadow-sm cursor-pointer' : 'cursor-default'
      } ${s.status === 'here' ? 'ring-1 ring-inset' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={soon ? { background: '#F1F5F9', color: '#94A3B8' } : { background: palette.chip, color: palette.fg }}
        >
          {s.icon}
        </span>
        <div className="flex items-center gap-1.5">
          {s.status === 'here' && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: palette.bar }}>Đang xem</span>
          )}
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCls}`}>{badge.text}</span>
          )}
          {clickable && (
            <ChevronRight size={15} className="text-slate-300" />
          )}
        </div>
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-semibold truncate ${soon ? 'text-slate-500' : 'text-slate-800'}`}>{s.label}</p>
        <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{s.desc}</p>
      </div>
      {typeof progress === 'number' && (
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: palette.chip }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: palette.bar }} />
        </div>
      )}
      {metrics && metrics.length > 0 && (
        <div className="mt-0.5 grid grid-cols-3 gap-x-2 gap-y-2 border-t pt-2.5" style={{ borderColor: palette.border }}>
          {metrics.map((m) => (
            <div key={m.label} className="min-w-0">
              <p className="text-[15px] font-bold leading-none text-slate-800 tabular-nums truncate">{m.value}</p>
              <p className="mt-1 text-[10px] leading-tight text-slate-400 truncate">{m.label}</p>
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 ${className}`}>
      {children}
    </div>
  )
}

function PanelTitle({ icon, children, right }: { icon: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{children}</h3>
      </div>
      {right}
    </div>
  )
}

// ── Hàng KPI runtime tổng quan (9 chỉ số) ──
// Phối màu NHẸ theo ngữ nghĩa (phương án A đã duyệt): nền tint rất nhạt + viền trên 3px +
// số/icon theo màu — đồng bộ với thẻ "Kết quả hôm nay" ở Office View. Chỉ light theme.
interface KpiPalette { bg: string; border: string; bar: string; fg: string }
const KPI_COLORS: Record<'emerald' | 'slate' | 'violet' | 'sky' | 'amber' | 'red', KpiPalette> = {
  emerald: { bg: '#ECFDF5', border: '#D1FAE5', bar: '#059669', fg: '#059669' },
  slate: { bg: '#F8FAFC', border: '#E2E8F0', bar: '#94A3B8', fg: '#64748B' },
  violet: { bg: '#F5F3FF', border: '#EDE9FE', bar: '#6D5DFB', fg: '#6D5DFB' },
  sky: { bg: '#EFF6FF', border: '#DBEAFE', bar: '#2563EB', fg: '#2563EB' },
  amber: { bg: '#FFFBEB', border: '#FEF3C7', bar: '#D97706', fg: '#D97706' },
  red: { bg: '#FEF2F2', border: '#FEE2E2', bar: '#EF4444', fg: '#EF4444' },
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

export function AiManagerDashboard() {
  const navigate = useNavigate()
  // Mở màn con kèm cờ ?from=aido → màn đích hiện thanh "Quay lại AI Operations Center" (AppLayout).
  const goHub = (to: string) => navigate(to.includes('?') ? `${to}&from=aido` : `${to}?from=aido`)
  const role = useAuthStore(s => s.user?.role)
  const { policies, intel, summary, opsSignals, loading, availability } = useAiManager()
  const rt = useOperationsRuntime()
  const [teamFilter, setTeamFilter] = useState<'all' | 'active' | 'planned'>('all')

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
    { tone: (ex?.failedToday ?? 0) > 0 ? 'warn' : 'ok', label: 'Executor Mít Đặc', detail: ex ? `${ex.executedToday} thực thi · ${ex.failedToday} lỗi hôm nay · TB ${ex.averageExecutionMs ?? 0}ms` : 'Chưa có hoạt động hôm nay' },
    { tone: 'info', label: 'Đội ngũ AI', detail: `${implAgents}/${AI_TEAM.length} agent hoạt động` },
  ]

  // ── Số liệu runtime nhúng vào từng card (từ runtime-summary + 3 endpoint tái dùng) ──
  const m = rt.summary?.modules
  const metricsFor = (key: string): { metrics?: CardMetric[]; badge?: { text: string; tone: 'ok' | 'warn' | 'muted' } | null; progress?: number | null } => {
    if (!rt.summary) return {}
    switch (key) {
      case 'hermes': {
        const h = m!.hermes
        return {
          progress: h.workflowToday > 0 ? Math.round((h.completedToday / h.workflowToday) * 100) : 0,
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
        const ag = rt.summary.agents
        return {
          metrics: [
            { label: 'Maika phân tích', value: ag.maika.analyses },
            { label: 'Lisa hỏi–đáp', value: ag.lisa.answered },
            { label: 'Mít Đặc thực thi', value: ag.mitDac.executed },
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
            { label: rt.kpi.interpretation ?? 'Sức khỏe CLB', value: rt.kpi.score >= 70 ? 'Ổn định' : rt.kpi.score >= 50 ? 'Theo dõi' : 'Cần cải thiện' },
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
            ...top.map((t) => ({ label: t.name, value: t.count })),
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

  const roster = useMemo(() => {
    if (teamFilter === 'planned') return rosterAll.filter(r => !r.implemented)
    if (teamFilter === 'active') return rosterAll.filter(r => r.implemented)
    return rosterAll
  }, [rosterAll, teamFilter])

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [background:var(--pf-primary-soft)]">
              <Bot size={20} className="[color:var(--pf-primary)]" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">AI Operations Center</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">
                  <span className="h-1.5 w-1.5 rounded-full [background:var(--pf-primary)] animate-pulse" />
                  Hermes · AI COO
                </span>
              </div>
              <p className="text-sm text-slate-500">Điều phối · Duyệt · Thông báo · Lịch · Cảnh báo · Giám sát (read-only)</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 w-full md:w-auto">
            <button
              onClick={() => navigate('/admin/ai-manager/club-memory?from=aido')}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <BookOpen size={16} />
              Club Memory
            </button>
            <button
              onClick={() => navigate('/admin/ai-approvals?from=aido')}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-xl [background:var(--pf-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:[background:var(--pf-primary-hover)]"
            >
              <Inbox size={16} />
              Hộp Duyệt AI
            </button>
          </div>
        </div>
      </div>

      <div className="pf-center-x w-full max-w-[1280px] px-4 sm:px-6 py-5 space-y-6">
        {/* ── HÀNG KPI RUNTIME TỔNG QUAN (9 chỉ số) — dữ liệu THẬT ── */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tổng quan runtime hôm nay</p>
            <div className="flex items-center gap-2">
              {rt.stale && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Không thể cập nhật</span>
              )}
              {rt.generatedAt && !rt.stale && (
                <span className="hidden sm:inline text-[11px] text-slate-400">Cập nhật {fmtTime(rt.generatedAt)}</span>
              )}
              <button
                onClick={rt.refresh}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                title="Làm mới số liệu runtime"
              >
                <RefreshCw size={12} className={rt.loading ? 'animate-spin' : ''} /> Làm mới
              </button>
            </div>
          </div>
          {rt.loading && !rt.summary ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-[74px] animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
              ))}
            </div>
          ) : rt.error && !rt.summary ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs text-amber-800">Không tải được số liệu runtime — hệ thống sẽ tự thử lại.</p>
              <button onClick={rt.refresh} className="shrink-0 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">Thử lại</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
              {KPI9.map((k) => {
                const c = KPI_COLORS[k.color]
                return (
                  <div
                    key={k.key}
                    className="rounded-xl border p-3 shadow-sm"
                    style={{ background: c.bg, borderColor: c.border, borderTop: `3px solid ${c.bar}` }}
                    title={k.label}
                  >
                    <span className="inline-flex" style={{ color: c.fg }}>{k.icon}</span>
                    <p className="mt-1.5 text-xl font-bold leading-none tabular-nums" style={{ color: c.fg }}>
                      {rt.summary ? k.pick(rt.summary.overview) : '—'}
                    </p>
                    <p className="mt-1 text-[10px] leading-tight text-slate-500 line-clamp-2">{k.label}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Hub điều hướng — gom theo cụm chức năng, mỗi card có số liệu runtime THẬT */}
        <Card>
          <PanelTitle icon={<LayoutGrid size={16} />}>Khu Vực Vận Hành</PanelTitle>
          <div className="space-y-5">
            {GROUP_ORDER.map(group => {
              const items = sections.filter(s => s.group === group)
              if (items.length === 0) return null
              return (
                <div key={group}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map(s => {
                      const extra = metricsFor(s.key)
                      return <SectionCard key={s.key} s={s} onGo={goHub} metrics={extra.metrics} badge={extra.badge} progress={extra.progress} palette={GROUP_TONE[group]} />
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Backend status banner — trung thực */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
          <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
          <p className="text-xs text-sky-800 leading-relaxed">
            Hàng đợi + phê duyệt + <b>Execution Bridge (Mít Đặc)</b> đã hoạt động. Duyệt KHÔNG tự thực thi —
            hành động <b>APPROVED</b> được thực thi thủ công qua Mít Đặc (Hộp Duyệt): APPROVED → EXECUTING → EXECUTED/FAILED.
            Bridge hiện là <b>no-op</b> (chưa chạy module nghiệp vụ thật). KPI dùng dữ liệu DB thật.
          </p>
        </div>

        {/* AI Team roster — số liệu runtime THẬT đúng nhiệm vụ từng agent */}
        <Card>
          <PanelTitle
            icon={<Bot size={16} />}
            right={
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
                {([['all', 'Tất cả'], ['active', 'Hoạt động'], ['planned', 'Dự kiến']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setTeamFilter(v)}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      teamFilter === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            }
          >Đội Ngũ AI</PanelTitle>
          {roster.length === 0 ? (
            <p className="text-sm text-slate-400">Không có agent nào ở bộ lọc này.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {roster.map(t => (
                <div key={t.key} className="rounded-xl border border-slate-100 p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full [background:var(--pf-primary-soft)]">
                      <Bot size={16} className="[color:var(--pf-primary)]" />
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Hoạt động
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-500 leading-snug line-clamp-2">{t.role}</p>
                  </div>
                  {t.stats ? (
                    <div className={`grid gap-1 text-center ${t.stats.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {t.stats.map(s => (
                        <div key={s.l} className="rounded-lg bg-slate-50 py-1.5">
                          <p className="text-sm font-bold text-slate-700 tabular-nums">{s.v}</p>
                          <p className="text-[10px] text-slate-400 leading-tight">{s.l}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-[38px] animate-pulse rounded-lg bg-slate-50" />
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400">{t.foot}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Approval policy matrix — REAL */}
          <Card>
            <PanelTitle icon={<ShieldCheck size={16} />}>Chính Sách Duyệt Theo Rủi Ro</PanelTitle>
            {loading ? (
              <p className="text-sm text-slate-400">Đang tải…</p>
            ) : !availability.policies ? (
              <p className="text-sm text-slate-400">Không tải được chính sách duyệt (endpoint không khả dụng).</p>
            ) : (
              <div className="space-y-2">
                {policies.map(p => (
                  <div key={p.riskLevel} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${RISK_STYLE[p.riskLevel] ?? 'bg-slate-100 text-slate-600'}`}>
                        {p.riskLevel}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{p.requiredApprovalCount} phê duyệt</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5">{p.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.requiresSafetyCheck && (
                        <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">Safety check</span>
                      )}
                      {p.requiresManualConfirmation && (
                        <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">Xác nhận thủ công</span>
                      )}
                      <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        Vai trò: {p.requiredRoles.join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Risk / Warning — REAL from org-intelligence */}
          <Card>
            <PanelTitle icon={<AlertTriangle size={16} />}>Rủi Ro & Cảnh Báo</PanelTitle>
            {loading ? (
              <p className="text-sm text-slate-400">Đang tải…</p>
            ) : !availability.intel && riskSignals.length === 0 ? (
              <p className="text-sm text-slate-400">Không tải được tín hiệu vận hành (endpoint không khả dụng).</p>
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
                        <span className={`text-[11px] font-semibold uppercase ${st.text}`}>{st.label}</span>
                        <span className="text-[10px] text-slate-400">{s.code}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{s.message}</p>
                      {s.code === 'DQ_NO_CLUB_MEMORY' && (
                        <button
                          onClick={() => navigate('/admin/ai-manager/club-memory?from=aido')}
                          className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold ${st.text} hover:underline`}
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
              <p className="text-sm text-slate-400">Đang tải…</p>
            ) : (
              <div className="space-y-2.5">
                {runtimeHealth.map((h, i) => (
                  <div key={`rt-${i}`} className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 items-start gap-2">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${HEALTH_DOT[h.tone]}`} />
                      <span className="text-xs font-medium text-slate-700">{h.label}</span>
                    </span>
                    <span className="text-right text-[11px] text-slate-500">{h.detail}</span>
                  </div>
                ))}
                {(intel?.healthSignals ?? []).map((s, i) => (
                  <div key={`hs-${i}`} className="flex items-start gap-2 border-t border-slate-50 pt-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <p className="text-xs text-slate-600">{s.message}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent AI activities — REAL suggested read actions / summary */}
          <Card>
            <PanelTitle icon={<ClipboardList size={16} />}>Hoạt Động & Đề Xuất AI</PanelTitle>
            {loading ? (
              <p className="text-sm text-slate-400">Đang tải…</p>
            ) : !availability.intel ? (
              <p className="text-sm text-slate-400">Không tải được hoạt động AI (endpoint không khả dụng).</p>
            ) : (
              <div className="space-y-3">
                {intel?.summary && <p className="text-xs text-slate-600 leading-relaxed">{intel.summary}</p>}
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
                          className="group flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left transition-colors hover:[border-color:var(--pf-primary-soft)] hover:[background:var(--pf-primary-soft)]"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate group-hover:[color:var(--pf-primary)]">{a.label}</p>
                            <p className="text-[10px] text-slate-400 truncate">{a.method} {a.endpoint}</p>
                          </div>
                          <ChevronRight size={14} className="text-slate-300 shrink-0 transition-colors group-hover:[color:var(--pf-primary)]" />
                        </button>
                      )
                    }
                    return (
                      <div key={i} title={a.reason} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{a.label}</p>
                          <p className="text-[10px] text-slate-400 truncate">{a.method} {a.endpoint}</p>
                        </div>
                        <span className="text-[10px] text-slate-300 shrink-0">chỉ đọc</span>
                      </div>
                    )
                  })}
                  {(intel?.suggestedReadActions?.length ?? 0) === 0 && (
                    <p className="text-sm text-slate-400">Chưa có đề xuất đọc.</p>
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
