export interface DashboardMember {
  id: string
  name: string
  skill: 'Cao' | 'TB' | 'Thấp'
  isSeed?: boolean
}

export interface DashboardGroup {
  id: string
  label: string
  members: DashboardMember[]
  totalExpectedMatches: number
  completedMatches: number
}

export interface DashboardMatch {
  id: string
  matchNumber: number
  status: 'COMPLETED' | 'PENDING_RESULT' | 'UPCOMING'
  court?: string
  team1: { player1Id: string; player2Id: string; player1: string; player2: string }
  team2: { player1Id: string; player2Id: string; player1: string; player2: string }
  score1?: number
  score2?: number
  completedAt?: string
}

export interface DashboardRound {
  roundNumber: number
  status: 'IN_PROGRESS' | 'COMPLETED'
  totalMatches: number
  completedMatches: number
  sitOuts: DashboardMember[]
  matches: DashboardMatch[]
}

export interface DashboardRanking {
  rank: number
  memberId: string
  name: string
  group: string
  played: number
  won: number
  drawn: number
  lost: number
  pointsFor: number
  pointsAgainst: number
  diff: number
  points: number
  winRate: number
  sitOutCount: number
}

export interface DashboardAlert {
  id: string
  level: 'HIGH' | 'MED' | 'LOW'
  title: string
  description: string
  actionLabel: string
}

export interface DashboardActivity {
  id: string
  text: string
  time: string
  type: 'score' | 'round' | 'group' | 'system'
}

export interface QuickStats {
  topScorer: { name: string; points: number }
  bestDiff: { name: string; diff: number }
  topWinRate: { name: string; rate: number }
  mostPlayed: { name: string; count: number }
  mostSitOut: { name: string; count: number }
}

export interface TournamentKpi {
  totalMembers: number
  totalGroups: number
  totalExpectedMatches: number
  completedMatches: number
  pendingResultMatches: number
  completionRate: number
  totalSitOuts: number
  currentRoundNumber: number
}

export interface MockTournamentDashboard {
  minigame: {
    id: string
    name: string
    description: string
    status: string
    formatType: string
    startDate: string
    endDate: string
    drawMode: string
  }
  kpi: TournamentKpi
  groups: DashboardGroup[]
  currentRound: DashboardRound
  rankings: DashboardRanking[]
  quickStats: QuickStats
  alerts: DashboardAlert[]
  recentActivities: DashboardActivity[]
}

