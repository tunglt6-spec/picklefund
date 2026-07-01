/**
 * UI-07 — AI Workspace Enterprise (Increment 2 — Human Approval Integration) — PickleFund v2.1
 * Kế thừa UI-02 (Golden Reference) + UI-07 Increment 1. Tuân thủ UIP-07 + UDP-01 +
 * Amendment #01 (Loading/Empty/Error) + Amendment #02 + VDS-01 (Visual Quality Gate).
 *
 * HUMAN APPROVAL INTEGRATION (KHÔNG phải Execution Engine):
 *  - Suggested Action → Human Review → Human Approval UI → backend flow HIỆN CÓ (nếu có).
 *  - Backend flow detection: các endpoint approval của Maika đều READ-ONLY
 *    (executionAllowed=false, không persist). KHÔNG có endpoint approve/reject persist →
 *    nút Approve/Reject **disabled + helper**. Source of Truth Inc.2: UI CHỈ đọc health-score,
 *    KHÔNG gọi bất kỳ endpoint approval nào.
 *  - CRITICAL AI SAFETY: KHÔNG Execute/Run/Dispatch/Send/write/DB/workflow/agent-execution.
 *    KHÔNG wording "Đã thực thi/Executed/Run now". Execution thuộc Epic 4.2 — BLOCKED.
 *  - Dữ liệu official từ backend hiện có; thiếu → "Chưa có dữ liệu". KHÔNG fake data.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare, Lightbulb, ListChecks, BookOpen, History as HistoryIcon,
  Cpu, Activity, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, Clock,
  Database, Bot, Eye, AlertTriangle, Check, Ban, X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  PageShell, PageHeader, MetricCard, FilterBar, StatusBadge, type StatusTone,
  ActionButton, EmptyState, LoadingState, ResponsiveTabs,
} from '../../components/shared'

function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}
function num(v: unknown): number | undefined {
  return v == null ? undefined : Number(v)
}

type AiTab = 'overview' | 'conversation' | 'insight' | 'recommendation' | 'approval' | 'knowledge' | 'history' | 'tools'
const AI_TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'conversation', label: 'Trò chuyện' },
  { key: 'insight', label: 'Insight' },
  { key: 'recommendation', label: 'Đề xuất' },
  { key: 'approval', label: 'Duyệt' },
  { key: 'knowledge', label: 'Kiến thức' },
  { key: 'history', label: 'Lịch sử' },
  { key: 'tools', label: 'Trạng thái công cụ' },
]

/**
 * Backend Flow Detection (Increment 2):
 * Các endpoint approval của Maika hiện có đều READ-ONLY (executionAllowed=false,
 * requiresHumanApproval, KHÔNG persist). KHÔNG có endpoint approve/reject persist →
 * nút Approve/Reject DISABLED + helper. Không gọi API giả, không mutate.
 * Source of Truth Inc.2: UI CHỈ đọc `/maika/health-score`, KHÔNG gọi endpoint approval nào.
 */
const APPROVAL_PERSIST_AVAILABLE = false
const APPROVAL_HELP = 'Backend approval flow (persist) chưa sẵn sàng — hiện chỉ preview/evaluate read-only.'

interface AiHealth {
  score?: number
  recommendations: string[]
  interpretation?: string
}

/** Item để review (từ recommendation read-only). */
interface ReviewItem {
  index: number
  recommendation: string
  confidence?: string
  source: string
}

/** Danh sách integration points (read-only). Status = "Chưa có dữ liệu" khi không có endpoint kiểm tra. */
const TOOLS = [
  { key: 'litellm', label: 'LiteLLM', icon: <Cpu size={16} /> },
  { key: 'openrouter', label: 'OpenRouter', icon: <Cpu size={16} /> },
  { key: 'ollama', label: 'Ollama', icon: <Cpu size={16} /> },
  { key: 'telegram', label: 'Telegram', icon: <MessageSquare size={16} /> },
  { key: 'email', label: 'Email', icon: <MessageSquare size={16} /> },
  { key: 'backend', label: 'Backend API', icon: <Database size={16} /> },
]

