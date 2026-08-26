/**
 * RunTraceDrawer — GIẢI TRÌNH 1 lần chạy Hermes Workflow (AI observability, Phase 1/2).
 * Trả lời 8 câu: rule nào · agent nào · tạo bao nhiêu AI Action · thành/bại · dedup/cooldown ·
 * human approval · chi phí AI · outcome nghiệp vụ (thông báo). Đọc GET /workflows/runs/:id/trace.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { fetchRunTrace, triggerLabel, type RunTrace } from '../../../hooks/useWorkflows'

function fmtMs(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

/** 1 khối "câu hỏi → trả lời". */
function QBlock({ n, q, children }: { n: number; q: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[color:var(--pf-border)] p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white [background:var(--pf-primary)]">{n}</span>
        <span className="text-[12px] font-semibold [color:var(--pf-text)]">{q}</span>
      </div>
      <div className="pl-7 text-[13px] [color:var(--pf-text)]">{children}</div>
    </div>
  )
}

function Chip({ children, tone }: { children: ReactNode; tone?: 'muted' | 'warn' | 'ok' | 'danger' }) {
  const bg = tone === 'warn' ? 'var(--pf-color-warning-soft)' : tone === 'ok' ? 'var(--pf-color-success-soft)' : tone === 'danger' ? 'var(--pf-color-danger-soft)' : 'var(--pf-color-muted-soft)'
  const fg = tone === 'warn' ? 'var(--pf-color-warning)' : tone === 'ok' ? 'var(--pf-color-success)' : tone === 'danger' ? 'var(--pf-color-danger)' : 'var(--pf-color-muted)'
  return <span className="mr-1.5 mb-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: bg, color: fg }}>{children}</span>
}

export function RunTraceDrawer({ runId, onClose }: { runId: string | null; onClose: () => void }) {
  const [trace, setTrace] = useState<RunTrace | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!runId) { setTrace(null); return }
    setLoading(true)
    fetchRunTrace(runId).then(setTrace).catch(() => setTrace(null)).finally(() => setLoading(false))
  }, [runId])

  const r = trace?.run
  const statusTone = r?.status === 'FAILED' ? 'danger' : r?.status === 'WAITING_APPROVAL' ? 'warn' : r?.status === 'COMPLETED' ? 'ok' : 'muted'

  return (
    <Modal open={!!runId} onClose={onClose} title="Giải trình lần chạy" subtitle={r?.ruleName ?? (r ? triggerLabel(r.triggerType) : undefined)} size="xl">
      {loading || !trace || !r ? (
        <div className="py-10 text-center text-[13px] [color:var(--pf-color-muted)]">Đang tải giải trình…</div>
      ) : (
        <div className="space-y-3">
          {/* Tóm tắt run */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl [background:var(--pf-color-muted-soft)] px-3 py-2 text-[12px]">
            <Chip tone={statusTone as any}>{r.status}</Chip>
            <span className="[color:var(--pf-color-muted)]">Thời lượng: <strong className="[color:var(--pf-text)]">{fmtMs(r.durationMs)}</strong></span>
            <span className="[color:var(--pf-color-muted)]">Lịch: <strong className="[color:var(--pf-text)]">{r.scheduleType ?? '—'}</strong></span>
            {r.matched != null && <span className="[color:var(--pf-color-muted)]">Khớp điều kiện: <strong className="[color:var(--pf-text)]">{r.matched ? 'Có' : 'Không'}</strong></span>}
          </div>
          {r.error && <p className="rounded-lg [background:var(--pf-color-danger-soft)] px-3 py-2 text-[12px] [color:var(--pf-color-danger)]">{r.error}</p>}

          <QBlock n={1} q="Rule nào chạy?">
            <strong>{trace.q1_rule.ruleName ?? '(rule đã xoá)'}</strong> · <span className="[color:var(--pf-color-muted)]">{triggerLabel(trace.q1_rule.triggerType)}</span>
          </QBlock>

          <QBlock n={2} q="Agent nào tham gia?">
            {trace.q2_agents.length ? trace.q2_agents.map((a) => <Chip key={a}>{a}</Chip>) : <span className="[color:var(--pf-color-muted)]">—</span>}
          </QBlock>

          <QBlock n={3} q="Tạo bao nhiêu AI Action?">
            <p className="mb-1"><strong>{trace.q3_actions.created}</strong> AI Action</p>
            {trace.q3_actions.items.length > 0 && (
              <div className="space-y-1">
                {trace.q3_actions.items.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-[color:var(--pf-border)] px-2 py-1 text-[12px]">
                    <span className="min-w-0 truncate">{a.title || a.actionType}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      <Chip tone="muted">{a.riskLevel}</Chip>
                      <Chip tone={a.status === 'EXECUTED' ? 'ok' : a.status === 'FAILED' || a.status === 'REJECTED' ? 'danger' : a.status === 'PENDING_APPROVAL' ? 'warn' : 'muted'}>{a.status}</Chip>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </QBlock>

          <QBlock n={4} q="Thành công / thất bại?">
            <Chip tone={statusTone as any}>{trace.q4_result.status}</Chip>
          </QBlock>

          <QBlock n={5} q="Duplicate / cooldown bao nhiêu?">
            <Chip tone="muted">Trùng: {trace.q5_dedup.skippedDuplicate}</Chip>
            <Chip tone="muted">Cooldown: {trace.q5_dedup.skippedCooldown}</Chip>
            <Chip tone="muted">Bỏ khác: {trace.q5_dedup.skippedOther}</Chip>
            <Chip tone="muted">Tự đóng: {trace.q5_dedup.autoResolved}</Chip>
          </QBlock>

          <QBlock n={6} q="Human approval bao nhiêu?">
            <Chip tone="warn">Cần duyệt: {trace.q6_approval.required}</Chip>
            <Chip tone="warn">Đang chờ: {trace.q6_approval.pending}</Chip>
            <Chip tone="ok">Đã duyệt: {trace.q6_approval.approved}</Chip>
            <Chip tone="danger">Từ chối: {trace.q6_approval.rejected}</Chip>
          </QBlock>

          <QBlock n={7} q="Chi phí AI bao nhiêu?">
            {trace.q7_cost.note ? (
              <span className="[color:var(--pf-color-muted)]">{trace.q7_cost.note}</span>
            ) : (
              <>
                <Chip tone="muted">{trace.q7_cost.calls} lượt gọi</Chip>
                <Chip tone="muted">{trace.q7_cost.totalTokens.toLocaleString('vi-VN')} token</Chip>
                <Chip tone="muted">≈ ${trace.q7_cost.estimatedCostUsd.toFixed(4)}</Chip>
              </>
            )}
          </QBlock>

          <QBlock n={8} q="Outcome nghiệp vụ (thông báo)?">
            <p className="mb-1"><strong>{trace.q8_business.notifications.total}</strong> thông báo phát sinh</p>
            <div>
              {Object.entries(trace.q8_business.notifications.byChannel).map(([c, n]) => <Chip key={c} tone="muted">{c}: {n}</Chip>)}
            </div>
            <div className="mt-0.5">
              {Object.entries(trace.q8_business.notifications.byStatus).map(([s, n]) => (
                <Chip key={s} tone={s === 'FAILED' ? 'danger' : s === 'READY' ? 'ok' : 'muted'}>{s}: {n}</Chip>
              ))}
            </div>
          </QBlock>
        </div>
      )}
    </Modal>
  )
}
