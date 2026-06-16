import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  MiniGame, MiniGameParticipant, MiniGameGroup, MiniGameMatch,
  MiniGameStanding, MinigameDashboard,
  DrawMode, DoublesPlayer, MiniGameRound, MiniGameRoundSitOut, MiniGameDoublesMatch,
  MiniGamePersonalStanding, MiniGamePairStat, MiniGameOpponentStat, FairnessAlert,
  TournamentDashboardData, DrawRoundPreview, DrawRoundOptions, GenderBalanceMode,
  MiniGameTeam, MiniGameTeamMatch, MiniGameTeamStanding, FixedDoublesDashboardData,
} from '../types/minigame'
import toast from 'react-hot-toast'

// ── Mock data ──────────────────────────────────────────────────────────────────

const MEMBERS = [
  { id: 'mem-1',  name: 'Nguyễn Văn An' },
  { id: 'mem-2',  name: 'Trần Thị Bình' },
  { id: 'mem-3',  name: 'Lê Minh Cường' },
  { id: 'mem-4',  name: 'Phạm Thu Dung' },
  { id: 'mem-5',  name: 'Hoàng Đức Anh' },
  { id: 'mem-6',  name: 'Vũ Thị Lan' },
  { id: 'mem-7',  name: 'Đặng Văn Hùng' },
  { id: 'mem-8',  name: 'Bùi Thị Hoa' },
  { id: 'mem-9',  name: 'Ngô Minh Tuấn' },
  { id: 'mem-10', name: 'Lý Thị Mai' },
  { id: 'mem-11', name: 'Phan Văn Đức' },
  { id: 'mem-12', name: 'Đỗ Thị Thảo' },
  { id: 'mem-13', name: 'Trương Minh Khoa' },
  { id: 'mem-14', name: 'Hồ Thị Thu' },
  { id: 'mem-15', name: 'Đinh Văn Nam' },
  { id: 'mem-16', name: 'Chu Thị Linh' },
  { id: 'mem-17', name: 'Mai Văn Phong' },
  { id: 'mem-18', name: 'Tô Thị Hạnh' },
]

const MOCK_MINIGAMES: MiniGame[] = [
  {
    id: 'mg-1',
    clubId: 'club-1',
    name: 'Minigame Q2/2026',
    description: 'Giải đấu vòng bảng 1v1 Quý 2/2026',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    status: 'IN_PROGRESS',
    groupSize: 4,
    allowDraw: false,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    notes: 'Vòng bảng, mỗi bảng 4 người đấu vòng tròn',
    createdBy: 'user-1',
    createdAt: '2026-03-25T08:00:00Z',
    formatType: 'GROUP_STAGE',
    drawMode: 'RANDOM',
  },
  {
    id: 'mg-2',
    clubId: 'club-1',
    name: 'Minigame Q1/2026',
    description: 'Giải đấu vòng bảng 1v1 Quý 1/2026',
    startDate: '2026-01-05',
    endDate: '2026-03-20',
    status: 'COMPLETED',
    groupSize: 4,
    allowDraw: false,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    notes: 'Vòng bảng, mỗi bảng 4 người đấu vòng tròn',
    createdBy: 'user-1',
    createdAt: '2025-12-20T08:00:00Z',
    formatType: 'GROUP_STAGE',
    drawMode: 'RANDOM',
  },
  {
    id: 'mg-4',
    clubId: 'club-1',
    name: 'Minigame Đôi Cố Định T6/2026',
    description: 'Giải đấu đôi cố định vòng tròn Tháng 6/2026',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    status: 'IN_PROGRESS',
    groupSize: 4,
    allowDraw: false,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    notes: 'Đôi cố định, đấu vòng tròn toàn phần',
    createdBy: 'user-1',
    createdAt: '2026-05-28T08:00:00Z',
    formatType: 'FIXED_DOUBLES_ROUND_ROBIN',
    drawMode: 'BALANCED_SKILL',
    pairingMode: 'BALANCED_SKILL_PAIRING',
  },
  {
    id: 'mg-3',
    clubId: 'club-1',
    name: 'Minigame Đánh Đôi T6/2026',
    description: 'Giải đấu đánh đôi ngẫu nhiên Tháng 6/2026',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    status: 'IN_PROGRESS',
    groupSize: 4,
    allowDraw: false,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    notes: 'Bốc thăm công bằng theo lượt',
    createdBy: 'user-1',
    createdAt: '2026-05-28T08:00:00Z',
    formatType: 'RANDOM_DOUBLES',
    drawMode: 'FAIR_ROTATION',
  },
]

const SKILL_LEVELS: Record<string, number> = {
  'mem-1': 78, 'mem-2': 55, 'mem-3': 62, 'mem-4': 48,
  'mem-5': 85, 'mem-6': 50, 'mem-7': 70, 'mem-8': 44,
  'mem-9': 66, 'mem-10': 59, 'mem-11': 72, 'mem-12': 45,
  'mem-13': 68, 'mem-14': 53, 'mem-15': 77, 'mem-16': 61,
  'mem-17': 80, 'mem-18': 57,
}

const MOCK_PARTICIPANTS_MG3: MiniGameParticipant[] = MEMBERS.map((m, i) => ({
  id: `part-mg3-${i + 1}`,
  minigameId: 'mg-3',
  memberId: m.id,
  memberName: m.name,
  skillLevel: SKILL_LEVELS[m.id],
  status: 'ACTIVE',
}))

// mg-4: 8 participants for Fixed Doubles Round Robin
const MG4_MEMBER_IDS = ['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5', 'mem-6', 'mem-7', 'mem-8']
const MOCK_PARTICIPANTS_MG4: MiniGameParticipant[] = MG4_MEMBER_IDS.map((id, i) => {
  const m = MEMBERS.find(x => x.id === id)!
  return { id: `part-mg4-${i + 1}`, minigameId: 'mg-4', memberId: m.id, memberName: m.name, skillLevel: SKILL_LEVELS[m.id], status: 'ACTIVE' }
})

function dp4(memberId: string): DoublesPlayer {
  const m = MEMBERS.find(x => x.id === memberId)!
  return { memberId: m.id, memberName: m.name, skillLevel: SKILL_LEVELS[m.id] }
}

// 4 teams: balanced by skill
const MOCK_TEAMS: MiniGameTeam[] = [
  { id: 'tm-1', minigameId: 'mg-4', name: 'Đội 1', player1: dp4('mem-1'), player2: dp4('mem-4'), seedLevel: 1 }, // 78+48=126
  { id: 'tm-2', minigameId: 'mg-4', name: 'Đội 2', player1: dp4('mem-5'), player2: dp4('mem-8'), seedLevel: 2 }, // 85+44=129
  { id: 'tm-3', minigameId: 'mg-4', name: 'Đội 3', player1: dp4('mem-3'), player2: dp4('mem-6'), seedLevel: 3 }, // 62+50=112
  { id: 'tm-4', minigameId: 'mg-4', name: 'Đội 4', player1: dp4('mem-7'), player2: dp4('mem-2'), seedLevel: 4 }, // 70+55=125
]

// Round-robin 4 teams: 6 matches across 3 rounds (Berger circle method)
const MOCK_TEAM_MATCHES: MiniGameTeamMatch[] = [
  // Round 1
  { id: 'tm-m-1', minigameId: 'mg-4', round: 1, matchNumber: 1, team1Id: 'tm-1', team2Id: 'tm-4', team1Score: 21, team2Score: 17, winningTeamId: 'tm-1', status: 'COMPLETED', matchDate: '2026-06-01' },
  { id: 'tm-m-2', minigameId: 'mg-4', round: 1, matchNumber: 2, team1Id: 'tm-2', team2Id: 'tm-3', team1Score: 18, team2Score: 21, winningTeamId: 'tm-3', status: 'COMPLETED', matchDate: '2026-06-01' },
  // Round 2
  { id: 'tm-m-3', minigameId: 'mg-4', round: 2, matchNumber: 1, team1Id: 'tm-1', team2Id: 'tm-3', team1Score: 21, team2Score: 14, winningTeamId: 'tm-1', status: 'COMPLETED', matchDate: '2026-06-08' },
  { id: 'tm-m-4', minigameId: 'mg-4', round: 2, matchNumber: 2, team1Id: 'tm-4', team2Id: 'tm-2', team1Score: 19, team2Score: 21, winningTeamId: 'tm-2', status: 'COMPLETED', matchDate: '2026-06-08' },
  // Round 3
  { id: 'tm-m-5', minigameId: 'mg-4', round: 3, matchNumber: 1, team1Id: 'tm-1', team2Id: 'tm-2', status: 'PENDING' },
  { id: 'tm-m-6', minigameId: 'mg-4', round: 3, matchNumber: 2, team1Id: 'tm-3', team2Id: 'tm-4', status: 'PENDING' },
]

// Round-robin pairs for 4 players: (0,1)(0,2)(0,3)(1,2)(1,3)(2,3)
function roundRobinPairs(ids: string[]): [number, number][] {
  const pairs: [number, number][] = []
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++)
      pairs.push([i, j])
  return pairs
}

// ── Seed data for mg-1 / mg-2 (Group Stage) ─────────────────────────────────────

const GROUP_STAGE_MEMBER_IDS_MG1 = ['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5', 'mem-6', 'mem-7', 'mem-8']
const GROUP_STAGE_MEMBER_IDS_MG2 = ['mem-9', 'mem-10', 'mem-11', 'mem-12', 'mem-13', 'mem-14', 'mem-15', 'mem-16']

function buildGroupStageParticipants(minigameId: string, memberIds: string[]): MiniGameParticipant[] {
  return memberIds.map((id, i) => {
    const m = MEMBERS.find(x => x.id === id)!
    return {
      id: `part-${minigameId}-${i + 1}`,
      minigameId,
      memberId: m.id,
      memberName: m.name,
      skillLevel: SKILL_LEVELS[m.id],
      status: 'ACTIVE',
    }
  })
}

const MOCK_PARTICIPANTS_MG1: MiniGameParticipant[] = buildGroupStageParticipants('mg-1', GROUP_STAGE_MEMBER_IDS_MG1)
const MOCK_PARTICIPANTS_MG2: MiniGameParticipant[] = buildGroupStageParticipants('mg-2', GROUP_STAGE_MEMBER_IDS_MG2)

function buildGroupStageGroups(minigameId: string, memberIds: string[]): MiniGameGroup[] {
  return [
    { id: `grp-${minigameId}-A`, minigameId, groupName: 'Bảng A', groupOrder: 0, status: 'LOCKED', memberIds: memberIds.slice(0, 4) },
    { id: `grp-${minigameId}-B`, minigameId, groupName: 'Bảng B', groupOrder: 1, status: 'LOCKED', memberIds: memberIds.slice(4, 8) },
  ]
}

const MOCK_GROUPS_MG1: MiniGameGroup[] = buildGroupStageGroups('mg-1', GROUP_STAGE_MEMBER_IDS_MG1)
const MOCK_GROUPS_MG2: MiniGameGroup[] = buildGroupStageGroups('mg-2', GROUP_STAGE_MEMBER_IDS_MG2)

function buildGroupStageMatches(
  minigameId: string,
  groups: MiniGameGroup[],
  participants: MiniGameParticipant[],
  allCompleted: boolean,
  matchDate: string,
): MiniGameMatch[] {
  const matches: MiniGameMatch[] = []
  let ctr = 1
  groups.forEach(grp => {
    roundRobinPairs(grp.memberIds).forEach(([i, j], idx) => {
      const p1 = participants.find(p => p.memberId === grp.memberIds[i])!
      const p2 = participants.find(p => p.memberId === grp.memberIds[j])!
      const isCompleted = allCompleted || idx < 4
      const p1Score = isCompleted ? 15 + ((ctr * 3) % 7) : undefined
      const p2Score = isCompleted ? 15 + ((ctr * 5) % 7) : undefined
      matches.push({
        id: `match-${minigameId}-${ctr}`,
        minigameId,
        groupId: grp.id,
        player1Id: p1.memberId,
        player1Name: p1.memberName,
        player2Id: p2.memberId,
        player2Name: p2.memberName,
        player1Score: p1Score,
        player2Score: p2Score,
        winnerId: isCompleted ? ((p1Score! > p2Score!) ? p1.memberId : (p2Score! > p1Score!) ? p2.memberId : undefined) : undefined,
        matchDate: isCompleted ? matchDate : undefined,
        status: isCompleted ? 'COMPLETED' : 'PENDING',
        round: 1,
      })
      ctr++
    })
  })
  return matches
}

