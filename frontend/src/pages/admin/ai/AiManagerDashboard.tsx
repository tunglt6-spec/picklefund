import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot, ShieldCheck, Activity, AlertTriangle, Inbox, ClipboardList,
  CheckCircle2, XCircle, Clock, Zap, Info, ChevronRight, BookOpen,
  Workflow, ClipboardCheck, Send, Bell, CalendarClock, Database, Gauge,
  ScrollText, LayoutGrid,
} from 'lucide-react'
import {
  useAiManager, AI_TEAM, type IntelSignal, type SignalLevel,
} from '../../../hooks/useAiManager'
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

const ACCENT: Record<string, { dot: string; bg: string; text: string }> = {
  indigo: { dot: '[background:var(--pf-primary)]', bg: '[background:var(--pf-primary-soft)]', text: '[color:var(--pf-primary)]' },
  violet: { dot: '[background:var(--pf-primary)]', bg: '[background:var(--pf-primary-soft)]', text: '[color:var(--pf-primary)]' },
  sky: { dot: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-600' },
  emerald: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  slate: { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-500' },
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

// Map endpoint ĐỌC (read-only GET) của đề xuất AI → route thật trong app để admin xem dữ liệu.
// Chỉ điều hướng (không mutate). Đề xuất không map được → hiển thị tĩnh, không bấm.
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

function SectionCard({ s, onGo }: { s: OpsSection; onGo: (to: string) => void }) {
  const clickable = s.status === 'active' && !!s.to
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onGo(s.to!)}
      className={`group relative flex flex-col gap-2 rounded-xl border p-3.5 text-left transition-all ${
        s.status === 'here'
          ? '[border-color:var(--pf-primary)] [background:var(--pf-primary-soft)]'
          : clickable
            ? 'border-slate-100 hover:[border-color:var(--pf-primary-soft)] hover:[background:var(--pf-primary-soft)] cursor-pointer'
            : 'border-slate-100 bg-slate-50/60 cursor-default'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          s.status === 'soon' ? 'bg-slate-100 text-slate-400' : '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]'
        }`}>
          {s.icon}
        </span>
        {s.status === 'here' && (
          <span className="rounded-full [background:var(--pf-primary)] px-2 py-0.5 text-[10px] font-semibold text-white">Đang xem</span>
        )}
        {s.status === 'soon' && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Đang phát triển</span>
        )}
        {clickable && (
          <ChevronRight size={15} className="text-slate-300 transition-colors group-hover:[color:var(--pf-primary)]" />
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-semibold truncate ${s.status === 'soon' ? 'text-slate-500' : 'text-slate-800'}`}>{s.label}</p>
        <p className="text-[11px] text-slate-400 leading-snug">{s.desc}</p>
      </div>
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

function PanelTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-slate-400">{icon}</span>
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{children}</h3>
    </div>
  )
}

export function AiManagerDashboard() {
  const navigate = useNavigate()
  // Mở màn con kèm cờ ?from=aido → màn đích hiện thanh "Quay lại AI Operations Center" (AppLayout).
  const goHub = (to: string) => navigate(to.includes('?') ? `${to}&from=aido` : `${to}?from=aido`)
  const role = useAuthStore(s => s.user?.role)
  const { policies, intel, summary, opsSignals, loading, availability } = useAiManager()
  const [teamFilter, setTeamFilter] = useState<'all' | 'active' | 'planned'>('all')

  const sections = useMemo(() => buildSections(role === 'SUPER_ADMIN'), [role])

  const team = useMemo(() => {
    if (teamFilter === 'active') return AI_TEAM.filter(t => t.implemented)
    if (teamFilter === 'planned') return AI_TEAM.filter(t => !t.implemented)
    return AI_TEAM
  }, [teamFilter])

  const riskSignals: IntelSignal[] = [
    // Cảnh báo vận hành thật (quỹ/công nợ/chuyên cần từ Finance Engine) — ưu tiên hiển thị trước.
    ...opsSignals,
    ...(intel?.attentionSignals ?? []),
    ...(intel?.dataQualitySignals ?? []),
  ]

  const fmtDuration = (s: number): string =>
    !s ? '—' : s < 60 ? `${s}s` : `${Math.round(s / 60)}m`
  const countByAi = (agent: string): number =>
    summary?.actionsByAi.find(x => x.ai === agent)?.count ?? 0

  // KPI hàng đợi duyệt — DỮ LIỆU DB THẬT (0 khi chưa có action, không giả lập).
  const queueKpis: { label: string; value: string | number; icon: React.ReactNode }[] = [
    { label: 'Chờ duyệt', value: summary?.pendingApprovals ?? 0, icon: <Inbox size={16} /> },
    { label: 'Đã duyệt', value: summary?.approvedActions ?? 0, icon: <CheckCircle2 size={16} /> },
    { label: 'Từ chối', value: summary?.rejectedActions ?? 0, icon: <XCircle size={16} /> },
    { label: 'Thất bại', value: summary?.failedActions ?? 0, icon: <AlertTriangle size={16} /> },
    { label: 'Thực thi hôm nay', value: summary?.executedToday ?? 0, icon: <Zap size={16} /> },
    { label: 'TG duyệt TB', value: fmtDuration(summary?.averageApprovalTime ?? 0), icon: <Clock size={16} /> },
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
              onClick={() => navigate('/admin/ai-manager/club-memory')}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <BookOpen size={16} />
              Club Memory
            </button>
            <button
              onClick={() => navigate('/admin/ai-approvals')}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-xl [background:var(--pf-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:[background:var(--pf-primary-hover)]"
            >
              <Inbox size={16} />
              Hộp Duyệt AI
            </button>
          </div>
        </div>
      </div>

      <div className="pf-center-x w-full max-w-[1280px] px-4 sm:px-6 py-5 space-y-6">
        {/* Hub điều hướng — 11 khu vực gom theo cụm chức năng */}
        <Card>
          <PanelTitle icon={<LayoutGrid size={16} />}>Khu Vực Vận Hành</PanelTitle>
          <div className="space-y-5">
            {GROUP_ORDER.map(group => {
              const items = sections.filter(s => s.group === group)
              if (items.length === 0) return null
              return (
                <div key={group}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {items.map(s => (
                      <SectionCard key={s.key} s={s} onGo={goHub} />
                    ))}
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

        {/* AI Team roster */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <PanelTitle icon={<Bot size={16} />}>Đội Ngũ AI</PanelTitle>
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
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {team.map(t => {
              const ac = ACCENT[t.accent] ?? ACCENT.slate
              const online = t.implemented && (t.key !== 'maika' || availability.intel || availability.policies)
              return (
                <div key={t.key} className="rounded-xl border border-slate-100 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${ac.bg}`}>
                      <Bot size={16} className={ac.text} />
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      t.implemented ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : t.implemented ? 'bg-amber-400' : 'bg-slate-400'}`} />
                      {t.implemented ? (online ? 'Hoạt động' : 'Chờ') : 'Chưa triển khai'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-500 leading-snug">{t.role}</p>
                  </div>
                  {t.agent === 'MIT_DAT' && summary?.executor ? (
                    <>
                      <div className="mt-1 grid grid-cols-2 gap-1 text-center">
                        {[
                          { l: 'Đang chạy', v: summary.executor.running },
                          { l: 'Xong hôm nay', v: summary.executor.executedToday },
                          { l: 'Lỗi hôm nay', v: summary.executor.failedToday },
                          { l: 'TB (ms)', v: summary.executor.averageExecutionMs },
                        ].map(s => (
                          <div key={s.l} className="rounded-lg bg-slate-50 py-1">
                            <p className="text-sm font-bold text-slate-700">{s.v}</p>
                            <p className="text-[10px] text-slate-400">{s.l}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-emerald-600 font-medium">Executor · Mít Đặc</p>
                    </>
                  ) : (
                    <>
                      <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                        <span className="text-[11px] text-slate-500">Hành động đã tạo</span>
                        <span className="text-sm font-bold text-slate-700">{countByAi(t.agent)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Module: {t.module}</p>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* KPI cards — dữ liệu DB thật (/ai/actions/summary) */}
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {queueKpis.map(k => (
              <div key={k.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide leading-tight">{k.label}</span>
                  <span className="[color:var(--pf-primary)]">{k.icon}</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{availability.actions ? k.value : '—'}</p>
                {!availability.actions && (
                  <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Không tải được</span>
                )}
              </div>
            ))}
          </div>
        </div>

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
                          onClick={() => navigate('/admin/ai-manager/club-memory')}
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
                {/* Tín hiệu tri thức nền (nếu CLB có Club Memory) */}
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
