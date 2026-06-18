import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardEdit, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Button } from '../../../components/ui/Button'
import { ScoreEntryModal } from '../../../components/minigame/ScoreEntryModal'
import { ScoreEntryDrawer } from '../../../components/minigame/ScoreEntryDrawer'
import { useMinigameStore } from '../../../store/minigameStore'
import { useMinigameDetailSync } from '../../../hooks/useMinigameDetailSync'
import { useIsMobile } from '../../../hooks/useIsMobile'
import type { MiniGameMatch, MiniGameDoublesMatch } from '../../../types/minigame'
import { cn } from '../../../lib/utils'

type Filter = 'all' | 'pending' | 'completed' | string

/** Lịch Thi Đấu for RANDOM_DOUBLES minigames — sourced from rounds/doublesMatches
 *  (kept in sync with "Rút Thăm Vòng Mới" and the round/group panel on the dashboard),
 *  never from the legacy GROUP_STAGE groups/matches state. */
function DoublesSchedule({ minigameId, minigameName }: { minigameId: string; minigameName: string }) {
  const navigate = useNavigate()
  const { getMinigame, doublesMatches, rounds, removeDoublesMatch } = useMinigameStore()
  const mg = getMinigame(minigameId)
  const myMatches = doublesMatches.filter(m => m.minigameId === minigameId)
  const myRounds = rounds.filter(r => r.minigameId === minigameId).sort((a, b) => a.roundNumber - b.roundNumber)

  const [filter, setFilter] = useState<Filter>('all')
  const [scoreMatch, setScoreMatch] = useState<MiniGameDoublesMatch | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MiniGameDoublesMatch | null>(null)
  const isMobile = useIsMobile()

  const filtered = myMatches.filter(m => {
    if (filter === 'all') return true
    if (filter === 'pending') return m.status === 'PENDING'
    if (filter === 'completed') return m.status === 'COMPLETED'
    return m.roundId === filter
  }).sort((a, b) => {
    const ra = myRounds.find(r => r.id === a.roundId)?.roundNumber ?? 0
    const rb = myRounds.find(r => r.id === b.roundId)?.roundNumber ?? 0
    return ra !== rb ? ra - rb : a.matchNumber - b.matchNumber
  })

  const tabs: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: `Tất cả (${myMatches.length})` },
    { id: 'pending', label: `Chờ đấu (${myMatches.filter(m => m.status === 'PENDING').length})` },
    { id: 'completed', label: `Hoàn thành (${myMatches.filter(m => m.status === 'COMPLETED').length})` },
    ...myRounds.map(r => ({ id: r.id, label: `Vòng ${r.roundNumber}` })),
  ]

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/minigames/${minigameId}`)} className="text-slate-500">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-slate-800 truncate">Lịch Thi Đấu</p>
            <p className="text-[11px] text-slate-400 truncate">{minigameName} · {myMatches.length} trận · {myRounds.length} vòng</p>
          </div>
          <button
            onClick={() => setScoreMatch(myMatches.find(m => m.status === 'PENDING') ?? null)}
            className="shrink-0 text-[12px] font-semibold text-white px-3 py-1.5 rounded-[10px]"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
          >
            Nhập KQ
          </button>
        </div>

        {myRounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <p className="text-slate-500 font-medium text-[14px]">Chưa có lịch thi đấu</p>
            <p className="text-slate-400 text-[12px] mt-1 mb-4">Vào tổng quan và bấm "Rút Thăm Vòng Mới"</p>
            <button onClick={() => navigate(`/minigames/${minigameId}`)}
              className="text-[13px] font-semibold text-white px-4 py-2 rounded-[10px]"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}>
              Tới Rút Thăm
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 bg-white border-b border-slate-100 px-3 py-2 overflow-x-auto">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setFilter(t.id)}
                  className={cn(
                    'shrink-0 text-[11px] font-medium px-2.5 py-1.5 rounded-[8px]',
                    filter === t.id ? 'text-white' : 'text-slate-500 bg-slate-50'
                  )}
                  style={filter === t.id ? { background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' } : {}}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="px-4 py-4 space-y-3">
              {filtered.length === 0 ? (
                <p className="text-center text-slate-400 text-[13px] py-8">Không có trận nào</p>
              ) : filtered.map((m, idx) => {
                const rnd = myRounds.find(r => r.id === m.roundId)
                const team1Won = m.winningTeam === 1
                const team2Won = m.winningTeam === 2
                return (
                  <div key={m.id} className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] text-slate-400">Trận {idx + 1} · Vòng {rnd?.roundNumber ?? '–'}</span>
                      <span className={cn('text-[11px] font-medium',
                        m.status === 'COMPLETED' ? 'text-green-600' :
                        m.status === 'PLAYING' ? 'text-red-500' : 'text-slate-400'
                      )}>
                        {m.status === 'COMPLETED' ? '✅ Hoàn thành' : m.status === 'PLAYING' ? '🔴 Đang đấu' : '⏳ Chờ đấu'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn('flex-1 text-center py-2 rounded-[10px]', team1Won ? 'bg-green-50' : 'bg-slate-50')}>
                        <p className={cn('text-[12px] font-semibold leading-tight', team1Won ? 'text-green-700' : 'text-slate-800')}>
                          {m.team1.map(p => p.memberName.split(' ').pop()).join(' & ')}
                        </p>
                      </div>
                      <div className="shrink-0 text-center">
                        {m.status === 'COMPLETED'
                          ? <p className="text-[16px] font-black text-slate-900 font-mono">{m.team1Score}–{m.team2Score}</p>
                          : <p className="text-[13px] font-bold text-slate-300">vs</p>}
                      </div>
                      <div className={cn('flex-1 text-center py-2 rounded-[10px]', team2Won ? 'bg-green-50' : 'bg-slate-50')}>
                        <p className={cn('text-[12px] font-semibold leading-tight', team2Won ? 'text-green-700' : 'text-slate-800')}>
                          {m.team2.map(p => p.memberName.split(' ').pop()).join(' & ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setScoreMatch(m)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium text-indigo-600 bg-indigo-50 py-2 rounded-[10px]"
                      >
                        <Pencil size={12} /> {m.status === 'PENDING' ? 'Nhập KQ' : 'Sửa KQ'}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(m)}
                        className="px-3 py-2 text-red-500 bg-red-50 rounded-[10px]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <ScoreEntryDrawer open={!!scoreMatch} onClose={() => setScoreMatch(null)} match={scoreMatch} minigame={mg ?? null} />

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-t-[20px] p-6 w-full">
              <p className="font-semibold text-slate-800 mb-1">Xóa trận đấu?</p>
              <p className="text-[12px] text-slate-500 mb-3">
                {deleteTarget.team1.map(p => p.memberName).join(' & ')} vs {deleteTarget.team2.map(p => p.memberName).join(' & ')}
              </p>
              {deleteTarget.status === 'COMPLETED' && (
                <p className="text-[11px] text-amber-600 bg-amber-50 rounded-[10px] px-3 py-2 mb-3">
                  Trận này đã có kết quả. Xóa sẽ hủy kết quả.
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium text-slate-600 bg-slate-100">Hủy</button>
                <button onClick={() => { removeDoublesMatch(deleteTarget.id); setDeleteTarget(null) }}
                  className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium text-white bg-red-600">Xóa</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title={`Lịch Thi Đấu – ${minigameName}`}
        subtitle={`${myMatches.length} trận · ${myRounds.length} vòng`}
        actions={
          <Button size="sm" onClick={() => setScoreMatch(myMatches.find(m => m.status === 'PENDING') ?? null)}>
            <ClipboardEdit size={14} /> Nhập Kết Quả
          </Button>
        }
      />

      <div className="p-6">
        <button onClick={() => navigate(`/minigames/${minigameId}`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors">
          <ArrowLeft size={14} /> {minigameName}
        </button>

        {myRounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-slate-100 shadow-sm">
            <p className="text-slate-500 font-medium">Chưa có lịch thi đấu</p>
            <p className="text-slate-400 text-sm mt-1 mb-4">Vào trang tổng quan và bấm "Rút Thăm Vòng Mới" để tạo trận đấu</p>
            <Button onClick={() => navigate(`/minigames/${minigameId}`)}>Đi Tới Rút Thăm Vòng Mới</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 mb-4 bg-white rounded-xl border border-slate-100 shadow-sm p-1 overflow-x-auto">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={cn(
                    'whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
                    filter === t.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vòng</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Team 1</th>
                    <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase">vs</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Team 2</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tỷ Số</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Trạng Thái</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">Không có trận nào</td></tr>
                  )}
                  {filtered.map((m, idx) => {
                    const rnd = myRounds.find(r => r.id === m.roundId)
                    const team1Won = m.winningTeam === 1
                    const team2Won = m.winningTeam === 2
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{rnd?.roundNumber ?? '–'}</td>
                        <td className={cn('px-4 py-2.5 text-sm font-medium', team1Won ? 'text-green-700' : 'text-slate-800')}>
                          {m.team1.map(p => p.memberName).join(' & ')}
                        </td>
                        <td className="px-2 py-2.5 text-center text-xs text-slate-400 font-bold">vs</td>
                        <td className={cn('px-4 py-2.5 text-sm font-medium', team2Won ? 'text-green-700' : 'text-slate-800')}>
                          {m.team2.map(p => p.memberName).join(' & ')}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm font-mono font-semibold text-slate-900">
                          {m.status === 'COMPLETED' ? `${m.team1Score} – ${m.team2Score}` : '–'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn('text-xs font-medium',
                            m.status === 'COMPLETED' ? 'text-green-600' :
                            m.status === 'PLAYING' ? 'text-red-500' : 'text-slate-400'
                          )}>
                            {m.status === 'COMPLETED' ? '✅ Hoàn thành' :
                             m.status === 'PLAYING' ? '🔴 Đang đấu' : '⏳ Chờ đấu'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {m.status === 'PENDING' ? (
                              <Button size="sm" variant="ghost" onClick={() => setScoreMatch(m)}>
                                Nhập KQ
                              </Button>
                            ) : (
                              <button
                                onClick={() => setScoreMatch(m)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Sửa kết quả"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteTarget(m)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Xóa trận đấu"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ScoreEntryDrawer
        open={!!scoreMatch}
        onClose={() => setScoreMatch(null)}
        match={scoreMatch}
        minigame={mg ?? null}
      />

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Xóa trận đấu?</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {deleteTarget.team1.map(p => p.memberName).join(' & ')} vs {deleteTarget.team2.map(p => p.memberName).join(' & ')}
                </p>
              </div>
            </div>
            {deleteTarget.status === 'COMPLETED' && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
                Trận này đã có kết quả. Xóa sẽ hủy kết quả và xóa khỏi lịch thi đấu.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  removeDoublesMatch(deleteTarget.id)
                  setDeleteTarget(null)
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function MatchSchedule() {
  const { id } = useParams<{ id: string }>()
  useMinigameDetailSync(id)
  const navigate = useNavigate()
  const { getMinigame, matches, groups, generateSchedule } = useMinigameStore()
  const mg = getMinigame(id!)
  const myMatches = matches.filter(m => m.minigameId === id)
  const myGroups = groups.filter(g => g.minigameId === id).sort((a, b) => a.groupOrder - b.groupOrder)

  // Self-heal: if groups already exist but no schedule was generated yet
  // (e.g. minigames created before auto-schedule was wired in), generate it now.
  // Only applies to GROUP_STAGE minigames — RANDOM_DOUBLES uses its own round/draw flow.
  useEffect(() => {
    if (id && mg?.formatType === 'GROUP_STAGE' && myGroups.length > 0 && myMatches.length === 0) {
      generateSchedule(id)
    }
  }, [id, mg?.formatType, myGroups.length, myMatches.length, generateSchedule])

  const [filter, setFilter] = useState<Filter>('all')
  const [scoreMatch, setScoreMatch] = useState<MiniGameMatch | null>(null)
  const isMobile = useIsMobile()

  if (!mg) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-slate-500">Không tìm thấy minigame</p>
    </div>
  )

  if (mg.formatType === 'RANDOM_DOUBLES') {
    return <DoublesSchedule minigameId={id!} minigameName={mg.name} />
  }

  const filtered = myMatches.filter(m => {
    if (filter === 'all') return true
    if (filter === 'pending') return m.status === 'PENDING'
    if (filter === 'completed') return m.status === 'COMPLETED'
    return m.groupId === filter
  })

  const tabs: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: `Tất cả (${myMatches.length})` },
    { id: 'pending', label: `Chờ đấu (${myMatches.filter(m => m.status === 'PENDING').length})` },
    { id: 'completed', label: `Hoàn thành (${myMatches.filter(m => m.status === 'COMPLETED').length})` },
    ...myGroups.map(g => ({ id: g.id, label: g.groupName })),
  ]

  if (isMobile) {
    const mTabs: Array<{ id: Filter; label: string }> = [
      { id: 'all', label: `Tất cả (${myMatches.length})` },
      { id: 'pending', label: `Chờ (${myMatches.filter(m => m.status === 'PENDING').length})` },
      { id: 'completed', label: `Xong (${myMatches.filter(m => m.status === 'COMPLETED').length})` },
      ...myGroups.map(g => ({ id: g.id, label: g.groupName })),
    ]
    const mFiltered = myMatches.filter(m => {
      if (filter === 'all') return true
      if (filter === 'pending') return m.status === 'PENDING'
      if (filter === 'completed') return m.status === 'COMPLETED'
      return m.groupId === filter
    })
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/minigames/${id}`)} className="text-slate-500">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-slate-800 truncate">Lịch Thi Đấu</p>
            <p className="text-[11px] text-slate-400 truncate">{mg.name} · {myMatches.length} trận</p>
          </div>
          <button
            onClick={() => setScoreMatch(myMatches.find(m => m.status === 'PENDING') ?? null)}
            className="shrink-0 text-[12px] font-semibold text-white px-3 py-1.5 rounded-[10px]"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
          >
            Nhập KQ
          </button>
        </div>

        <div className="flex gap-1.5 bg-white border-b border-slate-100 px-3 py-2 overflow-x-auto">
          {mTabs.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={cn(
                'shrink-0 text-[11px] font-medium px-2.5 py-1.5 rounded-[8px]',
                filter === t.id ? 'text-white' : 'text-slate-500 bg-slate-50'
              )}
              style={filter === t.id ? { background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-4 py-4 space-y-3">
          {mFiltered.length === 0 ? (
            <p className="text-center text-slate-400 text-[13px] py-8">Không có trận nào</p>
          ) : mFiltered.map((m, idx) => {
            const grp = myGroups.find(g => g.id === m.groupId)
            const p1Won = m.winnerId === m.player1Id
            const p2Won = m.winnerId === m.player2Id
            return (
              <div key={m.id} className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-slate-400">Trận {idx + 1} · {grp?.groupName ?? '–'} · Vòng {m.round ?? 1}</span>
                  <span className={cn('text-[11px] font-medium',
                    m.status === 'COMPLETED' ? 'text-green-600' :
                    m.status === 'PLAYING' ? 'text-red-500' : 'text-slate-400'
                  )}>
                    {m.status === 'COMPLETED' ? '✅ Xong' : m.status === 'PLAYING' ? '🔴 Đấu' : '⏳ Chờ'}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className={cn('flex-1 text-center py-2 rounded-[10px]', p1Won ? 'bg-green-50' : 'bg-slate-50')}>
                    <p className={cn('text-[12px] font-semibold', p1Won ? 'text-green-700' : 'text-slate-800')}>{m.player1Name}</p>
                  </div>
                  <div className="shrink-0">
                    {m.status === 'COMPLETED'
                      ? <p className="text-[16px] font-black text-slate-900 font-mono">{m.player1Score}–{m.player2Score}</p>
                      : <p className="text-[13px] font-bold text-slate-300">vs</p>}
                  </div>
                  <div className={cn('flex-1 text-center py-2 rounded-[10px]', p2Won ? 'bg-green-50' : 'bg-slate-50')}>
                    <p className={cn('text-[12px] font-semibold', p2Won ? 'text-green-700' : 'text-slate-800')}>{m.player2Name}</p>
                  </div>
                </div>

                {m.status === 'PENDING' && (
                  <button
                    onClick={() => setScoreMatch(m)}
                    className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium text-indigo-600 bg-indigo-50 py-2 rounded-[10px]"
                  >
                    <ClipboardEdit size={12} /> Nhập Kết Quả
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <ScoreEntryModal
          open={!!scoreMatch} onClose={() => setScoreMatch(null)}
          match={scoreMatch} minigame={mg}
          groupName={scoreMatch ? myGroups.find(g => g.id === scoreMatch.groupId)?.groupName : undefined}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title={`Lịch Thi Đấu – ${mg.name}`}
        subtitle={`${myMatches.length} trận`}
        actions={
          <Button size="sm" onClick={() => setScoreMatch(myMatches.find(m => m.status === 'PENDING') ?? null)}>
            <ClipboardEdit size={14} /> Nhập Kết Quả
          </Button>
        }
      />

      <div className="p-6">
        <button onClick={() => navigate(`/minigames/${id}`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors">
          <ArrowLeft size={14} /> {mg.name}
        </button>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4 bg-white rounded-xl border border-slate-100 shadow-sm p-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={cn(
                'whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
                filter === t.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Bảng</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vòng</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Người Chơi 1</th>
                <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase">vs</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Người Chơi 2</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tỷ Số</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Trạng Thái</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-slate-400 text-sm">Không có trận nào</td></tr>
              )}
              {filtered.map((m, idx) => {
                const grp = myGroups.find(g => g.id === m.groupId)
                return (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{grp?.groupName ?? '–'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{m.round ?? 1}</td>
                    <td className={cn('px-4 py-2.5 text-sm font-medium', m.winnerId === m.player1Id ? 'text-green-700' : 'text-slate-800')}>
                      {m.player1Name}
                    </td>
                    <td className="px-2 py-2.5 text-center text-xs text-slate-400 font-bold">vs</td>
                    <td className={cn('px-4 py-2.5 text-sm font-medium', m.winnerId === m.player2Id ? 'text-green-700' : 'text-slate-800')}>
                      {m.player2Name}
                    </td>
                    <td className="px-4 py-2.5 text-center text-sm font-mono font-semibold text-slate-900">
                      {m.status === 'COMPLETED' ? `${m.player1Score} – ${m.player2Score}` : '–'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn('text-xs font-medium',
                        m.status === 'COMPLETED' ? 'text-green-600' :
                        m.status === 'PLAYING' ? 'text-red-500' : 'text-slate-400'
                      )}>
                        {m.status === 'COMPLETED' ? '✅ Hoàn thành' :
                         m.status === 'PLAYING' ? '🔴 Đang đấu' : '⏳ Chờ đấu'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {m.status === 'PENDING' && (
                        <Button size="sm" variant="ghost" onClick={() => setScoreMatch(m)}>
                          Nhập KQ
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ScoreEntryModal
        open={!!scoreMatch}
        onClose={() => setScoreMatch(null)}
        match={scoreMatch}
        minigame={mg}
        groupName={scoreMatch ? myGroups.find(g => g.id === scoreMatch.groupId)?.groupName : undefined}
      />
    </div>
  )
}
