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
  conditionsJson?: Record<string, unknown>
  actionsJson?: unknown[]
}

/**
 * useWorkflows — đọc rules/runs/templates của Hermes Workflow Engine (self-scope theo JWT).
 * Chỉ gọi /workflows/* (SUPER_ADMIN/CLUB_ADMIN). Không đọc dữ liệu module khác.
 */
export function useWorkflows() {
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    let alive = true
    Promise.allSettled([
      api.get('/workflows/rules'),
      api.get('/workflows/runs'),
      api.get('/workflows/templates'),
    ])
      .then(([r, ru, t]) => {
        if (!alive) return
        if (r.status === 'fulfilled') setRules((r.value.data?.data ?? []) as WorkflowRule[])
        if (ru.status === 'fulfilled') setRuns((ru.value.data?.data ?? []) as WorkflowRun[])
        if (t.status === 'fulfilled') setTemplates((t.value.data?.data ?? []) as WorkflowTemplate[])
        setAvailable(r.status === 'fulfilled')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [refreshKey])

  return { rules, runs, templates, loading, available, refetch }
}

export async function createRuleFromTemplate(tpl: WorkflowTemplate): Promise<void> {
  await api.post('/workflows/rules', {
    name: tpl.name,
    triggerType: tpl.triggerType,
    conditionsJson: tpl.conditionsJson,
    actionsJson: tpl.actionsJson,
    enabled: true,
  })
}
export async function setRuleEnabled(id: string, enabled: boolean): Promise<void> {
  await api.put(`/workflows/rules/${id}`, { enabled })
}
export async function deleteWorkflowRule(id: string): Promise<void> {
  await api.delete(`/workflows/rules/${id}`)
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
] as const

/** Tóm tắt dispatch sanitized từ backend — chỉ số đếm, không context/payload. */
export interface DispatchSummary {
  triggerType: string
  totalRules: number
  matchedRules: number
  createdRuns: number
  createdActions: number
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
