export type MinigameStatus = 'DRAFT' | 'GROUPED' | 'PAIRED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type MatchStatus = 'PENDING' | 'PLAYING' | 'COMPLETED' | 'CANCELLED'

export type MinigameFormatType = 'RANDOM_DOUBLES' | 'GROUP_STAGE' | 'FIXED_DOUBLES_ROUND_ROBIN' | 'SINGLES' | 'KNOCKOUT'
export type PairingMode = 'RANDOM_PAIRING' | 'BALANCED_SKILL_PAIRING' | 'MANUAL_PAIRING'
export type DrawMode = 'RANDOM' | 'FAIR_ROTATION' | 'BALANCED_SKILL' | 'SMART_DRAW' | 'GENDER_BALANCED'
export type GenderBalanceMode = 'OFF' | 'PREFERRED' | 'REQUIRED'

export interface MiniGame {
  id: string
  clubId: string
  name: string
  description?: string
  startDate: string
  endDate?: string
  status: MinigameStatus
  groupSize: number
  allowDraw: boolean
  winPoints: number
  drawPoints: number
  lossPoints: number
  notes?: string
  createdBy: string
  createdAt: string
  formatType: MinigameFormatType
  /** Đa bộ môn: PICKLEBALL (mặc định) | FOOTBALL | GOLF... — quyết định dashboard hiển thị. */
  sport?: string
  /** HEAD_TO_HEAD (đối kháng theo trận) | LEADERBOARD (bảng điểm). */
  scoringModel?: string
  drawMode: DrawMode
  pairingMode?: PairingMode
  /** FIXED_DOUBLES_ROUND_ROBIN: đã sinh lịch lượt đi & lượt về (double round-robin). */
  doubleRoundRobin?: boolean
}

/** Player key của khách mời dùng prefix `guest-`. Dùng chung để nhận diện + hiển thị badge "Khách". */
export function isGuestId(memberId?: string | null): boolean {
  return !!memberId && memberId.startsWith('guest-')
}

const KNOWN_MINIGAME_STATUS: MinigameStatus[] = [
  'DRAFT', 'GROUPED', 'PAIRED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
]

/**
 * Chuẩn hoá status minigame từ backend về enum FE.
 * Backend (Prisma MinigameStatus) = DRAFT | ACTIVE | COMPLETED | CANCELLED — KHÔNG có IN_PROGRESS;
 * FE dùng IN_PROGRESS cho "đang diễn ra". Nếu KHÔNG map, status 'ACTIVE' lọt vào các Record<status>
 * → undefined → StatusBadge crash (màn trắng) + đếm "đang diễn ra" sai. Map ACTIVE → IN_PROGRESS,
 * status lạ → DRAFT (an toàn, không bao giờ trả undefined).
 */
export function normalizeMinigameStatus(raw?: string | null): MinigameStatus {
  if (!raw) return 'DRAFT'
  if (raw === 'ACTIVE') return 'IN_PROGRESS'
  return KNOWN_MINIGAME_STATUS.includes(raw as MinigameStatus)
    ? (raw as MinigameStatus)
    : 'DRAFT'
}

/**
 * Suy ngày hiển thị "Thời gian" của giải, ƯU TIÊN NGÀY THI ĐẤU THỰC TẾ.
 * start: firstPlayedAt (ngày đấu trận đầu) → startedAt → scheduledAt → createdAt (luôn có).
 * end:   lastPlayedAt (ngày đấu trận cuối) → endedAt; chỉ hiện khi khác ngày bắt đầu.
 * Model không có startDate/endDate; firstPlayedAt/lastPlayedAt do backend tính (min/max playedAt
 * của trận COMPLETED). Trận nhập điểm mới có playedAt → phản ánh đúng lúc thực đấu.
 */
export function deriveMinigameDates(m: {
  firstPlayedAt?: string | null
  lastPlayedAt?: string | null
  startedAt?: string | null
  scheduledAt?: string | null
  endedAt?: string | null
  createdAt?: string | null
}): { startDate: string; endDate?: string } {
  const d = (v?: string | null): string => (v ? String(v).slice(0, 10) : '')
  const startDate =
    d(m.firstPlayedAt) || d(m.startedAt) || d(m.scheduledAt) || d(m.createdAt) || ''
  const endRaw = d(m.lastPlayedAt) || d(m.endedAt) || ''
  return { startDate, endDate: endRaw && endRaw !== startDate ? endRaw : undefined }
}

export interface MiniGameParticipant {
  id: string
  minigameId: string
  /**
   * Player key thống nhất cho toàn bộ draw/team/match/score/standings (store dùng memberId
   * làm khóa người chơi). Member thật: id thật của member. Khách mời: `guest-<uuid>` (prefix
   * `guest-`), KHÔNG phải member trong DB → không validate CLB, không ghi bảng members.
   */
  memberId: string
  memberName: string
  seedLevel?: number
  skillLevel?: number
  status: 'ACTIVE' | 'WITHDRAWN'
  /** true = khách mời (không thuộc CLB). Hiển thị badge "Khách". */
  isGuest?: boolean
}

export interface MiniGameGroup {
  id: string
  minigameId: string
  groupName: string
  groupOrder: number
  status: 'ACTIVE' | 'LOCKED' | 'COMPLETED'
  memberIds: string[]
}

export interface MiniGameMatch {
  id: string
  minigameId: string
  groupId: string
  player1Id: string
  player1Name: string
  player2Id: string
  player2Name: string
  player1Score?: number
  player2Score?: number
  winnerId?: string
  matchDate?: string
  status: MatchStatus
  round?: number
  notes?: string
}

