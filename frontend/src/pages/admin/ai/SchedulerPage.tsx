/**
 * SchedulerPage — AI Operations Center › Scheduler (Pha 2 Hermes v2).
 * Read-only + run-now, NỐI endpoint sẵn có (KHÔNG backend mới):
 *   GET  /workflows/runtime/status   — trạng thái timer + tick gần nhất
 *   GET  /workflows/rules            — lọc scheduleType != MANUAL = lịch định kỳ
 *   GET  /workflows/runtime/history  — run do scheduler dispatch (SCHED:*)
 *   POST /workflows/runtime/run-now  — chạy thủ công các rule định kỳ (idempotent theo kỳ)
 * Cron hệ thống (Maika/Lisa @Cron) hiển thị tĩnh (không có endpoint — lịch cố định).
 * V2.2 Clean Modern SaaS + loading/error/empty state.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Power, Repeat, Clock, Play, Bot, Sparkles, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import {
  PageShell, PageHeader, MetricCard, StatusBadge, EmptyState, LoadingState, ErrorState,
  ActionButton, type StatusTone,
} from '../../../components/shared'

interface SchedulerStatus {
  enabled: boolean
  intervalMs: number
  supportedScheduleTypes: string[]
  lastTick: { tickedAt: string; groups: number; dispatched: number; skippedDuplicate: number; failedGroups: number } | null
}
interface WorkflowRule {
  id: string
  name: string
  triggerType: string
  scheduleType: string
  enabled: boolean
  priority?: number
}
interface SchedRun {
  id: string
  triggerType: string
  status: string
  idempotencyKey?: string
  startedAt?: string
  createdAt?: string
}

const SCHEDULE_LABEL: Record<string, string> = {
  DAILY: 'Hàng ngày', WEEKLY: 'Hàng tuần', MONTHLY: 'Hàng tháng', MANUAL: 'Thủ công',
}
const TRIGGER_LABEL: Record<string, string> = {
  DEBT_ESCALATION: 'Nhắc đóng quỹ',
  EVENT_REMINDER: 'Nhắc buổi tập',
  REPORT_DISPATCH: 'Gửi báo cáo kỳ quỹ',
  ATTENDANCE_COMPLETED: 'Điểm danh hoàn tất',
  CONTRIBUTION_CONFIRMED: 'Xác nhận đóng quỹ',
  EXPENSE_RECORDED: 'Ghi nhận chi phí',
  FUND_PERIOD_CLOSED: 'Chốt kỳ quỹ',
  MINIGAME_COMPLETED: 'Kết thúc minigame',
}
const RUN_TONE: Record<string, StatusTone> = {
  COMPLETED: 'success', FAILED: 'danger', WAITING_APPROVAL: 'warning',
  RUNNING: 'info', PENDING: 'neutral',
}

// Cron hệ thống cố định (@Cron trong MaikaScheduler/LisaScheduler — không cấu hình runtime).
const SYSTEM_CRONS = [
  { agent: 'Maika', icon: 'maika', label: 'Bản tin sáng (Daily Brief)', when: 'Mỗi ngày · 08:00' },
  { agent: 'Maika', icon: 'maika', label: 'Báo cáo tuần', when: 'Chủ nhật · 09:00' },
  { agent: 'Maika', icon: 'maika', label: 'Quét bất thường (Anomaly)', when: 'Mỗi 6 giờ' },
  { agent: 'Lisa', icon: 'lisa', label: 'Nhắc nhở thông minh', when: 'Mỗi ngày · 09:00' },
]

function fmt(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN', { hour12: false })
}

export function SchedulerPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<SchedulerStatus | null>(null)
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [runs, setRuns] = useState<SchedRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [running, setRunning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [st, rl, hi] = await Promise.all([
        api.get('/workflows/runtime/status'),
        api.get('/workflows/rules'),
        api.get('/workflows/runtime/history'),
      ])
      setStatus(st.data?.data ?? st.data ?? null)
      setRules(((rl.data?.data ?? rl.data ?? []) as WorkflowRule[]))
      setRuns(((hi.data?.data ?? hi.data ?? []) as SchedRun[]))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const scheduled = rules.filter(r => r.scheduleType && r.scheduleType !== 'MANUAL')

  const handleRunNow = async () => {
    setRunning(true)
    try {
      const res = await api.post('/workflows/runtime/run-now')
      const d = res.data?.data ?? res.data
      toast.success(`Đã chạy: ${d?.groups ?? 0} nhóm · ${d?.failed ?? 0} lỗi`)
      await load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Chạy scheduler thất bại')
    } finally {
      setRunning(false)
    }
  }

  const lt = status?.lastTick
  return (
    <PageShell>
      <PageHeader
        title="Scheduler"
        subtitle="Lịch cron & tác vụ định kỳ của Hermes AI COO"
        actions={
          <div className="flex items-center gap-2">
            <ActionButton variant="ghost" icon={<ArrowLeft size={15} />} onClick={() => navigate('/admin/ai-manager')}>
              AI Operations Center
            </ActionButton>
            {scheduled.length > 0 && (
              <ActionButton icon={<Play size={15} />} onClick={handleRunNow} disabled={running}>
                {running ? 'Đang chạy…' : 'Chạy định kỳ ngay'}
              </ActionButton>
            )}
          </div>
        }
      />

      {loading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState onRetry={() => void load()} />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Trạng thái runtime */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Trạng thái timer"
              value={status?.enabled ? 'BẬT' : 'TẮT'}
              icon={<Power size={16} />}
              sub={status?.enabled ? 'Tự động chạy định kỳ' : 'Chỉ chạy thủ công (run-now)'}
            />
            <MetricCard
              label="Chu kỳ tick"
              value={status ? `${Math.round((status.intervalMs ?? 0) / 1000)}s` : '—'}
              icon={<Repeat size={16} />}
            />
            <MetricCard
              label="Tick gần nhất"
              value={lt ? fmt(lt.tickedAt) : '—'}
              icon={<Clock size={16} />}
              sub={lt ? `${lt.dispatched} dispatch · ${lt.skippedDuplicate} trùng · ${lt.failedGroups} lỗi` : 'Chưa có tick'}
            />
            <MetricCard
              label="Lịch định kỳ đang bật"
              value={scheduled.filter(r => r.enabled).length}
              icon={<CalendarClock size={16} />}
              sub={`${scheduled.length} rule định kỳ`}
            />
          </div>

          {/* Lịch định kỳ (workflow rules) */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <CalendarClock size={16} className="text-slate-400" /> Lịch Định Kỳ (Workflow)
            </h3>
            {scheduled.length === 0 ? (
              <EmptyState
                title="Chưa có lịch định kỳ"
                description="Tạo workflow rule với chu kỳ Hàng ngày/tuần/tháng ở Workflow Studio để scheduler tự chạy."
                action={<ActionButton onClick={() => navigate('/admin/workflows')}>Tới Workflow Studio</ActionButton>}
              />
            ) : (
              <div className="divide-y divide-slate-50">
                {scheduled.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                      <p className="text-[11px] text-slate-400">{TRIGGER_LABEL[r.triggerType] ?? r.triggerType}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)] px-2.5 py-0.5 text-[11px] font-medium">
                        {SCHEDULE_LABEL[r.scheduleType] ?? r.scheduleType}
                      </span>
                      <StatusBadge tone={r.enabled ? 'success' : 'neutral'}>
                        {r.enabled ? 'Đang bật' : 'Tắt'}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Cron hệ thống (cố định) */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-2">
              <Clock size={16} className="text-slate-400" /> Cron Hệ Thống (cố định)
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">Lịch tự động của Maika/Lisa — cố định theo hệ thống, không cấu hình tại đây.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SYSTEM_CRONS.map((c, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">
                    {c.icon === 'lisa' ? <Sparkles size={16} /> : <Bot size={16} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.label}</p>
                    <p className="text-[11px] text-slate-400">{c.agent} · {c.when}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Lịch sử scheduler dispatch */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Repeat size={16} className="text-slate-400" /> Lịch Sử Chạy Định Kỳ
            </h3>
            {runs.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có lượt chạy định kỳ nào.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {runs.slice(0, 30).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">{TRIGGER_LABEL[r.triggerType] ?? r.triggerType}</p>
                      <p className="text-[11px] text-slate-400 truncate">{fmt(r.startedAt ?? r.createdAt)}</p>
                    </div>
                    <StatusBadge tone={RUN_TONE[r.status] ?? 'neutral'}>{r.status}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </PageShell>
  )
}
