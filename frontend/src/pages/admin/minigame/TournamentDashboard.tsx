import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Users, RefreshCw, Swords, CheckCircle, Clock,
  UserMinus, Crown, TrendingUp, AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '../../../components/layout/PageHeader'
import { KpiCard } from '../../../components/ui/KpiCard'
import { Button } from '../../../components/ui/Button'
import { MatchCard2v2 } from '../../../components/minigame/MatchCard2v2'
import { ScoreEntryDrawer } from '../../../components/minigame/ScoreEntryDrawer'
import { SitOutPanel } from '../../../components/minigame/SitOutPanel'
import { FairnessAlerts } from '../../../components/minigame/FairnessAlerts'
import { DrawRoundPanel } from '../../../components/minigame/DrawRoundPanel'
import { DrawRoundModal } from '../../../components/minigame/DrawRoundModal'
import { RoundHistory } from '../../../components/minigame/RoundHistory'
import { PersonalStandings } from '../../../components/minigame/PersonalStandings'
import { PairStatsCard } from '../../../components/minigame/PairStatsCard'
import { WinRateChart } from '../../../components/minigame/WinRateChart'
import { RecentActivitiesPanel } from '../../../components/minigame/v2/RecentActivitiesPanel'
import { useMinigameStore } from '../../../store/minigameStore'
import type { MinigameStatus, MiniGameDoublesMatch } from '../../../types/minigame'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { cn } from '../../../lib/utils'
import toast from 'react-hot-toast'

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return 'Vừa xong'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} phút trước`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} giờ trước`
  const day = Math.floor(hr / 24)
  return `${day} ngày trước`
}

const AUDIT_ACTION_TYPE: Record<string, 'score' | 'round' | 'group' | 'system'> = {
  DRAW_ROUND: 'round',
  LOCK_ROUND: 'round',
  ENTER_RESULT: 'score',
}

const STATUS_LABEL: Record<MinigameStatus, string> = {
  DRAFT: 'Nháp', GROUPED: 'Đã Chia Bảng', PAIRED: 'Đã Ghép Cặp', SCHEDULED: 'Có Lịch',
  IN_PROGRESS: 'Đang Diễn Ra', COMPLETED: 'Hoàn Thành', CANCELLED: 'Đã Hủy',
}
const STATUS_CLASS: Record<MinigameStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600', GROUPED: 'bg-sky-100 text-sky-600',
  PAIRED: 'bg-violet-100 text-violet-700', SCHEDULED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

