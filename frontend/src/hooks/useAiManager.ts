import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'

/**
 * useAiManager — đọc dữ liệu AI Action Center THẬT từ backend (Epic 4.2):
 *   - GET /ai/actions/summary                    (KPI tổng hợp — DB thật)
 *   - GET /ai/actions?status=PENDING_APPROVAL    (hàng đợi chờ duyệt thật)
 *   - GET /ai/maika/approval/policies            (chính sách duyệt theo rủi ro)
 *   - GET /ai/maika/organization-intelligence    (tín hiệu vận hành/cảnh báo)
 * Mọi call bọc allSettled → cờ availability để UI hiển thị trạng thái an toàn (không bịa).
 * Ghi chú: approve KHÔNG tự execute (execution engine deferred) — action dừng ở APPROVED.
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface ApprovalPolicy {
  riskLevel: RiskLevel
  requiredApprovalCount: number
  requiredRoles: string[]
  requiredApprovals: string[]
  requiresSafetyCheck: boolean
  requiresManualConfirmation: boolean
  description: string
}

export type SignalLevel = 'info' | 'attention' | 'warning'
export interface IntelSignal {
  code: string
  level: SignalLevel
  message: string
}
export interface SuggestedReadAction {
  label: string
  method: string
  endpoint: string
  reason: string
}
export interface OrgIntelligence {
  clubId: string
  generatedAt: string
  summary: string
  healthSignals: IntelSignal[]
  attentionSignals: IntelSignal[]
  dataQualitySignals: IntelSignal[]
  suggestedReadActions: SuggestedReadAction[]
}

export interface ApprovalEvaluation {
  riskLevel?: RiskLevel
  requiredApprovalCount?: number
  executionAllowed?: boolean
  reason?: string
  [k: string]: unknown
}

export type AiActionStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTING'
  | 'EXECUTED'
  | 'FAILED'
  | 'RETRY_PENDING'

export interface AiActionListItem {
  id: string
  requestedByAi: string
  actionType: string
  targetModule: string | null
  riskLevel: string
  title: string
  summary: string | null
  status: AiActionStatus
  approvalRequired: boolean
  retryCount: number
  createdAt: string
}

export interface AiActionEvent {
  id: string
  type: string
  message: string | null
  actorUserId?: string | null
  createdAt: string
}

export interface PayloadSummary {
  fieldNames: string[]
  fieldCount: number
  approxSizeBytes: number
}

export interface AiActionDetail extends AiActionListItem {
  targetEntityType: string | null
  targetEntityId: string | null
  payloadSummary?: PayloadSummary
  approvalPolicy?: Record<string, unknown> | null
  approvedBy?: string | null
  approvedAt?: string | null
  rejectedBy?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  executionResult?: Record<string, unknown> | null
  errorMessage?: string | null
  executorAgent?: string | null
  executorStartedAt?: string | null
  executorFinishedAt?: string | null
  executionDuration?: number | null
  updatedAt: string
  events: AiActionEvent[]
}

export interface ExecutorSummary {
  agent: string
  running: number
  executedToday: number
  failedToday: number
  averageExecutionMs: number
}

export interface AiActionSummary {
  pendingApprovals: number
  approvedActions: number
  rejectedActions: number
  failedActions: number
  executedToday: number
  averageApprovalTime: number
  actionsByAi: { ai: string; count: number }[]
  actionsByRisk: { risk: string; count: number }[]
  recentActivities: (AiActionEvent & { actionId?: string })[]
  executor?: ExecutorSummary
}

export interface AiTeammate {
  key: string
  name: string
  role: string
  module: string
  agent: string
  implemented: boolean
  accent: string
}

export const AI_TEAM: AiTeammate[] = [
  { key: 'maika', name: 'Maika', role: 'Quản lý & Trí tuệ CLB', module: 'ai/maika', agent: 'MAIKA', implemented: true, accent: 'indigo' },
  { key: 'lisa', name: 'Lisa', role: 'Trợ lý thành viên & nhắc nhở', module: 'lisa', agent: 'LISA', implemented: true, accent: 'violet' },
  { key: 'hermes', name: 'Hermes', role: 'Điều phối thông báo', module: 'hermes', agent: 'HERMES', implemented: true, accent: 'sky' },
  { key: 'mit-dac', name: 'Mít Đặc', role: 'Operations Executor (thực thi hành động đã duyệt)', module: 'ai-actions/executor', agent: 'MIT_DAT', implemented: true, accent: 'emerald' },
]

export function useAiManager() {
  const [policies, setPolicies] = useState<ApprovalPolicy[]>([])
  const [intel, setIntel] = useState<OrgIntelligence | null>(null)
  const [summary, setSummary] = useState<AiActionSummary | null>(null)
  const [pending, setPending] = useState<AiActionListItem[]>([])
  const [executable, setExecutable] = useState<AiActionListItem[]>([])
  const [opsSignals, setOpsSignals] = useState<IntelSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [availability, setAvailability] = useState({ policies: false, intel: false, actions: false })
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    let alive = true
    Promise.allSettled([
      api.get('/ai/maika/approval/policies'),
      api.get('/ai/maika/organization-intelligence'),
      api.get('/ai/actions/summary'),
      api.get('/ai/actions?status=PENDING_APPROVAL&limit=50'),
      api.get('/ai/actions?status=APPROVED&limit=50'),
      api.get('/ai/maika/operational-alerts'),
    ])
      .then(([p, i, s, q, e, o]) => {
        if (!alive) return
        if (p.status === 'fulfilled') setPolicies((p.value.data?.data ?? []) as ApprovalPolicy[])
        if (i.status === 'fulfilled') setIntel((i.value.data?.data ?? null) as OrgIntelligence | null)
        if (s.status === 'fulfilled') setSummary((s.value.data?.data ?? null) as AiActionSummary | null)
        if (q.status === 'fulfilled') setPending((q.value.data?.data ?? []) as AiActionListItem[])
        if (e.status === 'fulfilled') setExecutable((e.value.data?.data ?? []) as AiActionListItem[])
        if (o.status === 'fulfilled') setOpsSignals((o.value.data?.data ?? []) as IntelSignal[])
        setAvailability({
          policies: p.status === 'fulfilled',
          intel: i.status === 'fulfilled',
          actions: s.status === 'fulfilled' && q.status === 'fulfilled',
        })
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [refreshKey])

  return { policies, intel, summary, pending, executable, opsSignals, loading, availability, refetch }
}

/** Preview điều kiện duyệt (read-only) — POST /ai/maika/approval/evaluate. */
export async function evaluateApproval(input: {
  actionType?: string
  riskLevel?: RiskLevel
  objective?: string
}): Promise<ApprovalEvaluation> {
  const res = await api.post('/ai/maika/approval/evaluate', input)
  return (res.data?.data ?? res.data) as ApprovalEvaluation
}

/** Chi tiết 1 action + lịch sử sự kiện. */
export async function fetchAiAction(id: string): Promise<AiActionDetail> {
  const res = await api.get(`/ai/actions/${id}`)
  return (res.data?.data ?? res.data) as AiActionDetail
}

export async function approveAiAction(id: string): Promise<void> {
  await api.post(`/ai/actions/${id}/approve`)
}
export async function rejectAiAction(id: string, reason?: string): Promise<void> {
  await api.post(`/ai/actions/${id}/reject`, { reason })
}
export async function retryAiAction(id: string): Promise<void> {
  await api.post(`/ai/actions/${id}/retry`)
}
export async function executeAiAction(id: string): Promise<void> {
  await api.post(`/ai/actions/${id}/execute`)
}
