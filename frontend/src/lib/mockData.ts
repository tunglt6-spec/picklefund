import type { Club, Member, FundPeriod, AttendanceSession, FundContribution, LivingExpense, FundPeriodSummary, SuperAdminStats } from '../types'

export const mockClubs: Club[] = [
  { id: 'club-1', name: 'CLB Pickleball Hà Nội', code: 'PBHN', address: 'Sân Mỹ Đình, Hà Nội', contactEmail: 'pbhn@gmail.com', contactPhone: '0912345678', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z', _count: { members: 18, fundPeriods: 2 } },
  { id: 'club-2', name: 'CLB Pickleball Hồ Chí Minh', code: 'PBHCM', address: 'Sân Phan Đình Phùng, TP.HCM', contactEmail: 'pbhcm@gmail.com', contactPhone: '0987654321', status: 'active', createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z', _count: { members: 12, fundPeriods: 1 } },
  { id: 'club-3', name: 'CLB Pickleball Đà Nẵng', code: 'PBDN', address: 'Sân Hòa Xuân, Đà Nẵng', contactEmail: 'pbdn@gmail.com', contactPhone: '0978123456', status: 'suspended', createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-05-15T00:00:00Z', _count: { members: 6, fundPeriods: 1 } },
]

export const mockMembers: Member[] = [
  { id: 'mem-1',  clubId: 'club-1', fullName: 'Nguyễn Văn An',     phone: '0912111111', email: 'nguyenvanan@gmail.com',   joinDate: '2026-01-01', status: 'active' },
  { id: 'mem-2',  clubId: 'club-1', fullName: 'Trần Thị Bình',      phone: '0912222222', email: 'tranthibinh@gmail.com',    joinDate: '2026-01-01', status: 'active' },
  { id: 'mem-3',  clubId: 'club-1', fullName: 'Lê Minh Cường',      phone: '0912333333', email: 'leminhcuong@gmail.com',    joinDate: '2026-01-15', status: 'active' },
  { id: 'mem-4',  clubId: 'club-1', fullName: 'Phạm Thu Dung',      phone: '0912444444', email: 'phamthudung@gmail.com',    joinDate: '2026-01-15', status: 'active' },
  { id: 'mem-5',  clubId: 'club-1', fullName: 'Hoàng Đức Anh',      phone: '0912555555', email: 'hoangducanh@gmail.com',    joinDate: '2026-02-01', status: 'active' },
  { id: 'mem-6',  clubId: 'club-1', fullName: 'Vũ Thị Lan',         phone: '0912666666', email: 'vuthilan@gmail.com',       joinDate: '2026-02-01', status: 'active' },
  { id: 'mem-7',  clubId: 'club-1', fullName: 'Đặng Văn Hùng',      phone: '0912777777', email: 'dangvanhung@gmail.com',    joinDate: '2026-02-15', status: 'active' },
  { id: 'mem-8',  clubId: 'club-1', fullName: 'Bùi Thị Hoa',        phone: '0912888888', email: 'buithihoa@gmail.com',      joinDate: '2026-02-15', status: 'active' },
  { id: 'mem-9',  clubId: 'club-1', fullName: 'Ngô Minh Tuấn',      phone: '0913111111', email: 'ngominhtuan@gmail.com',    joinDate: '2026-03-01', status: 'active' },
  { id: 'mem-10', clubId: 'club-1', fullName: 'Lý Thị Mai',         phone: '0913222222', email: 'lythimai@gmail.com',       joinDate: '2026-03-01', status: 'active' },
  { id: 'mem-11', clubId: 'club-1', fullName: 'Phan Văn Đức',       phone: '0913333333', email: 'phanvanduc@gmail.com',     joinDate: '2026-03-15', status: 'active' },
  { id: 'mem-12', clubId: 'club-1', fullName: 'Đỗ Thị Thảo',        phone: '0913444444', email: 'dothithao@gmail.com',      joinDate: '2026-03-15', status: 'active' },
  { id: 'mem-13', clubId: 'club-1', fullName: 'Trương Minh Khoa',   phone: '0913555555', email: 'truongminhkhoa@gmail.com', joinDate: '2026-04-01', status: 'active' },
  { id: 'mem-14', clubId: 'club-1', fullName: 'Hồ Thị Thu',         phone: '0913666666', email: 'hothithu@gmail.com',       joinDate: '2026-04-01', status: 'active' },
  { id: 'mem-15', clubId: 'club-1', fullName: 'Đinh Văn Nam',       phone: '0913777777', email: 'dinhvannam@gmail.com',     joinDate: '2026-04-15', status: 'active' },
  { id: 'mem-16', clubId: 'club-1', fullName: 'Chu Thị Linh',       phone: '0913888888', email: 'chuthilinh@gmail.com',     joinDate: '2026-04-15', status: 'active' },
  { id: 'mem-17', clubId: 'club-1', fullName: 'Mai Văn Phong',      phone: '0914111111', email: 'maivanphong@gmail.com',    joinDate: '2026-05-01', status: 'active' },
  { id: 'mem-18', clubId: 'club-1', fullName: 'Tô Thị Hạnh',        phone: '0914222222', email: 'tothihanh@gmail.com',      joinDate: '2026-05-01', status: 'active' },
]

export const mockFundPeriods: FundPeriod[] = [
  { id: 'fp-1', clubId: 'club-1', name: 'Quý 1/2026', startDate: '2026-01-01', endDate: '2026-03-31', contributionAmount: 1000000, totalSessions: 13, status: 'finalized', createdBy: 'user-1', finalizedAt: '2026-04-01T00:00:00Z' },
  { id: 'fp-2', clubId: 'club-1', name: 'Quý 2/2026', startDate: '2026-04-01', endDate: '2026-06-30', contributionAmount: 1000000, totalSessions: 13, status: 'active', createdBy: 'user-1' },
]

export const mockSessions: AttendanceSession[] = Array.from({ length: 10 }, (_, i) => ({
  id: `sess-${i + 1}`,
  clubId: 'club-1',
  fundPeriodId: 'fp-2',
  sessionDate: `2026-04-${String((i + 1) * 3).padStart(2, '0')}`,
  startTime: '08:00',
  endTime: '11:00',
  courtFee: 450000,
  courtName: 'Sân Mỹ Đình Indoor',
  status: i < 8 ? 'completed' : 'scheduled',
  createdBy: 'user-1',
  _count: { attendanceRecords: 6 + (i % 3) },
}))

export const mockContributions: FundContribution[] = mockMembers.map((m, i) => ({
  id: `contrib-${i + 1}`,
  clubId: 'club-1',
  fundPeriodId: 'fp-2',
  memberId: m.id,
  amount: 1000000,
  paymentDate: '2026-04-01',
  paymentMethod: 'bank_transfer',
  isConfirmed: i < 6,
  member: m,
  createdAt: '2026-04-01T00:00:00Z',
}))

export const mockExpenses: LivingExpense[] = [
  { id: 'exp-1', clubId: 'club-1', fundPeriodId: 'fp-2', amount: 450000, description: 'Tiền sân buổi 1', allocationRule: 'ATTENDANCE', expenseDate: '2026-04-05', createdBy: 'user-1', createdAt: '2026-04-05T00:00:00Z' },
  { id: 'exp-2', clubId: 'club-1', fundPeriodId: 'fp-2', amount: 250000, description: 'Nước uống', allocationRule: 'ATTENDANCE', expenseDate: '2026-04-05', createdBy: 'user-1', createdAt: '2026-04-05T00:00:00Z' },
  { id: 'exp-3', clubId: 'club-1', fundPeriodId: 'fp-2', amount: 100000, description: 'Phí duy trì nhóm Zalo', allocationRule: 'EQUAL', expenseDate: '2026-04-01', createdBy: 'user-1', createdAt: '2026-04-01T00:00:00Z' },
  { id: 'exp-4', clubId: 'club-1', fundPeriodId: 'fp-2', amount: 500000, description: 'Mua vợt dùng chung', allocationRule: 'FUND_ONLY', expenseDate: '2026-04-10', createdBy: 'user-1', createdAt: '2026-04-10T00:00:00Z' },
]

export const mockFundSummary: FundPeriodSummary = {
  totalIncome: 8000000,
  totalExpenses: 6455704,
  courtExpenses: 5387500,
  livingExpenses: 1068204,
  balance: 1544296,
  totalAttendance: 78,
  costPerAttendance: 82765,
  unpaidCount: 2,
  negativeBalanceCount: 0,
  lowAttendanceCount: 1,
  members: [
    { memberId: 'mem-1', memberName: 'Nguyễn Văn A', attendedSessions: 13, amountPaid: true, courtCost: 731250, livingCost: 178205, totalCost: 909455, balance: 90545, contributionPaid: true },
    { memberId: 'mem-2', memberName: 'Trần Thị B', attendedSessions: 11, amountPaid: true, courtCost: 618750, livingCost: 150641, totalCost: 769391, balance: 230609, contributionPaid: true },
    { memberId: 'mem-3', memberName: 'Lê Văn C', attendedSessions: 10, amountPaid: true, courtCost: 562500, livingCost: 136923, totalCost: 699423, balance: 300577, contributionPaid: true },
    { memberId: 'mem-4', memberName: 'Phạm Thị D', attendedSessions: 9, amountPaid: false, courtCost: 506250, livingCost: 123205, totalCost: 629455, balance: 370545, contributionPaid: false },
    { memberId: 'mem-5', memberName: 'Hoàng Văn E', attendedSessions: 13, amountPaid: true, courtCost: 731250, livingCost: 178205, totalCost: 909455, balance: 90545, contributionPaid: true },
    { memberId: 'mem-6', memberName: 'Đặng Thị F', attendedSessions: 8, amountPaid: true, courtCost: 450000, livingCost: 109487, totalCost: 559487, balance: 440513, contributionPaid: true },
    { memberId: 'mem-7', memberName: 'Bùi Văn G', attendedSessions: 7, amountPaid: true, courtCost: 393750, livingCost: 95769, totalCost: 489519, balance: 510481, contributionPaid: true },
    { memberId: 'mem-8', memberName: 'Vũ Thị H', attendedSessions: 7, amountPaid: false, courtCost: 393750, livingCost: 95769, totalCost: 489519, balance: 510481, contributionPaid: false },
  ],
}

export const mockSuperStats: SuperAdminStats = {
  totalClubs: 3,
  activeClubs: 2,
  suspendedClubs: 1,
  totalMembers: 26,
  totalFundPeriods: 4,
  loginsLast24h: 34,
}

export const mockChartData = {
  incomeExpenseByPeriod: [
    { period: 'Q3/2025', income: 8000000, expense: 7200000 },
    { period: 'Q4/2025', income: 8000000, expense: 6800000 },
    { period: 'Q1/2026', income: 8000000, expense: 6455704 },
    { period: 'Q2/2026', income: 8000000, expense: 5200000 },
  ],
  costBreakdown: [
    { name: 'Tiền sân', value: 5387500, fill: '#6366f1' },
    { name: 'Sinh hoạt', value: 1068204, fill: '#06b6d4' },
    { name: 'Khác', value: 0, fill: '#f59e0b' },
  ],
  attendanceBySession: mockSessions.slice(0, 8).map((s, i) => ({
    session: `Buổi ${i + 1}`,
    count: s._count?.attendanceRecords ?? 6,
  })),
  balanceOverTime: [
    { date: '01/04', balance: 8000000 },
    { date: '05/04', balance: 7100000 },
    { date: '12/04', balance: 6200000 },
    { date: '19/04', balance: 5850000 },
    { date: '26/04', balance: 5400000 },
    { date: '03/05', balance: 4950000 },
    { date: '10/05', balance: 4300000 },
    { date: '15/06', balance: 1544296 },
  ],
  clubActivityByMonth: [
    { month: 'Jan', active: 1 },
    { month: 'Feb', active: 2 },
    { month: 'Mar', active: 2 },
    { month: 'Apr', active: 3 },
    { month: 'May', active: 3 },
    { month: 'Jun', active: 2 },
  ],
}