const MOCK_MATCHES_MG1: MiniGameMatch[] = buildGroupStageMatches('mg-1', MOCK_GROUPS_MG1, MOCK_PARTICIPANTS_MG1, false, '2026-05-10')
const MOCK_MATCHES_MG2: MiniGameMatch[] = buildGroupStageMatches('mg-2', MOCK_GROUPS_MG2, MOCK_PARTICIPANTS_MG2, true, '2026-03-15')

// ── Random Doubles algorithms ───────────────────────────────────────────────────

function inferGenderFromName(name: string): 'MALE' | 'FEMALE' | 'UNKNOWN' {
  if (name.includes(' Thị ')) return 'FEMALE'
  return 'MALE'
}

function toDoublesPlayer(p: MiniGameParticipant): DoublesPlayer {
  return { memberId: p.memberId, memberName: p.memberName, skillLevel: p.skillLevel, gender: inferGenderFromName(p.memberName) }
}

const SPLITS: [number, number, number, number][] = [
  [0, 1, 2, 3], // team1=[0,1] team2=[2,3]
  [0, 2, 1, 3], // team1=[0,2] team2=[1,3]
  [0, 3, 1, 2], // team1=[0,3] team2=[1,2]
]

function splitToTeams(group: DoublesPlayer[], split: [number, number, number, number]): { team1: DoublesPlayer[]; team2: DoublesPlayer[] } {
  const [a, b, c, d] = split
  return { team1: [group[a], group[b]], team2: [group[c], group[d]] }
}

function drawRandomAlgo(participants: DoublesPlayer[]): { matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[]; sitOuts: DoublesPlayer[] } {
  const shuffled = [...participants].sort(() => Math.random() - 0.5)
  const matchCount = Math.floor(shuffled.length / 4)
  const playing = shuffled.slice(0, matchCount * 4)
  const sitOuts = shuffled.slice(matchCount * 4)
  const matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[] = []
  for (let i = 0; i < matchCount; i++) {
    const group = playing.slice(i * 4, i * 4 + 4)
    const split = SPLITS[Math.floor(Math.random() * 3)]
    matches.push(splitToTeams(group, split))
  }
  return { matches, sitOuts }
}

interface FairParticipantInfo {
  player: DoublesPlayer
  played: number
  sitOutCount: number
  lastPlayedAt: number
}

function bestSplitByRepeatPenalty(
  group: DoublesPlayer[],
  pairStats: MiniGamePairStat[],
  opponentStats: MiniGameOpponentStat[],
): [number, number, number, number] {
  const pairKey = (a: string, b: string) => [a, b].sort().join('|')
  const pairedCountOf = (a: string, b: string) => {
    const k = pairKey(a, b)
    const found = pairStats.find(p => pairKey(p.memberAId, p.memberBId) === k)
    return found?.pairedCount ?? 0
  }
  const opponentCountOf = (a: string, b: string) => {
    const k = pairKey(a, b)
    const found = opponentStats.find(p => pairKey(p.memberAId, p.memberBId) === k)
    return found?.opponentCount ?? 0
  }

  let best = SPLITS[0]
  let bestPenalty = Infinity
  for (const split of SPLITS) {
    const { team1, team2 } = splitToTeams(group, split)
    const pairPenalty = pairedCountOf(team1[0].memberId, team1[1].memberId) + pairedCountOf(team2[0].memberId, team2[1].memberId)
    const opponentPenalty =
      opponentCountOf(team1[0].memberId, team2[0].memberId) +
      opponentCountOf(team1[0].memberId, team2[1].memberId) +
      opponentCountOf(team1[1].memberId, team2[0].memberId) +
      opponentCountOf(team1[1].memberId, team2[1].memberId)
    const penalty = pairPenalty + opponentPenalty
    if (penalty < bestPenalty) { bestPenalty = penalty; best = split }
  }
  return best
}

function drawFairRotationAlgo(
  infos: FairParticipantInfo[],
  pairStats: MiniGamePairStat[],
  opponentStats: MiniGameOpponentStat[],
): { matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[]; sitOuts: DoublesPlayer[] } {
  const sorted = [...infos].sort((a, b) => {
    if (a.played !== b.played) return a.played - b.played
    if (a.sitOutCount !== b.sitOutCount) return b.sitOutCount - a.sitOutCount
    return a.lastPlayedAt - b.lastPlayedAt
  })
  const matchCount = Math.floor(sorted.length / 4)
  const playing = sorted.slice(0, matchCount * 4).map(i => i.player)
  const sitOuts = sorted.slice(matchCount * 4).map(i => i.player)
  const matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[] = []
  for (let i = 0; i < matchCount; i++) {
    const group = playing.slice(i * 4, i * 4 + 4)
    const split = bestSplitByRepeatPenalty(group, pairStats, opponentStats)
    matches.push(splitToTeams(group, split))
  }
  return { matches, sitOuts }
}

function drawBalancedSkillAlgo(participants: DoublesPlayer[]): { matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[]; sitOuts: DoublesPlayer[] } {
  const shuffled = [...participants].sort(() => Math.random() - 0.5)
  const matchCount = Math.floor(shuffled.length / 4)
  const playing = shuffled.slice(0, matchCount * 4)
  const sitOuts = shuffled.slice(matchCount * 4)
  const matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[] = []
  for (let i = 0; i < matchCount; i++) {
    const group = playing.slice(i * 4, i * 4 + 4)
    let best = SPLITS[0]
    let bestDiff = Infinity
    for (const split of SPLITS) {
      const { team1, team2 } = splitToTeams(group, split)
      const s1 = team1.reduce((sum, p) => sum + (p.skillLevel ?? 50), 0)
      const s2 = team2.reduce((sum, p) => sum + (p.skillLevel ?? 50), 0)
      const diff = Math.abs(s1 - s2)
      if (diff < bestDiff) { bestDiff = diff; best = split }
    }
    matches.push(splitToTeams(group, best))
  }
  return { matches, sitOuts }
}

function computeSmartSplitScore(
  group: DoublesPlayer[],
  split: [number, number, number, number],
  pairStats: MiniGamePairStat[],
  opponentStats: MiniGameOpponentStat[],
): number {
  const pairKey = (a: string, b: string) => [a, b].sort().join('|')
  const { team1, team2 } = splitToTeams(group, split)
  const s1 = team1.reduce((sum, p) => sum + (p.skillLevel ?? 50), 0)
  const s2 = team2.reduce((sum, p) => sum + (p.skillLevel ?? 50), 0)
  const skillScore = Math.max(0, 1 - Math.abs(s1 - s2) / 80)
  const partnerPenalty =
    (pairStats.find(p => pairKey(p.memberAId, p.memberBId) === pairKey(team1[0].memberId, team1[1].memberId))?.pairedCount ?? 0) +
    (pairStats.find(p => pairKey(p.memberAId, p.memberBId) === pairKey(team2[0].memberId, team2[1].memberId))?.pairedCount ?? 0)
  const partnerScore = Math.max(0, 1 - partnerPenalty / 10)
  const opponentPenalty =
    (opponentStats.find(o => pairKey(o.memberAId, o.memberBId) === pairKey(team1[0].memberId, team2[0].memberId))?.opponentCount ?? 0) +
    (opponentStats.find(o => pairKey(o.memberAId, o.memberBId) === pairKey(team1[0].memberId, team2[1].memberId))?.opponentCount ?? 0) +
    (opponentStats.find(o => pairKey(o.memberAId, o.memberBId) === pairKey(team1[1].memberId, team2[0].memberId))?.opponentCount ?? 0) +
    (opponentStats.find(o => pairKey(o.memberAId, o.memberBId) === pairKey(team1[1].memberId, team2[1].memberId))?.opponentCount ?? 0)
  const opponentScore = Math.max(0, 1 - opponentPenalty / 20)
  const mix1 = team1.some(p => p.gender === 'MALE') && team1.some(p => p.gender === 'FEMALE') ? 1 : 0
  const mix2 = team2.some(p => p.gender === 'MALE') && team2.some(p => p.gender === 'FEMALE') ? 1 : 0
  const genderScore = (mix1 + mix2) / 2
  return skillScore * 0.45 + partnerScore * 0.27 + opponentScore * 0.18 + genderScore * 0.10
}

function drawSmartAlgo(
  infos: FairParticipantInfo[],
  pairStats: MiniGamePairStat[],
  opponentStats: MiniGameOpponentStat[],
): { matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[]; sitOuts: DoublesPlayer[] } {
  const sorted = [...infos].sort((a, b) => {
    if (a.played !== b.played) return a.played - b.played
    if (a.sitOutCount !== b.sitOutCount) return b.sitOutCount - a.sitOutCount
    return a.lastPlayedAt - b.lastPlayedAt
  })
  const matchCount = Math.floor(sorted.length / 4)
  const playing = sorted.slice(0, matchCount * 4).map(i => i.player)
  const sitOuts = sorted.slice(matchCount * 4).map(i => i.player)
  const matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[] = []
  for (let i = 0; i < matchCount; i++) {
    const group = playing.slice(i * 4, i * 4 + 4)
    let best = SPLITS[0]; let bestScore = -Infinity
    for (const split of SPLITS) {
      const score = computeSmartSplitScore(group, split, pairStats, opponentStats)
      if (score > bestScore) { bestScore = score; best = split }
    }
    matches.push(splitToTeams(group, best))
  }
  return { matches, sitOuts }
}

function drawGenderBalancedAlgo(
  infos: FairParticipantInfo[],
  pairStats: MiniGamePairStat[],
  opponentStats: MiniGameOpponentStat[],
): { matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[]; sitOuts: DoublesPlayer[] } {
  const sorted = [...infos].sort((a, b) => {
    if (a.played !== b.played) return a.played - b.played
    if (a.sitOutCount !== b.sitOutCount) return b.sitOutCount - a.sitOutCount
    return a.lastPlayedAt - b.lastPlayedAt
  })
  const matchCount = Math.floor(sorted.length / 4)
  const playingInfos = sorted.slice(0, matchCount * 4)
  const sitOuts = sorted.slice(matchCount * 4).map(i => i.player)
  const females = playingInfos.filter(i => i.player.gender === 'FEMALE')
  const males = playingInfos.filter(i => i.player.gender !== 'FEMALE')
  const playing: DoublesPlayer[] = []
  const femalesPerGroup = Math.min(2, Math.floor(females.length / Math.max(matchCount, 1)))
  if (femalesPerGroup > 0) {
    const femaleIt = [...females]; const maleIt = [...males]
    for (let i = 0; i < matchCount; i++) {
      const group: DoublesPlayer[] = []
      for (let j = 0; j < femalesPerGroup && femaleIt.length > 0; j++) group.push(femaleIt.shift()!.player)
      while (group.length < 4 && maleIt.length > 0) group.push(maleIt.shift()!.player)
      while (group.length < 4 && femaleIt.length > 0) group.push(femaleIt.shift()!.player)
      playing.push(...group)
    }
  } else {
    playing.push(...playingInfos.map(i => i.player))
  }
  const matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[] = []
  for (let i = 0; i < matchCount; i++) {
    const group = playing.slice(i * 4, i * 4 + 4)
    if (group.length < 4) break
    let best = SPLITS[0]; let bestScore = -Infinity
    for (const split of SPLITS) {
      const score = computeSmartSplitScore(group, split, pairStats, opponentStats)
      if (score > bestScore) { bestScore = score; best = split }
    }
    matches.push(splitToTeams(group, best))
  }
  return { matches, sitOuts }
}

