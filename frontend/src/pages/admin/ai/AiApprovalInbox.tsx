import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Inbox, Info, Check, X, RotateCcw, ShieldCheck,
  Play, AlertTriangle, ChevronRight, Bot, RefreshCw, Zap,
} from 'lucide-react'
import {
  useAiManager, evaluateApproval, fetchAiAction,
  approveAiAction, rejectAiAction, retryAiAction, executeAiAction,
  type RiskLevel, type ApprovalEvaluation, type AiActionDetail,
} from '../../../hooks/useAiManager'

const RISK_OPTS: { value: RiskLevel; label: string }[] = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'critical', label: 'Nghiêm trọng' },
]

const RISK_STYLE: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700', LOW: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700', MEDIUM: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700', HIGH: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700', CRITICAL: 'bg-red-100 text-red-700',
}

const STATUS_STYLE: Record<string, string> = {
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXECUTING: 'bg-sky-100 text-sky-700',
  EXECUTED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  RETRY_PENDING: '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]',
  EXPIRED: '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]',
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN', { hour12: false })
}

export function AiApprovalInbox() {
  const { policies, pending, executable, loading, availability, refetch } = useAiManager()

  // Detail drawer
  const [detail, setDetail] = useState<AiActionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Evaluator (read-only preview)
  const [actionType, setActionType] = useState('')
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium')
  const [objective, setObjective] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [evalError, setEvalError] = useState<string | null>(null)
  const [result, setResult] = useState<ApprovalEvaluation | null>(null)

  const payloadKeys = detail?.payloadSummary?.fieldNames ?? []
  const payloadSize = detail?.payloadSummary?.approxSizeBytes ?? 0

  async function openDetail(id: string) {
    setDetailLoading(true)
    setRejectReason('')
    try {
      setDetail(await fetchAiAction(id))
    } catch {
      toast.error('Không tải được chi tiết hành động.')
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function runMutation(fn: () => Promise<void>, okMsg: string) {
    setBusy(true)
    try {
      await fn()
      toast.success(okMsg)
      setDetail(null)
      refetch()
    } catch {
      toast.error('Thao tác thất bại (kiểm tra quyền hoặc trạng thái hành động).')
    } finally {
      setBusy(false)
    }
  }

  async function handleEvaluate() {
    setEvaluating(true)
    setEvalError(null)
    try {
      setResult(
        await evaluateApproval({
          actionType: actionType.trim() || undefined,
          riskLevel,
          objective: objective.trim() || undefined,
        }),
      )
    } catch {
      setEvalError('Không gọi được /ai/maika/approval/evaluate.')
      setResult(null)
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [background:var(--pf-primary-soft)]">
              <Inbox size={20} className="[color:var(--pf-primary)]" />
            </span>
            <div>
              <h1 className="text-xl font-bold [color:var(--pf-text)]">Hộp Duyệt AI</h1>
              <p className="text-sm [color:var(--pf-color-muted)]">Hàng đợi phê duyệt hành động AI · Đánh giá điều kiện duyệt</p>
            </div>
          </div>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--pf-border)] px-3 py-2 text-xs font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)]"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
      </div>

      <div className="pf-center-x w-full max-w-[1280px] px-4 sm:px-6 py-5 space-y-6">
        {!availability.actions && !loading && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Không tải được hàng đợi hành động (kiểm tra quyền/đăng nhập). Hiển thị trạng thái an toàn.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Pending queue — REAL */}
          <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Inbox size={16} className="[color:var(--pf-color-muted)]" />
                <h3 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">Hàng Đợi Chờ Duyệt</h3>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{pending.length}</span>
            </div>

            {loading ? (
              <p className="text-sm [color:var(--pf-color-muted)]">Đang tải…</p>
            ) : pending.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[color:var(--pf-border)] py-10 text-center">
                <Inbox size={30} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm [color:var(--pf-color-muted)] font-medium">Không có hành động chờ duyệt</p>
                <p className="text-xs [color:var(--pf-color-muted)] mt-1">Khi AI tạo yêu cầu cần duyệt, nó sẽ hiện ở đây.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pending.map(a => (
                  <div key={a.id} className="rounded-xl border border-[color:var(--pf-border)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Bot size={13} className="[color:var(--pf-primary)] shrink-0" />
                        <span className="text-xs font-semibold [color:var(--pf-color-muted)]">{a.requestedByAi}</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${RISK_STYLE[a.riskLevel] ?? '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]'}`}>
                          {a.riskLevel}
                        </span>
                      </div>
                      <span className="text-[10px] [color:var(--pf-color-muted)] shrink-0">{fmtTime(a.createdAt)}</span>
                    </div>
                    <p className="text-sm font-semibold [color:var(--pf-text)] mt-1.5">{a.title}</p>
                    {a.summary && <p className="text-xs [color:var(--pf-color-muted)] line-clamp-2 mt-0.5">{a.summary}</p>}
                    <p className="text-[11px] [color:var(--pf-color-muted)] mt-1">{a.actionType}{a.targetModule ? ` · ${a.targetModule}` : ''}</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <button
                        onClick={() => void runMutation(() => approveAiAction(a.id), 'Đã duyệt')}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <Check size={13} /> Duyệt
                      </button>
                      <button
                        onClick={() => void runMutation(() => rejectAiAction(a.id), 'Đã từ chối')}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                      >
                        <X size={13} /> Từ chối
                      </button>
                      <button
                        onClick={() => void openDetail(a.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--pf-border)] px-3 py-1.5 text-xs font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)]"
                      >
                        Chi tiết <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approval evaluator — REAL read-only preview */}
          <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="[color:var(--pf-color-muted)]" />
              <h3 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">Đánh Giá Điều Kiện Duyệt</h3>
            </div>
            <div className="space-y-3">
              <input
                value={actionType}
                onChange={e => setActionType(e.target.value)}
                placeholder="Loại hành động (VD: send-reminder)…"
                className="w-full rounded-xl border border-[color:var(--pf-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] focus:border-transparent"
              />
              <div className="flex flex-wrap gap-1.5">
                {RISK_OPTS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setRiskLevel(o.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      riskLevel === o.value ? RISK_STYLE[o.value] : '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] hover:bg-slate-200'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <textarea
                value={objective}
                onChange={e => setObjective(e.target.value)}
                rows={2}
                placeholder="Mục tiêu (tuỳ chọn)…"
                className="w-full rounded-xl border border-[color:var(--pf-border)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] focus:border-transparent"
              />
              <button
                onClick={() => void handleEvaluate()}
                disabled={evaluating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl [background:var(--pf-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:[background:var(--pf-primary-hover)] disabled:opacity-50"
              >
                <Play size={15} /> {evaluating ? 'Đang đánh giá…' : 'Đánh giá'}
              </button>
              {evalError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5">
                  <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{evalError}</p>
                </div>
              )}
              {result && (
                <div className="rounded-xl border border-[color:var(--pf-border)] [background:var(--pf-surface-muted)] px-3 py-3">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${RISK_STYLE[result.riskLevel ?? riskLevel] ?? '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]'}`}>
                      {result.riskLevel ?? riskLevel}
                    </span>
                    {typeof result.requiredApprovalCount === 'number' && (
                      <span className="text-xs font-medium [color:var(--pf-color-muted)]">Cần {result.requiredApprovalCount} phê duyệt</span>
                    )}
                  </div>
                  {result.reason && <p className="text-xs [color:var(--pf-color-muted)] mt-2">{result.reason}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Đã duyệt — chờ thực thi (Mít Đặc Executor) */}
        <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap size={16} className="[color:var(--pf-color-muted)]" />
              <h3 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">Đã Duyệt — Chờ Thực Thi (Mít Đặc)</h3>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{executable.length}</span>
          </div>
          {loading ? (
            <p className="text-sm [color:var(--pf-color-muted)]">Đang tải…</p>
          ) : executable.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[color:var(--pf-border)] py-8 text-center">
              <Zap size={26} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm [color:var(--pf-color-muted)] font-medium">Không có hành động chờ thực thi</p>
              <p className="text-xs [color:var(--pf-color-muted)] mt-1">Hành động sau khi được duyệt sẽ xuất hiện ở đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {executable.map(a => (
                <div key={a.id} className="rounded-xl border border-[color:var(--pf-border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Bot size={13} className="text-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold [color:var(--pf-color-muted)]">{a.requestedByAi}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${RISK_STYLE[a.riskLevel] ?? '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]'}`}>{a.riskLevel}</span>
                    </div>
                    <span className="text-[10px] [color:var(--pf-color-muted)] shrink-0">{fmtTime(a.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold [color:var(--pf-text)] mt-1.5">{a.title}</p>
                  <p className="text-[11px] [color:var(--pf-color-muted)] mt-0.5">{a.actionType}{a.targetModule ? ` · ${a.targetModule}` : ''}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      onClick={() => void runMutation(() => executeAiAction(a.id), 'Đã thực thi')}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <Zap size={13} /> Thực thi
                    </button>
                    <button
                      onClick={() => void openDetail(a.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--pf-border)] px-3 py-1.5 text-xs font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)]"
                    >
                      Chi tiết <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative h-full w-full max-w-md [background:var(--pf-surface)] shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold [color:var(--pf-text)]">Chi Tiết Hành Động AI</h3>
              <button onClick={() => setDetail(null)} className="[color:var(--pf-color-muted)] hover:[color:var(--pf-text)]"><X size={18} /></button>
            </div>

            {detailLoading || !detail ? (
              <div className="px-5 py-8 text-sm [color:var(--pf-color-muted)]">Đang tải…</div>
            ) : (
              <div className="px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${STATUS_STYLE[detail.status] ?? '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]'}`}>
                      {detail.status}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${RISK_STYLE[detail.riskLevel] ?? '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]'}`}>
                      {detail.riskLevel}
                    </span>
                  </div>
                  <p className="text-base font-bold [color:var(--pf-text)] mt-2">{detail.title}</p>
                  {detail.summary && <p className="text-sm [color:var(--pf-color-muted)] mt-1">{detail.summary}</p>}
                </div>

                <div className="space-y-2 text-sm">
                  <Row label="AI yêu cầu">{detail.requestedByAi}</Row>
                  <Row label="Loại hành động">{detail.actionType}</Row>
                  <Row label="Module đích">{detail.targetModule ?? '—'}</Row>
                  <Row label="Thực thể đích">{detail.targetEntityType ? `${detail.targetEntityType}${detail.targetEntityId ? ` #${detail.targetEntityId}` : ''}` : '—'}</Row>
                  <Row label="Cần duyệt">{detail.approvalRequired ? 'Có' : 'Không'}</Row>
                  <Row label="Số lần chạy lại">{detail.retryCount}</Row>
                  {detail.approvedAt && <Row label="Duyệt lúc">{fmtTime(detail.approvedAt)}</Row>}
                  {detail.rejectedAt && <Row label="Từ chối lúc">{fmtTime(detail.rejectedAt)}</Row>}
                  {detail.rejectionReason && <Row label="Lý do từ chối">{detail.rejectionReason}</Row>}
                  {detail.executorAgent && <Row label="Executor">{detail.executorAgent}</Row>}
                  {typeof detail.executionDuration === 'number' && (
                    <Row label="Thời lượng thực thi">{detail.executionDuration}ms</Row>
                  )}
                  {detail.executorFinishedAt && <Row label="Thực thi xong">{fmtTime(detail.executorFinishedAt)}</Row>}
                  {detail.errorMessage && <Row label="Lỗi">{detail.errorMessage}</Row>}
                </div>

                {/* Payload summary — chỉ liệt kê TÊN trường, KHÔNG lộ giá trị nhạy cảm */}
                <div>
                  <p className="text-[11px] font-semibold [color:var(--pf-color-muted)] uppercase mb-1">Tóm tắt payload</p>
                  <p className="text-xs [color:var(--pf-color-muted)]">
                    {payloadKeys.length
                      ? `${payloadKeys.length} trường (~${payloadSize}B): ${payloadKeys.join(', ')}`
                      : 'Không có payload.'}
                  </p>
                </div>

                {/* Execution history / audit trail */}
                <div>
                  <p className="text-[11px] font-semibold [color:var(--pf-color-muted)] uppercase mb-2">Lịch sử sự kiện</p>
                  <div className="space-y-2">
                    {detail.events.length === 0 ? (
                      <p className="text-xs [color:var(--pf-color-muted)]">Chưa có sự kiện.</p>
                    ) : (
                      detail.events.map(ev => (
                        <div key={ev.id} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full [background:var(--pf-primary)]" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium [color:var(--pf-text)]">{ev.type}</p>
                            {ev.message && <p className="text-[11px] [color:var(--pf-color-muted)]">{ev.message}</p>}
                            <p className="text-[10px] [color:var(--pf-color-muted)]">{fmtTime(ev.createdAt)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions in drawer */}
                {detail.status === 'PENDING_APPROVAL' && (
                  <div className="space-y-2 border-t border-[color:var(--pf-border)] pt-3">
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      rows={2}
                      placeholder="Lý do từ chối (tuỳ chọn)…"
                      className="w-full rounded-xl border border-[color:var(--pf-border)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => void runMutation(() => approveAiAction(detail.id), 'Đã duyệt')}
                        disabled={busy}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <Check size={15} /> Duyệt
                      </button>
                      <button
                        onClick={() => void runMutation(() => rejectAiAction(detail.id, rejectReason.trim() || undefined), 'Đã từ chối')}
                        disabled={busy}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                      >
                        <X size={15} /> Từ chối
                      </button>
                    </div>
                  </div>
                )}
                {detail.status === 'APPROVED' && (
                  <button
                    onClick={() => void runMutation(() => executeAiAction(detail.id), 'Đã thực thi')}
                    disabled={busy}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Zap size={15} /> Thực thi (Mít Đặc)
                  </button>
                )}
                {detail.status === 'EXECUTING' && (
                  <p className="rounded-xl bg-sky-50 px-3 py-2.5 text-xs font-medium text-sky-700 text-center">
                    Đang thực thi bởi Mít Đặc…
                  </p>
                )}
                {detail.status === 'EXECUTED' && (
                  <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700 text-center">
                    Đã thực thi xong (read-only).
                  </p>
                )}
                {detail.status === 'FAILED' && (
                  <button
                    onClick={() => void runMutation(() => retryAiAction(detail.id), 'Đã yêu cầu chạy lại')}
                    disabled={busy}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <RotateCcw size={15} /> Chạy lại
                  </button>
                )}

                {policies.length > 0 && (
                  <p className="text-[10px] [color:var(--pf-color-muted)]">
                    Duyệt KHÔNG tự thực thi. Hành động APPROVED được thực thi thủ công qua Mít Đặc (bridge no-op hiện tại).
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase shrink-0">{label}</span>
      <span className="text-sm font-medium [color:var(--pf-text)] text-right break-words">{children}</span>
    </div>
  )
}
