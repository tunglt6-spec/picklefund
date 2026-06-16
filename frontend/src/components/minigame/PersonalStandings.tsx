import type { MiniGamePersonalStanding } from '../../types/minigame'
import { cn } from '../../lib/utils'

const RANK_CLASS: Record<number, string> = {
  1: 'bg-yellow-50 border-l-2 border-yellow-400',
  2: 'bg-slate-50 border-l-2 border-slate-400',
  3: 'bg-amber-50 border-l-2 border-amber-400',
}

interface Props {
  standings: MiniGamePersonalStanding[]
}

export function PersonalStandings({ standings }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-800">Bảng Xếp Hạng Cá Nhân</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Thành Viên</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Trận</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">T/H/B</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Điểm+</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Điểm-</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">+/-</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Điểm XH</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Win%</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Ngồi Ngoài</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {standings.length === 0 && (
              <tr><td colSpan={10} className="text-center py-10 text-slate-400 text-sm">Chưa có dữ liệu</td></tr>
            )}
            {standings.map(s => (
              <tr key={s.memberId} className={cn('transition-colors', RANK_CLASS[s.rank] ?? 'hover:bg-slate-50/50')}>
                <td className="px-3 py-2.5 text-center">
                  <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    s.rank === 1 ? 'bg-yellow-400 text-white' :
                    s.rank === 2 ? 'bg-slate-400 text-white' :
                    s.rank === 3 ? 'bg-amber-500 text-white' :
                    'text-slate-500'
                  )}>
                    {s.rank}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{s.memberName}</td>
                <td className="px-3 py-2.5 text-center text-slate-700">{s.played}</td>
                <td className="px-3 py-2.5 text-center text-xs">
                  <span className="text-green-700 font-semibold">{s.won}</span>
                  <span className="text-slate-300 mx-0.5">/</span>
                  <span className="text-amber-600">{s.drawn}</span>
                  <span className="text-slate-300 mx-0.5">/</span>
                  <span className="text-red-500">{s.lost}</span>
                </td>
                <td className="px-3 py-2.5 text-center text-slate-700">{s.pointsFor}</td>
                <td className="px-3 py-2.5 text-center text-slate-400">{s.pointsAgainst}</td>
                <td className={cn('px-3 py-2.5 text-center font-semibold', s.pointDifference >= 0 ? 'text-green-600' : 'text-red-500')}>
                  {s.pointDifference > 0 ? '+' : ''}{s.pointDifference}
                </td>
                <td className="px-3 py-2.5 text-center font-bold text-indigo-700 text-base">{s.rankingPoints}</td>
                <td className="px-3 py-2.5 text-center text-slate-700">{s.winRate}%</td>
                <td className="px-3 py-2.5 text-center text-slate-500">{s.sitOutCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