function computeOverallFairnessScore(
  result: { matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[]; sitOuts: DoublesPlayer[] },
  infos: FairParticipantInfo[],
  pairStats: MiniGamePairStat[],
  opponentStats: MiniGameOpponentStat[],
): number {
  void opponentStats
  if (result.matches.length === 0 || infos.length === 0) return 50
  const pairKey = (a: string, b: string) => [a, b].sort().join('|')
  const playingIds = new Set(result.matches.flatMap(m => [...m.team1, ...m.team2].map(p => p.memberId)))
  const simCounts = infos.map(i => i.played + (playingIds.has(i.player.memberId) ? 1 : 0))
  const avg = simCounts.reduce((a, b) => a + b, 0) / simCounts.length
  const stdDev = Math.sqrt(simCounts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / simCounts.length)
  const fairRotScore = Math.max(0, 1 - stdDev / 3)
  const skillScores = result.matches.map(m => {
    const s1 = m.team1.reduce((s, p) => s + (p.skillLevel ?? 50), 0)
    const s2 = m.team2.reduce((s, p) => s + (p.skillLevel ?? 50), 0)
    return Math.max(0, 1 - Math.abs(s1 - s2) / 80)
  })
  const avgSkillScore = skillScores.reduce((a, b) => a + b, 0) / skillScores.length
  const totalRepeats = result.matches.reduce((total, m) => {
    const k1 = pairKey(m.team1[0].memberId, m.team1[1].memberId)
    const k2 = pairKey(m.team2[0].memberId, m.team2[1].memberId)
    const r1 = pairStats.find(p => pairKey(p.memberAId, p.memberBId) === k1)?.pairedCount ?? 0
    const r2 = pairStats.find(p => pairKey(p.memberAId, p.memberBId) === k2)?.pairedCount ?? 0
    return total + r1 + r2
  }, 0)
  const partnerScore = Math.max(0, 1 - totalRepeats / (result.matches.length * 3))
  const genderScores = result.matches.map(m => {
    const mix1 = m.team1.some(p => p.gender === 'MALE') && m.team1.some(p => p.gender === 'FEMALE') ? 1 : 0
    const mix2 = m.team2.some(p => p.gender === 'MALE') && m.team2.some(p => p.gender === 'FEMALE') ? 1 : 0
    return (mix1 + mix2) / 2
  })
  const avgGenderScore = genderScores.reduce((a, b) => a + b, 0) / genderScores.length
  return Math.round((fairRotScore * 0.40 + avgSkillScore * 0.25 + partnerScore * 0.20 + avgGenderScore * 0.15) * 100)
}

function matchIsGenderBalanced(m: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }): boolean {
  return (
    (m.team1.some(p => p.gender === 'MALE') && m.team1.some(p => p.gender === 'FEMALE')) ||
    (m.team2.some(p => p.gender === 'MALE') && m.team2.some(p => p.gender === 'FEMALE'))
  )
}

function hasUsableGenderData(players: DoublesPlayer[]): boolean {
  return players.some(p => p.gender === 'MALE' || p.gender === 'FEMALE')
}

function applyMaxMatchesCap(
  drawResult: { matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[]; sitOuts: DoublesPlayer[] },
  courtCount?: number,
  maxMatches?: number | null,
): { matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[]; sitOuts: DoublesPlayer[] } {
  const effectiveMax = maxMatches != null && maxMatches > 0
    ? maxMatches
    : (courtCount != null && courtCount > 0 ? courtCount : Infinity)
  if (effectiveMax >= drawResult.matches.length) return drawResult
  const kept = drawResult.matches.slice(0, effectiveMax)
  const removed = drawResult.matches.slice(effectiveMax)
  const removedPlayers = removed.flatMap(m => [...m.team1, ...m.team2])
  return { matches: kept, sitOuts: [...drawResult.sitOuts, ...removedPlayers] }
}

const DRAW_MODE_DISPLAY_LABEL: Record<DrawMode, string> = {
  RANDOM: 'Ngẫu Nhiên',
  FAIR_ROTATION: 'Luân Phiên',
  BALANCED_SKILL: 'Cân Bằng Trình Độ',
  SMART_DRAW: 'Thông Minh',
  GENDER_BALANCED: 'Cân Bằng Giới Tính',
}

// ── Random Doubles aggregate computation (recompute-from-scratch) ──────────────

function computeDoublesAggregates(
  minigame: MiniGame,
  participants: MiniGameParticipant[],
  rounds: MiniGameRound[],
  sitOuts: MiniGameRoundSitOut[],
  matches: MiniGameDoublesMatch[],
): { standings: MiniGamePersonalStanding[]; pairStats: MiniGamePairStat[]; opponentStats: MiniGameOpponentStat[] } {
  const { winPoints, drawPoints, lossPoints } = minigame
  const mgRounds = rounds.filter(r => r.minigameId === minigame.id).sort((a, b) => a.roundNumber - b.roundNumber)
  const roundIds = new Set(mgRounds.map(r => r.id))
  const mgMatches = matches.filter(m => roundIds.has(m.roundId) && m.status === 'COMPLETED')
    .sort((a, b) => a.matchNumber - b.matchNumber)
  const mgSitOuts = sitOuts.filter(s => roundIds.has(s.roundId))

  const standingMap = new Map<string, MiniGamePersonalStanding>()
  const ensureStanding = (memberId: string, memberName: string) => {
    if (!standingMap.has(memberId)) {
      standingMap.set(memberId, {
        memberId, memberName, played: 0, won: 0, drawn: 0, lost: 0,
        pointsFor: 0, pointsAgainst: 0, pointDifference: 0, rankingPoints: 0,
        winRate: 0, sitOutCount: 0, rank: 0,
      })
    }
    return standingMap.get(memberId)!
  }

  participants.forEach(p => ensureStanding(p.memberId, p.memberName))

  for (const s of mgSitOuts) {
    const st = ensureStanding(s.memberId, s.memberName)
    st.sitOutCount += 1
  }

  const pairKey = (a: string, b: string) => [a, b].sort().join('|')
  const pairMap = new Map<string, MiniGamePairStat>()
  const ensurePair = (a: DoublesPlayer, b: DoublesPlayer) => {
    const k = pairKey(a.memberId, b.memberId)
    if (!pairMap.has(k)) {
      const [first, second] = [a, b].sort((x, y) => x.memberId.localeCompare(y.memberId))
      pairMap.set(k, {
        memberAId: first.memberId, memberAName: first.memberName,
        memberBId: second.memberId, memberBName: second.memberName,
        pairedCount: 0, wonTogether: 0, lostTogether: 0, drawnTogether: 0, winRateTogether: 0,
      })
    }
    return pairMap.get(k)!
  }

  const opponentMap = new Map<string, MiniGameOpponentStat>()
  const ensureOpponent = (a: DoublesPlayer, b: DoublesPlayer) => {
    const k = pairKey(a.memberId, b.memberId)
    if (!opponentMap.has(k)) {
      const [first, second] = [a, b].sort((x, y) => x.memberId.localeCompare(y.memberId))
      opponentMap.set(k, {
        memberAId: first.memberId, memberAName: first.memberName,
        memberBId: second.memberId, memberBName: second.memberName,
        opponentCount: 0, memberAWins: 0, memberBWins: 0, draws: 0,
      })
    }
    return opponentMap.get(k)!
  }

  for (const m of mgMatches) {
    const t1Score = m.team1Score ?? 0
    const t2Score = m.team2Score ?? 0
    const winningTeam = m.winningTeam ?? (t1Score > t2Score ? 1 : t2Score > t1Score ? 2 : 0)
    const isDraw = winningTeam === 0

    // Per-player standing updates
    for (const player of m.team1) {
      const st = ensureStanding(player.memberId, player.memberName)
      st.played += 1
      st.pointsFor += t1Score
      st.pointsAgainst += t2Score
      if (isDraw) { st.drawn += 1; st.rankingPoints += drawPoints }
      else if (winningTeam === 1) { st.won += 1; st.rankingPoints += winPoints }
      else { st.lost += 1; st.rankingPoints += lossPoints }
    }
    for (const player of m.team2) {
      const st = ensureStanding(player.memberId, player.memberName)
      st.played += 1
      st.pointsFor += t2Score
      st.pointsAgainst += t1Score
      if (isDraw) { st.drawn += 1; st.rankingPoints += drawPoints }
      else if (winningTeam === 2) { st.won += 1; st.rankingPoints += winPoints }
      else { st.lost += 1; st.rankingPoints += lossPoints }
    }

    // Pair stats
    const pair1 = ensurePair(m.team1[0], m.team1[1])
    pair1.pairedCount += 1
    if (isDraw) pair1.drawnTogether += 1
    else if (winningTeam === 1) pair1.wonTogether += 1
    else pair1.lostTogether += 1

    const pair2 = ensurePair(m.team2[0], m.team2[1])
    pair2.pairedCount += 1
    if (isDraw) pair2.drawnTogether += 1
    else if (winningTeam === 2) pair2.wonTogether += 1
    else pair2.lostTogether += 1

    // Opponent stats (4 cross pairs)
    for (const p1 of m.team1) {
      for (const p2 of m.team2) {
        const opp = ensureOpponent(p1, p2)
        opp.opponentCount += 1
        const [firstId] = [p1.memberId, p2.memberId].sort()
        if (isDraw) { opp.draws += 1 }
        else if (winningTeam === 1) {
          if (firstId === p1.memberId) opp.memberAWins += 1; else opp.memberBWins += 1
        } else {
          if (firstId === p2.memberId) opp.memberAWins += 1; else opp.memberBWins += 1
        }
      }
    }
  }

  const standings = Array.from(standingMap.values()).map(s => ({
    ...s,
    pointDifference: s.pointsFor - s.pointsAgainst,
    winRate: s.played > 0 ? Math.round((s.won / s.played) * 1000) / 10 : 0,
  })).sort((a, b) =>
    b.rankingPoints - a.rankingPoints ||
    b.pointDifference - a.pointDifference ||
    b.pointsFor - a.pointsFor ||
    b.won - a.won ||
    b.winRate - a.winRate ||
    a.sitOutCount - b.sitOutCount ||
    a.played - b.played
  ).map((s, i) => ({ ...s, rank: i + 1 }))

  const pairStats = Array.from(pairMap.values()).map(p => ({
    ...p,
    winRateTogether: p.pairedCount > 0 ? Math.round((p.wonTogether / p.pairedCount) * 1000) / 10 : 0,
  }))

  const opponentStats = Array.from(opponentMap.values())

  return { standings, pairStats, opponentStats }
}

function buildFairnessAlerts(
  mgRounds: MiniGameRound[],
  mgSitOuts: MiniGameRoundSitOut[],
  standings: MiniGamePersonalStanding[],
  pairStats: MiniGamePairStat[],
  opponentStats: MiniGameOpponentStat[],
  pendingMatches: number,
): FairnessAlert[] {
  const alerts: FairnessAlert[] = []
  const sortedRounds = [...mgRounds].sort((a, b) => b.roundNumber - a.roundNumber)
  const lastTwo = sortedRounds.slice(0, 2)
  if (lastTwo.length === 2) {
    const sitOutsByRound = lastTwo.map(r => new Set(mgSitOuts.filter(s => s.roundId === r.id).map(s => s.memberId)))
    const consecutive = [...sitOutsByRound[0]].filter(id => sitOutsByRound[1].has(id))
    if (consecutive.length > 0) {
      alerts.push({ level: 'HIGH', message: 'Ngồi ngoài 2 lượt liên tiếp', actionLabel: 'Xem chi tiết' })
    }
  }
  if (pairStats.some(p => p.pairedCount > 4)) {
    alerts.push({ level: 'MED', message: 'Cặp ghép > 4 lần', actionLabel: 'Xem cặp đấu' })
  }
  if (opponentStats.some(o => o.opponentCount > 5)) {
    alerts.push({ level: 'LOW', message: 'Gặp đối thủ > 5 lần', actionLabel: 'Xem đối thủ' })
  }
  if (pendingMatches > 0) {
    alerts.push({ level: 'HIGH', message: 'Trận chưa nhập KQ', actionLabel: 'Nhập kết quả' })
  }
  if (standings.length > 0) {
    const avgPlayed = standings.reduce((sum, s) => sum + s.played, 0) / standings.length
    if (standings.some(s => s.played < avgPlayed * 0.7)) {
      alerts.push({ level: 'LOW', message: 'TV ít trận hơn TB 30%', actionLabel: 'Xem thành viên' })
    }
  }
  return alerts
}

// ── Seed data for mg-3 (Random Doubles) ─────────────────────────────────────────

function dp(memberId: string): DoublesPlayer {
  const m = MEMBERS.find(x => x.id === memberId)!
  return { memberId: m.id, memberName: m.name, skillLevel: SKILL_LEVELS[m.id] }
}

const MOCK_ROUNDS: MiniGameRound[] = [
  { id: 'rnd-1', minigameId: 'mg-3', roundNumber: 1, drawMode: 'FAIR_ROTATION', totalPlayers: 8, totalMatches: 2, sitOutCount: 2, status: 'COMPLETED', createdAt: '2026-06-01T08:00:00Z' },
  { id: 'rnd-2', minigameId: 'mg-3', roundNumber: 2, drawMode: 'FAIR_ROTATION', totalPlayers: 8, totalMatches: 2, sitOutCount: 2, status: 'COMPLETED', createdAt: '2026-06-03T08:00:00Z' },
  { id: 'rnd-3', minigameId: 'mg-3', roundNumber: 3, drawMode: 'FAIR_ROTATION', totalPlayers: 8, totalMatches: 2, sitOutCount: 2, status: 'COMPLETED', createdAt: '2026-06-08T08:00:00Z' },
  { id: 'rnd-4', minigameId: 'mg-3', roundNumber: 4, drawMode: 'FAIR_ROTATION', totalPlayers: 8, totalMatches: 2, sitOutCount: 2, status: 'ACTIVE', createdAt: '2026-06-12T08:00:00Z' },
]

