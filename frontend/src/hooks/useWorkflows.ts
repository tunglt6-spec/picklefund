import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'

export interface WorkflowRule {
  id: string
  name: string
  triggerType: string
  enabled: boolean
  priority: number
  conditionsJson?: Record<string, unknown> | null
  actionsJson?: unknown[] | null
  createdAt: string
}

export type WorkflowRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export interface WorkflowRun {
  id: string
  workflowRuleId: string | null
  triggerType: string
  status: WorkflowRunStatus
  resultJson?: Record<string, unknown> | null
  errorMessage?: string | null
  createdAt: string
}

export interface WorkflowTemplate {
  key: string
  name: string
  triggerType: string
  scheduleType?: string
  conditionsJson?: Record<string, unknown>
  actionsJson?: unknown[]
}

/**
 * useWorkflows — đọc rules/runs/templates của Hermes Workflow Engine (self-scope theo JWT).
 * Chỉ gọi /workflows/* (SUPER_ADMIN/CLUB_ADMIN). Không đọc dữ liệu module khác.
 */
/** Thống kê run cho KPI (đếm tổng ở backend, không bị cap 100 như danh sách runs). */
export interface RunStats {
  total: number
  waitingApproval: number
  completed: number
  failed: number
}

export function useWorkflows() {
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [runStats, setRunStats] = useState<RunStats | null>(null)
  const [loading, setLoading] = useState(true)
  // refreshing = refetch thủ công (nút Làm mới) → spinner + khóa nút, không blank skeleton.
  const [refreshing, setRefreshing] = useState(false)
  const [available, setAvailable] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => {
    setRefreshing(true)
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    let alive = true
    Promise.allSettled([
      api.get('/workflows/rules'),
      api.get('/workflows/runs'),
      api.get('/workflows/templates'),
      api.get('/workflows/runs/stats'),
    ])
      .then(([r, ru, t, st]) => {
        if (!alive) return
        if (r.status === 'fulfilled') setRules((r.value.data?.data ?? []) as WorkflowRule[])
        if (ru.status === 'fulfilled') setRuns((ru.value.data?.data ?? []) as WorkflowRun[])
        if (t.status === 'fulfilled') setTemplates((t.value.data?.data ?? []) as WorkflowTemplate[])
        if (st.status === 'fulfilled') setRunStats((st.value.data?.data ?? null) as RunStats | null)
        setAvailable(r.status === 'fulfilled')
      })
      .finally(() => {
        if (alive) {
          setLoading(false)
          setRefreshing(false)
        }
      })
    return () => {
      alive = false
    }
  }, [refreshKey])

  return { rules, runs, templates, runStats, loading, refreshing, available, refetch }
}

export interface RuleExistsInfo {
  existingRuleId: string
  existingRuleName: string
}

/** Tạo rule từ template. allowDuplicate=false (mặc định) → BE trả 409 nếu đã có rule trùng. */
export async function createRuleFromTemplate(
  tpl: WorkflowTemplate,
  allowDuplicate = false,
): Promise<void> {
  await api.post('/workflows/rules', {
    name: tpl.name,
    triggerType: tpl.triggerType,
    conditionsJson: tpl.conditionsJson,
    actionsJson: tpl.actionsJson,
    enabled: true,
    allowDuplicate,
    ...(tpl.scheduleType ? { scheduleType: tpl.scheduleType } : {}),
  })
}

/** Nhận diện lỗi 409 "rule đã tồn tại" → trả thông tin rule hiện có (để mở), hoặc null. */
export function parseRuleExists(err: unknown): RuleExistsInfo | null {
  const e = err as { response?: { status?: number; data?: Record<string, unknown> } }
  const d = e?.response?.data
  if (e?.response?.status === 409 && d?.code === 'RULE_EXISTS') {
    return {
      existingRuleId: String(d.existingRuleId ?? ''),
      existingRuleName: String(d.existingRuleName ?? ''),
    }
  }
  return null
}
export async function setRuleEnabled(id: string, enabled: boolean): Promise<void> {
  await api.put(`/workflows/rules/${id}`, { enabled })
}
export async function deleteWorkflowRule(id: string): Promise<void> {
  await api.delete(`/workflows/rules/${id}`)
}

/** Giải trình 1 lần chạy (AI observability) — trả lời 8 câu hỏi. */
export interface RunTrace {
  run: {
    id: string; triggerType: string; status: WorkflowRunStatus
    ruleId: string | null; ruleName: string | null; scheduleType: string | null
    startedAt: string | null; completedAt: string | null; durationMs: number | null
    idempotencyKey: string | null; matched: boolean | null; error: string | null
  }
  q1_rule: { ruleId: string | null; ruleName: string | null; triggerType: string }
  q2_agents: string[]
  q3_actions: { created: number; items: { id: string; actionType: string; riskLevel: string; status: string; title: string; executionDurationMs: number | null }[] }
  q4_result: { status: WorkflowRunStatus; matched: boolean | null }
  q5_dedup: { skippedDuplicate: number; skippedCooldown: number; skippedOther: number; autoResolved: number }
  q6_approval: { required: number; approved: number; rejected: number; pending: number }
  q7_cost: { calls: number; totalTokens: number; estimatedCostUsd: number; note?: string }
  q8_business: { notifications: { total: number; byChannel: Record<string, number>; byStatus: Record<string, number> } }
}
export async function fetchRunTrace(runId: string): Promise<RunTrace> {
  const res = await api.get(`/workflows/runs/${runId}/trace`)
  return (res.data?.data ?? res.data) as RunTrace
}

