import type { MiniGame } from '../types/minigame'
export type TournamentSection = 'schedule' | 'results' | 'standings'

export function tournamentSectionTarget(kind: TournamentSection, mg: MiniGame): string {
  const id = mg.id
  const sport = String(mg.sport ?? '')
  const fmt = String(mg.formatType ?? '')
  const teamStyle = ['FOOTBALL', 'BASKETBALL', 'VOLLEYBALL', 'AIR_VOLLEYBALL'].includes(sport)
    || (mg.participantType === 'PAIR' && (fmt === 'GROUP_STAGE' || fmt === 'KNOCKOUT'))
  if (teamStyle) return `/minigames/${id}?view=${kind === 'standings' ? 'standings' : 'schedule'}`
  if (sport === 'GOLF' && fmt !== 'KNOCKOUT') return `/minigames/${id}?view=${kind === 'standings' ? 'leaderboard' : 'scores'}`
  if (sport === 'RUNNING') return `/minigames/${id}`
  if (fmt === 'FIXED_DOUBLES_ROUND_ROBIN') return `/minigames/${id}?view=${kind === 'standings' ? 'standings' : 'schedule'}`
  if (fmt === 'KNOCKOUT') return `/minigames/${id}`
  return kind === 'standings' ? `/minigames/${id}/standings` : `/minigames/${id}/schedule`
}

/** Several formats edit scores on the schedule screen. Show that destination once. */
export function tournamentSectionLinks(mg: MiniGame) {
  const root = `/minigames/${mg.id}`
  const schedule = tournamentSectionTarget('schedule', mg)
  const results = tournamentSectionTarget('results', mg)
  const standings = tournamentSectionTarget('standings', mg)
  const candidates = [
    { key: 'schedule', label: schedule === results ? mg.sport === 'GOLF' ? 'Điểm số' : 'Lịch & kết quả' : 'Lịch đấu', to: schedule },
    { key: 'results', label: 'Kết quả', to: results },
    { key: 'standings', label: 'Xếp hạng', to: standings },
  ]
  const seen = new Set([root])
  return candidates.filter(link => {
    if (seen.has(link.to)) return false
    seen.add(link.to)
    return true
  })
}
