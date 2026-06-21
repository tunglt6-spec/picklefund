export type Role = 'SUPER_ADMIN' | 'CLUB_ADMIN' | 'CLUB_TREASURER' | 'CLUB_MEMBER'

export type ClubStatus = 'active' | 'suspended' | 'deleted'
export type FundPeriodStatus = 'draft' | 'active' | 'closed' | 'finalized'
export type FundPeriodType = 'chung' | 'game'
export type MemberStatus = 'active' | 'inactive' | 'left'
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled'
export type AttendanceStatus = 'PRESENT' | 'ABSENT'
export type AllocationRule = 'ATTENDANCE' | 'EQUAL' | 'PRESENT_ONLY' | 'FUND_ONLY'

export type FundSource = 'COMMON' | 'MINI'
export type MiniIncomeType = 'BETTING' | 'SPONSORSHIP' | 'PENALTY' | 'DONATION' | 'OTHER'
export type MiniExpenseType = 'GAME_REWARD' | 'TOURNAMENT_PRIZE' | 'PARTY' | 'BALL_PURCHASE' | 'OTHER'

export const MINI_INCOME_TYPE_LABELS: Record<MiniIncomeType, string> = {
  BETTING: 'Cá cược',
  SPONSORSHIP: 'Tài trợ',
  PENALTY: 'Nộp phạt',
  DONATION: 'Ủng hộ',
  OTHER: 'Khác',
}

export const MINI_EXPENSE_TYPE_LABELS: Record<MiniExpenseType, string> = {
  GAME_REWARD: 'Thưởng game',
  TOURNAMENT_PRIZE: 'Thưởng giải',
  PARTY: 'Liên hoan',
  BALL_PURCHASE: 'Mua bóng',
  OTHER: 'Chi khác',
}

export interface User {
  id: string
  username: string
  email: string
  clubId: string | null
  role: Role
  memberId?: string
  mustChangePassword?: boolean
}

export interface MemberUserAccount {
  id: string
  username: string
  email: string
  isActive: boolean
  mustChangePassword: boolean
  lastLoginAt: string | null
  notificationEnabled: boolean
  createdAt: string
  member: {
    id: string
    fullName: string
    phone?: string
    email?: string
  } | null
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

export interface Club {
  id: string
  name: string
  code: string
  logoUrl?: string
  address?: string
  contactEmail?: string
  contactPhone?: string
  status: ClubStatus
  settings?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  _count?: { members: number; fundPeriods: number }
}

export interface Member {
  id: string
  clubId: string
  userId?: string
  fullName: string
  phone?: string
  email?: string
  joinDate: string
  status: MemberStatus
  avatarUrl?: string
  notes?: string
}

export interface FundPeriod {
  id: string
  clubId: string
  name: string
  startDate: string
  endDate: string
  contributionAmount: number
  totalSessions: number
  status: FundPeriodStatus
  type?: FundPeriodType
  notes?: string
  finalizedAt?: string
  createdBy: string
}

export interface AttendanceSession {
  id: string
  clubId: string
  fundPeriodId: string
  sessionDate: string
  startTime?: string
  endTime?: string
  courtFee: number
  courtName?: string
  status: SessionStatus
  notes?: string
  createdBy: string
  _count?: { attendanceRecords: number }
}

export interface AttendanceRecord {
  id: string
  clubId: string
  attendanceSessionId: string
  memberId: string
  status: AttendanceStatus
  member?: Member
}

export interface FundContribution {
  id: string
  clubId: string
  fundSource: FundSource
  // COMMON
  fundPeriodId?: string
  memberId?: string
  member?: Member
  // MINI
  miniIncomeType?: MiniIncomeType
  payerName?: string
  relatedMinigameId?: string
  // shared
  amount: number
  paymentDate: string
  paymentMethod: string
  isConfirmed: boolean
  notes?: string
  createdAt: string
}

export type ExpenseStatus = 'pending' | 'approved' | 'paid' | 'rejected'

export interface LivingExpense {
  id: string
  clubId: string
  fundSource: FundSource
  // COMMON
  fundPeriodId?: string
  attendanceSessionId?: string
  categoryId?: string
  allocationRule: AllocationRule
  allocationEnabled: boolean
  // MINI
  miniExpenseType?: MiniExpenseType
  receiverName?: string
  relatedMinigameId?: string
  // shared
  amount: number
  description: string
  expenseDate: string
  receiptUrl?: string
  status?: ExpenseStatus
  createdBy: string
  createdAt: string
}

export interface PersonalReceipt {
  memberId: string
  memberName: string
  fundPeriodId: string
  fundPeriodName: string
  totalSessions: number
  attendedSessions: number
  attendanceRate: number
  amountPaid: number
  courtCost: number
  livingCost: number
  totalCost: number
  balance: number
  needToPay: number
}

export interface FundPeriodSummary {
  totalIncome: number
  totalExpenses: number
  courtExpenses: number
  livingExpenses: number
  balance: number
  totalAttendance: number
  costPerAttendance: number
  unpaidCount: number
  negativeBalanceCount: number
  lowAttendanceCount: number
  members: MemberSummary[]
}

export interface MemberSummary {
  memberId: string
  memberName: string
  attendedSessions: number
  amountPaid: boolean
  courtCost: number
  livingCost: number
  totalCost: number
  balance: number
  contributionPaid: boolean
}

export interface SuperAdminStats {
  totalClubs: number
  activeClubs: number
  suspendedClubs: number
  totalMembers: number
  totalFundPeriods: number
  loginsLast24h: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface Alert {
  id: string
  type: 'HIGH' | 'MED' | 'LOW'
  message: string
  action?: string
}
