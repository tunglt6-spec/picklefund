export interface MemberContext {
  memberId: string;
  memberName: string;
  clubId: string;
  clubName: string;
  status: string;
  totalPaid: number;
  totalUnpaid: number;
  currentPeriodPaid: boolean;
  currentPeriodAmount: number;
  sessionsAttended: number;
  totalSessions: number;
  lastAttendedAt: Date | null;
  balance: number;
  clubFundBalance: number;
  clubTotalExpenses: number;
  clubTotalContributions: number;
  activeMemberCount: number;
  memberNames: string[];
  activePeriodName: string | null;
  recentPayments: { amount: number; date: Date }[];
}

export interface PersonalBrief {
  greeting: string;
  paymentStatus: string;
  activitySummary: string;
  reminder: string | null;
  tips: string[];
}

export interface SmartReminder {
  type:
    | 'payment_due'
    | 'session_upcoming'
    | 'inactivity'
    | 'fund_low'
    | 'period_closing';
  title: string;
  body: string;
  dueDate: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  memberId: string;
  // userId của tài khoản gắn với thành viên — cần để gửi notification (SPECIFIC_USER).
  // null nếu thành viên chưa có tài khoản → không thể nhắc qua kênh notification.
  userId: string | null;
  clubId: string;
}

export interface AskLisaResult {
  question: string;
  answer: string;
  suggestedActions: string[];
}
