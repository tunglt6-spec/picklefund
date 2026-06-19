import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Edit2, Trash2, Trophy } from 'lucide-react'
import api from '../../../lib/api'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Button } from '../../../components/ui/Button'
import { useMinigameStore } from '../../../store/minigameStore'
import { useAuthStore } from '../../../store/authStore'
import type { MinigameStatus } from '../../../types/minigame'
import { cn } from '../../../lib/utils'
import { useIsMobile } from '../../../hooks/useIsMobile'
import toast from 'react-hot-toast'

const STATUS_LABEL: Record<MinigameStatus, string> = {
  DRAFT: 'Nháp',
  GROUPED: 'Đã Chia Bảng',
  PAIRED: 'Đã Ghép Cặp',
  SCHEDULED: 'Có Lịch',
  IN_PROGRESS: 'Đang Diễn Ra',
  COMPLETED: 'Hoàn Thành',
  CANCELLED: 'Đã Hủy',
}

const STATUS_CLASS: Record<MinigameStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  GROUPED: 'bg-sky-100 text-sky-600',
  PAIRED: 'bg-violet-100 text-violet-700',
  SCHEDULED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

export function MinigameList() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getMinigames, deleteMinigame, participants, groups, matches } = useMinigameStore()
  const minigames = getMinigames(clubId)
  const isMobile = useIsMobile()

  const handleDelete = async (id: string) => {
    try {
      await api.post(`/minigames/${id}/cancel`)
      deleteMinigame(id)
      toast.success('Đã xóa minigame')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xóa minigame thất bại')
    }
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-bold text-slate-800">Minigame</p>
            <p className="text-[11px] text-slate-400">Giải đấu nội bộ CLB</p>
          </div>
          <button
            onClick={() => navigate('/minigames/new')}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-white px-3 py-1.5 rounded-[10px]"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
          >
            <Plus size={14} /> Tạo mới
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          {minigames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Trophy size={40} className="text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium text-[14px]">Chưa có giải đấu nào</p>
              <p className="text-slate-400 text-[12px] mt-1 mb-4">Tạo giải đấu đầu tiên</p>
              <button
                onClick={() => navigate('/minigames/new')}
                className="text-[13px] font-semibold text-white px-4 py-2 rounded-[10px]"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
              >
                Tạo Minigame
              </button>
            </div>
          ) : minigames.map(mg => {
            const parts = participants.filter(p => p.minigameId === mg.id && p.status === 'ACTIVE')
            const grps = groups.filter(g => g.minigameId === mg.id)
            const mts = matches.filter(m => m.minigameId === mg.id)
            const completed = mts.filter(m => m.status === 'COMPLETED').length
            const pct = mts.length > 0 ? Math.round((completed / mts.length) * 100) : 0
            return (
              <div key={mg.id} className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-[14px] leading-tight">{mg.name}</p>
                    {mg.description && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{mg.description}</p>}
                  </div>
                  <span className={cn('shrink-0 text-[11px] font-medium rounded-full px-2 py-0.5', STATUS_CLASS[mg.status])}>
                    {STATUS_LABEL[mg.status]}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className={cn(
                    'text-[11px] font-medium rounded-full px-2 py-0.5',
                    mg.formatType === 'RANDOM_DOUBLES' ? 'bg-purple-100 text-purple-700'
                    : mg.formatType === 'FIXED_DOUBLES_ROUND_ROBIN' ? 'bg-orange-100 text-orange-700'
                    : 'bg-cyan-100 text-cyan-700'
                  )}>
                    {mg.formatType === 'RANDOM_DOUBLES' ? '🏓 Đánh Đôi'
                    : mg.formatType === 'FIXED_DOUBLES_ROUND_ROBIN' ? '🤝 Đôi Cố Định'
                    : '👥 Vòng Bảng'}
                  </span>
                  <span className="text-[11px] text-slate-400">{mg.startDate}{mg.endDate ? ` → ${mg.endDate}` : ''}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Người', value: parts.length },
                    { label: 'Bảng', value: grps.length },
                    { label: 'Trận', value: mts.length },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 rounded-[10px] py-2 text-center">
                      <p className="text-[15px] font-bold text-slate-900">{item.value}</p>
                      <p className="text-[10px] text-slate-400">{item.label}</p>
                    </div>
                  ))}
                </div>

                {mts.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-400">Hoàn thành</span>
                      <span className="text-[11px] font-semibold text-slate-700">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/minigames/${mg.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium text-indigo-600 bg-indigo-50 py-2 rounded-[10px]"
                  >
                    <Eye size={13} /> Xem
                  </button>
                  <button
                    onClick={() => navigate(`/minigames/${mg.id}/edit`)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium text-slate-600 bg-slate-50 py-2 rounded-[10px]"
                  >
                    <Edit2 size={13} /> Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(mg.id)}
                    className="px-3 py-2 text-red-500 bg-red-50 rounded-[10px]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="🏆 Minigame / Giải Đấu Nội Bộ"
        subtitle="Quản lý các giải đấu nội bộ của câu lạc bộ"
        actions={
          <Button onClick={() => navigate('/minigames/new')}>
            <Plus size={16} /> Tạo Minigame
          </Button>
        }
      />

      <div className="p-6">
        {minigames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Trophy size={48} className="text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Chưa có giải đấu nào</p>
            <p className="text-slate-400 text-sm mt-1 mb-4">Tạo giải đấu đầu tiên cho câu lạc bộ</p>
            <Button onClick={() => navigate('/minigames/new')}>
              <Plus size={16} /> Tạo Minigame
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tên</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Thời gian</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Người / Bảng / Trận</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hoàn thành</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Trạng thái</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {minigames.map(mg => {
                  const parts = participants.filter(p => p.minigameId === mg.id && p.status === 'ACTIVE')
                  const grps = groups.filter(g => g.minigameId === mg.id)
                  const mts = matches.filter(m => m.minigameId === mg.id)
                  const completed = mts.filter(m => m.status === 'COMPLETED').length
                  const pct = mts.length > 0 ? Math.round((completed / mts.length) * 100) : 0
                  return (
                    <tr key={mg.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{mg.name}</p>
                          <span className={cn(
                            'text-xs font-medium rounded-full px-2 py-0.5 whitespace-nowrap',
                            mg.formatType === 'RANDOM_DOUBLES' ? 'bg-purple-100 text-purple-700'
                            : mg.formatType === 'FIXED_DOUBLES_ROUND_ROBIN' ? 'bg-orange-100 text-orange-700'
                            : 'bg-cyan-100 text-cyan-700'
                          )}>
                            {mg.formatType === 'RANDOM_DOUBLES' ? '🏓 Đánh Đôi'
                            : mg.formatType === 'FIXED_DOUBLES_ROUND_ROBIN' ? '🤝 Đôi Cố Định'
                            : '👥 Vòng Bảng'}
                          </span>
                        </div>
                        {mg.description && <p className="text-xs text-slate-400 mt-0.5">{mg.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {mg.startDate}{mg.endDate ? ` → ${mg.endDate}` : ''}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium text-slate-900">{parts.length}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="font-medium text-slate-900">{grps.length}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="font-medium text-slate-900">{mts.length}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {mts.length > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-semibold text-slate-900">{pct}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        ) : <span className="text-slate-400">–</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_CLASS[mg.status])}>
                          {STATUS_LABEL[mg.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/minigames/${mg.id}`)}>
                            <Eye size={14} /> Xem
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/minigames/${mg.id}/edit`)}>
                            <Edit2 size={14} /> Sửa
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(mg.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