/* ── Insight card (read-only) — module scope ── */
function InsightCard({ title, tone = 'ai', confidence, source, reason }: { title: string; tone?: StatusTone; confidence?: string; source?: string; reason?: string }) {
  return (
    <div className="rounded-2xl border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--pf-color-ai-soft)', color: 'var(--pf-color-ai)' }}>
          <Lightbulb size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium [color:var(--pf-text)]">{title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge tone={tone}>Insight</StatusBadge>
            {confidence && <span className="text-xs [color:var(--pf-color-muted)]">Độ tin cậy: {confidence}</span>}
            {source && <span className="text-xs [color:var(--pf-color-muted)]">Nguồn: {source}</span>}
          </div>
          {reason && <p className="mt-2 text-sm [color:var(--pf-color-muted)]">{reason}</p>}
        </div>
      </div>
    </div>
  )
}

/* ── Empty box helper — module scope ── */
function EmptyBox({ title, desc, icon }: { title: string; desc: string; icon: ReactNode }) {
  return (
    <div className="rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
      <EmptyState icon={icon} title={title} description={desc} />
    </div>
  )
}

/* ── Detail row ── */
function DRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 [color:var(--pf-color-muted)]">{label}</dt>
      <dd className="text-right font-medium [color:var(--pf-text)]">{value}</dd>
    </div>
  )
}

/* ── Human Review / Approval Drawer (desktop right / mobile bottom sheet) ──
   Approve/Reject DISABLED khi backend chưa có persist flow. KHÔNG execute/run/dispatch. */
function ReviewDrawer({
  item, isMobile, onClose,
}: { item: ReviewItem; isMobile: boolean; onClose: () => void }) {
  return (
    <div className={`fixed inset-0 z-50 flex ${isMobile ? 'items-end' : 'justify-end'}`}>
      <div className="absolute inset-0" style={{ background: 'rgb(15 23 42 / 0.30)' }} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Human Review — đề xuất AI"
        className={`relative flex flex-col [background:var(--pf-surface)] ${
          isMobile ? 'w-full max-h-[88vh] rounded-t-[24px] animate-fadeIn' : 'h-full w-full max-w-md shadow-2xl animate-fadeIn'
        }`}>
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4 border-[color:var(--pf-border)]">
          <div className="min-w-0">
            <h2 className="text-base font-semibold [color:var(--pf-text)]">Human Review</h2>
            <p className="mt-0.5 text-xs [color:var(--pf-color-muted)]">Con người xem xét đề xuất AI — read-only, chưa thực thi</p>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div className="rounded-2xl border p-4 [background:var(--pf-color-ai-soft)] border-[color:var(--pf-border)]">
            <div className="flex items-center gap-2">
              <StatusBadge tone="ai">Đề xuất AI</StatusBadge>
              <StatusBadge tone="warning">Cần con người duyệt</StatusBadge>
            </div>
            <p className="mt-2 text-sm [color:var(--pf-text)]">{item.recommendation}</p>
          </div>

          <dl className="space-y-2 text-sm">
            <DRow label="Loại action" value="Đề xuất (suggested action)" />
            <DRow label="Đối tượng" value="Chưa có dữ liệu" />
            <DRow label="Lý do" value={<span className="max-w-[220px]">{item.recommendation}</span>} />
            <DRow label="Độ tin cậy" value={item.confidence ?? 'Chưa có dữ liệu'} />
            <DRow label="Mức rủi ro" value={<StatusBadge tone="neutral">Chưa có dữ liệu</StatusBadge>} />
            <DRow label="Quyền yêu cầu" value="Chưa có dữ liệu" />
            <DRow label="Nguồn" value={item.source} />
            <DRow label="Backend flow dự kiến" value="Maika Approval (read-only preview/evaluate)" />
            <DRow label="Trạng thái" value={<StatusBadge tone="warning">Chờ duyệt · chưa thực thi</StatusBadge>} />
          </dl>

          <div className="rounded-xl border px-3 py-2 text-xs border-[color:var(--pf-border)] [color:var(--pf-color-muted)]">
            <AlertTriangle size={13} className="mr-1 inline" />
            {APPROVAL_HELP} AI <b>không</b> tự thực thi (Execution — Epic 4.2 BLOCKED).
          </div>
        </div>

        <div className="flex items-center gap-3 border-t px-5 py-4 border-[color:var(--pf-border)]">
          <ActionButton variant="secondary" fullWidth icon={<Ban size={15} />}
            disabled={!APPROVAL_PERSIST_AVAILABLE} title={APPROVAL_PERSIST_AVAILABLE ? 'Từ chối' : APPROVAL_HELP}>Từ chối</ActionButton>
          <ActionButton fullWidth icon={<Check size={15} />}
            disabled={!APPROVAL_PERSIST_AVAILABLE} title={APPROVAL_PERSIST_AVAILABLE ? 'Duyệt' : APPROVAL_HELP}>Duyệt</ActionButton>
        </div>
      </div>
    </div>
  )
}