const MOCK_ROUND_SITOUTS: MiniGameRoundSitOut[] = [
  { id: 'so-1-1', roundId: 'rnd-1', minigameId: 'mg-3', memberId: 'mem-9',  memberName: 'Ngô Minh Tuấn' },
  { id: 'so-1-2', roundId: 'rnd-1', minigameId: 'mg-3', memberId: 'mem-10', memberName: 'Lý Thị Mai' },

  { id: 'so-2-1', roundId: 'rnd-2', minigameId: 'mg-3', memberId: 'mem-7', memberName: 'Đặng Văn Hùng' },
  { id: 'so-2-2', roundId: 'rnd-2', minigameId: 'mg-3', memberId: 'mem-8', memberName: 'Bùi Thị Hoa' },

  { id: 'so-3-1', roundId: 'rnd-3', minigameId: 'mg-3', memberId: 'mem-1', memberName: 'Nguyễn Văn An' },
  { id: 'so-3-2', roundId: 'rnd-3', minigameId: 'mg-3', memberId: 'mem-2', memberName: 'Trần Thị Bình' },

  { id: 'so-4-1', roundId: 'rnd-4', minigameId: 'mg-3', memberId: 'mem-3', memberName: 'Lê Minh Cường' },
  { id: 'so-4-2', roundId: 'rnd-4', minigameId: 'mg-3', memberId: 'mem-4', memberName: 'Phạm Thu Dung' },
]

const MOCK_DOUBLES_MATCHES: MiniGameDoublesMatch[] = [
  // Round 1: players mem-1..mem-8 (mem-9, mem-10 sit out)
  {
    id: 'dm-1-1', minigameId: 'mg-3', roundId: 'rnd-1', matchNumber: 1,
    team1: [dp('mem-1'), dp('mem-3')], team2: [dp('mem-2'), dp('mem-4')],
    team1Score: 21, team2Score: 15, winningTeam: 1, status: 'COMPLETED', matchDate: '2026-06-01',
  },
  {
    id: 'dm-1-2', minigameId: 'mg-3', roundId: 'rnd-1', matchNumber: 2,
    team1: [dp('mem-5'), dp('mem-7')], team2: [dp('mem-6'), dp('mem-8')],
    team1Score: 18, team2Score: 21, winningTeam: 2, status: 'COMPLETED', matchDate: '2026-06-01',
  },

  // Round 2: mem-7, mem-8 sit out this time
  {
    id: 'dm-2-1', minigameId: 'mg-3', roundId: 'rnd-2', matchNumber: 1,
    team1: [dp('mem-1'), dp('mem-4')], team2: [dp('mem-2'), dp('mem-3')],
    team1Score: 21, team2Score: 19, winningTeam: 1, status: 'COMPLETED', matchDate: '2026-06-03',
  },
  {
    id: 'dm-2-2', minigameId: 'mg-3', roundId: 'rnd-2', matchNumber: 2,
    team1: [dp('mem-5'), dp('mem-9')], team2: [dp('mem-6'), dp('mem-10')],
    team1Score: 21, team2Score: 12, winningTeam: 1, status: 'COMPLETED', matchDate: '2026-06-03',
  },

  // Round 3: mem-1, mem-2 sit out this time
  {
    id: 'dm-3-1', minigameId: 'mg-3', roundId: 'rnd-3', matchNumber: 1,
    team1: [dp('mem-3'), dp('mem-6')], team2: [dp('mem-4'), dp('mem-5')],
    team1Score: 16, team2Score: 21, winningTeam: 2, status: 'COMPLETED', matchDate: '2026-06-08',
  },
  {
    id: 'dm-3-2', minigameId: 'mg-3', roundId: 'rnd-3', matchNumber: 2,
    team1: [dp('mem-7'), dp('mem-9')], team2: [dp('mem-8'), dp('mem-10')],
    team1Score: 21, team2Score: 17, winningTeam: 1, status: 'COMPLETED', matchDate: '2026-06-08',
  },

  // Round 4 (ACTIVE): mem-3, mem-4 sit out, 2 pending matches
  {
    id: 'dm-4-1', minigameId: 'mg-3', roundId: 'rnd-4', matchNumber: 1,
    team1: [dp('mem-1'), dp('mem-6')], team2: [dp('mem-2'), dp('mem-5')],
    status: 'PENDING', matchDate: '2026-06-12',
  },
  {
    id: 'dm-4-2', minigameId: 'mg-3', roundId: 'rnd-4', matchNumber: 2,
    team1: [dp('mem-7'), dp('mem-10')], team2: [dp('mem-8'), dp('mem-9')],
    status: 'PENDING', matchDate: '2026-06-12',
  },
]

// ── Audit log ────────────────────────────────────────────────────────────────

export interface MiniGameAuditLogEntry {
  id: string
  minigameId: string
  action: string
  detail: string
  actorName: string
  createdAt: string
}

