import type { ReactNode } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { DataFreshness } from './DataFreshness'
import { LoadingState } from './LoadingState'
import { ErrorState } from './ErrorState'

export interface FinancialSnapshot {
  updatedAt: number | null
  loading: boolean
  error: boolean
  refreshing?: boolean
  reload?: () => void | Promise<unknown>
}

/** Initial load/error is not an empty fund. A failed refresh keeps the previous snapshot visible. */
export function FinancialDataState({ sources, children }: { sources: FinancialSnapshot[]; children: ReactNode }) {
  const mobile = useIsMobile(1024)
  if (!mobile) return <>{children}</>
  if (sources.some(s => s.error && s.updatedAt == null)) return <ErrorState onRetry={() => sources.forEach(s => { void s.reload?.() })} />
  if (sources.some(s => s.loading && s.updatedAt == null)) return <LoadingState variant="list" />
  const times = sources.map(s => s.updatedAt)
  const updatedAt = times.every((t): t is number => t != null) ? Math.min(...times) : null
  return <>
    <div className="pf-financial-freshness mb-3"><DataFreshness updatedAt={updatedAt} loading={sources.some(s => s.refreshing)} error={sources.some(s => s.error)} mode="poll" /></div>
    {children}
  </>
}
