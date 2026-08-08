import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Shuffle, Trophy, UserMinus, UserPen } from 'lucide-react'

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
import { useAuthStore } from '../../../store/authStore'
import api from '../../../lib/api'
import toast from 'react-hot-toast'

function isLocalToken(token?: string | null) {
  return !token || token.startsWith('local-token-') || token.startsWith('token-')
}

export function MinigameDashboardPage({ resync }: { resync?: () => void }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const accessToken = useAuthStore(s => s.accessToken)
  const backend = !isLocalToken(accessToken)
  const [scoreEntryMatchId, setScoreEntryMatchId] = useState<string | null>(null)
  const [score1, setScore1] = useState<number>(0)
  const [score2, setScore2] = useState<number>(0)
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ memberId: string; name: string } | null>(null)
  const [editTarget, setEditTarget] = useState<{ memberId: string; name: string } | null>(null)
  const [editName, setEditName] = useState('')
  // Mốc thời gian ổn định: tính 1 lần qua lazy initializer khi mount
  // (không gọi Date.now() trực tiếp trong render path, không recalculate mỗi render).
  const [now] = useState(() => Date.now())
  // Chặn double-submit cho các thao tác async (bốc vòng / kết thúc / lưu điểm).
  const [busy, setBusy] = useState(false)

  const { getMinigame, getTournamentDashboard, getRecentActivity, lockRound, enterDoublesMatchResult, removeParticipant, updateParticipant } = useMinigameStore()

  const mg = getMinigame(id!)
  const data = getTournamentDashboard(id!)

  if (!mg || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="[color:var(--pf-color-muted)]">Không tìm thấy minigame</p>
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

  // Kết thúc giải đấu: → COMPLETED + phát MINIGAME_COMPLETED (lịch sử CLB). Reuse POST /minigames/:id/end.
  const canFinish = mg.status !== 'COMPLETED' && mg.status !== 'CANCELLED' && data.kpi.totalMatches > 0
  const allDone = data.kpi.totalMatches > 0 && data.kpi.completedMatches === data.kpi.totalMatches
  const handleEndTournament = async () => {
    if (!id) return
    const remaining = data.kpi.totalMatches - data.kpi.completedMatches
    const msg = remaining > 0
      ? `Còn ${remaining} trận chưa có kết quả. Vẫn kết thúc giải đấu?`
      : 'Kết thúc giải đấu? Trạng thái chuyển "Hoàn Thành" và lưu vào lịch sử CLB.'
    if (!window.confirm(msg)) return
    setBusy(true)
    try {
      await api.post(`/minigames/${id}/end`)
      resync?.()
      toast.success('Đã kết thúc giải đấu — đã lưu vào lịch sử CLB!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi kết thúc giải đấu')
    } finally {
      setBusy(false)
    }
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
      // Optional-chaining: đội có thể chưa đủ 2 người (guest chưa resolve) — KHÔNG được crash trắng.
      team1: { player1Id: m.team1[0]?.memberId ?? '', player2Id: m.team1[1]?.memberId ?? '', player1: m.team1[0]?.memberName ?? '—', player2: m.team1[1]?.memberName ?? '—' },
      team2: { player1Id: m.team2[0]?.memberId ?? '', player2Id: m.team2[1]?.memberId ?? '', player1: m.team2[0]?.memberName ?? '—', player2: m.team2[1]?.memberName ?? '—' },
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
    const diffMs = now - new Date(iso).getTime()
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

  const handleSaveScore = async () => {
    if (scoreEntryMatchId) {
      setBusy(true)
      try {
        if (backend) {
          try {
            await api.patch(`/minigames/matches/${scoreEntryMatchId}/score`, { scoreA: score1, scoreB: score2 })
            resync?.()
          } catch (e: any) {
            toast.error(e?.response?.data?.message ?? 'Lưu kết quả thất bại')
          }
        } else {
          enterDoublesMatchResult(scoreEntryMatchId, score1, score2)
        }
      } finally {
        setBusy(false)
      }
    }
    setScoreEntryMatchId(null)
  }

  const handleCloseModal = () => setScoreEntryMatchId(null)

  // Đánh đôi ngẫu nhiên: backend bốc vòng mới (persist) rồi đồng bộ; local dùng modal mock.
  const handleDrawRound = async (mode: 'random' | 'mexicano' = 'random') => {
    setBusy(true)
    try {
      if (backend) {
        try {
          const ep = mode === 'mexicano' ? `/minigames/${id}/draw-round-mexicano` : `/minigames/${id}/draw-round`
          const res = await api.post(ep)
          const d = res.data?.data
          resync?.()
          toast.success(d ? `Đã bốc vòng ${d.round} — ${d.matches} trận${d.sitOut ? `, ${d.sitOut} nghỉ` : ''}` : 'Đã bốc vòng mới')
        } catch (e: any) {
          toast.error(e?.response?.data?.message ?? 'Bốc vòng thất bại')
        }
      } else {
        setIsDrawModalOpen(true)
      }
    } finally {
      setBusy(false)
    }
  }
  // Hoàn thành lượt: persist server (settings.lockedRounds) rồi resync — trước đây chỉ set store
  // nên hydrate lại mất tác dụng. Chế độ demo (local-token) giữ lock cục bộ.
  const handleCompleteRound = async () => {
    const cr = data.currentRound
    if (!cr) return
    if (backend) {
      try {
        await api.post(`/minigames/${id}/rounds/${cr.roundNumber}/lock`)
        resync?.()
        toast.success('Đã hoàn thành lượt')
      } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Lỗi hoàn thành lượt')
      }
    } else {
      lockRound(cr.id)
    }
  }

  const handleEditParticipant = (memberId: string, name: string) => {
    setEditTarget({ memberId, name })
    setEditName(name)
  }

  // Đổi tên người chơi (khách mời): persist server rồi resync. Chế độ demo: sửa store cục bộ.
  const handleConfirmEdit = async () => {
    if (!editTarget || !editName.trim()) return
    const key = editTarget.memberId
    const name = editName.trim()
    setEditTarget(null)
    if (backend) {
      try {
        await api.patch(`/minigames/${id}/participants/${key}`, { name })
        resync?.()
        toast.success('Đã cập nhật tên')
      } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Lỗi đổi tên')
      }
    } else {
      updateParticipant(id!, key, { memberName: name })
    }
  }

  const handleDeleteParticipant = (memberId: string, name: string) => {
    setDeleteTarget({ memberId, name })
  }

  // Xóa người chơi: persist server (xóa participant/khách) rồi resync — trước đây chỉ set store
  // nên F5 hiện lại. Chế độ demo: xóa store cục bộ.
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const key = deleteTarget.memberId
    setDeleteTarget(null)
    if (backend) {
      try {
        await api.delete(`/minigames/${id}/participants/${key}`)
        resync?.()
        toast.success('Đã xóa người chơi')
      } catch (e: any) {
        toast.error(e?.response?.data?.message ?? 'Lỗi xóa người chơi')
      }
    } else {
      removeParticipant(id!, key)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-bg)]">
      {/* Header / Top bar */}
      <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 sm:px-6 py-4">
        <button
          onClick={() => navigate('/minigames')}
          className="flex items-center gap-1.5 text-sm [color:var(--pf-color-muted)] hover:[color:var(--pf-text)] transition-colors w-fit"
        >
          <ArrowLeft size={14} />
          Danh Sách Minigame
        </button>

        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold [color:var(--pf-text)]">{mg.name}</h1>
              <StatusBadge status={mg.status as 'IN_PROGRESS' | 'COMPLETED' | 'DRAFT' | 'GROUPED' | 'SCHEDULED' | 'CANCELLED'} />
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">
                🏓 Đánh Đôi Ngẫu Nhiên
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-sm [color:var(--pf-color-muted)]">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {mg.startDate} — {mg.endDate}
              </span>
              {mg.description && (
                <>
                  <span className="[color:var(--pf-color-muted)]">·</span>
                  <span className="truncate">{mg.description}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0 md:flex-row md:items-center">
            {canFinish && (
              <button
                onClick={handleEndTournament}
                disabled={busy}
                title={allDone ? 'Kết thúc giải đấu — chuyển Hoàn Thành & lưu lịch sử CLB' : 'Còn trận chưa xong — vẫn có thể kết thúc'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:[filter:brightness(0.92)] disabled:opacity-60 disabled:cursor-not-allowed md:w-auto"
                style={{ background: allDone ? 'var(--pf-color-success)' : 'var(--pf-color-muted)' }}
              >
                <Trophy size={16} /> Kết thúc giải đấu
              </button>
            )}
            {/* Primary CTA — bốc vòng mới. Backend → persist qua API + resync; local → modal. */}
            <button
              onClick={() => handleDrawRound('random')}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl [background:var(--pf-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:[background:var(--pf-primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed md:w-auto"
            >
              <Shuffle size={16} />
              Bốc ngẫu nhiên (Americano)
            </button>
            {/* M6: Mexicano — bốc vòng ghép theo BXH (yêu cầu vòng trước đủ kết quả). */}
            <button
              onClick={() => handleDrawRound('mexicano')}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold [color:var(--pf-primary)] [background:var(--pf-primary-soft)] border-[color:var(--pf-primary-soft)] transition-colors hover:[background:var(--pf-primary)] hover:text-white disabled:opacity-60 disabled:cursor-not-allowed md:w-auto"
            >
              <Shuffle size={16} />
              Bốc theo BXH (Mexicano)
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pf-center-x w-full max-w-[1280px] px-4 sm:px-6 py-5 space-y-6">
        <MinigameKpiCards kpi={kpi} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <GroupAssignmentPanel groups={groupCards} onDrawAgain={handleDrawRound} />
          </div>

          <div className="lg:col-span-1">
            {currentRoundData ? (
              <CurrentRoundPanel
                round={currentRoundData}
                onEnterScore={handleEnterScore}
                onCompleteRound={handleCompleteRound}
              />
            ) : (
              <div className="[background:var(--pf-surface)] rounded-2xl shadow-sm border border-[color:var(--pf-border)] p-6 flex flex-col items-center justify-center gap-2 text-center h-full min-h-[200px]">
                <p className="[color:var(--pf-color-muted)] font-medium">Chưa có lượt đấu nào</p>
                <p className="text-sm [color:var(--pf-color-muted)]">Nhấn "Rút Thăm Vòng Mới" để bắt đầu</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 flex flex-col gap-5">
            <QuickActionsPanel
              minigameId={id!}
              onDrawRound={handleDrawRound}
              onCompleteRound={handleCompleteRound}
              canCompleteRound={!!data.currentRound}
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
          <div className="[background:var(--pf-surface)] rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={20} className="[color:var(--pf-primary)]" />
              <h3 className="text-lg font-bold [color:var(--pf-text)]">
                Nhập Kết Quả Trận #{scoreEntryMatch.matchNumber}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="[background:var(--pf-primary-soft)] rounded-xl p-3">
                <p className="text-xs font-semibold [color:var(--pf-primary)] uppercase tracking-wide mb-1">Đội 1</p>
                <p className="text-sm font-medium [color:var(--pf-text)]">
                  {scoreEntryMatch.team1?.[0]?.memberName ?? 'VĐV'} &amp; {scoreEntryMatch.team1?.[1]?.memberName ?? 'VĐV'}
                </p>
              </div>

              <div className="flex items-center gap-4 justify-center py-2">
                <div className="flex flex-col items-center gap-1.5">
                  <label className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">Đội 1</label>
                  <input
                    type="number"
                    min={0}
                    max={21}
                    value={score1}
                    onChange={e => setScore1(Math.max(0, Math.min(21, Number(e.target.value))))}
                    className="w-20 h-12 text-center text-2xl font-bold [color:var(--pf-primary)] border-2 [border-color:var(--pf-primary-soft)] rounded-xl focus:outline-none focus:[border-color:var(--pf-primary)]"
                  />
                </div>
                <span className="text-2xl font-bold [color:var(--pf-color-muted)] mt-5">—</span>
                <div className="flex flex-col items-center gap-1.5">
                  <label className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">Đội 2</label>
                  <input
                    type="number"
                    min={0}
                    max={21}
                    value={score2}
                    onChange={e => setScore2(Math.max(0, Math.min(21, Number(e.target.value))))}
                    className="w-20 h-12 text-center text-2xl font-bold [color:var(--pf-primary)] border-2 [border-color:var(--pf-primary-soft)] rounded-xl focus:outline-none focus:[border-color:var(--pf-primary)]"
                  />
                </div>
              </div>

              <div className="[background:var(--pf-primary-soft)] rounded-xl p-3">
                <p className="text-xs font-semibold [color:var(--pf-primary)] uppercase tracking-wide mb-1">Đội 2</p>
                <p className="text-sm font-medium [color:var(--pf-text)]">
                  {scoreEntryMatch.team2?.[0]?.memberName ?? 'VĐV'} &amp; {scoreEntryMatch.team2?.[1]?.memberName ?? 'VĐV'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[color:var(--pf-border)] text-sm font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveScore}
                disabled={busy}
                className="flex-1 py-2.5 px-4 rounded-xl [background:var(--pf-primary)] text-white text-sm font-medium hover:[background:var(--pf-primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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
          <div className="[background:var(--pf-surface)] rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full [background:var(--pf-color-danger-soft)] flex items-center justify-center shrink-0">
                <UserMinus size={18} className="[color:var(--pf-color-danger)]" />
              </div>
              <div>
                <h3 className="text-base font-bold [color:var(--pf-text)]">Xóa thành viên</h3>
                <p className="text-sm [color:var(--pf-color-muted)] mt-0.5">
                  Xóa <span className="font-semibold [color:var(--pf-text)]">{deleteTarget.name}</span> khỏi minigame?
                </p>
              </div>
            </div>
            <p className="text-xs [color:var(--pf-color-warning)] [background:var(--pf-color-warning-soft)] rounded-lg px-3 py-2 mb-5">
              Lịch sử trận đấu của thành viên này vẫn được giữ nguyên.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[color:var(--pf-border)] text-sm font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl [background:var(--pf-color-danger)] text-white text-sm font-medium hover:[filter:brightness(0.92)] transition-colors"
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
          <div className="[background:var(--pf-surface)] rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full [background:var(--pf-primary-soft)] flex items-center justify-center shrink-0">
                <UserPen size={18} className="[color:var(--pf-primary)]" />
              </div>
              <h3 className="text-base font-bold [color:var(--pf-text)]">Sửa thành viên</h3>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide mb-1.5">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirmEdit()}
                  className="w-full border border-[color:var(--pf-border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] focus:border-transparent"
                  placeholder="Nhập tên..."
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[color:var(--pf-border)] text-sm font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmEdit}
                disabled={!editName.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl [background:var(--pf-primary)] text-white text-sm font-medium hover:[background:var(--pf-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
