import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useClubDataStore } from '../store/clubDataStore'
import api from '../lib/api'
import type { Member, FundPeriod, FundContribution, LivingExpense, AttendanceSession } from '../types'
import type { MemberAttendanceSummary } from '../store/clubDataStore'

function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}

function toNum(v: string | number | null | undefined): number {
  return v == null ? 0 : typeof v === 'number' ? v : Number(v)
}

export function useApiSync() {
  const { user, accessToken, isAuthenticated } = useAuthStore()
  const { setMembers, setFundPeriods, setContributions, setExpenses, setSessions, setMyAttendedSessionIds, setMemberAttendanceSummary, setClubSettings } = useClubDataStore()
  // Boolean ref — persists across renders but resets on component unmount (logout/remount).
  // Prevents silent-refresh token rotation from re-triggering a wipe-and-replace sync mid-session.
  const syncedRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || !user?.clubId || !accessToken) return
    if (isLocalToken(accessToken)) return
    if (syncedRef.current) return

    const clubId = user.clubId
    syncedRef.current = true

    const load = async () => {
      try {
        const [membersRes, periodsRes, contribsRes, expensesRes, sessionsRes, mySessionsRes, memberSummaryRes, clubRes] = await Promise.allSettled([
          api.get(`/members?clubId=${clubId}`),
          api.get(`/fund-periods?clubId=${clubId}`),
          api.get(`/contributions?clubId=${clubId}`),
          api.get(`/expenses?clubId=${clubId}`),
          api.get(`/attendance?clubId=${clubId}`),
          api.get('/attendance/my-sessions'),
          api.get('/attendance/member-summary'),
          api.get('/clubs/me'),
        ])

        if (membersRes.status === 'fulfilled') {
          const raw = membersRes.value.data?.data ?? []
          const members: Member[] = raw.map((m: any) => ({
            id: m.id,
            clubId: m.clubId,
            fullName: m.fullName,
            phone: m.phone ?? undefined,
            email: m.email ?? undefined,
            joinDate: m.joinDate?.slice(0, 10) ?? '',
            status: m.status ?? 'active',
            avatarUrl: m.avatarUrl ?? undefined,
            notes: m.notes ?? undefined,
          }))
          setMembers(clubId, members)
        }

        if (periodsRes.status === 'fulfilled') {
          const raw = periodsRes.value.data?.data ?? []
          const periods: FundPeriod[] = raw.map((p: any) => ({
            id: p.id,
            clubId: p.clubId,
            name: p.name,
            startDate: p.startDate?.slice(0, 10) ?? '',
            endDate: p.endDate?.slice(0, 10) ?? '',
            contributionAmount: toNum(p.contributionAmount),
            totalSessions: p.totalSessions ?? 0,
            status: p.status,
            notes: p.notes ?? undefined,
            type: p.type ?? 'chung',
            finalizedAt: p.finalizedAt ?? undefined,
            createdBy: p.createdById ?? '',
          }))
          setFundPeriods(clubId, periods)
        }

        if (contribsRes.status === 'fulfilled') {
          const raw = contribsRes.value.data?.data ?? []
          const contributions: FundContribution[] = raw.map((c: any) => ({
            id: c.id,
            clubId: c.clubId,
            fundSource: c.fundSource ?? 'COMMON',
            fundPeriodId: c.fundPeriodId ?? undefined,
            memberId: c.memberId ?? undefined,
            member: c.member ? { id: c.memberId, fullName: c.member.fullName } as Member : undefined,
            amount: toNum(c.amount),
            paymentDate: c.paymentDate?.slice(0, 10) ?? '',
            paymentMethod: c.paymentMethod ?? 'bank_transfer',
            isConfirmed: c.isConfirmed ?? false,
            notes: c.notes ?? undefined,
            miniIncomeType: c.miniIncomeType ?? undefined,
            payerName: c.payerName ?? undefined,
            createdAt: c.createdAt ?? '',
            createdBy: c.createdById ?? '',
          }))
          setContributions(clubId, contributions)
        }

        if (expensesRes.status === 'fulfilled') {
          const raw = expensesRes.value.data?.data ?? []
          const expenses: LivingExpense[] = raw.map((e: any) => ({
            id: e.id,
            clubId: e.clubId,
            fundSource: e.fundSource ?? 'COMMON',
            fundPeriodId: e.fundPeriodId ?? undefined,
            description: e.description,
            amount: toNum(e.amount),
            allocationRule: e.allocationRule ?? 'FUND_ONLY',
            allocationEnabled: e.allocationEnabled ?? true,
            expenseDate: e.expenseDate?.slice(0, 10) ?? '',
            receiptUrl: e.receiptUrl ?? undefined,
            miniExpenseType: e.miniExpenseType ?? undefined,
            receiverName: e.receiverName ?? undefined,
            status: (e.status ?? 'pending') as import('../types').ExpenseStatus,
            createdAt: e.createdAt ?? '',
            createdBy: e.createdById ?? '',
          }))
          setExpenses(clubId, expenses)
        }

        if (mySessionsRes.status === 'fulfilled') {
          const ids: string[] = mySessionsRes.value.data?.data ?? []
          setMyAttendedSessionIds(clubId, ids)
        }

        if (memberSummaryRes.status === 'fulfilled') {
          const raw = memberSummaryRes.value.data?.data ?? []
          const summary: MemberAttendanceSummary[] = raw.map((s: any) => ({
            memberId: s.memberId,
            memberName: s.memberName,
            attendedSessions: s.attendedSessions ?? 0,
            totalSessions: s.totalSessions ?? 0,
          }))
          setMemberAttendanceSummary(clubId, summary)
        }

        if (clubRes.status === 'fulfilled') {
          const c = clubRes.value.data?.data
          if (c) {
            const extra = (c.settings ?? {}) as Record<string, unknown>
            setClubSettings(clubId, {
              ...(extra as any),
              name: c.name ?? '',
              code: c.code ?? '',
              address: c.address ?? '',
              contactPhone: c.contactPhone ?? '',
              contactEmail: c.contactEmail ?? '',
              description: (extra.description as string) ?? '',
              maxMembers: (extra.maxMembers as string) ?? '',
              defaultContribution: (extra.defaultContribution as string) ?? '',
              defaultSessions: (extra.defaultSessions as string) ?? '',
            })
          }
        }

        if (sessionsRes.status === 'fulfilled') {
          const raw = sessionsRes.value.data?.data ?? []
          const sessions: AttendanceSession[] = raw.map((s: any) => ({
            id: s.id,
            clubId: s.clubId,
            fundPeriodId: s.fundPeriodId || undefined,
            sessionDate: s.sessionDate?.slice(0, 10) ?? '',
            startTime: s.startTime ?? '',
            endTime: s.endTime ?? '',
            courtName: s.courtName ?? '',
            courtFee: toNum(s.courtFee),
            status: s.status ?? 'scheduled',
            notes: s.notes ?? undefined,
            createdBy: s.createdById ?? '',
            _count: { attendanceRecords: s._count?.attendanceRecords ?? 0 },
          }))
          setSessions(clubId, sessions)
        }
      } catch {
        // Silently fail — local Zustand data stays intact
      }
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.clubId, setMembers, setFundPeriods, setContributions, setExpenses, setSessions, setMyAttendedSessionIds, setMemberAttendanceSummary, setClubSettings])
}