const MOCK_AUDIT_LOG: MiniGameAuditLogEntry[] = [
  { id: 'audit-1', minigameId: 'mg-3', action: 'DRAW_ROUND', detail: 'Admin đã rút thăm Lượt 4 bằng Luân Phiên', actorName: 'Admin', createdAt: '2026-06-12T08:00:00Z' },
  { id: 'audit-2', minigameId: 'mg-3', action: 'LOCK_ROUND', detail: 'Admin đã khóa Lượt 3', actorName: 'Admin', createdAt: '2026-06-08T10:30:00Z' },
  { id: 'audit-3', minigameId: 'mg-3', action: 'ENTER_RESULT', detail: 'Admin đã nhập kết quả Trận 2: 21 - 17', actorName: 'Admin', createdAt: '2026-06-08T09:15:00Z' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function computeStandings(
  minigame: MiniGame,
  groups: MiniGameGroup[],
  participants: MiniGameParticipant[],
  matches: MiniGameMatch[],
): MiniGameStanding[] {
  const { winPoints, drawPoints, lossPoints } = minigame
  const mgMatches = matches.filter(m => m.minigameId === minigame.id && m.status === 'COMPLETED')

  return groups.flatMap(grp => {
    const members = participants.filter(p => grp.memberIds.includes(p.memberId))
    return members.map(participant => {
      const myMatches = mgMatches.filter(
        m => m.groupId === grp.id && (m.player1Id === participant.memberId || m.player2Id === participant.memberId)
      )
      let won = 0, drawn = 0, lost = 0, pf = 0, pa = 0
      for (const m of myMatches) {
        const isP1 = m.player1Id === participant.memberId
        const myScore = isP1 ? (m.player1Score ?? 0) : (m.player2Score ?? 0)
        const oppScore = isP1 ? (m.player2Score ?? 0) : (m.player1Score ?? 0)
        pf += myScore; pa += oppScore
        if (m.winnerId === participant.memberId) won++
        else if (!m.winnerId) drawn++
        else lost++
      }
      const rankingPoints = won * winPoints + drawn * drawPoints + lost * lossPoints
      return {
        memberId: participant.memberId,
        memberName: participant.memberName,
        groupId: grp.id,
        groupName: grp.groupName,
        played: myMatches.length,
        won, drawn, lost,
        pointsFor: pf,
        pointsAgainst: pa,
        pointDifference: pf - pa,
        rankingPoints,
        rank: 0,
      } satisfies Omit<MiniGameStanding, 'rank'> & { rank: number }
    }).sort((a, b) =>
      b.rankingPoints - a.rankingPoints ||
      b.pointDifference - a.pointDifference ||
      b.pointsFor - a.pointsFor
    ).map((s, i) => ({ ...s, rank: i + 1 }))
  })
}

function computeDashboard(
  minigame: MiniGame,
  groups: MiniGameGroup[],
  participants: MiniGameParticipant[],
  matches: MiniGameMatch[],
): MinigameDashboard {
  const mgMatches = matches.filter(m => m.minigameId === minigame.id)
  const completed = mgMatches.filter(m => m.status === 'COMPLETED')
  const pending = mgMatches.filter(m => m.status === 'PENDING')
  const standings = computeStandings(minigame, groups, participants, matches)

  const allSorted = [...standings].sort((a, b) =>
    b.rankingPoints - a.rankingPoints || b.pointDifference - a.pointDifference
  )
  const leader = allSorted[0] ? { name: allSorted[0].memberName, points: allSorted[0].rankingPoints } : null
  const bestDiff = [...standings].sort((a, b) => b.pointDifference - a.pointDifference)[0]
  const bestDifference = bestDiff ? { name: bestDiff.memberName, diff: bestDiff.pointDifference } : null

  const completionRate = mgMatches.length > 0 ? Math.round((completed.length / mgMatches.length) * 100) : 0

  return {
    kpi: {
      totalParticipants: participants.filter(p => p.minigameId === minigame.id).length,
      totalGroups: groups.filter(g => g.minigameId === minigame.id).length,
      totalMatches: mgMatches.length,
      completedMatches: completed.length,
      pendingMatches: pending.length,
      completionRate,
      leader,
      bestDifference,
      matchesNeedingScore: pending.length,
    },
    groups: groups.filter(g => g.minigameId === minigame.id).map(grp => ({
      group: grp,
      standings: standings.filter(s => s.groupId === grp.id),
    })),
  }
}

function generateGroupsAlgo(participantCount: number, groupSize = 4) {
  const numGroups = Math.ceil(participantCount / groupSize)
  const baseSize = Math.floor(participantCount / numGroups)
  const extra = participantCount % numGroups
  return Array.from({ length: numGroups }, (_, i) => ({
    name: `Bảng ${String.fromCharCode(65 + i)}`,
    size: i < extra ? baseSize + 1 : baseSize,
  }))
}

// ── Store ──────────────────────────────────────────────────────────────────────

interface MinigameStore {
  minigames: MiniGame[]
  participants: MiniGameParticipant[]
  groups: MiniGameGroup[]
  matches: MiniGameMatch[]
  rounds: MiniGameRound[]
  roundSitOuts: MiniGameRoundSitOut[]
  doublesMatches: MiniGameDoublesMatch[]
  teams: MiniGameTeam[]
  teamMatches: MiniGameTeamMatch[]
  auditLog: MiniGameAuditLogEntry[]

  getMinigames: (clubId: string) => MiniGame[]
  getMinigame: (id: string) => MiniGame | undefined
  createMinigame: (data: Omit<MiniGame, 'id' | 'createdAt'>) => MiniGame
  updateMinigame: (id: string, data: Partial<MiniGame>) => void
  deleteMinigame: (id: string) => void

  addParticipants: (minigameId: string, members: { memberId: string; memberName: string }[]) => void
  syncParticipants: (minigameId: string, members: { memberId: string; memberName: string }[]) => void
  removeParticipant: (minigameId: string, memberId: string) => void
  updateParticipant: (minigameId: string, memberId: string, updates: { memberName?: string; skillLevel?: number }) => void
  generateGroups: (minigameId: string) => void
  generateSchedule: (minigameId: string) => void
  enterScore: (matchId: string, p1Score: number, p2Score: number, notes?: string) => void
  moveParticipant: (minigameId: string, memberId: string, targetGroupId: string) => void
  lockGroups: (minigameId: string) => void

  getStandings: (minigameId: string) => MiniGameStanding[]
  getDashboard: (minigameId: string) => MinigameDashboard | null

  // Random Doubles
  previewDrawRound: (minigameId: string, drawMode: DrawMode, options?: DrawRoundOptions) => DrawRoundPreview | null
  drawRound: (minigameId: string, drawMode: DrawMode, options?: DrawRoundOptions) => void
  confirmRoundFromPreview: (minigameId: string, preview: DrawRoundPreview) => void
  redrawRound: (roundId: string) => void
  lockRound: (roundId: string) => void
  deleteRound: (roundId: string) => void
  enterDoublesMatchResult: (matchId: string, team1Score: number, team2Score: number, note?: string) => void
  getRecentActivity: (minigameId: string, limit?: number) => MiniGameAuditLogEntry[]
  deleteDoublesMatchResult: (matchId: string) => void
  removeDoublesMatch: (matchId: string) => void
  getRounds: (minigameId: string) => MiniGameRound[]
  getRoundDetail: (roundId: string) => { round: MiniGameRound | undefined; matches: MiniGameDoublesMatch[]; sitOuts: MiniGameRoundSitOut[] }
  getPersonalStandings: (minigameId: string) => MiniGamePersonalStanding[]
  getPairStats: (minigameId: string) => MiniGamePairStat[]
  getOpponentStats: (minigameId: string) => MiniGameOpponentStat[]
  getMemberStats: (minigameId: string, memberId: string) => {
    standing: MiniGamePersonalStanding | undefined
    pairStats: MiniGamePairStat[]
    opponentStats: MiniGameOpponentStat[]
  }
  getFairnessAlerts: (minigameId: string) => FairnessAlert[]
  getTournamentDashboard: (minigameId: string) => TournamentDashboardData | null

  // Fixed Doubles Round-Robin
  getTeams: (minigameId: string) => MiniGameTeam[]
  addTeam: (team: MiniGameTeam) => void
  removeTeam: (teamId: string) => void
  updateTeam: (teamId: string, updates: Partial<Pick<MiniGameTeam, 'name' | 'player1' | 'player2'>>) => void
  autoGenerateTeams: (minigameId: string) => void
  generateTeamRoundRobinSchedule: (minigameId: string) => void
  clearTeamSchedule: (minigameId: string) => void
  enterTeamMatchResult: (matchId: string, team1Score: number, team2Score: number, note?: string) => void
  deleteTeamMatchResult: (matchId: string) => void
  getTeamStandings: (minigameId: string) => MiniGameTeamStanding[]
  getFixedDoublesDashboard: (minigameId: string) => FixedDoublesDashboardData | null
}

export const useMinigameStore = create<MinigameStore>()(
  persist(
    (set, get) => ({
      minigames: MOCK_MINIGAMES,
      participants: [...MOCK_PARTICIPANTS_MG1, ...MOCK_PARTICIPANTS_MG2, ...MOCK_PARTICIPANTS_MG3, ...MOCK_PARTICIPANTS_MG4],
      groups: [...MOCK_GROUPS_MG1, ...MOCK_GROUPS_MG2],
      matches: [...MOCK_MATCHES_MG1, ...MOCK_MATCHES_MG2],
      rounds: MOCK_ROUNDS,
      roundSitOuts: MOCK_ROUND_SITOUTS,
      doublesMatches: MOCK_DOUBLES_MATCHES,
      teams: MOCK_TEAMS,
      teamMatches: MOCK_TEAM_MATCHES,
      auditLog: MOCK_AUDIT_LOG,

      getMinigames: (clubId) => get().minigames.filter(m => m.clubId === clubId),

      getMinigame: (id) => get().minigames.find(m => m.id === id),

      createMinigame: (data) => {
        const mg: MiniGame = { ...data, id: `mg-${Date.now()}`, createdAt: new Date().toISOString() }
        set(s => ({ minigames: [...s.minigames, mg] }))
        return mg
      },

      updateMinigame: (id, data) =>
        set(s => ({ minigames: s.minigames.map(m => m.id === id ? { ...m, ...data } : m) })),

      deleteMinigame: (id) =>
        set(s => {
          const roundIdsToRemove = new Set(s.rounds.filter(r => r.minigameId === id).map(r => r.id))
          return {
            minigames: s.minigames.filter(m => m.id !== id),
            participants: s.participants.filter(p => p.minigameId !== id),
            groups: s.groups.filter(g => g.minigameId !== id),
            matches: s.matches.filter(m => m.minigameId !== id),
            rounds: s.rounds.filter(r => r.minigameId !== id),
            roundSitOuts: s.roundSitOuts.filter(so => !roundIdsToRemove.has(so.roundId)),
            doublesMatches: s.doublesMatches.filter(dm => !roundIdsToRemove.has(dm.roundId)),
            teams: s.teams.filter(t => t.minigameId !== id),
            teamMatches: s.teamMatches.filter(m => m.minigameId !== id),
          }
        }),

      addParticipants: (minigameId, members) => {
        const existing = get().participants.filter(p => p.minigameId === minigameId).map(p => p.memberId)
        const newOnes = members
          .filter(m => !existing.includes(m.memberId))
          .map((m, i) => ({
            id: `part-${minigameId}-${Date.now()}-${i}`,
            minigameId,
            memberId: m.memberId,
            memberName: m.memberName,
            status: 'ACTIVE' as const,
          }))
        set(s => ({ participants: [...s.participants, ...newOnes] }))
        get().updateMinigame(minigameId, { status: 'DRAFT' })
      },

      syncParticipants: (minigameId, members) => {
        const newIds = new Set(members.map(m => m.memberId))
        const ts = Date.now()
        set(s => {
          const kept = s.participants.filter(p => p.minigameId !== minigameId)
          const newOnes = members.map((m, i) => ({
            id: `part-${minigameId}-${ts}-${i}`,
            minigameId,
            memberId: m.memberId,
            memberName: m.memberName,
            status: 'ACTIVE' as const,
          }))
          return { participants: [...kept, ...newOnes] }
        })
        void newIds
        get().updateMinigame(minigameId, { status: 'DRAFT' })
      },

      removeParticipant: (minigameId, memberId) => {
        set(s => ({
          participants: s.participants.filter(p => !(p.minigameId === minigameId && p.memberId === memberId)),
        }))
      },

      updateParticipant: (minigameId, memberId, updates) => {
        set(s => ({
          participants: s.participants.map(p =>
            p.minigameId === minigameId && p.memberId === memberId ? { ...p, ...updates } : p,
          ),
        }))
      },

      generateGroups: (minigameId) => {
        const parts = get().participants.filter(p => p.minigameId === minigameId && p.status === 'ACTIVE')
        const mg = get().getMinigame(minigameId)
        if (!mg) return
        if (mg.formatType !== 'GROUP_STAGE') {
          toast.error('Giải Đánh Đôi Ngẫu Nhiên dùng "Rút Thăm Vòng Mới", không dùng chia bảng cố định')
          return
        }
        const layout = generateGroupsAlgo(parts.length, mg.groupSize)
        const newGroups: MiniGameGroup[] = []
        let offset = 0
        layout.forEach((g, i) => {
          const slice = parts.slice(offset, offset + g.size)
          offset += g.size
          newGroups.push({
            id: `grp-${minigameId}-${i}-${Date.now()}`,
            minigameId,
            groupName: g.name,
            groupOrder: i,
            status: 'ACTIVE',
            memberIds: slice.map(p => p.memberId),
          })
        })
        set(s => ({
          groups: [...s.groups.filter(g => g.minigameId !== minigameId), ...newGroups],
          matches: s.matches.filter(m => m.minigameId !== minigameId),
        }))
        get().updateMinigame(minigameId, { status: 'GROUPED' })
      },

      generateSchedule: (minigameId) => {
        const grps = get().groups.filter(g => g.minigameId === minigameId)
        const parts = get().participants.filter(p => p.minigameId === minigameId)
        const mg = get().getMinigame(minigameId)
        if (!mg) return
        if (mg.formatType !== 'GROUP_STAGE') return
        const newMatches: MiniGameMatch[] = []
        let ctr = Date.now()
        grps.forEach(grp => {
          roundRobinPairs(grp.memberIds).forEach(([i, j]) => {
            const p1 = parts.find(p => p.memberId === grp.memberIds[i])
            const p2 = parts.find(p => p.memberId === grp.memberIds[j])
            if (!p1 || !p2) return
            newMatches.push({
              id: `match-${ctr++}`,
              minigameId,
              groupId: grp.id,
              player1Id: p1.memberId,
              player1Name: p1.memberName,
              player2Id: p2.memberId,
              player2Name: p2.memberName,
              status: 'PENDING',
              round: 1,
            })
          })
        })
        set(s => ({
          matches: [...s.matches.filter(m => m.minigameId !== minigameId), ...newMatches],
        }))
        get().updateMinigame(minigameId, { status: 'SCHEDULED' })
      },

      enterScore: (matchId, p1Score, p2Score, notes) => {
        set(s => ({
          matches: s.matches.map(m => {
            if (m.id !== matchId) return m
            const winnerId = p1Score > p2Score ? m.player1Id : p2Score > p1Score ? m.player2Id : undefined
            return { ...m, player1Score: p1Score, player2Score: p2Score, winnerId, status: 'COMPLETED', notes: notes ?? m.notes, matchDate: m.matchDate ?? new Date().toISOString().slice(0, 10) }
          }),
        }))
      },

      moveParticipant: (minigameId, memberId, targetGroupId) => {
        set(s => ({
          groups: s.groups.map(g => {
            if (g.minigameId !== minigameId) return g
            if (g.id === targetGroupId) return { ...g, memberIds: [...g.memberIds.filter(id => id !== memberId), memberId] }
            return { ...g, memberIds: g.memberIds.filter(id => id !== memberId) }
          }),
        }))
      },

      lockGroups: (minigameId) => {
        set(s => ({
          groups: s.groups.map(g => g.minigameId === minigameId ? { ...g, status: 'LOCKED' } : g),
        }))
        get().updateMinigame(minigameId, { status: 'GROUPED' })
      },

      getStandings: (minigameId) => {
        const { minigames, groups, participants, matches } = get()
        const mg = minigames.find(m => m.id === minigameId)
        if (!mg) return []
        return computeStandings(mg, groups.filter(g => g.minigameId === minigameId), participants.filter(p => p.minigameId === minigameId), matches)
      },

      getDashboard: (minigameId) => {
        const { minigames, groups, participants, matches } = get()
        const mg = minigames.find(m => m.id === minigameId)
        if (!mg) return null
        return computeDashboard(mg, groups.filter(g => g.minigameId === minigameId), participants.filter(p => p.minigameId === minigameId), matches)
      },

      // ── Random Doubles actions ──────────────────────────────────────────────

      previewDrawRound: (minigameId, drawMode, options) => {
        const mg = get().getMinigame(minigameId)
        if (!mg) return null
        const allActiveParts = get().participants.filter(p => p.minigameId === minigameId && p.status === 'ACTIVE')
        const activeParts = options?.memberIds?.length
          ? allActiveParts.filter(p => options.memberIds!.includes(p.memberId))
          : allActiveParts
        if (activeParts.length < 4) return null

        const players = activeParts.map(toDoublesPlayer)
        const { standings, pairStats, opponentStats } = computeDoublesAggregates(
          mg, allActiveParts, get().rounds, get().roundSitOuts, get().doublesMatches
        )
        const mgRounds = get().rounds.filter(r => r.minigameId === minigameId)
        const roundNumber = mgRounds.length > 0 ? Math.max(...mgRounds.map(r => r.roundNumber)) + 1 : 1

        let drawResult: { matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[]; sitOuts: DoublesPlayer[] }

        if (drawMode === 'RANDOM') {
          drawResult = drawRandomAlgo(players)
        } else if (drawMode === 'BALANCED_SKILL') {
          drawResult = drawBalancedSkillAlgo(players)
        } else {
          const lastPlayedMap = new Map<string, number>()
          const sortedRounds = [...mgRounds].sort((a, b) => a.roundNumber - b.roundNumber)
          sortedRounds.forEach((r, idx) => {
            get().doublesMatches.filter(m => m.roundId === r.id).forEach(m => {
              [...m.team1, ...m.team2].forEach(p => lastPlayedMap.set(p.memberId, idx))
            })
          })
          const infos: FairParticipantInfo[] = players.map(p => {
            const st = standings.find(s => s.memberId === p.memberId)
            return { player: p, played: st?.played ?? 0, sitOutCount: st?.sitOutCount ?? 0, lastPlayedAt: lastPlayedMap.get(p.memberId) ?? -1 }
          })
          const usedPairStats = options?.avoidRepeatPartners === false ? [] : pairStats
          const usedOpponentStats = options?.avoidRepeatOpponents === false ? [] : opponentStats
          if (drawMode === 'SMART_DRAW') {
            drawResult = drawSmartAlgo(infos, usedPairStats, usedOpponentStats)
          } else if (drawMode === 'GENDER_BALANCED') {
            drawResult = drawGenderBalancedAlgo(infos, usedPairStats, usedOpponentStats)
          } else {
            drawResult = drawFairRotationAlgo(infos, usedPairStats, usedOpponentStats)
          }
        }

        drawResult = applyMaxMatchesCap(drawResult, options?.courtCount, options?.maxMatches)

        const genderBalanceMode: GenderBalanceMode = options?.genderBalanceMode ?? 'OFF'
        let genderRequirementMet = true
        if (genderBalanceMode === 'REQUIRED') {
          const dataSufficient = hasUsableGenderData(players)
          if (dataSufficient) {
            genderRequirementMet = drawResult.matches.every(matchIsGenderBalanced)
          } else {
            genderRequirementMet = false
          }
        }

        const infosForScore: FairParticipantInfo[] = players.map(p => {
          const st = standings.find(s => s.memberId === p.memberId)
          return { player: p, played: st?.played ?? 0, sitOutCount: st?.sitOutCount ?? 0, lastPlayedAt: -1 }
        })
        const fairnessScore = computeOverallFairnessScore(drawResult, infosForScore, pairStats, opponentStats)

        const warnings: string[] = []
        if (drawResult.sitOuts.length > 0) {
          const names = drawResult.sitOuts.map(p => p.memberName).join(', ')
          warnings.push(`Ngồi ngoài lượt này: ${names}`)
        }
        const hasRepeatPair = drawResult.matches.some(m => {
          const pairKey = (a: string, b: string) => [a, b].sort().join('|')
          const k1 = pairKey(m.team1[0].memberId, m.team1[1].memberId)
          const k2 = pairKey(m.team2[0].memberId, m.team2[1].memberId)
          return (
            (pairStats.find(p => pairKey(p.memberAId, p.memberBId) === k1)?.pairedCount ?? 0) > 0 ||
            (pairStats.find(p => pairKey(p.memberAId, p.memberBId) === k2)?.pairedCount ?? 0) > 0
          )
        })
        if (hasRepeatPair) warnings.push('Một số cặp đã từng ghép trước đó')

        if (genderBalanceMode === 'REQUIRED' && !genderRequirementMet) {
          warnings.push('⚠ Không thể cân bằng nam/nữ cho tất cả các trận')
        }
        if (genderBalanceMode !== 'OFF' && !hasUsableGenderData(players)) {
          warnings.push('Thiếu dữ liệu giới tính — vẫn rút thăm được nhưng không tối ưu được cân bằng nam/nữ')
        }
        if ((drawMode === 'SMART_DRAW' || drawMode === 'BALANCED_SKILL') && players.every(p => p.skillLevel === undefined)) {
          warnings.push('Thiếu dữ liệu trình độ — vẫn rút thăm được nhưng không tối ưu được cân bằng trình độ')
        }

        return {
          roundNumber,
          drawMode,
          fairnessScore,
          totalPlayers: drawResult.matches.length * 4,
          totalMatches: drawResult.matches.length,
          sitOutCount: drawResult.sitOuts.length,
          matches: drawResult.matches.map((m, i) => ({
            matchNumber: i + 1,
            team1: m.team1,
            team2: m.team2,
            skillDiff: Math.abs(
              m.team1.reduce((s, p) => s + (p.skillLevel ?? 50), 0) -
              m.team2.reduce((s, p) => s + (p.skillLevel ?? 50), 0)
            ),
            isGenderBalanced: matchIsGenderBalanced(m),
          })),
          sitOuts: drawResult.sitOuts,
          warnings,
          genderBalanceMode,
          genderRequirementMet,
        }
      },

      drawRound: (minigameId, drawMode, options) => {
        const mg = get().getMinigame(minigameId)
        if (!mg) return
        const allActiveParts = get().participants.filter(p => p.minigameId === minigameId && p.status === 'ACTIVE')
        const activeParts = options?.memberIds?.length
          ? allActiveParts.filter(p => options.memberIds!.includes(p.memberId))
          : allActiveParts
        if (activeParts.length < 4) {
          toast.error('Cần tối thiểu 4 thành viên để bốc thăm')
          return
        }
        const players = activeParts.map(toDoublesPlayer)
        const { standings, pairStats, opponentStats } = computeDoublesAggregates(
          mg, allActiveParts, get().rounds, get().roundSitOuts, get().doublesMatches
        )
        const mgRounds = get().rounds.filter(r => r.minigameId === minigameId)

        let drawResult: { matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[]; sitOuts: DoublesPlayer[] }

        if (drawMode === 'RANDOM') {
          drawResult = drawRandomAlgo(players)
        } else if (drawMode === 'BALANCED_SKILL') {
          drawResult = drawBalancedSkillAlgo(players)
        } else {
          const lastPlayedMap = new Map<string, number>()
          const sortedRounds = [...mgRounds].sort((a, b) => a.roundNumber - b.roundNumber)
          sortedRounds.forEach((r, idx) => {
            const roundMatches = get().doublesMatches.filter(m => m.roundId === r.id)
            roundMatches.forEach(m => {
              [...m.team1, ...m.team2].forEach(p => lastPlayedMap.set(p.memberId, idx))
            })
          })
          const infos: FairParticipantInfo[] = players.map(p => {
            const st = standings.find(s => s.memberId === p.memberId)
            return {
              player: p,
              played: st?.played ?? 0,
              sitOutCount: st?.sitOutCount ?? 0,
              lastPlayedAt: lastPlayedMap.get(p.memberId) ?? -1,
            }
          })
          const usedPairStats = options?.avoidRepeatPartners === false ? [] : pairStats
          const usedOpponentStats = options?.avoidRepeatOpponents === false ? [] : opponentStats
          if (drawMode === 'SMART_DRAW') {
            drawResult = drawSmartAlgo(infos, usedPairStats, usedOpponentStats)
          } else if (drawMode === 'GENDER_BALANCED') {
            drawResult = drawGenderBalancedAlgo(infos, usedPairStats, usedOpponentStats)
          } else {
            drawResult = drawFairRotationAlgo(infos, usedPairStats, usedOpponentStats)
          }
        }

        drawResult = applyMaxMatchesCap(drawResult, options?.courtCount, options?.maxMatches)

        const genderBalanceMode: GenderBalanceMode = options?.genderBalanceMode ?? 'OFF'
        if (genderBalanceMode === 'REQUIRED') {
          const dataSufficient = hasUsableGenderData(players)
          const requirementMet = dataSufficient && drawResult.matches.every(matchIsGenderBalanced)
          if (!requirementMet) {
            toast.error('Không đủ dữ liệu nam/nữ để đảm bảo cân bằng bắt buộc')
            return
          }
        }

        const roundNumber = mgRounds.length > 0 ? Math.max(...mgRounds.map(r => r.roundNumber)) + 1 : 1
        const roundId = `rnd-${minigameId}-${Date.now()}`
        const newRound: MiniGameRound = {
          id: roundId,
          minigameId,
          roundNumber,
          drawMode,
          totalPlayers: drawResult.matches.length * 4,
          totalMatches: drawResult.matches.length,
          sitOutCount: drawResult.sitOuts.length,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          genderBalanceMode,
        }
        const newMatches: MiniGameDoublesMatch[] = drawResult.matches.map((m, i) => ({
          id: `dm-${roundId}-${i + 1}`,
          minigameId,
          roundId,
          matchNumber: i + 1,
          team1: m.team1,
          team2: m.team2,
          status: 'PENDING',
          matchDate: new Date().toISOString().slice(0, 10),
        }))
        const newSitOuts: MiniGameRoundSitOut[] = drawResult.sitOuts.map((p, i) => ({
          id: `so-${roundId}-${i + 1}`,
          roundId,
          minigameId,
          memberId: p.memberId,
          memberName: p.memberName,
        }))

        set(s => ({
          rounds: [...s.rounds, newRound],
          doublesMatches: [...s.doublesMatches, ...newMatches],
          roundSitOuts: [...s.roundSitOuts, ...newSitOuts],
          auditLog: [...s.auditLog, {
            id: `audit-${Date.now()}`,
            minigameId,
            action: 'DRAW_ROUND',
            detail: `Admin đã rút thăm vòng ${roundNumber} bằng ${DRAW_MODE_DISPLAY_LABEL[drawMode]}`,
            actorName: 'Admin',
            createdAt: new Date().toISOString(),
          }],
        }))
        if (mg.status === 'DRAFT' || mg.status === 'GROUPED' || mg.status === 'SCHEDULED') {
          get().updateMinigame(minigameId, { status: 'IN_PROGRESS' })
        }
        toast.success(`Đã bốc thăm Lượt ${roundNumber}: ${newMatches.length} trận, ${newSitOuts.length} người ngồi ngoài`)
      },

      confirmRoundFromPreview: (minigameId, preview) => {
        const mg = get().getMinigame(minigameId)
        if (!mg) return
        if (preview.genderBalanceMode === 'REQUIRED' && !preview.genderRequirementMet) {
          toast.error('Không đủ dữ liệu nam/nữ để đảm bảo cân bằng bắt buộc')
          return
        }
        const mgRounds = get().rounds.filter(r => r.minigameId === minigameId)
        const roundNumber = mgRounds.length > 0 ? Math.max(...mgRounds.map(r => r.roundNumber)) + 1 : 1
        const roundId = `rnd-${minigameId}-${Date.now()}`
        const newRound: MiniGameRound = {
          id: roundId,
          minigameId,
          roundNumber,
          drawMode: preview.drawMode,
          totalPlayers: preview.matches.length * 4,
          totalMatches: preview.matches.length,
          sitOutCount: preview.sitOuts.length,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          genderBalanceMode: preview.genderBalanceMode,
        }
        const newMatches: MiniGameDoublesMatch[] = preview.matches.map((m, i) => ({
          id: `dm-${roundId}-${i + 1}`,
          minigameId,
          roundId,
          matchNumber: i + 1,
          team1: m.team1,
          team2: m.team2,
          status: 'PENDING',
          matchDate: new Date().toISOString().slice(0, 10),
        }))
        const newSitOuts: MiniGameRoundSitOut[] = preview.sitOuts.map((p, i) => ({
          id: `so-${roundId}-${i + 1}`,
          roundId,
          minigameId,
          memberId: p.memberId,
          memberName: p.memberName,
        }))

        set(s => ({
          rounds: [...s.rounds, newRound],
          doublesMatches: [...s.doublesMatches, ...newMatches],
          roundSitOuts: [...s.roundSitOuts, ...newSitOuts],
          auditLog: [...s.auditLog, {
            id: `audit-${Date.now()}`,
            minigameId,
            action: 'DRAW_ROUND',
            detail: `Admin đã rút thăm vòng ${roundNumber} bằng ${DRAW_MODE_DISPLAY_LABEL[preview.drawMode]}`,
            actorName: 'Admin',
            createdAt: new Date().toISOString(),
          }],
        }))
        if (mg.status === 'DRAFT' || mg.status === 'GROUPED' || mg.status === 'SCHEDULED') {
          get().updateMinigame(minigameId, { status: 'IN_PROGRESS' })
        }
        toast.success(`Đã bốc thăm Lượt ${roundNumber}: ${newMatches.length} trận, ${newSitOuts.length} người ngồi ngoài`)
      },

      redrawRound: (roundId) => {
        const round = get().rounds.find(r => r.id === roundId)
        if (!round) return
        const existingMatches = get().doublesMatches.filter(m => m.roundId === roundId)
        if (existingMatches.some(m => m.status === 'COMPLETED')) {
          toast.error('Không thể random lại lượt đã có trận hoàn thành')
          return
        }
        const mg = get().getMinigame(round.minigameId)
        if (!mg) return
        const playerIds = new Set(existingMatches.flatMap(m => [...m.team1, ...m.team2].map(p => p.memberId)))
        const sitOutIds = new Set(get().roundSitOuts.filter(so => so.roundId === roundId).map(so => so.memberId))
        const allParts = get().participants.filter(p => p.minigameId === round.minigameId && (playerIds.has(p.memberId) || sitOutIds.has(p.memberId)))
        const players = allParts.map(toDoublesPlayer)

        let drawResult: { matches: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }[]; sitOuts: DoublesPlayer[] }
        if (round.drawMode === 'RANDOM') drawResult = drawRandomAlgo(players)
        else if (round.drawMode === 'BALANCED_SKILL') drawResult = drawBalancedSkillAlgo(players)
        else {
          const { standings, pairStats, opponentStats } = computeDoublesAggregates(
            mg, get().participants.filter(p => p.minigameId === round.minigameId), get().rounds, get().roundSitOuts, get().doublesMatches
          )
          const infos: FairParticipantInfo[] = players.map(p => {
            const st = standings.find(s => s.memberId === p.memberId)
            return { player: p, played: st?.played ?? 0, sitOutCount: st?.sitOutCount ?? 0, lastPlayedAt: -1 }
          })
          if (round.drawMode === 'SMART_DRAW') {
            drawResult = drawSmartAlgo(infos, pairStats, opponentStats)
          } else if (round.drawMode === 'GENDER_BALANCED') {
            drawResult = drawGenderBalancedAlgo(infos, pairStats, opponentStats)
          } else {
            drawResult = drawFairRotationAlgo(infos, pairStats, opponentStats)
          }
        }

        const newMatches: MiniGameDoublesMatch[] = drawResult.matches.map((m, i) => ({
          id: `dm-${roundId}-r-${Date.now()}-${i + 1}`,
          minigameId: round.minigameId,
          roundId,
          matchNumber: i + 1,
          team1: m.team1,
          team2: m.team2,
          status: 'PENDING',
          matchDate: new Date().toISOString().slice(0, 10),
        }))
        const newSitOuts: MiniGameRoundSitOut[] = drawResult.sitOuts.map((p, i) => ({
          id: `so-${roundId}-r-${Date.now()}-${i + 1}`,
          roundId,
          minigameId: round.minigameId,
          memberId: p.memberId,
          memberName: p.memberName,
        }))

        set(s => ({
          doublesMatches: [...s.doublesMatches.filter(m => m.roundId !== roundId), ...newMatches],
          roundSitOuts: [...s.roundSitOuts.filter(so => so.roundId !== roundId), ...newSitOuts],
          rounds: s.rounds.map(r => r.id === roundId
            ? { ...r, totalMatches: newMatches.length, totalPlayers: newMatches.length * 4, sitOutCount: newSitOuts.length }
            : r),
        }))
        toast.success('Đã random lại lượt này')
      },

      lockRound: (roundId) => {
        const round = get().rounds.find(r => r.id === roundId)
        set(s => ({ rounds: s.rounds.map(r => r.id === roundId ? { ...r, status: 'LOCKED' } : r) }))
        if (round) {
          set(s => ({
            auditLog: [...s.auditLog, {
              id: `audit-${Date.now()}`,
              minigameId: round.minigameId,
              action: 'LOCK_ROUND',
              detail: `Admin đã khóa Lượt ${round.roundNumber}`,
              actorName: 'Admin',
              createdAt: new Date().toISOString(),
            }],
          }))
        }
        toast.success('Đã khóa lượt đấu')
      },

      deleteRound: (roundId) => {
        const matches = get().doublesMatches.filter(m => m.roundId === roundId)
        if (matches.some(m => m.status === 'COMPLETED')) {
          toast.error('Không thể xóa lượt đã có trận hoàn thành')
          return
        }
        set(s => ({
          rounds: s.rounds.filter(r => r.id !== roundId),
          doublesMatches: s.doublesMatches.filter(m => m.roundId !== roundId),
          roundSitOuts: s.roundSitOuts.filter(so => so.roundId !== roundId),
        }))
        toast.success('Đã xóa lượt đấu')
      },

      enterDoublesMatchResult: (matchId, team1Score, team2Score, note) => {
        const match = get().doublesMatches.find(m => m.id === matchId)
        if (!match) return
        const mg = get().getMinigame(match.minigameId)
        if (!mg) return
        const isDraw = team1Score === team2Score
        if (isDraw && !mg.allowDraw) {
          toast.error('Minigame này không cho phép kết quả hòa')
          return
        }
        const winningTeam: 1 | 2 | undefined = isDraw ? undefined : (team1Score > team2Score ? 1 : 2)

        // Draw is represented as winningTeam=undefined with team1Score === team2Score.
        set(s => ({
          doublesMatches: s.doublesMatches.map(m => m.id === matchId
            ? { ...m, team1Score, team2Score, winningTeam, status: 'COMPLETED', note: note ?? m.note, matchDate: m.matchDate ?? new Date().toISOString().slice(0, 10) }
            : m),
          auditLog: [...s.auditLog, {
            id: `audit-${Date.now()}`,
            minigameId: match.minigameId,
            action: 'ENTER_RESULT',
            detail: `Admin đã nhập kết quả Trận ${match.matchNumber}: ${team1Score} - ${team2Score}`,
            actorName: 'Admin',
            createdAt: new Date().toISOString(),
          }],
        }))

        const winPts = mg.winPoints, drawPts = mg.drawPoints, lossPts = mg.lossPoints
        const team1Names = match.team1.map(p => p.memberName)
        const team2Names = match.team2.map(p => p.memberName)
        if (isDraw) {
          toast.success(`Hòa | ${[...team1Names, ...team2Names].map(n => `${n} +${drawPts}đ`).join(' · ')}`)
        } else {
          const winners = winningTeam === 1 ? team1Names : team2Names
          const losers = winningTeam === 1 ? team2Names : team1Names
          toast.success(`Team ${winningTeam} thắng | ${winners.map(n => `${n} +${winPts}đ`).join(' ')} ${losers.map(n => `${n} +${lossPts}đ`).join(' ')}`)
        }
      },

      deleteDoublesMatchResult: (matchId) => {
        set(s => ({
          doublesMatches: s.doublesMatches.map(m => m.id === matchId
            ? { ...m, team1Score: undefined, team2Score: undefined, winningTeam: undefined, status: 'PENDING' as const }
            : m),
        }))
        toast.success('Đã xóa kết quả trận đấu')
      },

      removeDoublesMatch: (matchId) => {
        set(s => ({
          doublesMatches: s.doublesMatches.filter(m => m.id !== matchId),
        }))
        toast.success('Đã xóa trận đấu')
      },

      getRecentActivity: (minigameId, limit = 10) =>
        get().auditLog
          .filter(a => a.minigameId === minigameId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit),

      getRounds: (minigameId) => get().rounds.filter(r => r.minigameId === minigameId).sort((a, b) => a.roundNumber - b.roundNumber),

      getRoundDetail: (roundId) => {
        const round = get().rounds.find(r => r.id === roundId)
        const matches = get().doublesMatches.filter(m => m.roundId === roundId).sort((a, b) => a.matchNumber - b.matchNumber)
        const sitOuts = get().roundSitOuts.filter(so => so.roundId === roundId)
        return { round, matches, sitOuts }
      },

      getPersonalStandings: (minigameId) => {
        const mg = get().getMinigame(minigameId)
        if (!mg) return []
        const parts = get().participants.filter(p => p.minigameId === minigameId)
        const { standings } = computeDoublesAggregates(mg, parts, get().rounds, get().roundSitOuts, get().doublesMatches)
        return standings
      },

      getPairStats: (minigameId) => {
        const mg = get().getMinigame(minigameId)
        if (!mg) return []
        const parts = get().participants.filter(p => p.minigameId === minigameId)
        const { pairStats } = computeDoublesAggregates(mg, parts, get().rounds, get().roundSitOuts, get().doublesMatches)
        return [...pairStats].sort((a, b) => b.winRateTogether - a.winRateTogether)
      },

      getOpponentStats: (minigameId) => {
        const mg = get().getMinigame(minigameId)
        if (!mg) return []
        const parts = get().participants.filter(p => p.minigameId === minigameId)
        const { opponentStats } = computeDoublesAggregates(mg, parts, get().rounds, get().roundSitOuts, get().doublesMatches)
        return opponentStats
      },

      getMemberStats: (minigameId, memberId) => {
        const mg = get().getMinigame(minigameId)
        if (!mg) return { standing: undefined, pairStats: [], opponentStats: [] }
        const parts = get().participants.filter(p => p.minigameId === minigameId)
        const { standings, pairStats, opponentStats } = computeDoublesAggregates(mg, parts, get().rounds, get().roundSitOuts, get().doublesMatches)
        return {
          standing: standings.find(s => s.memberId === memberId),
          pairStats: pairStats.filter(p => p.memberAId === memberId || p.memberBId === memberId),
          opponentStats: opponentStats.filter(o => o.memberAId === memberId || o.memberBId === memberId),
        }
      },

      getFairnessAlerts: (minigameId) => {
        const mg = get().getMinigame(minigameId)
        if (!mg) return []
        const parts = get().participants.filter(p => p.minigameId === minigameId)
        const mgRounds = get().rounds.filter(r => r.minigameId === minigameId)
        const mgSitOuts = get().roundSitOuts.filter(so => so.minigameId === minigameId)
        const { standings, pairStats, opponentStats } = computeDoublesAggregates(mg, parts, get().rounds, get().roundSitOuts, get().doublesMatches)
        const pendingMatches = get().doublesMatches.filter(m => mgRounds.some(r => r.id === m.roundId) && m.status === 'PENDING').length
        return buildFairnessAlerts(mgRounds, mgSitOuts, standings, pairStats, opponentStats, pendingMatches)
      },

      getTournamentDashboard: (minigameId) => {
        const mg = get().getMinigame(minigameId)
        if (!mg) return null
        const parts = get().participants.filter(p => p.minigameId === minigameId)
        const partIds = new Set(parts.map(p => p.memberId))
        const mgRounds = get().rounds.filter(r => r.minigameId === minigameId).sort((a, b) => a.roundNumber - b.roundNumber)
        const mgSitOuts = get().roundSitOuts.filter(so => so.minigameId === minigameId)
        const mgMatches = get().doublesMatches.filter(m => mgRounds.some(r => r.id === m.roundId))
        const { standings: allStandings, pairStats, opponentStats } = computeDoublesAggregates(mg, parts, get().rounds, get().roundSitOuts, get().doublesMatches)
        const standings = allStandings.filter(s => partIds.has(s.memberId))

        const completed = mgMatches.filter(m => m.status === 'COMPLETED')
        const pending = mgMatches.filter(m => m.status === 'PENDING')
        const currentRound = mgRounds.length > 0 ? mgRounds[mgRounds.length - 1] : null
        const currentRoundMatches = currentRound ? mgMatches.filter(m => m.roundId === currentRound.id) : []
        const currentRoundSitOuts = currentRound ? mgSitOuts.filter(so => so.roundId === currentRound.id) : []

        const leaderStanding = standings[0]
        const leader = leaderStanding ? { name: leaderStanding.memberName, points: leaderStanding.rankingPoints } : null

        const sortedPairs = [...pairStats].filter(p => p.pairedCount >= 2).sort((a, b) => b.wonTogether - a.wonTogether)
        const bestPairEntry = sortedPairs[0]
        const bestPair = bestPairEntry ? { names: `${bestPairEntry.memberAName} & ${bestPairEntry.memberBName}`, wins: bestPairEntry.wonTogether } : null

        const sortedByWinRate = [...standings].filter(s => s.played > 0).sort((a, b) => b.winRate - a.winRate)
        const bestWinRateEntry = sortedByWinRate[0]
        const bestWinRate = bestWinRateEntry ? { name: bestWinRateEntry.memberName, rate: bestWinRateEntry.winRate } : null

        const sortedBySitOuts = [...standings].sort((a, b) => b.sitOutCount - a.sitOutCount)
        const mostSitOutsEntry = sortedBySitOuts[0] && sortedBySitOuts[0].sitOutCount > 0 ? sortedBySitOuts[0] : null
        const mostSitOuts = mostSitOutsEntry ? { name: mostSitOutsEntry.memberName, count: mostSitOutsEntry.sitOutCount } : null

        const alerts = buildFairnessAlerts(mgRounds, mgSitOuts, standings, pairStats, opponentStats, pending.length)

        const dashboard: TournamentDashboardData = {
          kpi: {
            totalParticipants: parts.filter(p => p.status === 'ACTIVE').length,
            totalRounds: mgRounds.length,
            totalMatches: mgMatches.length,
            completedMatches: completed.length,
            completionRate: mgMatches.length > 0 ? Math.round((completed.length / mgMatches.length) * 100) : 0,
            pendingMatches: pending.length,
            currentSitOuts: currentRoundSitOuts.length,
            leader,
            bestPair,
            bestWinRate,
            mostSitOuts,
          },
          currentRound,
          currentRoundMatches,
          currentRoundSitOuts,
          standings,
          pairStats: sortedPairs.length > 0 ? [...pairStats].sort((a, b) => b.winRateTogether - a.winRateTogether) : pairStats,
          alerts,
          roundHistory: mgRounds,
        }
        return dashboard
      },

      // ── Fixed Doubles Round-Robin actions ─────────────────────────────────

      getTeams: (minigameId) => get().teams.filter(t => t.minigameId === minigameId),

      addTeam: (team) => set(s => ({ teams: [...s.teams, team] })),

      removeTeam: (teamId) => set(s => ({
        teams: s.teams.filter(t => t.id !== teamId),
        teamMatches: s.teamMatches.filter(m => m.team1Id !== teamId && m.team2Id !== teamId),
      })),

      updateTeam: (teamId, updates) => set(s => ({
        teams: s.teams.map(t => t.id === teamId ? { ...t, ...updates } : t),
      })),

      autoGenerateTeams: (minigameId) => {
        const mg = get().getMinigame(minigameId)
        if (!mg) return
        const parts = get().participants.filter(p => p.minigameId === minigameId && p.status === 'ACTIVE')
        if (parts.length < 4) { toast.error('Cần ít nhất 4 thành viên'); return }
        const pairingMode = mg.pairingMode ?? 'RANDOM_PAIRING'
        let sorted = [...parts]
        if (pairingMode === 'BALANCED_SKILL_PAIRING') {
          sorted.sort((a, b) => (b.skillLevel ?? 50) - (a.skillLevel ?? 50))
          // Pair best with worst, 2nd best with 2nd worst (snake draft)
          const newTeams: MiniGameTeam[] = []
          const n = Math.floor(sorted.length / 2)
          for (let i = 0; i < n; i++) {
            const p1 = sorted[i]
            const p2 = sorted[sorted.length - 1 - i]
            newTeams.push({
              id: `tm-${minigameId}-${Date.now()}-${i}`,
              minigameId,
              name: `Đội ${i + 1}`,
              player1: { memberId: p1.memberId, memberName: p1.memberName, skillLevel: p1.skillLevel },
              player2: { memberId: p2.memberId, memberName: p2.memberName, skillLevel: p2.skillLevel },
              seedLevel: i + 1,
            })
          }
          set(s => ({ teams: [...s.teams.filter(t => t.minigameId !== minigameId), ...newTeams] }))
        } else {
          // RANDOM_PAIRING: shuffle first
          for (let i = sorted.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sorted[i], sorted[j]] = [sorted[j], sorted[i]]
          }
          const newTeams: MiniGameTeam[] = []
          for (let i = 0; i < Math.floor(sorted.length / 2); i++) {
            const p1 = sorted[i * 2]
            const p2 = sorted[i * 2 + 1]
            newTeams.push({
              id: `tm-${minigameId}-${Date.now()}-${i}`,
              minigameId,
              name: `Đội ${i + 1}`,
              player1: { memberId: p1.memberId, memberName: p1.memberName, skillLevel: p1.skillLevel },
              player2: { memberId: p2.memberId, memberName: p2.memberName, skillLevel: p2.skillLevel },
              seedLevel: i + 1,
            })
          }
          set(s => ({ teams: [...s.teams.filter(t => t.minigameId !== minigameId), ...newTeams] }))
        }
        get().updateMinigame(minigameId, { status: 'PAIRED' })
        toast.success('Đã ghép cặp đôi tự động!')
      },

      generateTeamRoundRobinSchedule: (minigameId) => {
        const mgTeams = get().teams.filter(t => t.minigameId === minigameId)
        if (mgTeams.length < 2) { toast.error('Cần ít nhất 2 đội'); return }
        const n = mgTeams.length
        // Circle method: fix index 0, rotate the rest
        const indices = Array.from({ length: n }, (_, i) => i)
        const newMatches: MiniGameTeamMatch[] = []
        const rounds = n % 2 === 0 ? n - 1 : n
        let matchCounter = 1
        for (let round = 0; round < rounds; round++) {
          const rotated = [indices[0], ...indices.slice(1).map((_, k) => indices[1 + ((k + round) % (n - 1))])]
          let matchNum = 1
          for (let i = 0; i < Math.floor(n / 2); i++) {
            const t1 = mgTeams[rotated[i]]
            const t2 = mgTeams[rotated[n - 1 - i]]
            newMatches.push({
              id: `tm-m-${minigameId}-${matchCounter++}`,
              minigameId,
              round: round + 1,
              matchNumber: matchNum++,
              team1Id: t1.id,
              team2Id: t2.id,
              status: 'PENDING',
            })
          }
        }
        set(s => ({
          teamMatches: [...s.teamMatches.filter(m => m.minigameId !== minigameId), ...newMatches],
        }))
        get().updateMinigame(minigameId, { status: 'SCHEDULED' })
        toast.success(`Đã tạo lịch vòng tròn: ${newMatches.length} trận, ${rounds} vòng`)
      },

      clearTeamSchedule: (minigameId) => {
        set(s => ({ teamMatches: s.teamMatches.filter(m => m.minigameId !== minigameId) }))
        get().updateMinigame(minigameId, { status: 'PAIRED' })
        toast.success('Đã xóa lịch thi đấu')
      },

      enterTeamMatchResult: (matchId, team1Score, team2Score, note) => {
        set(s => ({
          teamMatches: s.teamMatches.map(m => {
            if (m.id !== matchId) return m
            const winningTeamId = team1Score > team2Score ? m.team1Id : team2Score > team1Score ? m.team2Id : undefined
            return { ...m, team1Score, team2Score, winningTeamId, status: 'COMPLETED' as const, note }
          }),
        }))
        const match = get().teamMatches.find(m => m.id === matchId)
        if (match) {
          const mgMatches = get().teamMatches.filter(m => m.minigameId === match.minigameId)
          const allDone = mgMatches.every(m => m.status === 'COMPLETED')
          if (allDone) get().updateMinigame(match.minigameId, { status: 'COMPLETED' })
          else get().updateMinigame(match.minigameId, { status: 'IN_PROGRESS' })
        }
        toast.success('Đã lưu kết quả trận đấu')
      },

      deleteTeamMatchResult: (matchId) => {
        set(s => ({
          teamMatches: s.teamMatches.map(m =>
            m.id !== matchId ? m : { ...m, team1Score: undefined, team2Score: undefined, winningTeamId: undefined, status: 'PENDING' as const, note: undefined }
          ),
        }))
        toast.success('Đã xóa kết quả trận đấu')
      },

      getTeamStandings: (minigameId) => {
        const mgTeams = get().teams.filter(t => t.minigameId === minigameId)
        const mgMatches = get().teamMatches.filter(m => m.minigameId === minigameId && m.status === 'COMPLETED')
        const mg = get().getMinigame(minigameId)
        const winPts = mg?.winPoints ?? 3
        const drawPts = mg?.drawPoints ?? 1
        const lossPts = mg?.lossPoints ?? 0
        const map = new Map<string, Omit<MiniGameTeamStanding, 'rank' | 'winRate'>>()
        for (const t of mgTeams) {
          map.set(t.id, {
            teamId: t.id, teamName: t.name,
            player1Name: t.player1.memberName, player2Name: t.player2.memberName,
            played: 0, won: 0, drawn: 0, lost: 0,
            pointsFor: 0, pointsAgainst: 0, pointDifference: 0, rankingPoints: 0,
          })
        }
        for (const m of mgMatches) {
          const t1 = map.get(m.team1Id)
          const t2 = map.get(m.team2Id)
          if (!t1 || !t2 || m.team1Score == null || m.team2Score == null) continue
          t1.played++; t2.played++
          t1.pointsFor += m.team1Score; t1.pointsAgainst += m.team2Score
          t2.pointsFor += m.team2Score; t2.pointsAgainst += m.team1Score
          if (m.winningTeamId === m.team1Id) {
            t1.won++; t2.lost++; t1.rankingPoints += winPts; t2.rankingPoints += lossPts
          } else if (m.winningTeamId === m.team2Id) {
            t2.won++; t1.lost++; t2.rankingPoints += winPts; t1.rankingPoints += lossPts
          } else {
            t1.drawn++; t2.drawn++; t1.rankingPoints += drawPts; t2.rankingPoints += drawPts
          }
        }
        return Array.from(map.values()).map(s => ({
          ...s,
          pointDifference: s.pointsFor - s.pointsAgainst,
          winRate: s.played > 0 ? Math.round((s.won / s.played) * 1000) / 10 : 0,
        })).sort((a, b) =>
          b.rankingPoints - a.rankingPoints ||
          b.pointDifference - a.pointDifference ||
          b.pointsFor - a.pointsFor
        ).map((s, i) => ({ ...s, rank: i + 1 }))
      },

      getFixedDoublesDashboard: (minigameId) => {
        const mg = get().getMinigame(minigameId)
        if (!mg) return null
        const mgTeams = get().teams.filter(t => t.minigameId === minigameId)
        const mgMatches = get().teamMatches.filter(m => m.minigameId === minigameId)
        const completed = mgMatches.filter(m => m.status === 'COMPLETED')
        const standings = get().getTeamStandings(minigameId)
        const leader = standings[0] ? { teamName: standings[0].teamName, points: standings[0].rankingPoints } : null
        const totalRounds = mgMatches.length > 0 ? Math.max(...mgMatches.map(m => m.round)) : 0
        return {
          kpi: {
            totalTeams: mgTeams.length,
            totalMatches: mgMatches.length,
            completedMatches: completed.length,
            pendingMatches: mgMatches.length - completed.length,
            completionRate: mgMatches.length > 0 ? Math.round((completed.length / mgMatches.length) * 100) : 0,
            leader,
            totalRounds,
          },
          teams: mgTeams,
          standings,
          schedule: mgMatches,
        }
      },
    }),
    {
      name: 'minigame-store',
      version: 6,
      migrate: (state: unknown, _version: number) => {
        const s = state as Record<string, unknown[]>
        const OLD_IDS = new Set(['mg-1', 'mg-2'])
        const allMinigames = (s.minigames ?? []) as { id: string; formatType?: string }[]
        const groupStageIds = new Set(allMinigames.filter(m => m.formatType === 'GROUP_STAGE').map(m => m.id))
        const nameMap: Record<string, string> = {
          'Lê Văn Cường': 'Lê Minh Cường', 'Phạm Thị Dung': 'Phạm Thu Dung',
          'Hoàng Văn Em': 'Hoàng Đức Anh', 'Vũ Thị Fương': 'Vũ Thị Lan',
          'Đặng Văn Giang': 'Đặng Văn Hùng', 'Ngô Văn Inh': 'Ngô Minh Tuấn',
          'Lý Thị Kim': 'Lý Thị Mai',
        }
        const fixName = (n: string) => nameMap[n] ?? n
        const roundsByMinigame = new Set(((s.rounds ?? []) as { minigameId: string }[]).map(r => r.minigameId))
        return {
          ...s,
          minigames: (allMinigames as { id: string; formatType?: string; status?: string }[])
            .filter(m => !OLD_IDS.has(m.id))
            .map(m => {
              // Fix status corrupted by the legacy generateSchedule bug overwriting
              // RANDOM_DOUBLES minigames with a GROUP_STAGE-only status value.
              if (m.formatType === 'RANDOM_DOUBLES' && (m.status === 'GROUPED' || m.status === 'SCHEDULED')) {
                return { ...m, status: roundsByMinigame.has(m.id) ? 'IN_PROGRESS' : 'DRAFT' }
              }
              return m
            }),
          participants: [
            ...MOCK_PARTICIPANTS_MG4,
            ...MOCK_PARTICIPANTS_MG3,
            ...((s.participants ?? []) as { id: string; minigameId: string; memberName: string }[])
              .filter(p => !OLD_IDS.has(p.minigameId) && p.minigameId !== 'mg-3' && p.minigameId !== 'mg-4')
              .map(p => ({ ...p, memberName: fixName(p.memberName) })),
          ],
          // Group-stage (1v1 round-robin) data only belongs to GROUP_STAGE minigames —
          // strip any groups/matches that ended up attached to RANDOM_DOUBLES minigames
          // by mistake (e.g. from a self-heal bug that ran the wrong schedule generator).
          groups: ((s.groups ?? []) as { minigameId: string }[])
            .filter(g => !OLD_IDS.has(g.minigameId) && groupStageIds.has(g.minigameId)),
          matches: ((s.matches ?? []) as { minigameId: string }[])
            .filter(m => !OLD_IDS.has(m.minigameId) && groupStageIds.has(m.minigameId)),
          rounds: ((s.rounds ?? []) as { minigameId: string }[]).filter(r => !OLD_IDS.has(r.minigameId)),
          roundSitOuts: ((s.roundSitOuts ?? []) as { minigameId: string; memberName: string }[])
            .filter(so => !OLD_IDS.has(so.minigameId))
            .map(so => ({ ...so, memberName: fixName(so.memberName) })),
          doublesMatches: ((s.doublesMatches ?? []) as { minigameId: string; team1: { memberName: string }[]; team2: { memberName: string }[] }[])
            .filter(dm => !OLD_IDS.has(dm.minigameId))
            .map(dm => ({
              ...dm,
              team1: dm.team1.map(p => ({ ...p, memberName: fixName(p.memberName) })),
              team2: dm.team2.map(p => ({ ...p, memberName: fixName(p.memberName) })),
            })),
          auditLog: ((s.auditLog ?? MOCK_AUDIT_LOG) as { minigameId: string }[]).filter(a => !OLD_IDS.has(a.minigameId)),
          teams: ((s as Record<string, unknown>).teams as MiniGameTeam[] | undefined) ?? MOCK_TEAMS,
          teamMatches: ((s as Record<string, unknown>).teamMatches as MiniGameTeamMatch[] | undefined) ?? MOCK_TEAM_MATCHES,
        }
      },
    }
  )
)
