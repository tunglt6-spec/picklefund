export type MinigameStatus = 'DRAFT' | 'GROUPED' | 'PAIRED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type MatchStatus = 'PENDING' | 'PLAYING' | 'COMPLETED' | 'CANCELLED'

export type MinigameFormatType = 'RANDOM_DOUBLES' | 'GROUP_STAGE' | 'FIXED_DOUBLES_ROUND_ROBIN'
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
  drawMode: DrawMode
  pairingMode?: PairingMode
}

export interface MiniGameParticipant {
  id: string
  minigameId: string
  memberId: string
  memberName: string
  seedLevel?: number
  skillLevel?: number
  status: 'ACTIVE' | 'WITHDRAWN'
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
