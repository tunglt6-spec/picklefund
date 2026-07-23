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
import { CalendarClock, Power, Repeat, Clock, Play, Bot, Sparkles } from 'lucide-react'
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
  const [partial, setPartial] = useState<string[]>([]) // nguồn lỗi cục bộ
  const [running, setRunning] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    // allSettled: 1 nguồn lỗi KHÔNG làm rơi cả trang — render từng section độc lập,
    // chỉ ErrorState toàn trang khi TẤT CẢ nguồn fail.
    const [st, rl, hi] = await Promise.allSettled([
      api.get('/workflows/runtime/status'),
      api.get('/workflows/rules'),
      api.get('/workflows/runtime/history'),
    ])
    if ([st, rl, hi].every(r => r.status === 'rejected')) {
      setError(true); setLoading(false); return
    }
    const failed: string[] = []
    if (st.status === 'fulfilled') setStatus(st.value.data?.data ?? st.value.data ?? null)
    else failed.push('Trạng thái timer')
    if (rl.status === 'fulfilled') setRules((rl.value.data?.data ?? rl.value.data ?? []) as WorkflowRule[])
    else failed.push('Lịch định kỳ')
    if (hi.status === 'fulfilled') setRuns((hi.value.data?.data ?? hi.value.data ?? []) as SchedRun[])
    else failed.push('Lịch sử chạy')
    setPartial(failed)
    setLoading(false)
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

  // Bật/tắt timer Scheduler (công tắc hệ thống, lưu bền). Bật cần xác nhận vì ảnh hưởng MỌI CLB.
  const handleToggleTimer = async () => {
    const turnOn = !status?.enabled
    if (
      turnOn &&
      !window.confirm(
        'Bật timer sẽ cho Hermes TỰ quét & tạo đề xuất định kỳ cho MỌI CLB (vẫn cần người duyệt trước khi thực thi). Tiếp tục?',
      )
    )
      return
    setToggling(true)
    try {
      await api.post('/workflows/runtime/scheduler', { enabled: turnOn })
      toast.success(turnOn ? 'Đã BẬT timer định kỳ' : 'Đã TẮT timer định kỳ')
      await load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Đổi trạng thái timer thất bại')
    } finally {
      setToggling(false)
    }
  }

  // Cập nhật 1 rule (bật/tắt hoặc đổi chu kỳ) qua PUT /workflows/rules/:id (endpoint sẵn có).
  const saveRule = async (id: string, patch: Record<string, unknown>, okMsg: string) => {
    setSavingId(id)
    try {
      await api.put(`/workflows/rules/${id}`, patch)
      toast.success(okMsg)
      await load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Cập nhật lịch thất bại')
    } finally {
      setSavingId(null)
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
            <ActionButton
              icon={<Power size={15} />}
              variant={status?.enabled ? 'ghost' : 'primary'}
              onClick={handleToggleTimer}
              disabled={toggling || loading}
            >
              {toggling ? 'Đang đổi…' : status?.enabled ? 'Tắt timer' : 'Bật timer'}
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
          {partial.length > 0 && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <Clock size={16} className="shrink-0 mt-0.5" />
              <span>Thiếu dữ liệu một phần — không tải được: <b>{partial.join(', ')}</b>. Các phần còn lại vẫn hiển thị bên dưới.</span>
            </div>
          )}
          {/* Trạng thái runtime */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Trạng thái timer"
              value={status?.enabled ? 'BẬT' : 'TẮT'}
              icon={<Power size={16} />}
              sub={status?.enabled ? 'Tự động chạy định kỳ' : 'Chỉ chạy thủ công (run-now)'}
              tone={status?.enabled ? 'success' : 'neutral'}
            />
            <MetricCard
              label="Chu kỳ tick"
              value={status ? `${Math.round((status.intervalMs ?? 0) / 1000)}s` : '—'}
              icon={<Repeat size={16} />}
              tone="info"
            />
            <MetricCard
              label="Tick gần nhất"
              value={lt ? fmt(lt.tickedAt) : '—'}
              icon={<Clock size={16} />}
              sub={lt ? `${lt.dispatched} dispatch · ${lt.skippedDuplicate} trùng · ${lt.failedGroups} lỗi` : 'Chưa có tick'}
              tone={lt && lt.failedGroups > 0 ? 'danger' : 'info'}
            />
            <MetricCard
              label="Lịch định kỳ đang bật"
              value={scheduled.filter(r => r.enabled).length}
              icon={<CalendarClock size={16} />}
              sub={`${scheduled.length} rule định kỳ`}
              tone={scheduled.filter(r => r.enabled).length > 0 ? 'success' : 'neutral'}
            />
          </div>

          {/* Luật & lịch chạy (workflow rules) — chỉnh chu kỳ + bật/tắt trực tiếp */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <CalendarClock size={16} className="text-slate-400" /> Luật & Lịch Chạy
            </h3>
            {rules.length === 0 ? (
              <EmptyState
                title="Chưa có luật workflow"
                description="Tạo workflow rule ở Workflow Studio, sau đó đặt chu kỳ (Hàng ngày/tuần/tháng) tại đây để scheduler tự chạy."
                action={<ActionButton onClick={() => navigate('/admin/workflows?from=aido')}>Tới Workflow Studio</ActionButton>}
              />
            ) : (
              <div className="divide-y divide-slate-50">
                {rules.map(r => (
                  <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                      <p className="text-[11px] text-slate-400">{TRIGGER_LABEL[r.triggerType] ?? r.triggerType}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Chỉnh chu kỳ */}
                      <select
                        value={r.scheduleType}
                        disabled={savingId === r.id}
                        onChange={e => saveRule(r.id, { scheduleType: e.target.value }, 'Đã đổi chu kỳ')}
                        aria-label={`Chu kỳ của ${r.name}`}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] disabled:opacity-50"
                      >
                        {(['MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY'] as const).map(v => (
                          <option key={v} value={v}>{SCHEDULE_LABEL[v]}</option>
                        ))}
                      </select>
                      {/* Bật/tắt */}
                      <button
                        type="button"
                        disabled={savingId === r.id}
                        onClick={() => saveRule(r.id, { enabled: !r.enabled }, r.enabled ? 'Đã tắt luật' : 'Đã bật luật')}
                        aria-label={r.enabled ? `Tắt ${r.name}` : `Bật ${r.name}`}
                        title={r.enabled ? 'Đang bật — bấm để tắt' : 'Đang tắt — bấm để bật'}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${r.enabled ? '[background:var(--pf-primary)]' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${r.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] text-slate-400">
              Chu kỳ <b>Thủ công</b> = chỉ chạy khi bấm "Chạy định kỳ ngay". Luật đã tắt sẽ không được scheduler dispatch.
            </p>
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