export const mockTournamentDashboard: MockTournamentDashboard = {
  minigame: {
    id: 'mg-1',
    name: 'Giải Đánh Đôi Tháng 6/2026',
    description: 'Giải đánh đôi ngẫu nhiên hàng tháng – vòng xoay công bằng',
    status: 'IN_PROGRESS',
    formatType: 'RANDOM_DOUBLES',
    startDate: '2026-06-14',
    endDate: '2026-06-16',
    drawMode: 'FAIR_ROTATION',
  },
  kpi: {
    totalMembers: 18,
    totalGroups: 5,
    totalExpectedMatches: 9,
    completedMatches: 7,
    pendingResultMatches: 1,
    completionRate: 78,
    totalSitOuts: 2,
    currentRoundNumber: 4,
  },
  groups: [
    {
      id: 'g-a', label: 'Bảng A',
      members: [
        { id: 'mem-1',  name: 'Nguyễn Văn An',   skill: 'Cao', isSeed: true },
        { id: 'mem-2',  name: 'Trần Thị Bình',    skill: 'Cao' },
        { id: 'mem-3',  name: 'Lê Minh Cường',    skill: 'TB' },
        { id: 'mem-4',  name: 'Phạm Thu Dung',    skill: 'TB' },
      ],
      totalExpectedMatches: 3, completedMatches: 2,
    },
    {
      id: 'g-b', label: 'Bảng B',
      members: [
        { id: 'mem-5',  name: 'Hoàng Đức Anh',    skill: 'TB' },
        { id: 'mem-6',  name: 'Vũ Thị Lan',       skill: 'Thấp' },
        { id: 'mem-7',  name: 'Đặng Văn Hùng',    skill: 'Cao', isSeed: true },
        { id: 'mem-8',  name: 'Bùi Thị Hoa',      skill: 'TB' },
      ],
      totalExpectedMatches: 3, completedMatches: 2,
    },
    {
      id: 'g-c', label: 'Bảng C',
      members: [
        { id: 'mem-9',  name: 'Ngô Minh Tuấn',    skill: 'Cao', isSeed: true },
        { id: 'mem-10', name: 'Lý Thị Mai',        skill: 'TB' },
        { id: 'mem-11', name: 'Phan Văn Đức',      skill: 'Thấp' },
        { id: 'mem-12', name: 'Đỗ Thị Thảo',       skill: 'TB' },
      ],
      totalExpectedMatches: 3, completedMatches: 1,
    },
    {
      id: 'g-d', label: 'Bảng D',
      members: [
        { id: 'mem-13', name: 'Trương Minh Khoa',  skill: 'Cao', isSeed: true },
        { id: 'mem-14', name: 'Hồ Thị Thu',        skill: 'Thấp' },
        { id: 'mem-15', name: 'Đinh Văn Nam',      skill: 'TB' },
      ],
      totalExpectedMatches: 2, completedMatches: 1,
    },
    {
      id: 'g-e', label: 'Bảng E',
      members: [
        { id: 'mem-16', name: 'Chu Thị Linh',      skill: 'TB' },
        { id: 'mem-17', name: 'Mai Văn Phong',     skill: 'TB' },
        { id: 'mem-18', name: 'Tô Thị Hạnh',       skill: 'Thấp' },
      ],
      totalExpectedMatches: 2, completedMatches: 1,
    },
  ],
  currentRound: {
    roundNumber: 4,
    status: 'IN_PROGRESS',
    totalMatches: 9,
    completedMatches: 7,
    sitOuts: [
      { id: 'mem-15', name: 'Đinh Văn Nam', skill: 'TB' },
      { id: 'mem-18', name: 'Tô Thị Hạnh',  skill: 'Thấp' },
    ],
    matches: [
      {
        id: 'match-1', matchNumber: 1, status: 'COMPLETED', court: 'Sân 1',
        team1: { player1Id: 'mem-1',  player2Id: 'mem-5',  player1: 'Nguyễn Văn An',  player2: 'Hoàng Đức Anh' },
        team2: { player1Id: 'mem-9',  player2Id: 'mem-13', player1: 'Ngô Minh Tuấn',  player2: 'Trương Minh Khoa' },
        score1: 11, score2: 8, completedAt: '08:15',
      },
      {
        id: 'match-2', matchNumber: 2, status: 'COMPLETED', court: 'Sân 2',
        team1: { player1Id: 'mem-2',  player2Id: 'mem-7',  player1: 'Trần Thị Bình',  player2: 'Đặng Văn Hùng' },
        team2: { player1Id: 'mem-10', player2Id: 'mem-16', player1: 'Lý Thị Mai',     player2: 'Chu Thị Linh' },
        score1: 11, score2: 5, completedAt: '08:20',
      },
      {
        id: 'match-3', matchNumber: 3, status: 'COMPLETED', court: 'Sân 3',
        team1: { player1Id: 'mem-3',  player2Id: 'mem-12', player1: 'Lê Minh Cường',  player2: 'Đỗ Thị Thảo' },
        team2: { player1Id: 'mem-6',  player2Id: 'mem-14', player1: 'Vũ Thị Lan',     player2: 'Hồ Thị Thu' },
        score1: 8, score2: 11, completedAt: '08:35',
      },
      {
        id: 'match-4', matchNumber: 4, status: 'COMPLETED', court: 'Sân 1',
        team1: { player1Id: 'mem-4',  player2Id: 'mem-8',  player1: 'Phạm Thu Dung',  player2: 'Bùi Thị Hoa' },
        team2: { player1Id: 'mem-11', player2Id: 'mem-17', player1: 'Phan Văn Đức',   player2: 'Mai Văn Phong' },
        score1: 11, score2: 3, completedAt: '08:40',
      },
      {
        id: 'match-5', matchNumber: 5, status: 'COMPLETED', court: 'Sân 2',
        team1: { player1Id: 'mem-1',  player2Id: 'mem-10', player1: 'Nguyễn Văn An',  player2: 'Lý Thị Mai' },
        team2: { player1Id: 'mem-7',  player2Id: 'mem-14', player1: 'Đặng Văn Hùng',  player2: 'Hồ Thị Thu' },
        score1: 11, score2: 7, completedAt: '09:00',
      },
      {
        id: 'match-6', matchNumber: 6, status: 'COMPLETED', court: 'Sân 3',
        team1: { player1Id: 'mem-5',  player2Id: 'mem-16', player1: 'Hoàng Đức Anh',  player2: 'Chu Thị Linh' },
        team2: { player1Id: 'mem-2',  player2Id: 'mem-12', player1: 'Trần Thị Bình',  player2: 'Đỗ Thị Thảo' },
        score1: 6, score2: 11, completedAt: '09:10',
      },
      {
        id: 'match-7', matchNumber: 7, status: 'COMPLETED', court: 'Sân 1',
        team1: { player1Id: 'mem-9',  player2Id: 'mem-17', player1: 'Ngô Minh Tuấn',  player2: 'Mai Văn Phong' },
        team2: { player1Id: 'mem-13', player2Id: 'mem-3',  player1: 'Trương Minh Khoa', player2: 'Lê Minh Cường' },
        score1: 11, score2: 4, completedAt: '09:20',
      },
      {
        id: 'match-8', matchNumber: 8, status: 'PENDING_RESULT', court: 'Sân 2',
        team1: { player1Id: 'mem-4',  player2Id: 'mem-11', player1: 'Phạm Thu Dung',  player2: 'Phan Văn Đức' },
        team2: { player1Id: 'mem-6',  player2Id: 'mem-8',  player1: 'Vũ Thị Lan',     player2: 'Bùi Thị Hoa' },
      },
      {
        id: 'match-9', matchNumber: 9, status: 'UPCOMING', court: 'Sân 3',
        team1: { player1Id: 'mem-13', player2Id: 'mem-16', player1: 'Trương Minh Khoa', player2: 'Chu Thị Linh' },
        team2: { player1Id: 'mem-5',  player2Id: 'mem-2',  player1: 'Hoàng Đức Anh',  player2: 'Trần Thị Bình' },
      },
    ],
  },
  rankings: [
    { rank: 1,  memberId: 'mem-1',  name: 'Nguyễn Văn An',    group: 'A', played: 6, won: 5, drawn: 0, lost: 1, pointsFor: 63, pointsAgainst: 45, diff: 18,  points: 15, winRate: 83, sitOutCount: 0 },
    { rank: 2,  memberId: 'mem-7',  name: 'Đặng Văn Hùng',    group: 'B', played: 6, won: 5, drawn: 0, lost: 1, pointsFor: 60, pointsAgainst: 47, diff: 13,  points: 15, winRate: 83, sitOutCount: 0 },
    { rank: 3,  memberId: 'mem-9',  name: 'Ngô Minh Tuấn',    group: 'C', played: 5, won: 4, drawn: 0, lost: 1, pointsFor: 55, pointsAgainst: 37, diff: 18,  points: 12, winRate: 80, sitOutCount: 1 },
    { rank: 4,  memberId: 'mem-13', name: 'Trương Minh Khoa', group: 'D', played: 5, won: 4, drawn: 0, lost: 1, pointsFor: 52, pointsAgainst: 40, diff: 12,  points: 12, winRate: 80, sitOutCount: 0 },
    { rank: 5,  memberId: 'mem-2',  name: 'Trần Thị Bình',    group: 'A', played: 6, won: 4, drawn: 0, lost: 2, pointsFor: 58, pointsAgainst: 48, diff: 10,  points: 12, winRate: 67, sitOutCount: 0 },
    { rank: 6,  memberId: 'mem-5',  name: 'Hoàng Đức Anh',    group: 'B', played: 6, won: 3, drawn: 0, lost: 3, pointsFor: 50, pointsAgainst: 52, diff: -2,  points: 9,  winRate: 50, sitOutCount: 0 },
    { rank: 7,  memberId: 'mem-3',  name: 'Lê Minh Cường',    group: 'A', played: 5, won: 3, drawn: 0, lost: 2, pointsFor: 48, pointsAgainst: 45, diff: 3,   points: 9,  winRate: 60, sitOutCount: 1 },
    { rank: 8,  memberId: 'mem-12', name: 'Đỗ Thị Thảo',      group: 'C', played: 5, won: 3, drawn: 0, lost: 2, pointsFor: 47, pointsAgainst: 44, diff: 3,   points: 9,  winRate: 60, sitOutCount: 1 },
    { rank: 9,  memberId: 'mem-10', name: 'Lý Thị Mai',        group: 'C', played: 5, won: 2, drawn: 0, lost: 3, pointsFor: 44, pointsAgainst: 50, diff: -6,  points: 6,  winRate: 40, sitOutCount: 1 },
    { rank: 10, memberId: 'mem-16', name: 'Chu Thị Linh',      group: 'E', played: 5, won: 2, drawn: 0, lost: 3, pointsFor: 43, pointsAgainst: 51, diff: -8,  points: 6,  winRate: 40, sitOutCount: 1 },
    { rank: 11, memberId: 'mem-4',  name: 'Phạm Thu Dung',     group: 'A', played: 4, won: 2, drawn: 0, lost: 2, pointsFor: 40, pointsAgainst: 38, diff: 2,   points: 6,  winRate: 50, sitOutCount: 2 },
    { rank: 12, memberId: 'mem-8',  name: 'Bùi Thị Hoa',       group: 'B', played: 4, won: 2, drawn: 0, lost: 2, pointsFor: 38, pointsAgainst: 40, diff: -2,  points: 6,  winRate: 50, sitOutCount: 2 },
    { rank: 13, memberId: 'mem-17', name: 'Mai Văn Phong',     group: 'E', played: 4, won: 1, drawn: 0, lost: 3, pointsFor: 35, pointsAgainst: 48, diff: -13, points: 3,  winRate: 25, sitOutCount: 2 },
    { rank: 14, memberId: 'mem-6',  name: 'Vũ Thị Lan',        group: 'B', played: 4, won: 1, drawn: 0, lost: 3, pointsFor: 33, pointsAgainst: 47, diff: -14, points: 3,  winRate: 25, sitOutCount: 2 },
    { rank: 15, memberId: 'mem-11', name: 'Phan Văn Đức',      group: 'C', played: 4, won: 1, drawn: 0, lost: 3, pointsFor: 32, pointsAgainst: 48, diff: -16, points: 3,  winRate: 25, sitOutCount: 2 },
    { rank: 16, memberId: 'mem-14', name: 'Hồ Thị Thu',        group: 'D', played: 4, won: 1, drawn: 0, lost: 3, pointsFor: 34, pointsAgainst: 50, diff: -16, points: 3,  winRate: 25, sitOutCount: 2 },
    { rank: 17, memberId: 'mem-15', name: 'Đinh Văn Nam',      group: 'D', played: 3, won: 0, drawn: 0, lost: 3, pointsFor: 25, pointsAgainst: 44, diff: -19, points: 0,  winRate: 0,  sitOutCount: 3 },
    { rank: 18, memberId: 'mem-18', name: 'Tô Thị Hạnh',       group: 'E', played: 3, won: 0, drawn: 0, lost: 3, pointsFor: 22, pointsAgainst: 44, diff: -22, points: 0,  winRate: 0,  sitOutCount: 3 },
  ],
  quickStats: {
    topScorer:  { name: 'Nguyễn Văn An',  points: 15 },
    bestDiff:   { name: 'Ngô Minh Tuấn',  diff: 18 },
    topWinRate: { name: 'Nguyễn Văn An',  rate: 83 },
    mostPlayed: { name: 'Trần Thị Bình',  count: 6 },
    mostSitOut: { name: 'Đinh Văn Nam',   count: 3 },
  },
  alerts: [
    {
      id: 'a-1', level: 'HIGH',
      title: 'Trận #8 chưa có kết quả',
      description: 'Phạm Thu Dung & Phan Văn Đức vs Vũ Thị Lan & Bùi Thị Hoa vẫn chờ nhập điểm.',
      actionLabel: 'Nhập ngay',
    },
    {
      id: 'a-2', level: 'MED',
      title: 'Đinh Văn Nam ngồi nghỉ 3 lần',
      description: 'Thành viên này đã ngồi nghỉ 3 vòng liên tiếp – vượt ngưỡng công bằng.',
      actionLabel: 'Điều chỉnh',
    },
    {
      id: 'a-3', level: 'LOW',
      title: 'Bảng D chỉ còn 3 người',
      description: 'Bảng D có ít thành viên hơn, cân nhắc cân bằng lại.',
      actionLabel: 'Xem xét',
    },
  ],
  recentActivities: [
    { id: 'act-1', text: 'Ngô Minh Tuấn & Mai Văn Phong thắng 11-4',          time: '5 phút trước',  type: 'score' },
    { id: 'act-2', text: 'Vòng 4 bắt đầu – 9 trận, 2 người ngồi nghỉ',        time: '12 phút trước', type: 'round' },
    { id: 'act-3', text: 'Nguyễn Văn An & Lý Thị Mai thắng 11-7',             time: '18 phút trước', type: 'score' },
    { id: 'act-4', text: 'Trần Thị Bình & Đỗ Thị Thảo thắng 11-6',           time: '25 phút trước', type: 'score' },
    { id: 'act-5', text: 'Vòng 3 hoàn thành – cập nhật bảng xếp hạng',        time: '32 phút trước', type: 'round' },
  ],
}

export default mockTournamentDashboard