export interface MiniGameStanding {
  memberId: string
  memberName: string
  groupId: string
  groupName: string
  played: number
  won: number
  drawn: number
  lost: number
  pointsFor: number
  pointsAgainst: number
  pointDifference: number
  rankingPoints: number
  rank: number
}

export interface MinigameDashboard {
  kpi: {
    totalParticipants: number
    totalGroups: number
    totalMatches: number
    completedMatches: number
    pendingMatches: number
    completionRate: number
    leader: { name: string; points: number } | null
    bestDifference: { name: string; diff: number } | null
    matchesNeedingScore: number
  }
  groups: Array<{
    group: MiniGameGroup
    standings: MiniGameStanding[]
  }>
}

// ── Random Doubles (v2) ─────────────────────────────────────────────────────

export interface MiniGameRound {
  id: string
  minigameId: string
  roundNumber: number
  drawMode: DrawMode
  totalPlayers: number
  totalMatches: number
  sitOutCount: number
  status: 'DRAFT' | 'ACTIVE' | 'LOCKED' | 'COMPLETED'
  createdAt: string
  genderBalanceMode?: GenderBalanceMode
}

export interface MiniGameRoundSitOut {
  id: string
  roundId: string
  minigameId: string
  memberId: string
  memberName: string
  reason?: string
}

export interface DoublesPlayer {
  memberId: string
  memberName: string
  skillLevel?: number
  gender?: 'MALE' | 'FEMALE' | 'UNKNOWN'
}

export interface DrawRoundOptions {
  drawMode?: DrawMode
  avoidRepeatPartners?: boolean
  avoidRepeatOpponents?: boolean
  prioritizeSitOuts?: boolean
  memberIds?: string[]
  genderBalanceMode?: GenderBalanceMode
  courtCount?: number
  maxMatches?: number | null
  overrideMatches?: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[]
  overrideSitOuts?: DoublesPlayer[]
}

export interface DrawRoundPreviewMatch {
  matchNumber: number
  team1: DoublesPlayer[]
  team2: DoublesPlayer[]
  skillDiff: number
  isGenderBalanced: boolean
}

export interface DrawRoundPreview {
  roundNumber: number
  drawMode: DrawMode
  fairnessScore: number
  totalPlayers: number
  totalMatches: number
  sitOutCount: number
  matches: DrawRoundPreviewMatch[]
  sitOuts: DoublesPlayer[]
  warnings: string[]
  genderBalanceMode?: GenderBalanceMode
  genderRequirementMet: boolean
}

export interface MiniGameDoublesMatch {
  id: string
  minigameId: string
  roundId: string
  matchNumber: number
  team1: DoublesPlayer[]
  team2: DoublesPlayer[]
  team1Score?: number
  team2Score?: number
  winningTeam?: 1 | 2
  status: MatchStatus
  matchDate?: string
  note?: string
}

export interface MiniGamePersonalStanding {
  memberId: string
  memberName: string
  played: number
  won: number
  drawn: number
  lost: number
  pointsFor: number
  pointsAgainst: number
  pointDifference: number
  rankingPoints: number
  winRate: number
  sitOutCount: number
  rank: number
}

export interface MiniGamePairStat {
  memberAId: string
  memberAName: string
  memberBId: string
  memberBName: string
  pairedCount: number
  wonTogether: number
  lostTogether: number
  drawnTogether: number
  winRateTogether: number
}

export interface MiniGameOpponentStat {
  memberAId: string
  memberAName: string
  memberBId: string
  memberBName: string
  opponentCount: number
  memberAWins: number
  memberBWins: number
  draws: number
}

export interface FairnessAlert {
  level: 'HIGH' | 'MED' | 'LOW'
  message: string
  actionLabel: string
}

export interface TournamentDashboardData {
  kpi: {
    totalParticipants: number
    totalRounds: number
    totalMatches: number
    completedMatches: number
    completionRate: number
    pendingMatches: number
    currentSitOuts: number
    leader: { name: string; points: number } | null
    bestPair: { names: string; wins: number } | null
    bestWinRate: { name: string; rate: number } | null
    mostSitOuts: { name: string; count: number } | null
  }
  currentRound: MiniGameRound | null
  currentRoundMatches: MiniGameDoublesMatch[]
  currentRoundSitOuts: MiniGameRoundSitOut[]
  standings: MiniGamePersonalStanding[]
  pairStats: MiniGamePairStat[]
  alerts: FairnessAlert[]
  roundHistory: MiniGameRound[]
}

// ── Fixed Doubles Round-Robin ────────────────────────────────────────────────

export interface MiniGameTeam {
  id: string
  minigameId: string
  name: string
  player1: DoublesPlayer
  player2: DoublesPlayer
  seedLevel?: number
}

export interface MiniGameTeamMatch {
  id: string
  minigameId: string
  round: number
  /** Lượt đấu: 1 = lượt đi, 2 = lượt về (double round-robin). Mặc định 1 (đọc kèm `?? 1`). */
  leg?: number
  matchNumber: number
  team1Id: string
  team2Id: string
  team1Score?: number
  team2Score?: number
  winningTeamId?: string
  status: MatchStatus
  matchDate?: string
  note?: string
}

export interface MiniGameTeamStanding {
  teamId: string
  teamName: string
  player1Name: string
  player2Name: string
  played: number
  won: number
  drawn: number
  lost: number
  pointsFor: number
  pointsAgainst: number
  pointDifference: number
  rankingPoints: number
  winRate: number
  rank: number
}

export interface FixedDoublesDashboardData {
  kpi: {
    totalTeams: number
    totalMatches: number
    completedMatches: number
    pendingMatches: number
    completionRate: number
    leader: { teamName: string; points: number } | null
    totalRounds: number
  }
  teams: MiniGameTeam[]
  standings: MiniGameTeamStanding[]
  schedule: MiniGameTeamMatch[]
}
