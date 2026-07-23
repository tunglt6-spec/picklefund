import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../lib/api'

/**
 * useOperationsRuntime — dữ liệu RUNTIME THẬT cho AI Operations Center (tab trong AIDO).
 *
 * MỘT request tổng hợp chính (/aido/operations/runtime-summary: overview + modules + agents)
 * + tái dùng 3 endpoint SẴN CÓ cho card Alert/Data/KPI Monitor (tránh circular DI ở backend):
 *   - GET /ai/maika/operational-alerts  → Alert Center (đếm theo mức thật)
 *   - GET /ai/maika/data-quality        → Data Monitor  (integrity/vấn đề thật)
 *   - GET /maika/health-score           → KPI Monitor   (điểm sức khỏe thật)
 * Tất cả bọc allSettled: nguồn phụ lỗi vẫn hiển thị an toàn (KHÔNG bịa số). generatedAt lấy
 * từ backend (KHÔNG dùng giờ client giả khi request lỗi). Giữ dữ liệu gần nhất khi refresh lỗi
 * (stale) thay vì xoá trắng.
 */

export interface RuntimeSummary {
  generatedAt: string
  timezone: string
  overview: {
    activeRules: number
    inactiveRules: number
    runsToday: number
    aiActionsCreatedToday: number
    pendingApprovals: number
    successfulToday: number
    failedToday: number
    duplicateSkippedToday: number
    cooldownBlockedToday: number
  }
  modules: {
    hermes: { workflowToday: number; running: number; waitingApproval: number; completedToday: number; failedToday: number }
    workflowStudio: { totalRules: number; activeRules: number; manualRules: number; disabledRules: number; runsToday: number; health: 'ok' | 'warn' }
    approvalCenter: { totalToday: number; pending: number; approvedToday: number; rejectedToday: number; expiredToday: number }
    notificationCenter: { sentToday: number; inApp: number; email: number; telegram: number; failedToday: number }
    scheduler: { daily: number; weekly: number; monthly: number; manual: number; autoEnabled: boolean }
    clubMemory: { total: number; byType: { type: string; count: number }[] }
    auditLogs: { total: number; byAction: { name: string; count: number }[] }
  }
  agents: {
    maika: { analyses: number; briefs: number; recommendations: number }
    lisa: { support: number; answered: number }
    hermes: { workflow: number; approval: number; completed: number }
    mitDac: { executed: number; errors: number; avgMs: number }
    notification: { sent: number; errors: number; successRate: number }
  }
}

export interface AlertCounts { total: number; high: number; medium: number; critical: number }
export interface DataMonitorState { integrityPct: number; issues: number; checks: number; status: 'ok' | 'warn'; checkedAt: string | null }
export interface KpiMonitorState { score: number | null; interpretation: string | null }

interface Signal { code?: string; level?: string; message?: string }
interface DqCheck { level?: string; count?: number }

export interface OperationsRuntime {
  summary: RuntimeSummary | null
  alerts: AlertCounts | null
  dataMonitor: DataMonitorState | null
  kpi: KpiMonitorState | null
  loading: boolean
  error: boolean
  /** Có dữ liệu cũ nhưng lần làm mới gần nhất thất bại (giữ số cũ, đánh dấu không cập nhật). */
  stale: boolean
  /** generatedAt THẬT từ backend (null nếu chưa từng tải được). */
  generatedAt: string | null
  refresh: () => void
}

const val = (x: PromiseSettledResult<{ data?: { data?: unknown } }>): unknown =>
  x.status === 'fulfilled' ? (x.value.data?.data ?? x.value.data ?? null) : null

export function useOperationsRuntime(pollMs = 60_000): OperationsRuntime {
  const [summary, setSummary] = useState<RuntimeSummary | null>(null)
  const [alerts, setAlerts] = useState<AlertCounts | null>(null)
  const [dataMonitor, setDataMonitor] = useState<DataMonitorState | null>(null)
  const [kpi, setKpi] = useState<KpiMonitorState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [stale, setStale] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const hasData = useRef(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const [s, al, dq, hs] = await Promise.allSettled([
      api.get('/aido/operations/runtime-summary', { timeout: 12_000 }),
      api.get('/ai/maika/operational-alerts', { timeout: 12_000 }),
      api.get('/ai/maika/data-quality', { timeout: 12_000 }),
      api.get('/maika/health-score', { timeout: 12_000 }),
    ])

    // Nguồn CHÍNH lỗi → giữ dữ liệu cũ (stale) nếu đã có; nếu chưa từng có → error.
    if (s.status !== 'fulfilled') {
      if (hasData.current) { setStale(true) } else { setError(true) }
      setLoading(false)
      return
    }

    const sum = val(s) as RuntimeSummary | null
    if (!sum) {
      if (hasData.current) { setStale(true) } else { setError(true) }
      setLoading(false)
      return
    }
    setSummary(sum)
    setGeneratedAt(sum.generatedAt ?? null)
    setError(false)
    setStale(false)
    hasData.current = true

    // Alert Center — mức thật (taxonomy info/attention/warning); info (healthy/no-period) KHÔNG tính cảnh báo.
    if (al.status === 'fulfilled') {
      const sigs = (val(al) as Signal[] | null) ?? []
      const high = sigs.filter((x) => x.level === 'warning').length
      const medium = sigs.filter((x) => x.level === 'attention').length
      setAlerts({ total: high + medium, high, medium, critical: 0 })
    }

    // Data Monitor — integrity = tỉ lệ check đạt; vấn đề = số check chưa đạt (số thật, không bịa uptime%).
    if (dq.status === 'fulfilled') {
      const rep = val(dq) as { checks?: DqCheck[]; generatedAt?: string } | null
      const checks = rep?.checks ?? []
      const okCount = checks.filter((c) => c.level === 'ok').length
      const issues = checks.filter((c) => c.level !== 'ok').length
      const integrityPct = checks.length ? Math.round((okCount / checks.length) * 100) : 100
      setDataMonitor({
        integrityPct,
        issues,
        checks: checks.length,
        status: checks.some((c) => c.level === 'warning') ? 'warn' : 'ok',
        checkedAt: rep?.generatedAt ?? null,
      })
    }

    // KPI Monitor — điểm sức khỏe CLB thật (không có lịch sử → không bịa delta/xu hướng).
    if (hs.status === 'fulfilled') {
      const h = val(hs) as { score?: number; interpretation?: string } | null
      setKpi({ score: typeof h?.score === 'number' ? h.score : null, interpretation: h?.interpretation ?? null })
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    if (pollMs <= 0) return
    const id = setInterval(() => void load(true), pollMs)
    return () => clearInterval(id)
  }, [load, pollMs])

  return { summary, alerts, dataMonitor, kpi, loading, error, stale, generatedAt, refresh: () => void load(), }
}
