import type { MiniGamePersonalStanding } from '../../types/minigame'
import { cn } from '../../lib/utils'

const RANK_CLASS: Record<number, string> = {
  1: 'bg-yellow-50 border-l-2 border-yellow-400',
  2: '[background:var(--pf-surface-muted)] border-l-2 border-slate-400',
  3: 'bg-amber-50 border-l-2 border-amber-400',
}

interface Props {
  standings: MiniGamePersonalStanding[]
}

export function PersonalStandings({ standings }: Props) {
  return (
    <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[color:var(--pf-border)]">
        <p className="text-sm font-semibold [color:var(--pf-text)]">Bảng Xếp Hạng Cá Nhân</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--pf-border)] bg-slate-50/50">
              <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Thành Viên</th>
              <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Trận</th>
              <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">T/H/B</th>
              <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Điểm+</th>
              <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Điểm-</th>
              <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">+/-</th>
              <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Điểm XH</th>
              <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Win%</th>
              <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Ngồi Ngoài</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {standings.length === 0 && (
              <tr><td colSpan={10} className="text-center py-10 [color:var(--pf-color-muted)] text-sm">Chưa có dữ liệu</td></tr>
            )}
            {standings.map(s => (
              <tr key={s.memberId} className={cn('transition-colors', RANK_CLASS[s.rank] ?? 'hover:bg-slate-50/50')}>
                <td className="px-3 py-2.5 text-center">
                  <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    s.rank === 1 ? 'bg-yellow-400 text-white' :
                    s.rank === 2 ? 'bg-slate-400 text-white' :
                    s.rank === 3 ? 'bg-amber-500 text-white' :
                    '[color:var(--pf-color-muted)]'
                  )}>
                    {s.rank}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-medium [color:var(--pf-text)]">{s.memberName}</td>
                <td className="px-3 py-2.5 text-center [color:var(--pf-text)]">{s.played}</td>
                <td className="px-3 py-2.5 text-center text-xs">
                  <span className="text-green-700 font-semibold">{s.won}</span>
                  <span className="[color:var(--pf-color-muted)] mx-0.5">/</span>
                  <span className="text-amber-600">{s.drawn}</span>
                  <span className="[color:var(--pf-color-muted)] mx-0.5">/</span>
                  <span className="text-red-500">{s.lost}</span>
                </td>
                <td className="px-3 py-2.5 text-center [color:var(--pf-text)]">{s.pointsFor}</td>
                <td className="px-3 py-2.5 text-center [color:var(--pf-color-muted)]">{s.pointsAgainst}</td>
                <td className={cn('px-3 py-2.5 text-center font-semibold', s.pointDifference >= 0 ? 'text-green-600' : 'text-red-500')}>
                  {s.pointDifference > 0 ? '+' : ''}{s.pointDifference}
                </td>
                <td className="px-3 py-2.5 text-center font-bold [color:var(--pf-primary)] text-base">{s.rankingPoints}</td>
                <td className="px-3 py-2.5 text-center [color:var(--pf-text)]">{s.winRate}%</td>
                <td className="px-3 py-2.5 text-center [color:var(--pf-color-muted)]">{s.sitOutCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
