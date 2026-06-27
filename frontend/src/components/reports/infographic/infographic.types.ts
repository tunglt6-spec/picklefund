export interface InfographicMemberData {
  id: string
  name: string
  attendedSessions: number
  totalSessions: number
  attendanceRate: number
  paidAmount: number
  isPaid: boolean
  courtFee: number
  livingFee: number
  totalCost: number
  balance: number
}

export interface InfographicReportData {
  clubName: string
  reportTitle: string
  periodLabel: string
  exportDate: string
  generatedAt: string
  totalMembers: number
  totalSessions: number
  paidMembers: number
  unpaidMembers: number
  totalIncome: number
  totalExpense: number
  fundBalance: number
  expenseIncomeRatio: number
  members: InfographicMemberData[]
}
