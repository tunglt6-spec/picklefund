import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Shuffle, Lock, Calendar, ChevronDown } from 'lucide-react'
import api from '../../../lib/api'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Button } from '../../../components/ui/Button'
import { useMinigameStore } from '../../../store/minigameStore'
import { useMinigameDetailSync } from '../../../hooks/useMinigameDetailSync'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { cn } from '../../../lib/utils'
import toast from 'react-hot-toast'

export function GroupAssignment() {
  const { id } = useParams<{ id: string }>()
  useMinigameDetailSync(id)
  const navigate = useNavigate()
  const {
    getMinigame, participants, groups, generateGroups,
    generateSchedule, lockGroups, moveParticipant,
  } = useMinigameStore()

  const mg = getMinigame(id!)
  const myParts = participants.filter(p => p.minigameId === id && p.status === 'ACTIVE')
  const myGroups = groups.filter(g => g.minigameId === id).sort((a, b) => a.groupOrder - b.groupOrder)
  const [openMove, setOpenMove] = useState<string | null>(null)
  const isMobile = useIsMobile()

  if (!mg) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-slate-500">Không tìm thấy minigame</p>
    </div>
  )

  if (mg.formatType === 'RANDOM_DOUBLES') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
        <Shuffle size={40} className="text-slate-300" />
        <p className="text-slate-700 font-medium">Giải Đánh Đôi Ngẫu Nhiên không dùng chia bảng cố định</p>
        <p className="text-slate-400 text-sm max-w-md">
          Việc ghép cặp/chia đội cho từng vòng được thực hiện qua chức năng "Rút Thăm Vòng Mới" ở trang tổng quan của giải.
        </p>
        <Button onClick={() => navigate(`/minigames/${id}`)}>Đi Tới Rút Thăm Vòng Mới</Button>
      </div>
    )
  }

  const handleAutoGenerate = async () => {
    generateGroups(id!)
    generateSchedule(id!)
    try {
      await api.post(`/minigames/${id}/generate-teams`)
      await api.post(`/minigames/${id}/generate-schedule`)
      toast.success('Đã chia bảng và tạo lịch thi đấu tự động!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu bảng đấu lên server thất bại — dữ liệu chỉ lưu cục bộ')
    }
  }

  const handleLock = async () => {
    lockGroups(id!)
    generateSchedule(id!)
    try {
      await api.post(`/minigames/${id}/generate-schedule`)
      toast.success('Đã khóa bảng đấu và cập nhật lịch thi đấu!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu lịch thi đấu lên server thất bại — dữ liệu chỉ lưu cục bộ')
    }
  }

  const handleCreateSchedule = async () => {
    generateSchedule(id!)
    try {
      await api.post(`/minigames/${id}/generate-schedule`)
      toast.success('Đã cập nhật lịch thi đấu!')
      navigate(`/minigames/${id}/schedule`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu lịch thi đấu lên server thất bại — dữ liệu chỉ lưu cục bộ')
    }
  }

  const handleMove = (memberId: string, targetGroupId: string) => {
    moveParticipant(id!, memberId, targetGroupId)
    generateSchedule(id!)
    setOpenMove(null)
    toast.success('Đã chuyển thành viên và cập nhật lịch thi đấu!')
  }

  const mobileHeader = isMobile ? (
    <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(`/minigames/${id}`)} className="text-slate-500">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-slate-800 truncate">Chia Bảng</p>
          <p className="text-[11px] text-slate-400">{mg.name} · {myParts.length} người</p>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        <button onClick={handleAutoGenerate}
          className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-[8px]">
          <Shuffle size={12} /> Chia Tự Động
        </button>
        {myGroups.length > 0 && (
          <>
            <button onClick={handleLock}
              className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-[8px]">
              <Lock size={12} /> Khóa Bảng
            </button>
            <button onClick={handleCreateSchedule}
              className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-white px-3 py-1.5 rounded-[8px]"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}>
              <Calendar size={12} /> Tạo Lịch
            </button>
          </>
        )}
      </div>
    </div>
  ) : null

  return (
    <div className={isMobile ? 'min-h-screen bg-[#F8FAFC]' : 'flex-1 overflow-y-auto bg-slate-50'}>
      {isMobile ? mobileHeader : null}
      {!isMobile && <PageHeader
        title={`Chia Bảng – ${mg.name}`}
        subtitle={`${myParts.length} người tham gia`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleAutoGenerate}>
              <Shuffle size={14} /> Chia Tự Động
            </Button>
            {myGroups.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={handleLock}>
                  <Lock size={14} /> Khóa Bảng
                </Button>
                <Button size="sm" onClick={handleCreateSchedule}>
                  <Calendar size={14} /> Xem Lịch Thi Đấu
                </Button>
              </>
            )}
          </div>
        }
      />}

      <div className={isMobile ? 'px-4 py-4' : 'p-6'}>
        {!isMobile && <button onClick={() => navigate(`/minigames/${id}`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors"><ArrowLeft size={14} /> {mg.name}</button>}

        {myGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Shuffle size={48} className="text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Chưa có bảng đấu</p>
            <p className="text-slate-400 text-sm mt-1 mb-4">
              {myParts.length} người tham gia sẽ được chia thành các bảng
            </p>
            <Button onClick={handleAutoGenerate}>
              <Shuffle size={16} /> Chia Bảng Tự Động
            </Button>
          </div>
        ) : (
          <>
            {/* Participant list without group (unassigned) */}
            {myParts.filter(p => !myGroups.some(g => g.memberIds.includes(p.memberId))).length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-amber-700 mb-2">⚠️ Thành viên chưa được xếp bảng</p>
                <div className="flex flex-wrap gap-2">
                  {myParts
                    .filter(p => !myGroups.some(g => g.memberIds.includes(p.memberId)))
                    .map(p => (
                      <span key={p.memberId} className="bg-white text-amber-700 border border-amber-200 text-xs px-2 py-1 rounded-lg font-medium">
                        {p.memberName}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGroups.map(grp => (
                <div key={grp.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                    <div>
                      <p className="text-sm font-bold text-indigo-800">{grp.groupName}</p>
                      <p className="text-xs text-indigo-500">{grp.memberIds.length} thành viên</p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                      grp.status === 'LOCKED' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'
                    )}>
                      {grp.status === 'LOCKED' ? '🔒 Đã khóa' : 'Mở'}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {grp.memberIds.map(memberId => {
                      const part = myParts.find(p => p.memberId === memberId)
                      if (!part) return null
                      return (
                        <div key={memberId} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-sm text-slate-800">{part.memberName}</span>
                          {grp.status !== 'LOCKED' && (
                            <div className="relative">
                              <button
                                onClick={() => setOpenMove(openMove === memberId ? null : memberId)}
                                className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors px-2 py-1 rounded hover:bg-indigo-50"
                              >
                                Chuyển <ChevronDown size={12} />
                              </button>
                              {openMove === memberId && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-lg shadow-lg z-10 py-1 min-w-28">
                                  {myGroups.filter(g => g.id !== grp.id).map(target => (
                                    <button
                                      key={target.id}
                                      onClick={() => handleMove(memberId, target.id)}
                                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors"
                                    >
                                      → {target.groupName}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
