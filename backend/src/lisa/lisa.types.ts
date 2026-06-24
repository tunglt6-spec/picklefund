export interface MemberContext {
  memberId: string
  memberName: string
  clubId: string
  clubName: string
  status: string
  totalPaid: number
  totalUnpaid: number
  currentPeriodPaid: boolean
  sessionsAttended: number
  totalSessions: number
  lastAttendedAt: Date | null
  balance: number
}

export interface PersonalBrief {
  greeting: string
  paymentStatus: string
  activitySummary: string
  reminder: string | null
  tips: string[]
}

export interface SmartReminder {
  type: 'payment_due' | 'session_upcoming' | 'inactivity' | 'fund_low' | 'period_closing'
  title: string
  body: string
  dueDate: string | null
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  memberId: string
  clubId: string
}

export interface AskLisaResult {
  question: string
  answer: string
  suggestedActions: string[]
}