export function AIWorkspace() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { user, accessToken } = useAuthStore()
  const clubId = user?.clubId ?? ''

  const [tab, setTab] = useState<AiTab>('overview')
  const [health, setHealth] = useState<AiHealth | null>(null)
  const [reviewItem, setReviewItem] = useState<ReviewItem | null>(null)
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [convSearch, setConvSearch] = useState('')

  /* ── Fetch AI health — Source of Truth UI-07 Inc.2: CHỈ đọc `/maika/health-score`.
     KHÔNG gọi bất kỳ endpoint approval nào (policies/evaluate/preview). Guarded local. ── */
  const fetchHealth = useCallback(async () => {
    if (!clubId || isLocalToken(accessToken)) { setHealth(null); setLoadState('idle'); return }
    setLoadState('loading')
    try {
      const res = await api.get('/maika/health-score')
      const data = res.data?.data ?? res.data ?? null
      setHealth(data ? {
        score: num(data.score),
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        interpretation: data.interpretation ?? undefined,
      } : null)
      setLoadState('idle')
    } catch {
      setLoadState('error')
    }
  }, [clubId, accessToken])

  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    void fetchHealth()
  }, [fetchHealth])

  /* ── Official values (chỉ từ backend; thiếu → undefined → "Chưa có dữ liệu") ── */
  const healthScore = health?.score
  const recommendations = health?.recommendations ?? []
  const interpretation = health?.interpretation
  const healthTone: StatusTone = healthScore === undefined ? 'neutral'
    : healthScore >= 70 ? 'success' : healthScore >= 40 ? 'warning' : 'danger'

  /* ── KPI helper: official-only, thiếu → "Chưa có dữ liệu" ── */
  const kpi = (label: string, value: number | undefined, sub: string, accent: 'green' | 'blue' | 'violet' | 'amber' | 'teal' | 'rose', icon: React.ReactNode, fmt: (v: number) => string = (v) => v.toLocaleString('vi-VN')) => (
    <MetricCard label={label} value={value === undefined ? 'Chưa có' : fmt(value)}
      sub={value === undefined ? 'Chưa có dữ liệu (backend)' : sub} accent={accent} icon={icon} />
  )

  /* ── Governance badge (read-only) ── */
  const govBadge = (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: 'var(--pf-color-ai-soft)', color: 'var(--pf-color-ai)' }}>
      <ShieldCheck size={14} /> Read-only · Human approval
    </span>
  )

  const headerActions = (
    <>
      {govBadge}
      <ActionButton variant="secondary" icon={<RefreshCw size={15} />} onClick={() => void fetchHealth()}>Làm mới</ActionButton>
      <ActionButton icon={<MessageSquare size={16} />} onClick={() => navigate('/lisa')}>Mở Lisa Chat</ActionButton>
    </>
  )

  return (
    <PageShell>
      <PageHeader
        title="AI Workspace"
        subtitle="Trợ lý AI của CLB — hiểu, phân tích, đề xuất (read-only, cần con người duyệt; không thực thi)."
        actions={headerActions}
      />

      {loadState === 'loading' ? (
        <>
          <LoadingState variant="cards" rows={6} />
          <div className="mt-4"><LoadingState variant="list" rows={5} /></div>
        </>
      ) : loadState === 'error' ? (
        <div className="rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
          <EmptyState icon={<AlertCircle size={26} />} title="Không tải được dữ liệu AI"
            description="Đã xảy ra lỗi khi tải trạng thái AI. Vui lòng thử lại."
            action={<ActionButton icon={<RefreshCw size={15} />} onClick={() => void fetchHealth()}>Thử lại</ActionButton>} />
        </div>
      ) : (
        <>
          {/* ── AI Tabs ── */}
          <ResponsiveTabs tabs={AI_TABS} active={tab} onChange={(k) => setTab(k as AiTab)} />

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="mt-4 space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">KPI chính thức · nguồn: backend</p>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                {kpi('AI Requests', undefined, 'Tổng lượt gọi', 'blue', <Activity size={18} />)}
                {kpi('Successful Responses', undefined, 'Phản hồi thành công', 'green', <CheckCircle2 size={18} />)}
                {kpi('Pending Approval', undefined, 'Đề xuất chờ duyệt', 'amber', <Clock size={18} />)}
                {kpi('Knowledge Sources', undefined, 'Nguồn kiến thức', 'violet', <BookOpen size={18} />)}
                {kpi('Connected Tools', undefined, 'Công cụ kết nối', 'teal', <Cpu size={18} />)}
                <MetricCard label="Health Status" value={healthScore === undefined ? 'Chưa có' : `${healthScore}/100`}
                  sub={healthScore === undefined ? 'Chưa có dữ liệu (backend)' : 'Sức khỏe AI (backend)'} accent="green" icon={<ShieldCheck size={18} />} />
              </div>

              {/* AI health insight (read-only) */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Maika AI · Insight (read-only)</p>
                {interpretation ? (
                  <InsightCard title={interpretation} tone={healthTone} confidence={healthScore !== undefined ? `${healthScore}/100` : undefined} source="Maika health-score" />
                ) : (
                  <EmptyBox title="Chưa có insight" desc="Backend chưa trả insight AI cho CLB này." icon={<Lightbulb size={26} />} />
                )}
              </div>

              {/* Approval queue (READ-ONLY, no execute/approve) */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Hàng chờ duyệt · read-only (không execute)</p>
                <EmptyBox title="Chưa có đề xuất chờ duyệt" desc="Không có action AI nào chờ con người duyệt. Read-only — không có nút thực thi." icon={<ListChecks size={26} />} />
              </div>
            </div>
          )}

          {/* ── CONVERSATION (read-only; chat write flow ở increment riêng) ── */}
          {tab === 'conversation' && (
            <div className="mt-4 space-y-3">
              <FilterBar searchValue={convSearch} onSearchChange={setConvSearch} searchPlaceholder="Tìm trong lịch sử hội thoại…" />
              <EmptyBox title="Chưa có hội thoại" desc="Lịch sử hội thoại AI hiển thị ở đây (read-only). Mở Lisa Chat để trò chuyện." icon={<MessageSquare size={26} />} />
              {/* Chat write flow chưa mở ở increment này → input disabled + helper (không fake send) */}
              <div className="rounded-2xl border p-3 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
                <div className="flex items-center gap-2">
                  <input disabled aria-label="Nhập tin nhắn (chưa mở)" placeholder="Chat write flow sẽ được mở ở increment riêng…"
                    className="h-10 flex-1 rounded-full border px-4 text-sm border-[color:var(--pf-border)] [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] disabled:cursor-not-allowed" />
                  <ActionButton disabled title="Chat write flow sẽ được mở ở increment riêng" icon={<MessageSquare size={15} />}>Gửi</ActionButton>
                </div>
                <p className="mt-1.5 text-xs [color:var(--pf-color-muted)]">Chat write flow sẽ được mở ở increment riêng. Hiện tại read-only — không gửi tin nhắn thật.</p>
              </div>
            </div>
          )}

          {/* ── INSIGHT ── */}
          {tab === 'insight' && (
            <div className="mt-4 space-y-3">
              {interpretation ? (
                <InsightCard title={interpretation} tone={healthTone} confidence={healthScore !== undefined ? `${healthScore}/100` : undefined} source="Maika health-score" reason="Insight read-only từ backend health-score; cần con người diễn giải & quyết định." />
              ) : (
                <EmptyBox title="Chưa có insight" desc="Backend chưa trả insight AI." icon={<Lightbulb size={26} />} />
              )}
            </div>
          )}

          {/* ── RECOMMENDATION (Insight → Recommendation → Suggested Action → Human Review; NOT executed) ── */}
          {tab === 'recommendation' && (
            <div className="mt-4 space-y-3">
              {recommendations.length === 0 ? (
                <EmptyBox title="Chưa có đề xuất" desc="Backend chưa trả khuyến nghị AI." icon={<ListChecks size={26} />} />
              ) : (
                recommendations.map((rec, i) => (
                  <div key={i} className="rounded-2xl border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--pf-color-ai-soft)', color: 'var(--pf-color-ai)' }}>
                        <Lightbulb size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="[color:var(--pf-text)]">{rec}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge tone="ai">Đề xuất</StatusBadge>
                          <StatusBadge tone="warning">Cần con người duyệt</StatusBadge>
                          <StatusBadge tone="neutral">Chưa thực thi</StatusBadge>
                        </div>
                      </div>
                      <ActionButton variant="secondary" icon={<Eye size={15} />}
                        onClick={() => setReviewItem({ index: i, recommendation: rec, confidence: healthScore !== undefined ? `${healthScore}/100` : undefined, source: 'Maika health-score' })}>
                        Xem xét
                      </ActionButton>
                    </div>
                  </div>
                ))
              )}
              <p className="text-xs [color:var(--pf-color-muted)]">Luồng: Insight → Đề xuất → Suggested Action → <b>Human Review</b>. AI <b>không</b> tự thực thi (Execution thuộc Epic 4.2 — BLOCKED).</p>
            </div>
          )}

          {/* ── APPROVAL (Human Approval Integration — read-only; approve/reject disabled) ── */}
          {tab === 'approval' && (
            <div className="mt-4 space-y-4">
              {/* Approval queue */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Hàng chờ duyệt · Human Approval (read-only)</p>
                {recommendations.length === 0 ? (
                  <EmptyBox title="Chưa có đề xuất chờ duyệt" desc="Không có action AI nào chờ con người duyệt (backend chưa có hàng chờ persist). Read-only." icon={<ListChecks size={26} />} />
                ) : (
                  <div className="rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)] divide-y divide-[color:var(--pf-border-soft)]">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--pf-color-ai-soft)', color: 'var(--pf-color-ai)' }}><Lightbulb size={16} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate [color:var(--pf-text)]">{rec}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <StatusBadge tone="warning">Chờ duyệt</StatusBadge>
                            <StatusBadge tone="neutral">Rủi ro: Chưa có dữ liệu</StatusBadge>
                            {healthScore !== undefined && <span className="text-xs [color:var(--pf-color-muted)]">Tin cậy {healthScore}/100</span>}
                          </div>
                        </div>
                        <ActionButton variant="secondary" icon={<Eye size={15} />}
                          onClick={() => setReviewItem({ index: i, recommendation: rec, confidence: healthScore !== undefined ? `${healthScore}/100` : undefined, source: 'Maika health-score' })}>
                          Review
                        </ActionButton>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approval policies — Source of Truth: KHÔNG gọi endpoint approval → "Chưa có dữ liệu" */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Chính sách duyệt (read-only)</p>
                <EmptyBox title="Chưa có dữ liệu" desc="Chính sách/trạng thái duyệt chưa sẵn sàng (backend approval flow chưa mở ở increment này). Read-only." icon={<ShieldCheck size={26} />} />
                <p className="mt-2 text-xs [color:var(--pf-color-muted)]"><AlertTriangle size={12} className="mr-1 inline" />{APPROVAL_HELP} Không Execute/Run/Dispatch (Epic 4.2 BLOCKED).</p>
              </div>
            </div>
          )}

          {/* ── KNOWLEDGE ── */}
          {tab === 'knowledge' && (
            <div className="mt-4">
              <EmptyBox title="Chưa có nguồn kiến thức" desc="Danh sách knowledge (indexed/updated/connected) hiển thị ở đây khi backend cung cấp. Read-only." icon={<BookOpen size={26} />} />
            </div>
          )}

          {/* ── HISTORY ── */}
          {tab === 'history' && (
            <div className="mt-4">
              <EmptyBox title="Chưa có lịch sử" desc="Lịch sử prompt/insight/approval hiển thị ở đây khi backend cung cấp. Read-only." icon={<HistoryIcon size={26} />} />
            </div>
          )}

          {/* ── TOOL STATUS (read-only; status "Chưa có dữ liệu" khi không có endpoint kiểm tra) ── */}
          {tab === 'tools' && (
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Trạng thái công cụ · Memory (read-only)</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {TOOLS.map(t => (
                    <div key={t.key} className="flex items-center justify-between rounded-2xl border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
                      <span className="flex items-center gap-2 font-medium [color:var(--pf-text)]">
                        <span className="[color:var(--pf-color-muted)]">{t.icon}</span>{t.label}
                      </span>
                      <StatusBadge tone="neutral">Chưa có dữ liệu</StatusBadge>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-2xl border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
                    <span className="flex items-center gap-2 font-medium [color:var(--pf-text)]">
                      <span className="[color:var(--pf-color-muted)]"><Bot size={16} /></span>Memory
                    </span>
                    <StatusBadge tone="neutral">Chưa có dữ liệu</StatusBadge>
                  </div>
                </div>
                <p className="mt-2 text-xs [color:var(--pf-color-muted)]">Trạng thái công cụ/Memory là read-only. UI không thay đổi cấu hình runtime (LiteLLM/OpenRouter/Ollama).</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Human Review / Approval Drawer ── */}
      {reviewItem && <ReviewDrawer item={reviewItem} isMobile={isMobile} onClose={() => setReviewItem(null)} />}
    </PageShell>
  )
}
