/**
 * Option 3 — self-fetch Thu/Chi CỤC BỘ theo màn (thay vì đọc global store do useApiSync nạp toàn bộ
 * mỗi lần vào app). Mỗi màn tài chính nạp dữ liệu KHI MỞ màn → sau khi Phase D cắt full-load trong
 * useApiSync, các màn này vẫn đúng số vì tái dùng NGUYÊN VẸN phép tính client (mapping giống useApiSync).
 */
import { useState, useCallback, useEffect } from 'react'
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
  const [data, setData] = useState<FundContribution[]>([])
  const reload = useCallback(() => {
    if (!clubId) return
    api
      .get(`/contributions?clubId=${clubId}`)
      .then((r) => setData((r.data?.data ?? []).map(mapContribution)))
      .catch(() => {
        /* local-token/offline → giữ rỗng như trước */
      })
  }, [clubId])
  useEffect(() => {
    reload()
  }, [reload])
  return { data, reload, setData }
}

/** Tải TOÀN BỘ expenses của CLB vào state cục bộ (dùng cho màn cần tổng hợp toàn lịch sử). */
export function useClubExpenses(clubId: string) {
  const [data, setData] = useState<LivingExpense[]>([])
  const reload = useCallback(() => {
    if (!clubId) return
    api
      .get(`/expenses?clubId=${clubId}`)
      .then((r) => setData((r.data?.data ?? []).map(mapExpense)))
      .catch(() => {
        /* local-token/offline → giữ rỗng như trước */
      })
  }, [clubId])
  useEffect(() => {
    reload()
  }, [reload])
  return { data, reload, setData }
}
