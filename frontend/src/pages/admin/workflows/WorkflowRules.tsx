import { useState } from 'react'
import toast from 'react-hot-toast'
import { Workflow, Info, Play, Trash2, RefreshCw, Plus, AlertTriangle, Zap, Database } from 'lucide-react'
import {
  useWorkflows,
  createRuleFromTemplate,
  parseRuleExists,
  setRuleEnabled,
  deleteWorkflowRule,
  testTriggerRule,
  dispatchTestTrigger,
  dispatchLiveTrigger,
  DISPATCH_TRIGGER_TYPES,
  type DispatchSummary,
  type DispatchLiveResult,
  type WorkflowRunStatus,
  type WorkflowTemplate,
} from '../../../hooks/useWorkflows'

const RUN_STATUS_STYLE: Record<WorkflowRunStatus, string> = {
  PENDING: '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]',
  RUNNING: 'bg-sky-100 text-sky-700',
  WAITING_APPROVAL: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]',
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN', { hour12: false })
}

/** Nhóm Rule theo module nghiệp vụ (Mục XII). */
const RULE_CATEGORY: Record<string, string> = {
  DEBT_ESCALATION: 'Tài chính',
  FUND_BALANCE_RISK: 'Tài chính',
  PAYMENT_DUE_REMINDER: 'Tài chính',
  MISSING_FINANCE_DOCUMENT: 'Tài chính',
  LOW_MEMBER_ATTENDANCE: 'Thành viên',
  EVENT_REMINDER: 'Hoạt động CLB',
  LOW_SESSION_REGISTRATION: 'Hoạt động CLB',
  ATTENDANCE_NOT_CLOSED: 'Hoạt động CLB',
  SESSION_CAPACITY_RISK: 'Hoạt động CLB',
  MATCH_RESULT_MISSING: 'Thi đấu',
  APPROVAL_OVERDUE: 'Điều phối AIDO',
  REPORT_DISPATCH: 'Báo cáo',
  WEEKLY_CLUB_HEALTH_REPORT: 'Báo cáo',
}
const CATEGORY_ORDER = ['Tài chính', 'Thành viên', 'Hoạt động CLB', 'Thi đấu', 'Điều phối AIDO', 'Báo cáo', 'Khác']
const categoryOf = (triggerType: string): string => RULE_CATEGORY[triggerType] ?? 'Khác'
/** Gom danh sách theo nhóm, giữ thứ tự CATEGORY_ORDER, bỏ nhóm rỗng. */
function groupByCategory<T>(items: T[], keyFn: (x: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const c = categoryOf(keyFn(it))
    if (!map.has(c)) map.set(c, [])
    map.get(c)!.push(it)
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => [c, map.get(c)!])
}

