import { useEffect, useState } from 'react'
import api from '../lib/api'

/** Tài chính cá nhân (nguồn: calculator server-side qua /member/me/finance). */
export interface MemberFinance {
  period: {
    id: string
    name: string
    startDate: string
    endDate: string
    contributionAmount: number
  } | null
  totalSessions: number
  member: {
    memberId: string
    memberName: string
    attendedSessions: number
    totalSessions: number
    paidAmount: number
    courtFee: number
    livingFee: number
    totalCost: number
    balance: number
    status: string
  } | null
  contribution: { amount: number; isConfirmed: boolean; paymentDate: string } | null
  totals: { court: number; living: number; memberCount: number } | null
}

export interface MemberSession {
  id: string
  sessionDate: string
  courtName: string | null
  startTime: string | null
  endTime: string | null
  status: string
  courtFee: number
  attendeeCount: number
  present: boolean
}

/** Lịch tham gia cá nhân (nguồn: /member/me/attendance). */
export interface MemberAttendance {
  memberName: string
  period: { id: string; name: string } | null
  totalCompleted: number
  attended: number
  upcoming: number
  sessions: MemberSession[]
}

/**
 * Hook đọc dữ liệu member portal — CHỈ gọi các endpoint self-scope theo JWT.
 * Không đụng tới clubDataStore (dữ liệu toàn CLB) → member không nhận dữ liệu member khác/quản trị.
 */
export function useMemberPortal() {
  const [finance, setFinance] = useState<MemberFinance | null>(null)
  const [attendance, setAttendance] = useState<MemberAttendance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      api
        .get('/member/me/finance')
        .then((r) => (r.data?.data ?? null) as MemberFinance | null)
        .catch(() => null),
      api
        .get('/member/me/attendance')
        .then((r) => (r.data?.data ?? null) as MemberAttendance | null)
        .catch(() => null),
    ])
      .then(([f, a]) => {
        if (!alive) return
        setFinance(f)
        setAttendance(a)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return { finance, attendance, loading }
}
