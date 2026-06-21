import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Member, FundPeriod, AttendanceSession, FundContribution, LivingExpense } from '../types'

export const DEMO_CLUB_ID = 'club-1'

export interface ClubSettings {
  name: string
  code: string
  address: string
  contactPhone: string
  contactEmail: string
  description: string
  maxMembers: string
  defaultContribution: string
  defaultSessions: string
}

export interface MemberAttendanceSummary {
  memberId: string
  memberName: string
  attendedSessions: number
  totalSessions: number
}

export interface ClubData {
  members: Member[]
  fundPeriods: FundPeriod[]
  sessions: AttendanceSession[]
  contributions: FundContribution[]
  expenses: LivingExpense[]
  settings?: ClubSettings
  myAttendedSessionIds?: string[]
  memberAttendanceSummary?: MemberAttendanceSummary[]
}

interface ClubDataStore {
  dataByClub: Record<string, ClubData>
  readNotifIds: Record<string, string[]>
  getClubData: (clubId: string) => ClubData
  setMembers: (clubId: string, members: Member[]) => void
  setFundPeriods: (clubId: string, periods: FundPeriod[]) => void
  setSessions: (clubId: string, sessions: AttendanceSession[]) => void
  setContributions: (clubId: string, contributions: FundContribution[]) => void
  setExpenses: (clubId: string, expenses: LivingExpense[]) => void
  setClubSettings: (clubId: string, settings: ClubSettings) => void
  setMyAttendedSessionIds: (clubId: string, ids: string[]) => void
  setMemberAttendanceSummary: (clubId: string, summary: MemberAttendanceSummary[]) => void
  markNotifRead: (clubId: string, ids: string[]) => void
}

const EMPTY_DATA: ClubData = {
  members: [],
  fundPeriods: [],
  sessions: [],
  contributions: [],
  expenses: [],
}

export const useClubDataStore = create<ClubDataStore>()(
  persist(
    (set, get) => ({
      dataByClub: {},
      readNotifIds: {},

      getClubData: (clubId: string) => {
        if (!clubId) return EMPTY_DATA
        return get().dataByClub[clubId] ?? EMPTY_DATA
      },

      setMembers: (clubId, members) =>
        set(s => ({ dataByClub: { ...s.dataByClub, [clubId]: { ...(s.dataByClub[clubId] ?? EMPTY_DATA), members } } })),

      setFundPeriods: (clubId, fundPeriods) =>
        set(s => ({ dataByClub: { ...s.dataByClub, [clubId]: { ...(s.dataByClub[clubId] ?? EMPTY_DATA), fundPeriods } } })),

      setSessions: (clubId, sessions) =>
        set(s => ({ dataByClub: { ...s.dataByClub, [clubId]: { ...(s.dataByClub[clubId] ?? EMPTY_DATA), sessions } } })),

      setContributions: (clubId, contributions) =>
        set(s => ({ dataByClub: { ...s.dataByClub, [clubId]: { ...(s.dataByClub[clubId] ?? EMPTY_DATA), contributions } } })),

      setExpenses: (clubId, expenses) =>
        set(s => ({ dataByClub: { ...s.dataByClub, [clubId]: { ...(s.dataByClub[clubId] ?? EMPTY_DATA), expenses } } })),

      setClubSettings: (clubId, settings) =>
        set(s => ({ dataByClub: { ...s.dataByClub, [clubId]: { ...(s.dataByClub[clubId] ?? EMPTY_DATA), settings } } })),

      setMyAttendedSessionIds: (clubId, myAttendedSessionIds) =>
        set(s => ({ dataByClub: { ...s.dataByClub, [clubId]: { ...(s.dataByClub[clubId] ?? EMPTY_DATA), myAttendedSessionIds } } })),

      setMemberAttendanceSummary: (clubId, memberAttendanceSummary) =>
        set(s => ({ dataByClub: { ...s.dataByClub, [clubId]: { ...(s.dataByClub[clubId] ?? EMPTY_DATA), memberAttendanceSummary } } })),

      markNotifRead: (clubId, ids) =>
        set(s => {
          const existing = s.readNotifIds[clubId] ?? []
          const merged = Array.from(new Set([...existing, ...ids]))
          return { readNotifIds: { ...s.readNotifIds, [clubId]: merged } }
        }),
    }),
    {
      name: 'picklefund-club-data',
      partialize: (state) => ({ dataByClub: state.dataByClub, readNotifIds: state.readNotifIds }),
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<ClubDataStore> | null
        return {
          ...current,
          dataByClub: { ...(p?.dataByClub ?? {}) },
          readNotifIds: { ...(p?.readNotifIds ?? {}) },
        }
      },
    }
  )
)
