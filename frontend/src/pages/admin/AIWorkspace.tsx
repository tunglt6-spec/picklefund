/**
 * UI-07 — AI Workspace Enterprise (Increment 1, READ-ONLY) — PickleFund v2.1
 * Kế thừa UI-02 (Golden Reference). Tuân thủ UIP-07 (AI Workspace Pattern) + UDP-01 +
 * Amendment #01 (Loading/Empty/Error) + Amendment #02 + VDS-01 (Visual Quality Gate).
 *
 * READ-ONLY tuyệt đối: KHÔNG execute/approve/send/run/dispatch/write. Không có nút
 * Execute/Run/Approve/Dispatch. AI chỉ hiển thị insight/recommendation/status read-only;
 * hành động ghi = Human Review / Not Executed (Execution thuộc Epic 4.2 — BLOCKED).
 * Dữ liệu official từ backend hiện có (`/maika/health-score`); thiếu field → "Chưa có dữ liệu".
 * KHÔNG fake data. KHÔNG đổi LLM routing/memory/knowledge/execution/API/DB.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare, Lightbulb, ListChecks, BookOpen, History as HistoryIcon,
  Cpu, Activity, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, Clock,
  Database, Bot,
} from 'lucide-react'
import type { ReactNode } from 'react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
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

type AiTab = 'overview' | 'conversation' | 'insight' | 'recommendation' | 'knowledge' | 'history' | 'tools'
const AI_TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'conversation', label: 'Trò chuyện' },
  { key: 'insight', label: 'Insight' },
  { key: 'recommendation', label: 'Đề xuất' },
  { key: 'knowledge', label: 'Kiến thức' },
  { key: 'history', label: 'Lịch sử' },
  { key: 'tools', label: 'Trạng thái công cụ' },
]

interface AiHealth {
  score?: number
  recommendations: string[]
  interpretation?: string
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

export function AIWorkspace() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuthStore()
  const clubId = user?.clubId ?? ''

  const [tab, setTab] = useState<AiTab>('overview')
  const [health, setHealth] = useState<AiHealth | null>(null)
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [convSearch, setConvSearch] = useState('')

  /* ── Fetch AI health (endpoint hiện có; guarded local) — điều khiển Loading/Error ── */
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

          {/* ── CONVERSATION (read-only) ── */}
          {tab === 'conversation' && (
            <div className="mt-4 space-y-3">
              <FilterBar searchValue={convSearch} onSearchChange={setConvSearch} searchPlaceholder="Tìm trong lịch sử hội thoại…" />
              <EmptyBox title="Chưa có hội thoại" desc="Lịch sử hội thoại AI hiển thị ở đây (read-only). Mở Lisa Chat để trò chuyện." icon={<MessageSquare size={26} />} />
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
                    </div>
                  </div>
                ))
              )}
              <p className="text-xs [color:var(--pf-color-muted)]">Luồng: Insight → Đề xuất → Suggested Action → <b>Human Review</b>. AI <b>không</b> tự thực thi (Execution thuộc Epic 4.2 — BLOCKED).</p>
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
    </PageShell>
  )
}
