/**
 * Option 3 — self-fetch Thu/Chi CỤC BỘ theo màn (thay vì đọc global store do useApiSync nạp toàn bộ
 * mỗi lần vào app). Mỗi màn tài chính nạp dữ liệu KHI MỞ màn → sau khi Phase D cắt full-load trong
 * useApiSync, các màn này vẫn đúng số vì tái dùng NGUYÊN VẸN phép tính client (mapping giống useApiSync).
 */
import { useLiveRefresh } from './useLiveRefresh'
import { useState, useCallback, useEffect, useRef, type SetStateAction } from 'react'
import api from '../lib/api'
import type { FundContribution, LivingExpense, Member, ExpenseStatus } from '../types'

export function mapContribution(c: any): FundContribution {
  return {
    id: c.id,
    clubId: c.clubId,
    fundSource: c.fundSource ?? 'COMMON',
    fundPeriodId: c.fundPeriodId ?? undefined,
    memberId: c.memberId ?? undefined,
    member: c.member ? ({ id: c.memberId, fullName: c.member.fullName } as Member) : undefined,
    amount: Number(c.amount ?? 0),
    paymentDate: c.paymentDate?.slice(0, 10) ?? '',
    paymentMethod: c.paymentMethod ?? 'bank_transfer',
    isConfirmed: c.isConfirmed ?? false,
    notes: c.notes ?? undefined,
    miniIncomeType: c.miniIncomeType ?? undefined,
    payerName: c.payerName ?? undefined,
    createdAt: c.createdAt ?? '',
  }
}

export function mapExpense(e: any): LivingExpense {
  return {
    id: e.id,
    clubId: e.clubId,
    fundSource: e.fundSource ?? 'COMMON',
    fundPeriodId: e.fundPeriodId ?? undefined,
    description: e.description ?? '',
    amount: Number(e.amount ?? 0),
    allocationRule: e.allocationRule ?? 'FUND_ONLY',
    costType: e.costType ?? 'LIVING',
    allocationEnabled: e.allocationEnabled ?? true,
    expenseDate: e.expenseDate?.slice(0, 10) ?? '',
    receiptUrl: e.receiptUrl ?? undefined,
    miniExpenseType: e.miniExpenseType ?? undefined,
    receiverName: e.receiverName ?? undefined,
    status: (e.status ?? 'pending') as ExpenseStatus,
    createdAt: e.createdAt ?? '',
    createdBy: e.createdById ?? '',
  }
}

/** Tải TOÀN BỘ contributions của CLB vào state cục bộ (dùng cho màn cần tổng hợp toàn lịch sử). */
export function useClubContributions(clubId: string) {
  return useFinanceCollection(clubId, 'contributions', mapContribution)
}

/** Tải TOÀN BỘ expenses của CLB vào state cục bộ (dùng cho màn cần tổng hợp toàn lịch sử). */
export function useClubExpenses(clubId: string) {
  return useFinanceCollection(clubId, 'expenses', mapExpense)
}

/** Keep the last confirmed snapshot on refresh failure; never confuse an error with an empty list. */
function useFinanceCollection<T>(clubId: string, resource: string, map: (raw: unknown) => T) {
  const [snapshot, setSnapshot] = useState<{ clubId: string; data: T[]; updatedAt: number | null; error: boolean; refreshing: boolean }>(
    { clubId, data: [], updatedAt: null, error: false, refreshing: !!clubId },
  )
  const request = useRef(0)
  const reload = useCallback(async () => {
    const id = ++request.current
    if (!clubId) return
    setSnapshot(prev => prev.clubId === clubId ? { ...prev, error: false, refreshing: true } : { clubId, data: [], updatedAt: null, error: false, refreshing: true })
    try {
      const result = await api.get(`/${resource}?clubId=${clubId}`)
      const data = result.data?.data
      if (!Array.isArray(data)) throw new Error('Invalid finance response')
      const mapped = data.map(map)
      if (id === request.current) setSnapshot({ clubId, data: mapped, updatedAt: Date.now(), error: false, refreshing: false })
    } catch {
      if (id === request.current) setSnapshot(prev => ({ ...prev, error: true, refreshing: false }))
    }
  }, [clubId, resource, map])
  useEffect(() => {
    void reload()
    return () => { request.current++ }
  }, [reload])
  useLiveRefresh(reload, !!clubId)
  const scoped = snapshot.clubId === clubId
  const setData = useCallback((action: SetStateAction<T[]>) => setSnapshot(prev => prev.clubId !== clubId ? prev : ({ ...prev, data: typeof action === 'function' ? (action as (rows: T[]) => T[])(prev.data) : action })), [clubId])
  return {
    data: scoped ? snapshot.data : [], reload, setData,
    updatedAt: scoped ? snapshot.updatedAt : null,
    loading: !!clubId && (!scoped || (snapshot.updatedAt == null && !snapshot.error)),
    refreshing: scoped && snapshot.refreshing,
    error: scoped && snapshot.error,
  }
}
