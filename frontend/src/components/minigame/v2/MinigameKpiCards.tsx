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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Thành viên
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100">
            <Users size={18} className="text-indigo-600" />
          </span>
        </div>
        <div>
          <p className="text-3xl font-bold text-slate-800">{kpi.totalMembers}</p>
          <p className="text-xs text-slate-400 mt-1">{kpi.totalGroups} bảng đấu</p>
        </div>
      </div>

      {/* Card 2: Trận Hoàn Thành */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Trận Hoàn Thành
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
            <Trophy size={18} className="text-green-600" />
          </span>
        </div>
        <div>
          <p className="text-3xl font-bold text-slate-800">
            {kpi.completedMatches}
            <span className="text-base font-normal text-slate-400">
              /{kpi.totalExpectedMatches}
            </span>
          </p>
          <div className="mt-2 w-full rounded-full bg-slate-100 h-1.5">
            <div
              className="h-1.5 rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${Math.min(kpi.completionRate, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">{kpi.completionRate.toFixed(0)}% hoàn thành</p>
        </div>
      </div>

      {/* Card 3: Chờ Nhập Điểm */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Chờ Nhập Điểm
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
            <ClipboardList size={18} className="text-amber-600" />
          </span>
        </div>
        <div>
          <p className="text-3xl font-bold text-slate-800">{kpi.pendingResultMatches}</p>
          {kpi.pendingResultMatches > 0 && (
            <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Cần xử lý
            </span>
          )}
        </div>
      </div>

      {/* Card 4: Vòng Hiện Tại */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Vòng Hiện Tại
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100">
            <RefreshCw size={18} className="text-purple-600" />
          </span>
        </div>
        <div>
          <p className="text-3xl font-bold text-slate-800">
            Vòng {kpi.currentRoundNumber}
          </p>
          <p className="text-xs text-slate-400 mt-1">{kpi.totalSitOuts} người ngồi nghỉ</p>
        </div>
      </div>
    </div>
  );
}
