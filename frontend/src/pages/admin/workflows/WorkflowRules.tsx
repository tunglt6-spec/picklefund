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
  PENDING: 'bg-slate-100 text-slate-600',
  RUNNING: 'bg-sky-100 text-sky-700',
  WAITING_APPROVAL: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN', { hour12: false })
}

export function WorkflowRules() {
  const { rules, runs, templates, loading, available, refetch } = useWorkflows()
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

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [background:var(--pf-primary-soft)]">
              <Workflow size={20} className="[color:var(--pf-primary)]" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Hermes Workflows</h1>
              <p className="text-sm text-slate-500">Workflow rule + lịch sử chạy · hành động đi qua AI Action Center</p>
            </div>
          </div>
          <button
            onClick={refetch}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
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

        {/* Create from template */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Tạo rule từ template</h3>
          <div className="flex flex-wrap gap-2">
            {templates.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có template.</p>
            ) : (
              templates.map((t) => (
                <button
                  key={t.key}
                  onClick={() => void createTemplate(t)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl [background:var(--pf-primary)] px-3 py-2 text-xs font-semibold text-white hover:[background:var(--pf-primary-hover)] disabled:opacity-50"
                >
                  <Plus size={13} /> {t.name}
                </button>
              ))
            )}
          </div>

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
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      Huỷ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dispatch theo Trigger (Epic 6 + Live data) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1">Chạy Dispatch theo Trigger</h3>
          <p className="text-xs text-slate-400 mb-3">
            <b>Dữ liệu thật</b>: lấy số liệu CLB hiện tại (nợ quỹ, buổi sắp tới, kỳ đã chốt) để rule khớp thực tế →
            tạo AiAction vào <b>Hộp Duyệt</b>. <b>Test rỗng</b>: chỉ chạy thử với ngữ cảnh trống (thường không khớp điều kiện).
          </p>
          <div className="space-y-2">
            {DISPATCH_TRIGGER_TYPES.map((t) => (
              <div key={t} className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-slate-500 w-40 shrink-0">{t}</span>
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
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">
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
                    <div key={label} className="rounded-lg bg-white border border-slate-100 px-2 py-1.5">
                      <p className="text-sm font-bold text-slate-800">{value}</p>
                      <p className="text-[10px] text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
                {isLive && (
                  <div className="mt-2 text-[11px] text-slate-500">
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Workflow Rules</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{rules.length}</span>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Đang tải…</p>
          ) : rules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
              <Workflow size={30} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm text-slate-500 font-medium">Chưa có workflow rule</p>
              <p className="text-xs text-slate-400 mt-1">Tạo rule từ template ở trên để bắt đầu.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((r) => (
                <div key={r.id} id={`wf-rule-${r.id}`} className="rounded-xl border border-slate-100 p-3 transition-shadow">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {r.triggerType} · ưu tiên {r.priority}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${r.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
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
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
          )}
        </div>

        {/* Runs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Lịch Sử Chạy (Runs)</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{runs.length}</span>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Đang tải…</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có lần chạy nào.</p>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <div key={run.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700">{run.triggerType}</p>
                    <p className="text-[10px] text-slate-400">{fmtTime(run.createdAt)}</p>
                    {run.errorMessage && <p className="text-[10px] text-red-500 truncate">{run.errorMessage}</p>}
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${RUN_STATUS_STYLE[run.status] ?? 'bg-slate-100 text-slate-600'}`}>
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
