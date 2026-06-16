import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Shuffle, Lock, Calendar, ChevronDown } from 'lucide-react'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Button } from '../../../components/ui/Button'
import { useMinigameStore } from '../../../store/minigameStore'
import { cn } from '../../../lib/utils'
import toast from 'react-hot-toast'

export function GroupAssignment() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    getMinigame, participants, groups, generateGroups,
    generateSchedule, lockGroups, moveParticipant,
  } = useMinigameStore()

  const mg = getMinigame(id!)
  const myParts = participants.filter(p => p.minigameId === id && p.status === 'ACTIVE')
  const myGroups = groups.filter(g => g.minigameId === id).sort((a, b) => a.groupOrder - b.groupOrder)
  const [openMove, setOpenMove] = useState<string | null>(null)

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

  const handleAutoGenerate = () => {
    generateGroups(id!)
    generateSchedule(id!)
    toast.success('Đã chia bảng và tạo lịch thi đấu tự động!')
  }

  const handleLock = () => {
    lockGroups(id!)
    generateSchedule(id!)
    toast.success('Đã khóa bảng đấu và cập nhật lịch thi đấu!')
  }

  const handleCreateSchedule = () => {
    generateSchedule(id!)
    toast.success('Đã cập nhật lịch thi đấu!')
    navigate(`/minigames/${id}/schedule`)
  }

  const handleMove = (memberId: string, targetGroupId: string) => {
    moveParticipant(id!, memberId, targetGroupId)
    generateSchedule(id!)
    setOpenMove(null)
    toast.success('Đã chuyển thành viên và cập nhật lịch thi đấu!')
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
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
      />

      <div className="p-6">
        <button onClick={() => navigate(`/minigames/${id}`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors">
          <ArrowLeft size={14} /> {mg.name}
        </button>

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
