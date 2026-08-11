import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Users, Trophy, ClipboardList,
  LayoutGrid, CalendarDays, BarChart2, Crown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '../../../components/layout/PageHeader'
import { MetricCard } from '../../../components/shared/MetricCard'
import { PairBuilder } from '../../../components/minigame/PairBuilder'
import { useMinigameStore } from '../../../store/minigameStore'
import { isGuestId } from '../../../types/minigame'
import { cn } from '../../../lib/utils'
import api from '../../../lib/api'

const RANK_ROW: Record<number, string> = {
  1: '[background:var(--pf-color-warning-soft)]',
  2: '[background:var(--pf-surface-muted)]',
  3: '[background:var(--pf-color-warning-soft)]',
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
  const [busy, setBusy] = useState(false)
  // Nhánh loại trực tiếp tồn tại khi backend đã set settings.knockoutStage (POST /knockout-from-groups).
  // KHÔNG suy từ store.matches: hydrate vòng bảng lọc bỏ trận KO (groupId=null) nên luôn thiếu.
  const [hasKnockout, setHasKnockout] = useState(false)
  useEffect(() => {
    if (!id) return
    api.get(`/minigames/${id}`)
      .then(r => setHasKnockout(!!(r.data?.data ?? r.data)?.settings?.knockoutStage))
      .catch(() => {/* non-critical: chỉ để quyết định hiển thị nút "Vòng KO kế tiếp" */})
  }, [id])

  if (!mg || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="[color:var(--pf-color-muted)]">Không tìm thấy minigame</p>
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

  // M7: Group → Knockout — khi vòng bảng xong, sinh nhánh loại trực tiếp top-N mỗi bảng.
  const handleKnockoutFromGroups = async () => {
    if (!id) return
    if (!window.confirm('Tạo nhánh loại trực tiếp từ Top 2 mỗi bảng? (Vòng bảng phải đã nhập đủ kết quả)')) return
    setBusy(true)
    try {
      await api.post(`/minigames/${id}/knockout-from-groups`, { topN: 2 })
      resync?.()
      toast.success('Đã tạo nhánh loại trực tiếp! Xem/nhập kết quả ở Lịch thi đấu.')
      navigate(`/minigames/${id}/schedule`)
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Tạo nhánh thất bại') }
    finally { setBusy(false) }
  }
  const handleAdvanceKo = async () => {
    if (!id) return
    setBusy(true)
    try { await api.post(`/minigames/${id}/knockout/advance`); resync?.(); toast.success('Đã tạo vòng KO kế tiếp!') }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Không tạo được vòng kế tiếp') }
    finally { setBusy(false) }
  }

  const navCards = [
    {
      label: 'Chia Bảng', desc: 'Chia/khóa bảng, kéo-chuyển người',
      icon: <LayoutGrid size={18} className="text-white" />, bg: '[background:var(--pf-primary)]',
      to: `/minigames/${id}/groups`,
    },
    {
      label: 'Lịch Thi Đấu', desc: 'Xem lịch & nhập kết quả',
      icon: <CalendarDays size={18} className="text-white" />, bg: '[background:var(--pf-color-info)]',
      to: `/minigames/${id}/schedule`,
    },
    {
      label: 'Bảng Xếp Hạng', desc: 'BXH từng bảng + xuất ảnh/PDF',
      icon: <BarChart2 size={18} className="text-white" />, bg: '[background:var(--pf-color-warning)]',
      to: `/minigames/${id}/standings`,
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-bg)]">
      <PageHeader
        title={`👥 Vòng Bảng – ${mg.name}`}
        subtitle={`${mg.startDate}${mg.endDate ? ` — ${mg.endDate}` : ''}`}
        actions={
          <>
            {allDone && (
              <button
                onClick={handleKnockoutFromGroups}
                disabled={busy}
                title="Lấy Top 2 mỗi bảng tạo nhánh loại trực tiếp"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed md:w-auto"
                style={{ background: 'var(--pf-primary)' }}
              >
                <Trophy size={16} /> Tạo nhánh loại trực tiếp
              </button>
            )}
            {hasKnockout && (
              <button
                onClick={handleAdvanceKo}
                disabled={busy}
                title="Sinh vòng KO kế tiếp (khi vòng KO hiện tại đủ kết quả)"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold [color:var(--pf-primary)] [background:var(--pf-primary-soft)] border-[color:var(--pf-primary-soft)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed md:w-auto"
              >
                Vòng KO kế tiếp
              </button>
            )}
            {canFinish && (
              <button
                onClick={handleEndTournament}
                disabled={busy}
                title={allDone ? 'Kết thúc giải đấu — chuyển Hoàn Thành & lưu lịch sử CLB' : 'Còn trận chưa xong — vẫn có thể kết thúc'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed md:w-auto"
                style={{ background: allDone ? 'var(--pf-color-success)' : 'var(--pf-color-muted)' }}
              >
                <Trophy size={16} /> Kết thúc giải đấu
              </button>
            )}
          </>
        }
      />

      {/* Content */}
      <div className="p-4 sm:p-6 max-w-[1280px] mx-auto space-y-6">
        <button
          onClick={() => navigate('/minigames')}
          className="flex items-center gap-1.5 text-sm [color:var(--pf-color-muted)] hover:[color:var(--pf-text)] transition-colors w-fit"
        >
          <ArrowLeft size={14} /> Danh Sách Minigame
        </button>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            icon={<Users size={18} />}
            label="Người Chơi"
            value={kpi.totalParticipants}
            sub={`${kpi.totalGroups} bảng đấu`}
            accent="blue"
          />
          <MetricCard
            icon={<Trophy size={18} />}
            label="Trận Hoàn Thành"
            value={`${kpi.completedMatches}/${kpi.totalMatches}`}
            sub={`${kpi.completionRate}% hoàn thành`}
            tone="success"
          />
          <MetricCard
            icon={<ClipboardList size={18} />}
            label="Chờ Nhập Điểm"
            value={kpi.pendingMatches}
            sub={kpi.pendingMatches > 0 ? 'Cần xử lý' : undefined}
            tone={kpi.pendingMatches > 0 ? 'warning' : 'success'}
          />
          <MetricCard
            icon={<Crown size={18} />}
            label="Dẫn Đầu"
            value={kpi.leader?.name ?? '—'}
            sub={kpi.leader ? `${kpi.leader.points} điểm xếp hạng` : 'Chưa có kết quả'}
            accent="amber"
          />
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

        {/* ĐƠN: chọn/thêm VĐV bằng builder dùng chung — trước khi chia bảng (thống nhất với đôi). */}
        {!hasGroups && (
          <PairBuilder mode="single" minigameId={id!} onChanged={resync} />
        )}

        {/* BXH từng bảng */}
        {!hasGroups ? (
          <div className="[background:var(--pf-surface)] rounded-2xl border border-[color:var(--pf-border)] shadow-sm flex flex-col items-center justify-center py-16 text-center px-6">
            <LayoutGrid size={44} className="[color:var(--pf-color-muted)] mb-3" />
            <p className="[color:var(--pf-color-muted)] font-medium">Chưa chia bảng</p>
            <p className="[color:var(--pf-color-muted)] text-sm mt-1 mb-4">
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
              <div key={group.id} className="[background:var(--pf-surface)] rounded-2xl border border-[color:var(--pf-border)] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 [background:var(--pf-primary-soft)] border-b [border-color:var(--pf-primary-soft)]">
                  <div>
                    <p className="text-sm font-bold [color:var(--pf-primary)]">{group.groupName}</p>
                    <p className="text-xs [color:var(--pf-primary)]">{group.memberIds.length} người chơi</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                    group.status === 'LOCKED' ? '[background:var(--pf-color-success-soft)] [color:var(--pf-color-success)]' : '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]',
                  )}>
                    {group.status === 'LOCKED' ? '🔒 Đã khóa' : 'Mở'}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--pf-border)] text-[11px] [color:var(--pf-color-muted)] uppercase">
                      <th className="text-left px-3 py-2 font-semibold">#</th>
                      <th className="text-left px-2 py-2 font-semibold">Người chơi</th>
                      <th className="text-center px-2 py-2 font-semibold" title="Đã đấu">Đ</th>
                      <th className="text-center px-2 py-2 font-semibold" title="Thắng">T</th>
                      <th className="text-center px-2 py-2 font-semibold" title="Hiệu số">HS</th>
                      <th className="text-center px-3 py-2 font-semibold" title="Điểm xếp hạng">Điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--pf-border-soft)]">
                    {standings.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 [color:var(--pf-color-muted)] text-xs">Chưa có người chơi</td></tr>
                    ) : standings.map(s => (
                      <tr key={s.memberId} className={cn(RANK_ROW[s.rank] ?? '')}>
                        <td className="px-3 py-2 [color:var(--pf-color-muted)] font-medium">{s.rank}</td>
                        <td className="px-2 py-2 [color:var(--pf-text)] truncate max-w-[120px]">
                          <span className="inline-flex items-center gap-1.5">
                            {s.memberName}
                            {isGuestId(s.memberId) && (
                              <span className="text-[9px] font-medium px-1 py-0.5 rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">Khách</span>
                            )}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center [color:var(--pf-color-muted)]">{s.played}</td>
                        <td className="px-2 py-2 text-center [color:var(--pf-text)] font-medium">{s.won}</td>
                        <td className={cn('px-2 py-2 text-center font-medium', s.pointDifference > 0 ? '[color:var(--pf-color-success)]' : s.pointDifference < 0 ? '[color:var(--pf-color-danger)]' : '[color:var(--pf-color-muted)]')}>
                          {s.pointDifference > 0 ? `+${s.pointDifference}` : s.pointDifference}
                        </td>
                        <td className="px-3 py-2 text-center font-bold [color:var(--pf-text)]">{s.rankingPoints}</td>
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
