import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Shuffle, Lock, Calendar, ChevronDown } from 'lucide-react'
import api from '../../../lib/api'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Button } from '../../../components/ui/Button'
import { useMinigameStore } from '../../../store/minigameStore'
import { isGuestId } from '../../../types/minigame'
import { useMinigameDetailSync } from '../../../hooks/useMinigameDetailSync'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { cn } from '../../../lib/utils'
import toast from 'react-hot-toast'

export function GroupAssignment() {
  const { id } = useParams<{ id: string }>()
  const { resync } = useMinigameDetailSync(id)
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

  // Chia bảng chỉ dành cho GROUP_STAGE (RANDOM_DOUBLES có thông báo riêng bên dưới). Format đội
  // (đôi cố định/bóng đá/bóng rổ) & golf KHÔNG chia bảng → điều hướng về dashboard (tránh dead-end
  // "Chia Bảng Tự Động" báo lỗi). Chặn #5 trong audit.
  useEffect(() => {
    if (mg && mg.formatType !== 'GROUP_STAGE' && mg.formatType !== 'RANDOM_DOUBLES') {
      navigate(`/minigames/${id}`, { replace: true })
    }
  }, [mg, id, navigate])

  if (!mg) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="[color:var(--pf-color-muted)]">Không tìm thấy minigame</p>
    </div>
  )

  if (mg.formatType === 'RANDOM_DOUBLES') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
        <Shuffle size={40} className="[color:var(--pf-color-muted)]" />
        <p className="[color:var(--pf-text)] font-medium">Giải Đánh Đôi Ngẫu Nhiên không dùng chia bảng cố định</p>
        <p className="[color:var(--pf-color-muted)] text-sm max-w-md">
          Việc ghép cặp/chia đội cho từng vòng được thực hiện qua chức năng "Rút Thăm Vòng Mới" ở trang tổng quan của giải.
        </p>
        <Button onClick={() => navigate(`/minigames/${id}`)}>Đi Tới Rút Thăm Vòng Mới</Button>
      </div>
    )
  }

  // Payload lưu bảng lên server (memberKeys = memberId|guestId).
  const groupsPayload = (mgId: string) =>
    useMinigameStore.getState().groups
      .filter(g => g.minigameId === mgId)
      .sort((a, b) => a.groupOrder - b.groupOrder)
      .map(g => ({ id: g.id, name: g.groupName, order: g.groupOrder, status: g.status, memberKeys: g.memberIds }))

  const handleAutoGenerate = async () => {
    generateGroups(id!)
    generateSchedule(id!)
    try {
      await api.post(`/minigames/${id}/generate-teams`)
      await api.post(`/minigames/${id}/generate-schedule`)
      resync() // lấy bảng/đội/lịch chuẩn từ server (id thật) đè lên bản cục bộ
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
      resync()
      toast.success('Đã khóa bảng đấu và cập nhật lịch thi đấu!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu lịch thi đấu lên server thất bại — dữ liệu chỉ lưu cục bộ')
    }
  }

  const handleCreateSchedule = async () => {
    generateSchedule(id!)
    try {
      await api.post(`/minigames/${id}/generate-schedule`)
      resync()
      toast.success('Đã cập nhật lịch thi đấu!')
      navigate(`/minigames/${id}/schedule`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu lịch thi đấu lên server thất bại — dữ liệu chỉ lưu cục bộ')
    }
  }

  const handleMove = async (memberId: string, targetGroupId: string) => {
    moveParticipant(id!, memberId, targetGroupId)
    generateSchedule(id!)
    setOpenMove(null)
    try {
      // Lưu cách chia bảng mới rồi dựng lại lịch (chỉ khi CHƯA có kết quả — server tự bảo toàn).
      await api.put(`/minigames/${id}/groups`, { groups: groupsPayload(id!) })
      await api.post(`/minigames/${id}/generate-schedule`)
      resync()
      toast.success('Đã chuyển thành viên và cập nhật lịch thi đấu!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Đã chuyển (cục bộ) — đồng bộ server thất bại')
    }
  }

  const mobileHeader = isMobile ? (
    <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(`/minigames/${id}`)} className="[color:var(--pf-color-muted)]">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold [color:var(--pf-text)] truncate">Chia Bảng</p>
          <p className="text-[11px] [color:var(--pf-color-muted)]">{mg.name} · {myParts.length} người</p>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        <button onClick={handleAutoGenerate}
          className="shrink-0 flex items-center gap-1 text-[11px] font-medium [color:var(--pf-primary)] [background:var(--pf-primary-soft)] px-3 py-1.5 rounded-[8px]">
          <Shuffle size={12} /> Chia Tự Động
        </button>
        {myGroups.length > 0 && (
          <>
            <button onClick={handleLock}
              className="shrink-0 flex items-center gap-1 text-[11px] font-medium [color:var(--pf-color-muted)] [background:var(--pf-color-muted-soft)] px-3 py-1.5 rounded-[8px]">
              <Lock size={12} /> Khóa Bảng
            </button>
            <button onClick={handleCreateSchedule}
              className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-white px-3 py-1.5 rounded-[8px]"
              style={{ background: 'var(--pf-primary)' }}>
              <Calendar size={12} /> Tạo Lịch
            </button>
          </>
        )}
      </div>
    </div>
  ) : null

  return (
    <div className={isMobile ? 'min-h-screen [background:var(--pf-bg)]' : 'flex-1 overflow-y-auto [background:var(--pf-surface-muted)]'}>
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
        {!isMobile && <button onClick={() => navigate(`/minigames/${id}`)} className="flex items-center gap-1.5 text-sm [color:var(--pf-color-muted)] hover:[color:var(--pf-text)] mb-4 transition-colors"><ArrowLeft size={14} /> {mg.name}</button>}

        {myGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Shuffle size={48} className="[color:var(--pf-color-muted)] mb-4" />
            <p className="[color:var(--pf-color-muted)] font-medium">Chưa có bảng đấu</p>
            <p className="[color:var(--pf-color-muted)] text-sm mt-1 mb-4">
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
                      <span key={p.memberId} className="[background:var(--pf-surface)] text-amber-700 border border-amber-200 text-xs px-2 py-1 rounded-lg font-medium">
                        {p.memberName}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGroups.map(grp => (
                <div key={grp.id} className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 [background:var(--pf-primary-soft)] border-b [border-color:var(--pf-primary-soft)]">
                    <div>
                      <p className="text-sm font-bold [color:var(--pf-primary)]">{grp.groupName}</p>
                      <p className="text-xs [color:var(--pf-primary)]">{grp.memberIds.length} thành viên</p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                      grp.status === 'LOCKED' ? 'bg-green-100 text-green-700' : '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]'
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
                          <span className="text-sm [color:var(--pf-text)] flex items-center gap-1.5">{part.memberName}{(part.isGuest || isGuestId(part.memberId)) && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">Khách</span>}</span>
                          {grp.status !== 'LOCKED' && (
                            <div className="relative">
                              <button
                                onClick={() => setOpenMove(openMove === memberId ? null : memberId)}
                                className="flex items-center gap-1 text-xs [color:var(--pf-color-muted)] hover:[color:var(--pf-primary)] transition-colors px-2 py-1 rounded hover:[background:var(--pf-primary-soft)]"
                              >
                                Chuyển <ChevronDown size={12} />
                              </button>
                              {openMove === memberId && (
                                <div className="absolute right-0 top-full mt-1 [background:var(--pf-surface)] border border-[color:var(--pf-border)] rounded-lg shadow-lg z-10 py-1 min-w-28">
                                  {myGroups.filter(g => g.id !== grp.id).map(target => (
                                    <button
                                      key={target.id}
                                      onClick={() => handleMove(memberId, target.id)}
                                      className="w-full text-left px-3 py-1.5 text-xs hover:[background:var(--pf-primary-soft)] [color:var(--pf-text)] hover:[color:var(--pf-primary)] transition-colors"
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
