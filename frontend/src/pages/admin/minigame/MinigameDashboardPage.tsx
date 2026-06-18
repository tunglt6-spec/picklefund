import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Trophy, UserMinus, UserPen } from 'lucide-react'

import { StatusBadge } from '../../../components/minigame/v2/StatusBadge'
import { MinigameKpiCards } from '../../../components/minigame/v2/MinigameKpiCards'
import { GroupAssignmentPanel } from '../../../components/minigame/v2/GroupAssignmentPanel'
import { CurrentRoundPanel } from '../../../components/minigame/v2/CurrentRoundPanel'
import { FairnessAlertsPanel } from '../../../components/minigame/v2/FairnessAlertsPanel'
import { PersonalRankingTable } from '../../../components/minigame/v2/PersonalRankingTable'
import { QuickStatsPanel } from '../../../components/minigame/v2/QuickStatsPanel'
import { TournamentProgressChart } from '../../../components/minigame/v2/TournamentProgressChart'
import { QuickActionsPanel } from '../../../components/minigame/v2/QuickActionsPanel'
import { RecentActivitiesPanel } from '../../../components/minigame/v2/RecentActivitiesPanel'
import { DrawRoundModal } from '../../../components/minigame/DrawRoundModal'
import { useMinigameStore } from '../../../store/minigameStore'

