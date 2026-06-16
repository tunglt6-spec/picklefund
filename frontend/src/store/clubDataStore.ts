import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Member, FundPeriod, AttendanceSession, FundContribution, LivingExpense } from '../types'
import {
  mockMembers,
  mockFundPeriods,
  mockSessions,
  mockContributions,
  mockExpenses,
} from '../lib/mockData'

export const DEMO_CLUB_ID = 'club-1'

export interface ClubData {
  members: Member[]
  fundPeriods: FundPeriod[]
  sessions: AttendanceSession[]
  contributions: FundContribution[]
  expenses: LivingExpense[]
}

interface ClubDataStore {
  dataByClub: Record<string, ClubData>
  getClubData: (clubId: string) => ClubData
  setMembers: (clubId: string, members: Member[]) => void
  setFundPeriods: (clubId: string, periods: FundPeriod[]) => void
  setSessions: (clubId: string, sessions: AttendanceSession[]) => void
  setContributions: (clubId: string, contributions: FundContribution[]) => void
  setExpenses: (clubId: string, expenses: LivingExpense[]) => void
}

const DEMO_DATA: ClubData = {
  members: mockMembers,
  fundPeriods: mockFundPeriods,
  sessions: mockSessions,
  contributions: mockContributions,
  expenses: mockExpenses,
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
      dataByClub: { [DEMO_CLUB_ID]: DEMO_DATA },

      getClubData: (clubId: string) => {
        if (!clubId || clubId === DEMO_CLUB_ID) return get().dataByClub[DEMO_CLUB_ID] ?? DEMO_DATA
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
    }),
    {
      name: 'picklefund-club-data',
      // Don't persist DEMO_DATA for club-1 — it's large and always available as fallback in initial state.
      // Only persist data for real (non-demo) clubs created by users.
      partialize: (state) => ({
        dataByClub: Object.fromEntries(
          Object.entries(state.dataByClub).filter(([id]) => id !== DEMO_CLUB_ID)
        ),
      }),
      // When rehydrating, merge stored user-club data back into state that already has demo data.
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<ClubDataStore> | null
        return {
          ...current,
          dataByClub: {
            [DEMO_CLUB_ID]: DEMO_DATA,
            ...(p?.dataByClub ?? {}),
          },
        }
      },
    }
  )
)
