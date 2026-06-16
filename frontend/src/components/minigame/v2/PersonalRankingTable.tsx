import { BarChart2, Pencil, Trash2 } from 'lucide-react';

interface DashboardRanking {
  rank: number;
  memberId: string;
  name: string;
  group: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  points: number;
  winRate: number;
  sitOutCount: number;
}

interface PersonalRankingTableProps {
  rankings: DashboardRanking[];
  compact?: boolean;
  onEdit?: (memberId: string, name: string) => void;
  onDelete?: (memberId: string, name: string) => void;
}

const GROUP_BORDER: Record<string, string> = {
  A: 'border-indigo-400',
  B: 'border-purple-400',
  C: 'border-emerald-400',
  D: 'border-amber-400',
  E: 'border-rose-400',
};

const GROUP_TEXT: Record<string, string> = {
  A: 'text-indigo-700 bg-indigo-50',
  B: 'text-purple-700 bg-purple-50',
  C: 'text-emerald-700 bg-emerald-50',
  D: 'text-amber-700 bg-amber-50',
  E: 'text-rose-700 bg-rose-50',
};

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function PersonalRankingTable({ rankings, compact = false, onEdit, onDelete }: PersonalRankingTableProps) {
  const rows = compact ? rankings.slice(0, 5) : rankings;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Bảng Xếp Hạng Cá Nhân
          </h2>
        </div>
        {compact && (
          <a
            href="#full-ranking"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Xem tất cả
          </a>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['#', 'Tên', 'Bảng', 'Played', 'W/D/L', 'PF:PA', '+/-', 'Pts', 'Win%'].map(
                (col) => (
                  <th
                    key={col}
                    className="text-xs font-semibold text-slate-400 uppercase tracking-wide py-2 px-2 text-right first:text-left whitespace-nowrap"
                  >
                    {col}
                  </th>
                )
              )}
              {(onEdit || onDelete) && (
                <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide py-2 px-2 text-right whitespace-nowrap">

                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isTop3 = r.rank <= 3;
              const rowCls = isTop3
                ? 'bg-amber-50/30 hover:bg-amber-50/60'
                : 'hover:bg-slate-50';
              const groupBorder = GROUP_BORDER[r.group] ?? 'border-slate-300';
              const groupText = GROUP_TEXT[r.group] ?? 'text-slate-600 bg-slate-50';
              const diffColor =
                r.diff > 0 ? 'text-green-600' : r.diff < 0 ? 'text-red-500' : 'text-slate-500';

              return (
                <tr
                  key={r.memberId}
                  className={`border-b border-slate-50 transition-colors ${rowCls}`}
                >
                  {/* Rank */}
                  <td className="py-2 px-2 text-left whitespace-nowrap">
                    <span className="font-semibold text-slate-700">
                      {MEDAL[r.rank] ? (
                        <span>
                          {MEDAL[r.rank]}
                          <span className="sr-only">{r.rank}</span>
                        </span>
                      ) : (
                        r.rank
                      )}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="py-2 px-2 text-left">
                    <span className="font-medium text-slate-800 whitespace-nowrap">{r.name}</span>
                  </td>

                  {/* Group badge */}
                  <td className="py-2 px-2 text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border-l-4 ${groupBorder} ${groupText}`}
                    >
                      {r.group}
                    </span>
                  </td>

                  {/* Played */}
                  <td className="py-2 px-2 text-right text-slate-600">{r.played}</td>

                  {/* W/D/L */}
                  <td className="py-2 px-2 text-right whitespace-nowrap">
                    <span className="text-green-600 font-medium">{r.won}</span>
                    <span className="text-slate-400 mx-0.5">/</span>
                    <span className="text-amber-500 font-medium">{r.drawn}</span>
                    <span className="text-slate-400 mx-0.5">/</span>
                    <span className="text-red-500 font-medium">{r.lost}</span>
                  </td>

                  {/* PF:PA */}
                  <td className="py-2 px-2 text-right whitespace-nowrap text-slate-600">
                    {r.pointsFor}:{r.pointsAgainst}
                  </td>

                  {/* Diff */}
                  <td className={`py-2 px-2 text-right font-semibold ${diffColor}`}>
                    {r.diff > 0 ? `+${r.diff}` : r.diff}
                  </td>

                  {/* Points */}
                  <td className="py-2 px-2 text-right font-bold text-indigo-700">{r.points}</td>

                  {/* Win Rate */}
                  <td className="py-2 px-2 text-right min-w-[80px]">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-600">{r.winRate}%</span>
                        {r.sitOutCount > 0 && (
                          <span className="text-xs text-orange-500 font-medium whitespace-nowrap">
                            (+{r.sitOutCount} nghỉ)
                          </span>
                        )}
                      </div>
                      <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(r.winRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  {(onEdit || onDelete) && (
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(r.memberId, r.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Sửa thành viên"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(r.memberId, r.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Xóa thành viên"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