/** Tổng quan observability (KPI runs + chi phí AI 30 ngày). */
export interface ObservabilitySummary {
  periodDays: number
  runs: { total: number; completed: number; failed: number; waitingApproval: number; successRate: number; avgDurationMs: number | null; skippedDuplicate: number; skippedCooldown: number }
  aiCost: {
    calls: number; totalTokens: number; estimatedCostUsd: number
    bySource: { source: string; calls: number; totalTokens: number; estimatedCostUsd: number }[]
    byModel: { model: string; calls: number; totalTokens: number; estimatedCostUsd: number }[]
    byAgent: { agent: string; calls: number; totalTokens: number; estimatedCostUsd: number }[]
  }
}
export async function fetchObservabilitySummary(): Promise<ObservabilitySummary> {
  const res = await api.get('/workflows/observability/summary')
  return (res.data?.data ?? res.data) as ObservabilitySummary
}

/** Lifecycle (Phase 3): phiên bản rule + rollback. */
export interface RuleVersion {
  id: string; ruleId: string; version: number; name: string; triggerType: string
  scheduleType: string; enabled: boolean; priority: number
  changedBy: string | null; changeNote: string | null; createdAt: string
}
export async function fetchRuleVersions(ruleId: string): Promise<RuleVersion[]> {
  const res = await api.get(`/workflows/rules/${ruleId}/versions`)
  return (res.data?.data ?? res.data) as RuleVersion[]
}
export async function rollbackRuleVersion(ruleId: string, versionId: string): Promise<void> {
  await api.post(`/workflows/rules/${ruleId}/rollback`, { versionId })
}
export async function testTriggerRule(
  id: string,
  contextJson?: Record<string, unknown>,
): Promise<WorkflowRun> {
  const res = await api.post(`/workflows/rules/${id}/test-trigger`, { contextJson })
  return (res.data?.data ?? res.data) as WorkflowRun
}

/** Trigger type hỗ trợ runtime dispatch (đồng bộ backend SUPPORTED_TRIGGER_TYPES). */
export const DISPATCH_TRIGGER_TYPES = [
  'DEBT_ESCALATION',
  'EVENT_REMINDER',
  'REPORT_DISPATCH',
  // Phase 2 — lô Tài chính
  'FUND_BALANCE_RISK',
  'PAYMENT_DUE_REMINDER',
  'MISSING_FINANCE_DOCUMENT',
  // Phase 3 — lô Hoạt động CLB
  'LOW_SESSION_REGISTRATION',
  'ATTENDANCE_NOT_CLOSED',
  'SESSION_CAPACITY_RISK',
  'LOW_MEMBER_ATTENDANCE',
  // Phase 4 — Điều phối + Thi đấu + Báo cáo
  'APPROVAL_OVERDUE',
  'MATCH_RESULT_MISSING',
  'WEEKLY_CLUB_HEALTH_REPORT',
] as const

/** Tóm tắt dispatch sanitized từ backend — chỉ số đếm, không context/payload. */
export interface DispatchSummary {
  triggerType: string
  totalRules: number
  matchedRules: number
  createdRuns: number
  createdActions: number
  skippedActions?: number
  autoResolvedActions?: number
  failedRuns: number
  skippedDuplicate: boolean
}

/** Dispatch-test runtime (Epic 6): đánh giá mọi rule enabled của triggerType. Admin-only. */
export async function dispatchTestTrigger(
  triggerType: string,
  contextJson?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<DispatchSummary> {
  const res = await api.post(`/workflows/triggers/${triggerType}/dispatch-test`, {
    contextJson,
    idempotencyKey,
  })
  return (res.data?.data ?? res.data) as DispatchSummary
}

/** Summary + ngữ cảnh dữ liệu thật của CLB (unpaidCount/upcomingSessions/periodFinalized…). */
export interface DispatchLiveResult extends DispatchSummary {
  liveContext: Record<string, unknown>
}

/** Dispatch dùng DỮ LIỆU THẬT của CLB — rule khớp thực tế + trả liveContext để xem. */
export async function dispatchLiveTrigger(
  triggerType: string,
): Promise<DispatchLiveResult> {
  const res = await api.post(`/workflows/triggers/${triggerType}/dispatch-live`, {})
  return (res.data?.data ?? res.data) as DispatchLiveResult
}