export function WorkflowRules() {
  const { rules, runs, templates, runStats, loading, available, refetch } = useWorkflows()
  const [busy, setBusy] = useState(false)
  const [dispatchResult, setDispatchResult] = useState<DispatchSummary | null>(null)
  const [liveResult, setLiveResult] = useState<DispatchLiveResult | null>(null)
  // Phase 1: rule trùng — khi BE trả 409, hỏi mở rule hiện có hay tạo bản mới.
  const [dup, setDup] = useState<{ template: WorkflowTemplate; existingRuleId: string; existingRuleName: string } | null>(null)

  async function run(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true)
    try {
      await fn()
      toast.success(okMsg)
      refetch()
    } catch {
      toast.error('Thao tác thất bại (kiểm tra quyền hoặc trạng thái).')
    } finally {
      setBusy(false)
    }
  }

  /** Tạo rule từ template — nếu trùng (409) thì mở hộp lựa chọn thay vì tạo bản trùng. */
  async function createTemplate(t: WorkflowTemplate, allowDuplicate = false) {
    setBusy(true)
    try {
      await createRuleFromTemplate(t, allowDuplicate)
      toast.success(`Đã tạo rule: ${t.name}`)
      setDup(null)
      refetch()
    } catch (err) {
      const exists = parseRuleExists(err)
      if (exists && !allowDuplicate) {
        setDup({ template: t, existingRuleId: exists.existingRuleId, existingRuleName: exists.existingRuleName })
      } else {
        toast.error('Tạo rule thất bại (kiểm tra quyền hoặc trạng thái).')
      }
    } finally {
      setBusy(false)
    }
  }

  /** Cuộn tới + làm nổi rule hiện có (khi người dùng chọn "Mở rule hiện có"). */
  function openExistingRule(id: string) {
    setDup(null)
    const el = document.getElementById(`wf-rule-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', '[--tw-ring-color:var(--pf-primary)]')
      setTimeout(() => el.classList.remove('ring-2', '[--tw-ring-color:var(--pf-primary)]'), 2200)
    }
  }

  // KPI runtime THẬT. "Chờ duyệt/Hoàn tất/Lỗi" lấy từ backend runStats (đếm TỔNG, không cap 100
  // như danh sách runs; "Chờ duyệt" = AiAction pending — khớp Approval Center). Fallback client khi chưa có.
  const kpi = {
    enabled: rules.filter((r) => r.enabled).length,
    disabled: rules.filter((r) => !r.enabled).length,
    waiting: runStats?.waitingApproval ?? runs.filter((r) => r.status === 'WAITING_APPROVAL').length,
    completed: runStats?.completed ?? runs.filter((r) => r.status === 'COMPLETED').length,
    failed: runStats?.failed ?? runs.filter((r) => r.status === 'FAILED').length,
  }
  // Palette tint value-based (đồng bộ nguyên tắc màu KPI toàn app).
  const WF_KPI_TONE = {
    success: { bg: '#ECFDF5', border: '#D1FAE5', bar: '#059669', fg: '#059669' },
    warning: { bg: '#FFFBEB', border: '#FEF3C7', bar: '#D97706', fg: '#D97706' },
    danger: { bg: '#FEF2F2', border: '#FEE2E2', bar: '#EF4444', fg: '#EF4444' },
    neutral: { bg: '#F8FAFC', border: '#E2E8F0', bar: '#94A3B8', fg: '#64748B' },
  } as const
  const templateGroups = groupByCategory(templates, (t) => t.triggerType)
  const ruleGroups = groupByCategory(rules, (r) => r.triggerType)

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [background:var(--pf-primary-soft)]">
              <Workflow size={20} className="[color:var(--pf-primary)]" />
            </span>
            <div>
              <h1 className="text-xl font-bold [color:var(--pf-text)]">Hermes Workflows</h1>
              <p className="text-sm [color:var(--pf-color-muted)]">Workflow rule + lịch sử chạy · hành động đi qua AI Action Center</p>
            </div>
          </div>
          <button
            onClick={refetch}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-[color:var(--pf-border)] px-3 py-2 text-xs font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)]"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
      </div>

      <div className="pf-center-x w-full max-w-[1280px] px-4 sm:px-6 py-5 space-y-6">
        {/* Banner */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
          <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
          <p className="text-xs text-sky-800 leading-relaxed">
            Hermes đánh giá rule và tạo <b>AI Action</b> (chờ duyệt) khi khớp — <b>không thực thi trực tiếp</b>.
            Mọi hành động vận hành đi qua <b>AI Action Center</b> (duyệt bởi con người). Test-trigger dùng ngữ cảnh rỗng.
          </p>
        </div>

        {!available && !loading && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">Không tải được workflow (kiểm tra quyền/đăng nhập).</p>
          </div>
        )}

        {/* KPI runtime (Mục XII) — chỉ số thật từ rules + runs; tô màu value-based (nguyên tắc chung) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {([
            { label: 'Rule đang bật', value: kpi.enabled, tone: kpi.enabled > 0 ? 'success' : 'neutral' },
            { label: 'Rule đang tắt', value: kpi.disabled, tone: 'neutral' },
            { label: 'Chờ duyệt', value: kpi.waiting, tone: kpi.waiting > 0 ? 'warning' : 'success' },
            { label: 'Hoàn tất', value: kpi.completed, tone: 'success' },
            { label: 'Lỗi', value: kpi.failed, tone: kpi.failed > 0 ? 'danger' : 'success' },
          ] as const).map((k) => {
            const c = WF_KPI_TONE[k.tone]
            return (
              <div
                key={k.label}
                className="rounded-2xl border shadow-sm px-4 py-3"
                style={{ background: c.bg, borderColor: c.border, borderTop: `3px solid ${c.bar}` }}
              >
                <p className="text-2xl font-bold tabular-nums" style={{ color: c.fg }}>{k.value}</p>
                <p className="text-[11px] font-medium [color:var(--pf-color-muted)] mt-0.5">{k.label}</p>
              </div>
            )
          })}
        </div>

        {/* Create from template — nhóm theo module */}
        <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5">
          <h3 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide mb-3">Tạo rule từ template</h3>
          {templates.length === 0 ? (
            <p className="text-sm [color:var(--pf-color-muted)]">Chưa có template.</p>
          ) : (
            <div className="space-y-4">
              {templateGroups.map(([cat, tpls]) => (
                <div key={cat}>
                  <p className="text-[11px] font-bold uppercase tracking-wider [color:var(--pf-color-muted)] mb-2">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {tpls.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => void createTemplate(t)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-xl [background:var(--pf-primary)] px-3 py-2 text-xs font-semibold text-white hover:[background:var(--pf-primary-hover)] disabled:opacity-50"
                      >
                        <Plus size={13} /> {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rule trùng: mở rule hiện có (khuyến nghị) hoặc tạo bản mới có xác nhận */}
          {dup && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-amber-800">
                    Rule “{dup.existingRuleName || dup.template.name}” đã tồn tại cho CLB này.
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">Chọn mở rule hiện có để chỉnh sửa, hoặc vẫn tạo một bản mới (biến thể).</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => openExistingRule(dup.existingRuleId)}
                      className="inline-flex items-center gap-1.5 rounded-lg [background:var(--pf-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:[background:var(--pf-primary-hover)]">
                      Mở rule hiện có
                    </button>
                    <button onClick={() => void createTemplate(dup.template, true)} disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                      Vẫn tạo bản mới
                    </button>
                    <button onClick={() => setDup(null)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--pf-border)] px-3 py-1.5 text-xs font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)]">
                      Huỷ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dispatch theo Trigger (Epic 6 + Live data) */}
        <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5">
          <h3 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide mb-1">Chạy Dispatch theo Trigger</h3>
          <p className="text-xs [color:var(--pf-color-muted)] mb-3">
            <b>Dữ liệu thật</b>: lấy số liệu CLB hiện tại (nợ quỹ, buổi sắp tới, kỳ đã chốt) để rule khớp thực tế →
            tạo AiAction vào <b>Hộp Duyệt</b>. <b>Test rỗng</b>: chỉ chạy thử với ngữ cảnh trống (thường không khớp điều kiện).
          </p>
          <div className="space-y-2">
            {DISPATCH_TRIGGER_TYPES.map((t) => (
              <div key={t} className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono [color:var(--pf-color-muted)] w-40 shrink-0">{t}</span>
                <button
                  onClick={() => void run(async () => { const r = await dispatchLiveTrigger(t); setLiveResult(r); setDispatchResult(null); toast(`Khớp ${r.matchedRules} rule · tạo ${r.createdActions} AiAction`) }, `Đã chạy dữ liệu thật: ${t}`)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl [background:var(--pf-primary)] px-3 py-2 text-xs font-semibold text-white hover:[background:var(--pf-primary-hover)] disabled:opacity-50"
                >
                  <Database size={13} /> Dữ liệu thật
                </button>
                <button
                  onClick={() => void run(async () => { setDispatchResult(await dispatchTestTrigger(t)); setLiveResult(null) }, `Đã dispatch-test: ${t}`)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl border [border-color:var(--pf-primary-soft)] [background:var(--pf-primary-soft)] px-3 py-2 text-xs font-semibold [color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)] disabled:opacity-50"
                >
                  <Zap size={13} /> Test rỗng
                </button>
              </div>
            ))}
          </div>
          {(liveResult ?? dispatchResult) && (() => {
            const r = liveResult ?? dispatchResult!
            const isLive = !!liveResult
            return (
              <div className="mt-4 rounded-xl border border-[color:var(--pf-border)] [background:var(--pf-surface-muted)] p-3">
                <p className="text-xs font-semibold [color:var(--pf-color-muted)] mb-2">
                  Kết quả {isLive ? '(dữ liệu thật)' : '(test rỗng)'}: {r.triggerType}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  {([
                    ['Tổng rule', r.totalRules],
                    ['Khớp', r.matchedRules],
                    ['Run tạo', r.createdRuns],
                    ['AiAction', r.createdActions],
                    ['Lỗi', r.failedRuns],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="rounded-lg [background:var(--pf-surface)] border border-[color:var(--pf-border)] px-2 py-1.5">
                      <p className="text-sm font-bold [color:var(--pf-text)]">{value}</p>
                      <p className="text-[10px] [color:var(--pf-color-muted)]">{label}</p>
                    </div>
                  ))}
                </div>
                {isLive && (
                  <div className="mt-2 text-[11px] [color:var(--pf-color-muted)]">
                    Số liệu CLB: {Object.entries(liveResult!.liveContext).map(([k, v]) => `${k}=${String(v)}`).join(' · ') || '(trống)'}
                  </div>
                )}
                {r.matchedRules === 0 && (
                  <p className="mt-2 text-[11px] text-amber-600">
                    Không rule nào khớp {isLive ? '(số liệu CLB chưa thoả điều kiện, hoặc chưa có rule bật cho trigger này)' : '(ngữ cảnh rỗng — thử "Dữ liệu thật")'}.
                  </p>
                )}
                {r.createdActions > 0 && (
                  <p className="mt-2 text-[11px] text-emerald-600">
                    Đã tạo {r.createdActions} AiAction → xem/duyệt tại <b>AI Operations Center · Hộp Duyệt</b>.
                  </p>
                )}
              </div>
            )
          })()}
        </div>

        {/* Rules list */}
        <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">Workflow Rules</h3>
            <span className="rounded-full [background:var(--pf-color-muted-soft)] px-2 py-0.5 text-xs font-semibold [color:var(--pf-color-muted)]">{rules.length}</span>
          </div>
          {loading ? (
            <p className="text-sm [color:var(--pf-color-muted)]">Đang tải…</p>
          ) : rules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[color:var(--pf-border)] py-10 text-center">
              <Workflow size={30} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm [color:var(--pf-color-muted)] font-medium">Chưa có workflow rule</p>
              <p className="text-xs [color:var(--pf-color-muted)] mt-1">Tạo rule từ template ở trên để bắt đầu.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ruleGroups.map(([cat, grpRules]) => (
                <div key={cat}>
                  <p className="text-[11px] font-bold uppercase tracking-wider [color:var(--pf-color-muted)] mb-2">{cat} · {grpRules.length}</p>
                  <div className="space-y-2">
              {grpRules.map((r) => (
                <div key={r.id} id={`wf-rule-${r.id}`} className="rounded-xl border border-[color:var(--pf-border)] p-3 transition-shadow">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold [color:var(--pf-text)]">{r.name}</p>
                      <p className="text-[11px] [color:var(--pf-color-muted)] mt-0.5">
                        {r.triggerType} · ưu tiên {r.priority}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${r.enabled ? 'bg-emerald-50 text-emerald-700' : '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${r.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {r.enabled ? 'Đang bật' : 'Đã tắt'}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      onClick={() => void run(async () => { const rr = await testTriggerRule(r.id); toast(`Run: ${rr.status}`) }, 'Đã test-trigger')}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg [background:var(--pf-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:[background:var(--pf-primary-hover)] disabled:opacity-50"
                    >
                      <Play size={13} /> Test
                    </button>
                    <button
                      onClick={() => void run(() => setRuleEnabled(r.id, !r.enabled), r.enabled ? 'Đã tắt rule' : 'Đã bật rule')}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--pf-border)] px-3 py-1.5 text-xs font-medium [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)] disabled:opacity-50"
                    >
                      {r.enabled ? 'Tắt' : 'Bật'}
                    </button>
                    <button
                      onClick={() => void run(() => deleteWorkflowRule(r.id), 'Đã xoá rule')}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={13} /> Xoá
                    </button>
                  </div>
                </div>
              ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Runs */}
        <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">Lịch Sử Chạy (Runs)</h3>
            <span className="rounded-full [background:var(--pf-color-muted-soft)] px-2 py-0.5 text-xs font-semibold [color:var(--pf-color-muted)]">{runs.length}</span>
          </div>
          {loading ? (
            <p className="text-sm [color:var(--pf-color-muted)]">Đang tải…</p>
          ) : runs.length === 0 ? (
            <p className="text-sm [color:var(--pf-color-muted)]">Chưa có lần chạy nào.</p>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <div key={run.id} className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--pf-border)] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium [color:var(--pf-text)]">{run.triggerType}</p>
                    <p className="text-[10px] [color:var(--pf-color-muted)]">{fmtTime(run.createdAt)}</p>
                    {run.errorMessage && <p className="text-[10px] text-red-500 truncate">{run.errorMessage}</p>}
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${RUN_STATUS_STYLE[run.status] ?? '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]'}`}>
                    {run.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
