import { Users, Trophy, ClipboardList, RefreshCw } from 'lucide-react';

export interface TournamentKpi {
  totalMembers: number;
  totalGroups: number;
  totalExpectedMatches: number;
  completedMatches: number;
  pendingResultMatches: number;
  completionRate: number;
  totalSitOuts: number;
  currentRoundNumber: number;
}

interface MinigameKpiCardsProps {
  kpi: TournamentKpi;
}

export function MinigameKpiCards({ kpi }: MinigameKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* Card 1: Thành viên */}
      <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">
            Thành viên
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full [background:var(--pf-primary-soft)]">
            <Users size={18} className="[color:var(--pf-primary)]" />
          </span>
        </div>
        <div>
          <p className="text-3xl font-bold [color:var(--pf-text)]">{kpi.totalMembers}</p>
          <p className="text-xs [color:var(--pf-color-muted)] mt-1">{kpi.totalGroups} bảng đấu</p>
        </div>
      </div>

      {/* Card 2: Trận Hoàn Thành */}
      <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">
            Trận Hoàn Thành
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full [background:var(--pf-color-success-soft)]">
            <Trophy size={18} className="[color:var(--pf-color-success)]" />
          </span>
        </div>
        <div>
          <p className="text-3xl font-bold [color:var(--pf-text)]">
            {kpi.completedMatches}
            <span className="text-base font-normal [color:var(--pf-color-muted)]">
              /{kpi.totalExpectedMatches}
            </span>
          </p>
          <div className="mt-2 w-full rounded-full [background:var(--pf-color-muted-soft)] h-1.5">
            <div
              className="h-1.5 rounded-full [background:var(--pf-color-success)] transition-all duration-300"
              style={{ width: `${Math.min(kpi.completionRate, 100)}%` }}
            />
          </div>
          <p className="text-xs [color:var(--pf-color-muted)] mt-1">{kpi.completionRate.toFixed(0)}% hoàn thành</p>
        </div>
      </div>

      {/* Card 3: Chờ Nhập Điểm */}
      <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">
            Chờ Nhập Điểm
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full [background:var(--pf-color-warning-soft)]">
            <ClipboardList size={18} className="[color:var(--pf-color-warning)]" />
          </span>
        </div>
        <div>
          <p className="text-3xl font-bold [color:var(--pf-text)]">{kpi.pendingResultMatches}</p>
          {kpi.pendingResultMatches > 0 && (
            <span className="mt-1 inline-flex items-center rounded-full [background:var(--pf-color-warning-soft)] px-2.5 py-0.5 text-xs font-medium [color:var(--pf-color-warning)]">
              Cần xử lý
            </span>
          )}
        </div>
      </div>

      {/* Card 4: Vòng Hiện Tại */}
      <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold [color:var(--pf-text)] uppercase tracking-wide">
            Vòng Hiện Tại
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full [background:var(--pf-primary-soft)]">
            <RefreshCw size={18} className="[color:var(--pf-primary)]" />
          </span>
        </div>
        <div>
          <p className="text-3xl font-bold [color:var(--pf-text)]">
            Vòng {kpi.currentRoundNumber}
          </p>
          <p className="text-xs [color:var(--pf-color-muted)] mt-1">{kpi.totalSitOuts} người ngồi nghỉ</p>
        </div>
      </div>
    </div>
  );
}
