/**
 * GroupAssignment — Xếp bảng cho GROUP_STAGE. M2a: manual builder song song auto.
 *
 * Auto ("Chia Tự Động") = SEED tạo đội đơn + bảng trên server (cần cho sinh lịch). Sau đó manual
 * toàn quyền: THÊM bảng rỗng, XÓA bảng, ĐỔI TÊN bảng, GÁN người (kể cả từ nhóm "chưa xếp") vào
 * bảng bất kỳ. Mỗi thao tác lưu `PUT /:id/groups` (backend validate không cho 1 người ở 2 bảng)
 * rồi dựng lại lịch. Không phá auto; giữ Khóa bảng + Xem lịch.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Shuffle, Lock, Calendar, ChevronDown, Plus, Trash2, Pencil, Check } from 'lucide-react'
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
    generateSchedule, lockGroups, moveParticipant, addGroup, removeGroup, renameGroup,
  } = useMinigameStore()

  const mg = getMinigame(id!)
  const myParts = participants.filter(p => p.minigameId === id && p.status === 'ACTIVE')
  const myGroups = groups.filter(g => g.minigameId === id).sort((a, b) => a.groupOrder - b.groupOrder)
  const [openMove, setOpenMove] = useState<string | null>(null)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()

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

  const groupsPayload = (mgId: string) =>
    useMinigameStore.getState().groups
      .filter(g => g.minigameId === mgId)
      .sort((a, b) => a.groupOrder - b.groupOrder)
      .map(g => ({ id: g.id, name: g.groupName, order: g.groupOrder, status: g.status, memberKeys: g.memberIds }))

  const unassigned = myParts.filter(p => !myGroups.some(g => g.memberIds.includes(p.memberId)))

  // Lưu cách chia bảng lên server + dựng lại lịch (server bảo toàn nếu đã có kết quả).
  const persistGroups = async (rebuildSchedule = true) => {
    try {
      await api.put(`/minigames/${id}/groups`, { groups: groupsPayload(id!) })
      if (rebuildSchedule) { generateSchedule(id!); await api.post(`/minigames/${id}/generate-schedule`) }
      resync()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Đồng bộ server thất bại (đã lưu cục bộ)')
    }
  }

  const handleAutoGenerate = async () => {
    setBusy(true)
    generateGroups(id!); generateSchedule(id!)
    try {
      await api.post(`/minigames/${id}/generate-teams`)
      await api.post(`/minigames/${id}/generate-schedule`)
      resync()
      toast.success('Đã chia bảng và tạo lịch thi đấu tự động!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu bảng đấu lên server thất bại')
    } finally {
      setBusy(false)
    }
  }

  const handleLock = async () => {
    setBusy(true)
    lockGroups(id!); generateSchedule(id!)
    try { await api.post(`/minigames/${id}/generate-schedule`); resync(); toast.success('Đã khóa bảng đấu và cập nhật lịch!') }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Lưu lịch lên server thất bại') }
    finally { setBusy(false) }
  }

  const handleCreateSchedule = async () => {
    setBusy(true)
    generateSchedule(id!)
    try { await api.post(`/minigames/${id}/generate-schedule`); resync(); toast.success('Đã cập nhật lịch thi đấu!'); navigate(`/minigames/${id}/schedule`) }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Lưu lịch lên server thất bại') }
    finally { setBusy(false) }
  }

  const handleMove = async (memberId: string, targetGroupId: string) => {
    moveParticipant(id!, memberId, targetGroupId); setOpenMove(null)
    await persistGroups()
    toast.success('Đã cập nhật xếp bảng!')
  }

  const handleAddGroup = async () => { addGroup(id!); await persistGroups(false); toast.success('Đã thêm bảng mới') }
  const handleRemoveGroup = async (groupId: string) => {
    if (!window.confirm('Xóa bảng này? Các đội trong bảng sẽ trở lại danh sách chưa xếp.')) return
    removeGroup(id!, groupId); await persistGroups(); toast.success('Đã xóa bảng (người chơi về nhóm chưa xếp)')
  }
  const startRename = (groupId: string, name: string) => { setEditingGroup(groupId); setEditName(name) }
  const saveRename = async (groupId: string) => {
    const name = editName.trim(); setEditingGroup(null)
    if (name) { renameGroup(id!, groupId, name); await persistGroups(false) }
  }

  // Dropdown gán/chuyển vào 1 bảng (dùng cho cả người chưa xếp lẫn người đang trong bảng khác).
  const MoveMenu = ({ memberId, excludeGroupId }: { memberId: string; excludeGroupId?: string }) => (
    <div className="relative">
      <button onClick={() => setOpenMove(openMove === memberId ? null : memberId)}
        className="flex items-center gap-1 text-xs [color:var(--pf-color-muted)] hover:[color:var(--pf-primary)] transition-colors px-2 py-1 rounded hover:[background:var(--pf-primary-soft)]">
        {excludeGroupId ? 'Chuyển' : 'Gán vào'} <ChevronDown size={12} />
      </button>
      {openMove === memberId && (
        <div className="absolute right-0 top-full mt-1 [background:var(--pf-surface)] border border-[color:var(--pf-border)] rounded-lg shadow-lg z-10 py-1 min-w-28 max-h-56 overflow-y-auto">
          {myGroups.filter(g => g.id !== excludeGroupId).length === 0 && <span className="block px-3 py-1.5 text-xs [color:var(--pf-color-muted)]">Chưa có bảng — bấm "Thêm bảng"</span>}
          {myGroups.filter(g => g.id !== excludeGroupId).map(target => (
            <button key={target.id} onClick={() => handleMove(memberId, target.id)}
              className="w-full text-left px-3 py-1.5 text-xs hover:[background:var(--pf-primary-soft)] [color:var(--pf-text)] hover:[color:var(--pf-primary)] transition-colors">
              → {target.groupName}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const toolbar = (
    <div className="flex items-center gap-2 flex-wrap">
      <Button size="sm" variant="outline" onClick={handleAutoGenerate} disabled={busy}><Shuffle size={14} /> Chia Tự Động</Button>
      <Button size="sm" variant="outline" onClick={handleAddGroup}><Plus size={14} /> Thêm bảng</Button>
      {myGroups.length > 0 && (
        <>
          <Button size="sm" variant="outline" onClick={handleLock} disabled={busy}><Lock size={14} /> Khóa Bảng</Button>
          <Button size="sm" onClick={handleCreateSchedule} disabled={busy}><Calendar size={14} /> Xem Lịch Thi Đấu</Button>
        </>
      )}
    </div>
  )

  return (
    <div className={isMobile ? 'min-h-screen [background:var(--pf-bg)]' : 'flex-1 overflow-y-auto [background:var(--pf-surface-muted)]'}>
      {isMobile ? (
        <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate(`/minigames/${id}`)} className="[color:var(--pf-color-muted)]"><ArrowLeft size={18} /></button>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold [color:var(--pf-text)] truncate">Xếp Bảng</p>
              <p className="text-[11px] [color:var(--pf-color-muted)]">{mg.name} · {myParts.length} người</p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5">{toolbar}</div>
        </div>
      ) : (
        <PageHeader title={`Xếp Bảng – ${mg.name}`} subtitle={`${myParts.length} người tham gia · tự động hoặc thủ công`} actions={toolbar} />
      )}

      <div className={isMobile ? 'px-4 py-4' : 'p-6'}>
        {!isMobile && <button onClick={() => navigate(`/minigames/${id}`)} className="flex items-center gap-1.5 text-sm [color:var(--pf-color-muted)] hover:[color:var(--pf-text)] mb-4 transition-colors"><ArrowLeft size={14} /> {mg.name}</button>}

        {myGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shuffle size={44} className="[color:var(--pf-color-muted)] mb-4" />
            <p className="[color:var(--pf-color-muted)] font-medium">Chưa có bảng đấu</p>
            <p className="[color:var(--pf-color-muted)] text-sm mt-1 mb-4 max-w-sm">
              {myParts.length} người tham gia. Chọn <b>Chia Tự Động</b> để hệ thống chia + tạo lịch, rồi tinh chỉnh thủ công; hoặc <b>Thêm bảng</b> rồi tự gán người.
            </p>
            <div className="flex gap-2 flex-wrap justify-center">
              <Button onClick={handleAutoGenerate} disabled={busy}><Shuffle size={16} /> Chia Bảng Tự Động</Button>
              <Button variant="outline" onClick={handleAddGroup}><Plus size={16} /> Thêm bảng thủ công</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Người chưa xếp bảng — có thể GÁN thủ công vào bảng */}
            {unassigned.length > 0 && (
              <div className="[background:var(--pf-color-warning-soft)] border [border-color:var(--pf-color-warning-soft)] rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold [color:var(--pf-color-warning)] mb-2">⚠️ {unassigned.length} người chưa được xếp bảng</p>
                <div className="flex flex-col divide-y divide-[color:var(--pf-color-warning-soft)]">
                  {unassigned.map(p => (
                    <div key={p.memberId} className="flex items-center justify-between py-1.5">
                      <span className="text-sm [color:var(--pf-color-warning)] flex items-center gap-1.5">
                        {p.memberName}
                        {(p.isGuest || isGuestId(p.memberId)) && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full [background:var(--pf-surface)] [color:var(--pf-color-warning)] border [border-color:var(--pf-color-warning-soft)]">Khách</span>}
                      </span>
                      <MoveMenu memberId={p.memberId} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGroups.map(grp => (
                <div key={grp.id} className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 [background:var(--pf-primary-soft)] border-b [border-color:var(--pf-primary-soft)] gap-2">
                    {editingGroup === grp.id ? (
                      <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveRename(grp.id); if (e.key === 'Escape') setEditingGroup(null) }}
                        onBlur={() => saveRename(grp.id)}
                        className="flex-1 min-w-0 text-sm font-bold [color:var(--pf-primary)] bg-white/70 border border-[color:var(--pf-primary-soft)] rounded px-2 py-1" />
                    ) : (
                      <div className="min-w-0">
                        <p className="text-sm font-bold [color:var(--pf-primary)] truncate">{grp.groupName}</p>
                        <p className="text-xs [color:var(--pf-primary)]">{grp.memberIds.length} thành viên</p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      {grp.status !== 'LOCKED' && editingGroup !== grp.id && (
                        <>
                          <button onClick={() => startRename(grp.id, grp.groupName)} title="Đổi tên" className="p-1 rounded [color:var(--pf-primary)] hover:bg-white/50"><Pencil size={13} /></button>
                          <button onClick={() => handleRemoveGroup(grp.id)} title="Xóa bảng" className="p-1 rounded [color:var(--pf-color-danger)] hover:bg-white/50"><Trash2 size={13} /></button>
                        </>
                      )}
                      {editingGroup === grp.id && <button onMouseDown={e => e.preventDefault()} onClick={() => saveRename(grp.id)} className="p-1 rounded [color:var(--pf-color-success)] hover:bg-white/50"><Check size={14} /></button>}
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', grp.status === 'LOCKED' ? '[background:var(--pf-color-success-soft)] [color:var(--pf-color-success)]' : '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]')}>
                        {grp.status === 'LOCKED' ? '🔒' : 'Mở'}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-[color:var(--pf-border-soft)] min-h-[44px]">
                    {grp.memberIds.length === 0 && <p className="px-4 py-3 text-xs italic [color:var(--pf-color-muted)]">Bảng trống — gán người từ nhóm "chưa xếp".</p>}
                    {grp.memberIds.map(memberId => {
                      const part = myParts.find(p => p.memberId === memberId)
                      if (!part) return null
                      return (
                        <div key={memberId} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-sm [color:var(--pf-text)] flex items-center gap-1.5">{part.memberName}{(part.isGuest || isGuestId(part.memberId)) && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">Khách</span>}</span>
                          {grp.status !== 'LOCKED' && <MoveMenu memberId={memberId} excludeGroupId={grp.id} />}
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
