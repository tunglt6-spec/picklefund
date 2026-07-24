/**
 * MatchHistory (28) — Lịch sử thi đấu: hub read-only các giải đã có trận hoàn
 * thành (cross-tournament). Đếm từ minigameStore (giống MinigameList, không đổi
 * logic); link sang BXH / lịch trận đã render đúng sẵn. Shared kit V2.2 + token.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Trophy, Users, ListChecks, BarChart3, CalendarDays } from 'lucide-react'
import { useMinigameStore } from '../../../store/minigameStore'
import { useAuthStore } from '../../../store/authStore'
import { formatDate } from '../../../lib/utils'
import api from '../../../lib/api'
import { normalizeMinigameStatus, deriveMinigameDates, sportEmoji, type MinigameStatus, type MiniGame } from '../../../types/minigame'
import {
  PageShell, PageHeader, MetricCard, StatusBadge, EmptyState, LoadingState, ErrorState,
  type StatusTone,
} from '../../../components/shared'

function isLocalToken(token?: string | null) {
  return !token || token.startsWith('local-token-') || token.startsWith('token-')
}

const STATUS_LABEL: Record<MinigameStatus, string> = {
  DRAFT: 'Nháp', GROUPED: 'Đã chia bảng', PAIRED: 'Đã bốc thăm', SCHEDULED: 'Đã lên lịch',
  IN_PROGRESS: 'Đang diễn ra', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy',
}
const STATUS_TONE: Record<MinigameStatus, StatusTone> = {
  DRAFT: 'neutral', GROUPED: 'info', PAIRED: 'info', SCHEDULED: 'info',
  IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'danger',
}

export function MatchHistory() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getMinigames, participants, matches, setMinigamesFromApi } = useMinigameStore()
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle')

  const fetchMinigames = useCallback(async () => {
    if (!clubId || isLocalToken(accessToken)) { setLoadState('idle'); return }
    setLoadState('loading')
    try {
      const res = await api.get('/minigames')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any[] = res.data?.data ?? []
      const list: MiniGame[] = raw.map(m => ({
        id: m.id, clubId: m.clubId, name: m.name, description: m.description ?? undefined,
        ...deriveMinigameDates(m), status: normalizeMinigameStatus(m.status),
        groupSize: m.settings?.groupSize ?? 4, allowDraw: m.settings?.allowDraw ?? false,
        winPoints: m.settings?.winPoints ?? 3, drawPoints: m.settings?.drawPoints ?? 1,
        lossPoints: m.settings?.lossPoints ?? 0, notes: m.notes ?? undefined,
        createdBy: m.createdById ?? '', createdAt: m.createdAt ?? '',
        formatType: m.format ?? 'GROUP_STAGE', sport: m.sport ?? 'PICKLEBALL', scoringModel: m.scoringModel ?? 'HEAD_TO_HEAD', drawMode: m.settings?.drawMode ?? 'RANDOM',
        pairingMode: m.settings?.pairingMode ?? undefined,
      }))
      setMinigamesFromApi(clubId, list)
      setLoadState('idle')
    } catch {
      setLoadState('error')
    }
  }, [clubId, accessToken, setMinigamesFromApi])

  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (isLocalToken(accessToken)) return
    if (getMinigames(clubId).length === 0) void fetchMinigames()
  }, [accessToken, clubId, fetchMinigames, getMinigames])

  const minigames = getMinigames(clubId)

  // Giải "đã thi đấu" = có ít nhất 1 trận COMPLETED hoặc trạng thái đã kết thúc.
  const rows = minigames
    .map(mg => {
      const mts = matches.filter(m => m.minigameId === mg.id)
      return {
        mg,
        completed: mts.filter(m => m.status === 'COMPLETED').length,
        total: mts.length,
        players: participants.filter(p => p.minigameId === mg.id && p.status === 'ACTIVE').length,
      }
    })
    .filter(r => r.completed > 0 || r.mg.status === 'COMPLETED')
    .sort((a, b) => (b.mg.endDate ?? b.mg.createdAt ?? '').localeCompare(a.mg.endDate ?? a.mg.createdAt ?? ''))

  const totalMatches = rows.reduce((s, r) => s + r.completed, 0)
  const totalPlayers = rows.reduce((s, r) => s + r.players, 0)

  if (loadState === 'loading') return <PageShell><PageHeader title="Lịch sử thi đấu" subtitle="Các giải đã hoàn thành và kết quả" /><LoadingState /></PageShell>
  if (loadState === 'error') return <PageShell><PageHeader title="Lịch sử thi đấu" subtitle="Các giải đã hoàn thành và kết quả" /><ErrorState onRetry={fetchMinigames} /></PageShell>

  return (
    <PageShell>
      <PageHeader title="Lịch sử thi đấu" subtitle="Các giải đã hoàn thành và kết quả thi đấu" />

      {rows.length === 0 ? (
        <EmptyState icon={<History size={24} />} title="Chưa có lịch sử thi đấu" description="Khi các giải có trận hoàn thành, chúng sẽ xuất hiện tại đây." />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <MetricCard accent="violet" icon={<Trophy size={18} />} label="Giải đã thi đấu" value={rows.length} />
            <MetricCard accent="blue" icon={<ListChecks size={18} />} label="Trận đã hoàn thành" value={totalMatches} />
            <MetricCard accent="teal" icon={<Users size={18} />} label="Lượt người chơi" value={totalPlayers} />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {rows.map(({ mg, completed, total, players }) => (
              <div key={mg.id} className="rounded-[18px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold [color:var(--pf-text)] truncate">
                      {sportEmoji(mg.sport) && `${sportEmoji(mg.sport)} `}{mg.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs [color:var(--pf-color-muted)]">
                      <CalendarDays size={12} />{mg.endDate ? formatDate(mg.endDate) : mg.createdAt ? formatDate(mg.createdAt.slice(0, 10)) : '—'}
                    </p>
                  </div>
                  <StatusBadge tone={STATUS_TONE[mg.status] ?? 'neutral'}>{STATUS_LABEL[mg.status] ?? mg.status}</StatusBadge>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs [color:var(--pf-color-muted)]">
                  <span><strong className="[color:var(--pf-text)]">{completed}</strong>/{total} trận</span>
                  <span><strong className="[color:var(--pf-text)]">{players}</strong> người chơi</span>
                </div>

                <div className="mt-3 flex gap-2">
                  {mg.sport === 'FOOTBALL' || mg.sport === 'GOLF' ? (
                    // Bóng đá/golf có dashboard riêng (BXH/nhánh/điểm ngay trong màn quản lý).
                    <button onClick={() => navigate(`/minigames/${mg.id}`)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[10px] min-h-11 text-xs font-semibold text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] transition-colors">
                      <BarChart3 size={14} />{mg.sport === 'GOLF' ? 'Bảng điểm golf' : 'Kết quả & BXH'}
                    </button>
                  ) : (
                    <>
                      <button onClick={() => navigate(`/minigames/${mg.id}/standings`)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[10px] min-h-11 text-xs font-semibold text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] transition-colors">
                        <BarChart3 size={14} />Bảng xếp hạng
                      </button>
                      <button onClick={() => navigate(`/minigames/${mg.id}/schedule`)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[10px] min-h-11 text-xs font-semibold [color:var(--pf-primary)] [background:var(--pf-primary-soft)] hover:[border-color:var(--pf-primary)] transition-colors">
                        <ListChecks size={14} />Chi tiết trận
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  )
}