export function MinigameDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [scoreEntryMatchId, setScoreEntryMatchId] = useState<string | null>(null)
  const [score1, setScore1] = useState<number>(0)
  const [score2, setScore2] = useState<number>(0)
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ memberId: string; name: string } | null>(null)
  const [editTarget, setEditTarget] = useState<{ memberId: string; name: string } | null>(null)
  const [editName, setEditName] = useState('')

  const { getMinigame, getTournamentDashboard, getRecentActivity, lockRound, enterDoublesMatchResult, removeParticipant, updateParticipant } = useMinigameStore()

  const mg = getMinigame(id!)
  const data = getTournamentDashboard(id!)

  if (!mg || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Không tìm thấy minigame</p>
      </div>
    )
  }

  const kpi = {
    totalMembers: data.kpi.totalParticipants,
    totalGroups: 0,
    totalExpectedMatches: data.kpi.totalMatches,
    completedMatches: data.kpi.completedMatches,
    pendingResultMatches: data.kpi.pendingMatches,
    completionRate: data.kpi.completionRate,
    totalSitOuts: data.kpi.currentSitOuts,
    currentRoundNumber: data.currentRound?.roundNumber ?? 0,
  }

  const currentRoundData = data.currentRound ? {
    roundNumber: data.currentRound.roundNumber,
    status: data.currentRound.status === 'COMPLETED' ? 'COMPLETED' as const : 'IN_PROGRESS' as const,
    totalMatches: data.currentRound.totalMatches,
    completedMatches: data.currentRoundMatches.filter(m => m.status === 'COMPLETED').length,
    sitOuts: data.currentRoundSitOuts.map(so => ({ id: so.memberId, name: so.memberName, skill: 'TB' as const })),
    matches: data.currentRoundMatches.map(m => ({
      id: m.id,
      matchNumber: m.matchNumber,
      status: m.status === 'COMPLETED' ? 'COMPLETED' as const : 'PENDING_RESULT' as const,
      team1: { player1Id: m.team1[0].memberId, player2Id: m.team1[1].memberId, player1: m.team1[0].memberName, player2: m.team1[1].memberName },
      team2: { player1Id: m.team2[0].memberId, player2Id: m.team2[1].memberId, player1: m.team2[0].memberName, player2: m.team2[1].memberName },
      score1: m.team1Score,
      score2: m.team2Score,
    })),
  } : null

  const rankings = data.standings.map(s => ({
    rank: s.rank,
    memberId: s.memberId,
    name: s.memberName,
    group: '',
    played: s.played,
    won: s.won,
    drawn: s.drawn,
    lost: s.lost,
    pointsFor: s.pointsFor,
    pointsAgainst: s.pointsAgainst,
    diff: s.pointDifference,
    points: s.rankingPoints,
    winRate: s.winRate,
    sitOutCount: s.sitOutCount,
  }))

  const mostPlayedStanding = data.standings.length > 0
    ? [...data.standings].sort((a, b) => b.played - a.played)[0]
    : null
  const bestDiffStanding = data.standings.length > 0
    ? [...data.standings].sort((a, b) => b.pointDifference - a.pointDifference)[0]
    : null
  const quickStats = {
    topScorer: data.kpi.leader ? { name: data.kpi.leader.name, points: data.kpi.leader.points } : { name: '—', points: 0 },
    bestDiff: bestDiffStanding ? { name: bestDiffStanding.memberName, diff: bestDiffStanding.pointDifference } : { name: '—', diff: 0 },
    topWinRate: data.kpi.bestWinRate ? { name: data.kpi.bestWinRate.name, rate: data.kpi.bestWinRate.rate } : { name: '—', rate: 0 },
    mostPlayed: mostPlayedStanding ? { name: mostPlayedStanding.memberName, count: mostPlayedStanding.played } : { name: '—', count: 0 },
    mostSitOut: data.kpi.mostSitOuts ? { name: data.kpi.mostSitOuts.name, count: data.kpi.mostSitOuts.count } : { name: '—', count: 0 },
  }

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

  const activities = getRecentActivity(id!, 5).map(a => ({
    id: a.id,
    text: a.detail,
    time: formatRelativeTime(a.createdAt),
    type: 'round' as const,
  }))

  const alertLabels: Record<typeof data.alerts[number]['level'], string> = {
    HIGH: 'Cần xử lý ngay', MED: 'Lưu ý', LOW: 'Thông tin',
  }
  const dashboardAlerts = data.alerts.map((a, i) => ({
    id: `alert-${i}-${a.level}`,
    level: a.level,
    title: alertLabels[a.level],
    description: a.message,
    actionLabel: a.actionLabel,
  }))

  const handleAlertAction = (alertId: string) => {
    const idx = Number(alertId.split('-')[1])
    const alert = data.alerts[idx]
    if (!alert) return
    if (alert.actionLabel.includes('Nhập')) {
      const pending = data.currentRoundMatches.find(m => m.status === 'PENDING')
      if (pending) handleEnterScore(pending.id)
    } else if (alert.actionLabel.includes('thành viên')) {
      navigate('/members')
    } else if (alert.actionLabel.includes('Tránh')) {
      navigate(`/minigames/${id}/standings`)
    } else if (alert.actionLabel.includes('Ưu tiên')) {
      setIsDrawModalOpen(true)
    } else {
      navigate(`/minigames/${id}/standings`)
    }
  }

  const groupCards = data.currentRoundMatches.map(m => ({
    id: m.id,
    label: `Trận ${m.matchNumber}`,
    members: [...m.team1, ...m.team2].map(p => ({
      id: p.memberId,
      name: p.memberName,
      skill: (p.skillLevel ?? 50) >= 70 ? 'Cao' as const : (p.skillLevel ?? 50) >= 50 ? 'TB' as const : 'Thấp' as const,
    })),
    totalExpectedMatches: 1,
    completedMatches: m.status === 'COMPLETED' ? 1 : 0,
  }))

  const scoreEntryMatch = scoreEntryMatchId
    ? data.currentRoundMatches.find(m => m.id === scoreEntryMatchId) ?? null
    : null

  const handleEnterScore = (matchId: string) => {
    setScoreEntryMatchId(matchId)
    setScore1(0)
    setScore2(0)
  }

  const handleSaveScore = () => {
    if (scoreEntryMatchId) {
      enterDoublesMatchResult(scoreEntryMatchId, score1, score2)
    }
    setScoreEntryMatchId(null)
  }

  const handleCloseModal = () => setScoreEntryMatchId(null)

  const handleDrawRound = () => setIsDrawModalOpen(true)
  const handleCompleteRound = () => {
    if (data.currentRound) lockRound(data.currentRound.id)
  }

  const handleEditParticipant = (memberId: string, name: string) => {
    setEditTarget({ memberId, name })
    setEditName(name)
  }

  const handleConfirmEdit = () => {
    if (!editTarget || !editName.trim()) return
    updateParticipant(id!, editTarget.memberId, { memberName: editName.trim() })
    setEditTarget(null)
  }

  const handleDeleteParticipant = (memberId: string, name: string) => {
    setDeleteTarget({ memberId, name })
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    removeParticipant(id!, deleteTarget.memberId)
    setDeleteTarget(null)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => navigate('/minigames')}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors w-fit"
            >
              <ArrowLeft size={14} />
              Danh Sách Minigame
            </button>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{mg.name}</h1>
              <StatusBadge status={mg.status as 'IN_PROGRESS' | 'COMPLETED' | 'DRAFT' | 'GROUPED' | 'SCHEDULED' | 'CANCELLED'} />
            </div>
            {mg.description && <p className="text-sm text-slate-500">{mg.description}</p>}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Calendar size={14} />
              <span>{mg.startDate} — {mg.endDate}</span>
            </div>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
              🏓 Đánh Đôi Ngẫu Nhiên
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 sm:px-6 py-5 space-y-6">
        <MinigameKpiCards kpi={kpi} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <GroupAssignmentPanel groups={groupCards} onDrawAgain={() => setIsDrawModalOpen(true)} />
          </div>

          <div className="lg:col-span-1">
            {currentRoundData ? (
              <CurrentRoundPanel
                round={currentRoundData}
                onEnterScore={handleEnterScore}
                onCompleteRound={handleCompleteRound}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center justify-center gap-2 text-center h-full min-h-[200px]">
                <p className="text-slate-400 font-medium">Chưa có lượt đấu nào</p>
                <p className="text-sm text-slate-400">Nhấn "Rút Thăm Vòng Mới" để bắt đầu</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 flex flex-col gap-5">
            <QuickActionsPanel
              minigameId={id!}
              onDrawRound={handleDrawRound}
              onCompleteRound={handleCompleteRound}
            />
            <FairnessAlertsPanel alerts={dashboardAlerts} onAction={handleAlertAction} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <TournamentProgressChart kpi={kpi} />
          <QuickStatsPanel stats={quickStats} />
          <RecentActivitiesPanel activities={activities} />
        </div>

        <PersonalRankingTable
          rankings={rankings}
          onEdit={handleEditParticipant}
          onDelete={handleDeleteParticipant}
        />
      </div>

      {/* Score Entry Modal */}
      {scoreEntryMatchId && scoreEntryMatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={20} className="text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">
                Nhập Kết Quả Trận #{scoreEntryMatch.matchNumber}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1">Đội 1</p>
                <p className="text-sm font-medium text-slate-800">
                  {scoreEntryMatch.team1[0].memberName} &amp; {scoreEntryMatch.team1[1].memberName}
                </p>
              </div>

              <div className="flex items-center gap-4 justify-center py-2">
                <div className="flex flex-col items-center gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Đội 1</label>
                  <input
                    type="number"
                    min={0}
                    max={21}
                    value={score1}
                    onChange={e => setScore1(Math.max(0, Math.min(21, Number(e.target.value))))}
                    className="w-20 h-12 text-center text-2xl font-bold text-indigo-600 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <span className="text-2xl font-bold text-slate-300 mt-5">—</span>
                <div className="flex flex-col items-center gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Đội 2</label>
                  <input
                    type="number"
                    min={0}
                    max={21}
                    value={score2}
                    onChange={e => setScore2(Math.max(0, Math.min(21, Number(e.target.value))))}
                    className="w-20 h-12 text-center text-2xl font-bold text-purple-600 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Đội 2</p>
                <p className="text-sm font-medium text-slate-800">
                  {scoreEntryMatch.team2[0].memberName} &amp; {scoreEntryMatch.team2[1].memberName}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveScore}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Lưu Kết Quả
              </button>
            </div>
          </div>
        </div>
      )}

      <DrawRoundModal
        minigameId={id!}
        isOpen={isDrawModalOpen}
        onClose={() => setIsDrawModalOpen(false)}
      />

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <UserMinus size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xóa thành viên</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Xóa <span className="font-semibold text-slate-700">{deleteTarget.name}</span> khỏi minigame?
                </p>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-5">
              Lịch sử trận đấu của thành viên này vẫn được giữ nguyên.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Participant Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <UserPen size={18} className="text-indigo-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Sửa thành viên</h3>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirmEdit()}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Nhập tên..."
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmEdit}
                disabled={!editName.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