export function TournamentDashboard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getMinigame, getTournamentDashboard, updateMinigame, getRecentActivity } = useMinigameStore()

  const mg = getMinigame(id!)
  const dashboard = getTournamentDashboard(id!)
  const [scoreMatch, setScoreMatch] = useState<MiniGameDoublesMatch | null>(null)
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false)
  const isMobile = useIsMobile()

  if (!mg || !dashboard) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Không tìm thấy minigame</p>
      </div>
    )
  }

  const { kpi, currentRound, currentRoundMatches, currentRoundSitOuts, standings, pairStats, alerts, roundHistory } = dashboard

  const currentRoundHasCompletedMatches = currentRoundMatches.some(m => m.status === 'COMPLETED')

  // Sit-out streak: members in current sit-outs who were also in the previous round's sit-outs
  const prevRound = [...roundHistory].sort((a, b) => b.roundNumber - a.roundNumber).find(r => r.id !== currentRound?.id)
  const streakMemberIds = new Set<string>()
  if (currentRound && prevRound) {
    const prevSitOutIds = new Set(useMinigameStore.getState().getRoundDetail(prevRound.id).sitOuts.map(s => s.memberId))
    currentRoundSitOuts.forEach(s => { if (prevSitOutIds.has(s.memberId)) streakMemberIds.add(s.memberId) })
  }

  const handleComplete = () => {
    updateMinigame(id!, { status: 'COMPLETED' })
    toast.success('Giải đấu đã hoàn thành!')
  }

  const noActiveRound = !currentRound || currentRound.status === 'LOCKED' || currentRound.status === 'COMPLETED'

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {isMobile ? (
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate('/minigames')} className="text-slate-500"><ArrowLeft size={18} /></button>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-slate-800 truncate">{mg.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn('text-[10px] font-medium rounded-full px-1.5 py-0.5', STATUS_CLASS[mg.status])}>
                  {currentRound ? `Lượt ${currentRound.roundNumber} · ` : ''}{STATUS_LABEL[mg.status]}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {noActiveRound && mg.status !== 'COMPLETED' && (
              <button onClick={() => setIsDrawModalOpen(true)}
                className="flex-1 text-[12px] font-semibold text-white py-2 rounded-[10px]"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}>
                Bốc Thăm Lượt Mới
              </button>
            )}
            {mg.status === 'IN_PROGRESS' && (
              <button onClick={handleComplete}
                className="flex-1 text-[12px] font-medium text-slate-700 bg-slate-100 py-2 rounded-[10px]">
                Hoàn Thành Giải
              </button>
            )}
          </div>
        </div>
      ) : (
        <PageHeader
          title={mg.name}
          subtitle={`${mg.startDate}${mg.endDate ? ' → ' + mg.endDate : ''}`}
          actions={
            <div className="flex items-center gap-2">
              <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_CLASS[mg.status])}>
                {currentRound ? `Lượt ${currentRound.roundNumber} · ` : ''}{STATUS_LABEL[mg.status]}
              </span>
              {noActiveRound && mg.status !== 'COMPLETED' && (
                <Button size="sm" onClick={() => setIsDrawModalOpen(true)}>Bốc Thăm Lượt Mới</Button>
              )}
              {mg.status === 'IN_PROGRESS' && (
                <Button size="sm" variant="outline" onClick={handleComplete}>Hoàn Thành Giải</Button>
              )}
            </div>
          }
        />
      )}

      <div className="p-4">
        {!isMobile && <button onClick={() => navigate('/minigames')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors"><ArrowLeft size={14} /> Danh Sách</button>}

        {/* KPI Cards (10) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <KpiCard title="Tổng Thành Viên" value={kpi.totalParticipants} icon={<Users size={16} />} color="indigo" />
          <KpiCard title="Tổng Lượt Bốc Thăm" value={kpi.totalRounds} icon={<RefreshCw size={16} />} color="cyan" />
          <KpiCard title="Tổng Số Trận" value={kpi.totalMatches} icon={<Swords size={16} />} color="indigo" />
          <KpiCard title="Trận Hoàn Thành" value={`${kpi.completedMatches} (${kpi.completionRate}%)`} icon={<CheckCircle size={16} />} color="green" />
          <KpiCard title="Chờ Nhập KQ" value={kpi.pendingMatches} icon={<Clock size={16} />} color="yellow" alert={kpi.pendingMatches > 0} />
          <KpiCard title="Ngồi Ngoài Lượt Này" value={kpi.currentSitOuts} icon={<UserMinus size={16} />} color="red" />
          <KpiCard title="Đang Dẫn Đầu" value={kpi.leader?.name ?? '–'} subtitle={kpi.leader ? `${kpi.leader.points} điểm` : undefined} icon={<Crown size={16} />} color="yellow" />
          <KpiCard title="Cặp Thắng Nhiều Nhất" value={kpi.bestPair?.names ?? '–'} subtitle={kpi.bestPair ? `${kpi.bestPair.wins} thắng` : undefined} icon={<Users size={16} />} color="green" />
          <KpiCard title="Win Rate Cao Nhất" value={kpi.bestWinRate?.name ?? '–'} subtitle={kpi.bestWinRate ? `${kpi.bestWinRate.rate}%` : undefined} icon={<TrendingUp size={16} />} color="green" />
          <KpiCard title="Ngồi Ngoài Nhiều Nhất" value={kpi.mostSitOuts?.name ?? '–'} subtitle={kpi.mostSitOuts ? `${kpi.mostSitOuts.count} lượt` : undefined} icon={<AlertTriangle size={16} />} color="red" />
        </div>

        {/* 3-column section */}
        <div className="grid grid-cols-1 md:grid-cols-[28%_44%_28%] gap-4 mb-5">
          <div className="space-y-3">
            <DrawRoundPanel
              minigameId={id!}
              currentRound={currentRound}
              currentRoundHasCompletedMatches={currentRoundHasCompletedMatches}
              onOpenDrawModal={() => setIsDrawModalOpen(true)}
            />
            <RoundHistory rounds={roundHistory} />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800 px-1">
              {currentRound ? `Trận Đấu Lượt ${currentRound.roundNumber}` : 'Chưa Có Lượt Đấu'}
            </p>
            {currentRoundMatches.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 text-center text-sm text-slate-400">
                Chưa có trận đấu nào. Hãy bốc thăm lượt mới.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentRoundMatches.map(m => (
                  <MatchCard2v2 key={m.id} match={m} onEnterScore={setScoreMatch} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <SitOutPanel sitOuts={currentRoundSitOuts} streakMemberIds={streakMemberIds} />
            <FairnessAlerts alerts={alerts} />
            <RecentActivitiesPanel
              activities={getRecentActivity(id!, 10).map(a => ({
                id: a.id,
                text: a.detail,
                time: formatRelativeTime(a.createdAt),
                type: AUDIT_ACTION_TYPE[a.action] ?? 'system',
              }))}
            />
          </div>
        </div>

        {/* Standings */}
        <div className="mb-5">
          <PersonalStandings standings={standings} />
        </div>

        {/* Pair stats + win rate chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PairStatsCard pairStats={pairStats} />
          <WinRateChart standings={standings} />
        </div>
      </div>

      <ScoreEntryDrawer
        open={!!scoreMatch}
        onClose={() => setScoreMatch(null)}
        match={scoreMatch}
        minigame={mg}
      />

      <DrawRoundModal
        minigameId={id!}
        isOpen={isDrawModalOpen}
        onClose={() => setIsDrawModalOpen(false)}
      />
    </div>
  )
}
