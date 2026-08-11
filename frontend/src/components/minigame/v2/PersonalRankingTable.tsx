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
  A: '[border-color:var(--pf-primary)]',
  B: '[border-color:var(--pf-primary)]',
  C: '[border-color:var(--pf-color-success)]',
  D: '[border-color:var(--pf-color-warning)]',
  E: '[border-color:var(--pf-color-danger)]',
};

const GROUP_TEXT: Record<string, string> = {
  A: '[color:var(--pf-primary)] [background:var(--pf-primary-soft)]',
  B: '[color:var(--pf-primary)] [background:var(--pf-primary-soft)]',
  C: '[color:var(--pf-color-success)] [background:var(--pf-color-success-soft)]',
  D: '[color:var(--pf-color-warning)] [background:var(--pf-color-warning-soft)]',
  E: '[color:var(--pf-color-danger)] [background:var(--pf-color-danger-soft)]',
};

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function PersonalRankingTable({ rankings, compact = false, onEdit, onDelete }: PersonalRankingTableProps) {
  const rows = compact ? rankings.slice(0, 5) : rankings;

  return (
    <div id="full-ranking" className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5 scroll-mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="[color:var(--pf-primary)]" />
          <h2 className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">
            Bảng Xếp Hạng Cá Nhân
          </h2>
        </div>
        {compact && (
          <a
            href="#full-ranking"
            className="text-xs [color:var(--pf-primary)] hover:[color:var(--pf-primary)] font-medium"
          >
            Xem tất cả
          </a>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--pf-border)]">
              {['#', 'Tên', 'Bảng', 'Played', 'W/D/L', 'PF:PA', '+/-', 'Pts', 'Win%'].map(
                (col) => (
                  <th
                    key={col}
                    className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide py-2 px-2 text-right first:text-left whitespace-nowrap"
                  >
                    {col}
                  </th>
                )
              )}
              {(onEdit || onDelete) && (
                <th className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide py-2 px-2 text-right whitespace-nowrap">

                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isTop3 = r.rank <= 3;
              const rowCls = isTop3
                ? '[background:var(--pf-color-warning-soft)] hover:[background:var(--pf-color-warning-soft)]'
                : 'hover:[background:var(--pf-surface-muted)]';
              const groupBorder = GROUP_BORDER[r.group] ?? '[border-color:var(--pf-border)]';
              const groupText = GROUP_TEXT[r.group] ?? '[color:var(--pf-color-muted)] [background:var(--pf-surface-muted)]';
              const diffColor =
                r.diff > 0 ? '[color:var(--pf-color-success)]' : r.diff < 0 ? '[color:var(--pf-color-danger)]' : '[color:var(--pf-color-muted)]';

              return (
                <tr
                  key={r.memberId}
                  className={`border-b border-[color:var(--pf-border)] transition-colors ${rowCls}`}
                >
                  {/* Rank */}
                  <td className="py-2 px-2 text-left whitespace-nowrap">
                    <span className="font-semibold [color:var(--pf-text)]">
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
                    <span className="font-medium [color:var(--pf-text)] whitespace-nowrap">{r.name}</span>
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
                  <td className="py-2 px-2 text-right [color:var(--pf-color-muted)]">{r.played}</td>

                  {/* W/D/L */}
                  <td className="py-2 px-2 text-right whitespace-nowrap">
                    <span className="[color:var(--pf-color-success)] font-medium">{r.won}</span>
                    <span className="[color:var(--pf-color-muted)] mx-0.5">/</span>
                    <span className="[color:var(--pf-color-warning)] font-medium">{r.drawn}</span>
                    <span className="[color:var(--pf-color-muted)] mx-0.5">/</span>
                    <span className="[color:var(--pf-color-danger)] font-medium">{r.lost}</span>
                  </td>

                  {/* PF:PA */}
                  <td className="py-2 px-2 text-right whitespace-nowrap [color:var(--pf-color-muted)]">
                    {r.pointsFor}:{r.pointsAgainst}
                  </td>

                  {/* Diff */}
                  <td className={`py-2 px-2 text-right font-semibold ${diffColor}`}>
                    {r.diff > 0 ? `+${r.diff}` : r.diff}
                  </td>

                  {/* Points */}
                  <td className="py-2 px-2 text-right font-bold [color:var(--pf-primary)]">{r.points}</td>

                  {/* Win Rate */}
                  <td className="py-2 px-2 text-right min-w-[80px]">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs [color:var(--pf-color-muted)]">{r.winRate}%</span>
                        {r.sitOutCount > 0 && (
                          <span className="text-xs [color:var(--pf-color-warning)] font-medium whitespace-nowrap">
                            (+{r.sitOutCount} nghỉ)
                          </span>
                        )}
                      </div>
                      <div className="w-14 h-1.5 [background:var(--pf-color-muted-soft)] rounded-full overflow-hidden">
                        <div
                          className="h-full [background:var(--pf-primary)] rounded-full"
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
                            className="p-1.5 rounded-lg [color:var(--pf-color-muted)] hover:[color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)] transition-colors"
                            title="Sửa thành viên"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(r.memberId, r.name)}
                            className="p-1.5 rounded-lg [color:var(--pf-color-muted)] hover:[color:var(--pf-color-danger)] hover:[background:var(--pf-color-danger-soft)] transition-colors"
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
