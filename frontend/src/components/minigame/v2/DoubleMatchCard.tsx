import { MapPin, ClipboardEdit } from 'lucide-react'


interface DashboardMatch {
  id: string; matchNumber: number
  status: 'COMPLETED'|'PENDING_RESULT'|'UPCOMING'
  court?: string
  team1: { player1Id: string; player2Id: string; player1: string; player2: string }
  team2: { player1Id: string; player2Id: string; player1: string; player2: string }
  score1?: number; score2?: number; completedAt?: string
}

interface DoubleMatchCardProps {
  match: DashboardMatch
  onEnterScore?: (matchId: string) => void
}

export function DoubleMatchCard({ match, onEnterScore }: DoubleMatchCardProps) {
  const { status, matchNumber, court, team1, team2, score1, score2 } = match

  const statusChip = () => {
    if (status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
          ✓ Xong
        </span>
      )
    }
    if (status === 'PENDING_RESULT') {
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
          ⏳ Chờ điểm
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">
        Sắp chơi
      </span>
    )
  }

  const renderScore = () => {
    if (status === 'COMPLETED' && score1 !== undefined && score2 !== undefined) {
      const team1Won = score1 > score2
      return (
        <div className="flex items-center justify-center gap-2 my-2">
          <span className={`text-2xl font-bold ${team1Won ? 'text-green-600' : 'text-red-500'}`}>
            {score1}
          </span>
          <span className="text-slate-400 font-semibold text-lg">:</span>
          <span className={`text-2xl font-bold ${!team1Won ? 'text-green-600' : 'text-red-500'}`}>
            {score2}
          </span>
        </div>
      )
    }
    if (status === 'PENDING_RESULT') {
      return (
        <div className="flex items-center justify-center gap-2 my-2">
          <span className="text-2xl font-bold text-amber-500">?</span>
          <span className="text-slate-400 font-semibold text-lg">:</span>
          <span className="text-2xl font-bold text-amber-500">?</span>
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center gap-2 my-2">
        <span className="text-2xl font-bold text-slate-300">–</span>
        <span className="text-slate-300 font-semibold text-lg">:</span>
        <span className="text-2xl font-bold text-slate-300">–</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Trận #{matchNumber}</span>
          {court && (
            <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs text-slate-500 bg-slate-100">
              <MapPin size={10} />
              Sân {court}
            </span>
          )}
        </div>
        {statusChip()}
      </div>

      <div className="flex items-stretch gap-2">
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-lg p-2">
          <span className="text-sm font-medium text-slate-700 text-center leading-tight">{team1.player1}</span>
          <span className="text-xs text-slate-400 my-0.5">&amp;</span>
          <span className="text-sm font-medium text-slate-700 text-center leading-tight">{team1.player2}</span>
        </div>

        <div className="flex flex-col items-center justify-center min-w-[70px]">
          {renderScore()}
          <span className="text-xs text-slate-400 font-medium">vs</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-lg p-2">
          <span className="text-sm font-medium text-slate-700 text-center leading-tight">{team2.player1}</span>
          <span className="text-xs text-slate-400 my-0.5">&amp;</span>
          <span className="text-sm font-medium text-slate-700 text-center leading-tight">{team2.player2}</span>
        </div>
      </div>

      {status === 'PENDING_RESULT' && onEnterScore && (
        <button
          onClick={() => onEnterScore(match.id)}
          className="mt-1 w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-1.5 px-3 transition-colors"
        >
          <ClipboardEdit size={14} />
          Nhập Điểm
        </button>
      )}
    </div>
  )
}
