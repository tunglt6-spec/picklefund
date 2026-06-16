import { PlayCircle, CheckCircle2 } from 'lucide-react'
import { DoubleMatchCard } from './DoubleMatchCard'

interface DashboardMember { id: string; name: string; skill: 'Cao'|'TB'|'Thấp'; isSeed?: boolean }
interface DashboardMatch {
  id: string; matchNumber: number
  status: 'COMPLETED'|'PENDING_RESULT'|'UPCOMING'
  court?: string
  team1: { player1Id: string; player2Id: string; player1: string; player2: string }
  team2: { player1Id: string; player2Id: string; player1: string; player2: string }
  score1?: number; score2?: number; completedAt?: string
}
interface DashboardRound {
  roundNumber: number; status: 'IN_PROGRESS'|'COMPLETED'
  totalMatches: number; completedMatches: number
  sitOuts: DashboardMember[]; matches: DashboardMatch[]
}

interface CurrentRoundPanelProps {
  round: DashboardRound
  onEnterScore?: (matchId: string) => void
  onCompleteRound?: () => void
}

export function CurrentRoundPanel({ round, onEnterScore, onCompleteRound }: CurrentRoundPanelProps) {
  const { roundNumber, totalMatches, completedMatches, sitOuts, matches } = round
  const progressPct = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0
  const allDone = completedMatches === totalMatches && totalMatches > 0

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <PlayCircle size={20} className="text-indigo-600 shrink-0" />
          <h2 className="text-base font-semibold text-slate-800">
            Vòng {roundNumber} – Đang Diễn Ra
          </h2>
        </div>
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700">
          {completedMatches}/{totalMatches} trận xong
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-2 rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 text-right">{progressPct}%</span>
      </div>

      {sitOuts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide text-xs">
            Ngồi Nghỉ Vòng Này:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sitOuts.map((member) => (
              <span
                key={member.id}
                className="bg-orange-100 text-orange-700 rounded-full px-2 py-0.5 text-xs font-medium"
              >
                {member.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {matches.map((match) => (
          <DoubleMatchCard
            key={match.id}
            match={match}
            onEnterScore={onEnterScore}
          />
        ))}
      </div>

      {allDone && onCompleteRound && (
        <button
          onClick={onCompleteRound}
          className="mt-1 w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 px-4 transition-colors"
        >
          <CheckCircle2 size={18} />
          Hoàn Thành Vòng
        </button>
      )}
    </div>
  )
}
