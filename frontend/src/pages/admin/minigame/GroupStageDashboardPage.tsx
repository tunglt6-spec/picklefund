import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Users, Trophy, ClipboardList,
  LayoutGrid, CalendarDays, BarChart2, Crown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { StatusBadge } from '../../../components/minigame/v2/StatusBadge'
import { useMinigameStore } from '../../../store/minigameStore'
import { isGuestId } from '../../../types/minigame'
import { cn } from '../../../lib/utils'
import api from '../../../lib/api'

const RANK_ROW: Record<number, string> = {
  1: 'bg-yellow-50',
  2: 'bg-slate-50',
  3: 'bg-amber-50',
}

/** Dashboard riêng cho GROUP_STAGE (Vòng bảng): KPI đúng theo bảng/trận + điều hướng
 *  3 thao tác chính (Chia Bảng / Lịch / BXH) + xem trước BXH từng bảng. Không dùng chung
 *  page Đánh Đôi Ngẫu Nhiên (vốn hiển thị KPI vòng/ngồi-nghỉ = 0 cho vòng bảng). */
export function GroupStageDashboardPage({ resync }: { resync?: () => void }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getMinigame, getDashboard } = useMinigameStore()
  const mg = getMinigame(id!)
  const data = getDashboard(id!)

  if (!mg || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Không tìm thấy minigame</p>
      </div>
    )
  }

  const { kpi, groups } = data
  const hasGroups = groups.length > 0

  // Kết thúc giải đấu: → COMPLETED + phát MINIGAME_COMPLETED (lịch sử CLB). Reuse POST /minigames/:id/end.
  const canFinish = mg.status !== 'COMPLETED' && mg.status !== 'CANCELLED' && kpi.totalMatches > 0
  const allDone = kpi.totalMatches > 0 && kpi.completedMatches === kpi.totalMatches
  const handleEndTournament = async () => {
    if (!id) return
    const remaining = kpi.totalMatches - kpi.completedMatches
    const msg = remaining > 0
      ? `Còn ${remaining} trận chưa có kết quả. Vẫn kết thúc giải đấu?`
      : 'Kết thúc giải đấu? Trạng thái chuyển "Hoàn Thành" và lưu vào lịch sử CLB.'
    if (!window.confirm(msg)) return
    try {
      await api.post(`/minigames/${id}/end`)
      resync?.()
      toast.success('Đã kết thúc giải đấu — đã lưu vào lịch sử CLB!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi kết thúc giải đấu')
    }
  }

  const navCards = [
    {
      label: 'Chia Bảng', desc: 'Chia/khóa bảng, kéo-chuyển người',
      icon: <LayoutGrid size={18} className="text-white" />, bg: '[background:var(--pf-primary)]',
      to: `/minigames/${id}/groups`,
    },
    {
      label: 'Lịch Thi Đấu', desc: 'Xem lịch & nhập kết quả',
      icon: <CalendarDays size={18} className="text-white" />, bg: 'bg-sky-500',
      to: `/minigames/${id}/schedule`,
    },
    {
      label: 'Bảng Xếp Hạng', desc: 'BXH từng bảng + xuất ảnh/PDF',
      icon: <BarChart2 size={18} className="text-white" />, bg: 'bg-amber-500',
      to: `/minigames/${id}/standings`,
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <button
          onClick={() => navigate('/minigames')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors w-fit"
        >
          <ArrowLeft size={14} /> Danh Sách Minigame
        </button>

        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{mg.name}</h1>
              <StatusBadge status={mg.status as 'IN_PROGRESS' | 'COMPLETED' | 'DRAFT' | 'GROUPED' | 'SCHEDULED' | 'CANCELLED'} />
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">
                👥 Vòng Bảng
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {mg.startDate}{mg.endDate ? ` — ${mg.endDate}` : ''}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0 md:flex-row md:items-center">
            {canFinish && (
              <button
                onClick={handleEndTournament}
                title={allDone ? 'Kết thúc giải đấu — chuyển Hoàn Thành & lưu lịch sử CLB' : 'Còn trận chưa xong — vẫn có thể kết thúc'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors md:w-auto"
                style={{ background: allDone ? '#16A34A' : '#94A3B8' }}
              >
                <Trophy size={16} /> Kết thúc giải đấu
              </button>
            )}
            <button
              onClick={() => navigate(`/minigames/${id}/groups`)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl [background:var(--pf-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:[background:var(--pf-primary-hover)] md:w-auto"
            >
              <LayoutGrid size={16} /> Chia Bảng
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pf-center-x w-full max-w-[1280px] px-4 sm:px-6 py-5 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Người Chơi</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full [background:var(--pf-primary-soft)]">
                <Users size={18} className="[color:var(--pf-primary)]" />
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800">{kpi.totalParticipants}</p>
              <p className="text-xs text-slate-400 mt-1">{kpi.totalGroups} bảng đấu</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Trận Hoàn Thành</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                <Trophy size={18} className="text-green-600" />
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800">
                {kpi.completedMatches}
                <span className="text-base font-normal text-slate-400">/{kpi.totalMatches}</span>
              </p>
              <div className="mt-2 w-full rounded-full bg-slate-100 h-1.5">
                <div className="h-1.5 rounded-full bg-green-500 transition-all duration-300"
                  style={{ width: `${Math.min(kpi.completionRate, 100)}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1">{kpi.completionRate}% hoàn thành</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Chờ Nhập Điểm</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                <ClipboardList size={18} className="text-amber-600" />
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800">{kpi.pendingMatches}</p>
              {kpi.pendingMatches > 0 && (
                <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Cần xử lý
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Dẫn Đầu</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-100">
                <Crown size={18} className="text-yellow-600" />
              </span>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800 truncate">{kpi.leader?.name ?? '—'}</p>
              <p className="text-xs text-slate-400 mt-1">
                {kpi.leader ? `${kpi.leader.points} điểm xếp hạng` : 'Chưa có kết quả'}
              </p>
            </div>
          </div>
        </div>

        {/* Điều hướng nhanh */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {navCards.map(c => (
            <button key={c.label} onClick={() => navigate(c.to)}
              className={cn('rounded-2xl p-4 flex items-center gap-3 text-left transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--pf-primary)]', c.bg)}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shrink-0">{c.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{c.label}</span>
                <span className="block text-[11px] text-white/80 leading-tight">{c.desc}</span>
              </span>
            </button>
          ))}
        </div>

        {/* BXH từng bảng */}
        {!hasGroups ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 text-center px-6">
            <LayoutGrid size={44} className="text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">Chưa chia bảng</p>
            <p className="text-slate-400 text-sm mt-1 mb-4">
              {kpi.totalParticipants} người chơi sẽ được chia thành các bảng đấu vòng tròn.
            </p>
            <button onClick={() => navigate(`/minigames/${id}/groups`)}
              className="inline-flex items-center gap-2 rounded-xl [background:var(--pf-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:[background:var(--pf-primary-hover)]">
              <LayoutGrid size={16} /> Chia Bảng Tự Động
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(({ group, standings }) => (
              <div key={group.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 [background:var(--pf-primary-soft)] border-b [border-color:var(--pf-primary-soft)]">
                  <div>
                    <p className="text-sm font-bold [color:var(--pf-primary)]">{group.groupName}</p>
                    <p className="text-xs [color:var(--pf-primary)]">{group.memberIds.length} người chơi</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                    group.status === 'LOCKED' ? 'bg-green-100 text-green-700' : '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]',
                  )}>
                    {group.status === 'LOCKED' ? '🔒 Đã khóa' : 'Mở'}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase">
                      <th className="text-left px-3 py-2 font-semibold">#</th>
                      <th className="text-left px-2 py-2 font-semibold">Người chơi</th>
                      <th className="text-center px-2 py-2 font-semibold" title="Đã đấu">Đ</th>
                      <th className="text-center px-2 py-2 font-semibold" title="Thắng">T</th>
                      <th className="text-center px-2 py-2 font-semibold" title="Hiệu số">HS</th>
                      <th className="text-center px-3 py-2 font-semibold" title="Điểm xếp hạng">Điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {standings.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 text-slate-400 text-xs">Chưa có người chơi</td></tr>
                    ) : standings.map(s => (
                      <tr key={s.memberId} className={cn(RANK_ROW[s.rank] ?? '')}>
                        <td className="px-3 py-2 text-slate-500 font-medium">{s.rank}</td>
                        <td className="px-2 py-2 text-slate-800 truncate max-w-[120px]">
                          <span className="inline-flex items-center gap-1.5">
                            {s.memberName}
                            {isGuestId(s.memberId) && (
                              <span className="text-[9px] font-medium px-1 py-0.5 rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">Khách</span>
                            )}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center text-slate-500">{s.played}</td>
                        <td className="px-2 py-2 text-center text-slate-700 font-medium">{s.won}</td>
                        <td className={cn('px-2 py-2 text-center font-medium', s.pointDifference > 0 ? 'text-green-600' : s.pointDifference < 0 ? 'text-red-500' : 'text-slate-500')}>
                          {s.pointDifference > 0 ? `+${s.pointDifference}` : s.pointDifference}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-slate-900">{s.rankingPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
