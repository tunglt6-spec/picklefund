import { useState, useMemo } from 'react'
import { Plus, CheckSquare, CalendarX, Clock, MapPin, Users, Edit2, Trash2, CalendarDays, UserCheck, TrendingUp } from 'lucide-react'
import api from '../../lib/api'
import { PageShell, PageHeader, MetricCard, EmptyState, StatusBadge, ActionButton } from '../../components/shared'
import { PeriodSelector } from '../../components/ui/PeriodSelector'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { AttendanceSession } from '../../types'
import { formatDate, formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

function MemberAvatar({ name, id }: { name: string; id: string }) {
  const colors = ['[background:var(--pf-primary)]', 'bg-emerald-500', 'bg-orange-500', '[background:var(--pf-primary)]', '[background:var(--pf-color-info)]', 'bg-rose-500']
  const color = colors[id.charCodeAt(id.length - 1) % colors.length]
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color} text-white text-xs font-bold select-none`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}

const statusTone = (st: AttendanceSession['status']) => st === 'completed' ? 'success' : st === 'cancelled' ? 'danger' : 'neutral'
const statusText = (st: AttendanceSession['status']) => st === 'completed' ? 'Hoàn thành' : st === 'cancelled' ? 'Đã hủy' : 'Chờ'

export function Attendance() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getClubData, setSessions: saveSessions } = useClubDataStore()
  const data = getClubData(clubId)
  const allSessions = data.sessions
  const members = data.members

  const allPeriods = useMemo(() =>
    [...data.fundPeriods].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [data.fundPeriods]
  )
  const activePeriod = allPeriods.find(p => p.status === 'active') ?? allPeriods[0]
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => activePeriod?.id ?? '')

  const sessions = useMemo(() => {
    if (!selectedPeriodId) return allSessions
    const exact = allSessions.filter(s => s.fundPeriodId === selectedPeriodId)
    return exact.length > 0 ? exact : allSessions.filter(s => !s.fundPeriodId)
  }, [allSessions, selectedPeriodId])

  const setSessions = (fn: (prev: AttendanceSession[]) => AttendanceSession[]) =>
    saveSessions(clubId, fn(getClubData(clubId).sessions))

  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null)
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ sessionDate: '', startTime: '08:00', endTime: '11:00', courtFee: 450000, courtName: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [editSession, setEditSession] = useState<AttendanceSession | null>(null)
  const [editForm, setEditForm] = useState({ sessionDate: '', startTime: '08:00', endTime: '11:00', courtFee: 450000, courtName: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showMovePeriod, setShowMovePeriod] = useState(false)
  const [moveToPeriodId, setMoveToPeriodId] = useState('')
  const [isMoving, setIsMoving] = useState(false)

  const openAttendance = async (session: AttendanceSession) => {
    setSelectedSession(session)
    // Default all present, then load existing records from server
    const defaultMap = Object.fromEntries(members.filter(m => m.status === 'active').map(m => [m.id, true]))
    setAttendance(defaultMap)
    try {
      const res = await api.get(`/attendance/${session.id}/attendance`)
      const records: { memberId: string; status: string }[] = res.data?.data ?? []
      if (records.length > 0) {
        const loaded = Object.fromEntries(records.map(r => [r.memberId, r.status === 'PRESENT']))
        setAttendance(loaded)
      }
    } catch { /* keep default */ }
  }

  const handleToggle = (memberId: string) => {
    setAttendance(prev => ({ ...prev, [memberId]: !prev[memberId] }))
  }

  const handleSaveAttendance = async () => {
    if (!selectedSession) return
    const records = members.filter(m => m.status === 'active').map(m => ({ memberId: m.id, status: attendance[m.id] ? 'PRESENT' : 'ABSENT' as const }))
    const count = records.filter(r => r.status === 'PRESENT').length
    try {
      await api.put(`/attendance/${selectedSession.id}/attendance`, { attendance: records })
      setSessions(prev => prev.map(s => s.id === selectedSession.id
        ? { ...s, _count: { attendanceRecords: count }, status: 'completed' }
        : s
      ))
      setSelectedSession(null)
      toast.success(`Đã lưu điểm danh: ${count}/${members.length} người`)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Lưu điểm danh thất bại'
      toast.error(msg)
    }
  }

  const openEdit = (session: AttendanceSession) => {
    setEditSession(session)
    setEditForm({
      sessionDate: session.sessionDate,
      startTime: session.startTime ?? '08:00',
      endTime: session.endTime ?? '11:00',
      courtFee: Number(session.courtFee),
      courtName: session.courtName ?? '',
    })
  }

  const handleEditSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editSession || isSaving) return
    setIsSaving(true)
    try {
      await api.put(`/attendance/${editSession.id}`, { ...editForm, courtFee: Number(editForm.courtFee) })
      setSessions(prev => prev.map(s => s.id === editSession.id
        ? { ...s, ...editForm, courtFee: Number(editForm.courtFee) }
        : s
      ))
      setEditSession(null)
      toast.success('Đã cập nhật buổi chơi!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật thất bại')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSession = async () => {
    if (!deleteId || isDeleting) return
    setIsDeleting(true)
    try {
      await api.delete(`/attendance/${deleteId}`)
      setSessions(prev => prev.filter(s => s.id !== deleteId))
      setDeleteId(null)
      toast.success('Đã xóa buổi chơi!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xóa thất bại')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMovePeriod = async () => {
    if (!moveToPeriodId || isMoving || sessions.length === 0) return
    setIsMoving(true)
    try {
      await api.patch('/attendance/bulk-move-period', {
        sessionIds: sessions.map(s => s.id),
        targetPeriodId: moveToPeriodId,
      })
      setSessions(prev => prev.map(s =>
        sessions.some(fs => fs.id === s.id) ? { ...s, fundPeriodId: moveToPeriodId } : s
      ))
      setSelectedPeriodId(moveToPeriodId)
      setShowMovePeriod(false)
      setMoveToPeriodId('')
      toast.success(`Đã chuyển ${sessions.length} buổi sang kỳ mới!`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Chuyển kỳ thất bại')
    } finally {
      setIsMoving(false)
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    const targetPeriodId = selectedPeriodId || activePeriod?.id
    if (!targetPeriodId) {
      toast.error('Cần tạo kỳ quỹ trước khi tạo buổi chơi')
      return
    }
    setIsSaving(true)
    const payload = { fundPeriodId: targetPeriodId, ...form, courtFee: Number(form.courtFee) }
    try {
      const res = await api.post('/attendance', payload)
      const d = res.data?.data
      setSessions(prev => [...prev, { ...d, courtFee: Number(d?.courtFee ?? form.courtFee), _count: { attendanceRecords: 0 } }])
      setShowCreate(false)
      toast.success('Đã tạo buổi chơi mới!')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Tạo buổi thất bại'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const presentCount = Object.values(attendance).filter(Boolean).length
  const completedSessions = sessions.filter(s => s.status === 'completed').length
  const totalAttendance = sessions.reduce((s, sess) => s + (sess._count?.attendanceRecords ?? 0), 0)
  const activeMemberList = members.filter(m => m.status === 'active')

  return (
    <PageShell maxWidth={1200}>
      <PageHeader
        title="Điểm Danh"
        subtitle={activePeriod ? activePeriod.name : 'Quản lý điểm danh từng buổi chơi'}
        actions={<ActionButton icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Tạo buổi chơi</ActionButton>}
      />

      <div className="flex flex-col gap-5">
        {/* Bộ lọc kỳ + chuyển kỳ */}
        {allPeriods.length > 1 && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <PeriodSelector periods={allPeriods} selectedId={selectedPeriodId} onChange={setSelectedPeriodId} label="Lọc theo kỳ" />
            </div>
            {sessions.length > 0 && (
              <button
                onClick={() => setShowMovePeriod(true)}
                className="min-h-11 rounded-lg border px-3 text-[13px] font-semibold [color:var(--pf-primary)] [border-color:var(--pf-primary-soft)] hover:[background:var(--pf-primary-soft)] transition-colors"
              >
                Chuyển kỳ ({sessions.length} buổi)
              </button>
            )}
          </div>
        )}

        {/* KPI */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <MetricCard accent="violet" icon={<CalendarDays size={18} />} label="Tổng buổi chơi" value={sessions.length} sub={`${completedSessions} đã hoàn thành`} />
            <MetricCard accent="blue" icon={<UserCheck size={18} />} label="Tổng lượt tham gia" value={totalAttendance} sub="lượt" />
            <MetricCard accent="teal" icon={<TrendingUp size={18} />} label="Trung bình/buổi" value={completedSessions > 0 ? (totalAttendance / completedSessions).toFixed(1) : '—'} sub="người/buổi" />
          </div>
        )}

        {/* Danh sách buổi */}
        {sessions.length === 0 ? (
          <EmptyState
            icon={<CalendarX size={24} />}
            title="Chưa có buổi chơi nào"
            description={!activePeriod ? 'Tạo kỳ quỹ trước khi tạo buổi chơi' : members.length === 0 ? 'Thêm thành viên trước khi tạo buổi chơi' : 'Tạo buổi chơi đầu tiên cho kỳ này'}
            action={activePeriod && members.length > 0 ? <ActionButton icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>Tạo buổi chơi đầu tiên</ActionButton> : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)).map(session => (
              <div key={session.id} className="rounded-2xl border p-4 [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold [color:var(--pf-text)]">{formatDate(session.sessionDate)}</p>
                    <div className="mt-0.5 flex items-center gap-1 text-xs [color:var(--pf-color-muted)]">
                      <Clock size={11} /><span>{session.startTime} – {session.endTime}</span>
                    </div>
                    {session.courtName && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs [color:var(--pf-color-muted)]">
                        <MapPin size={11} /><span>{session.courtName}</span>
                      </div>
                    )}
                  </div>
                  <StatusBadge tone={statusTone(session.status)}>{statusText(session.status)}</StatusBadge>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs [border-color:var(--pf-border)] [color:var(--pf-color-muted)]">
                  <span>Tiền sân: <strong className="[color:var(--pf-text)]">{formatVND(session.courtFee)}</strong></span>
                  <div className="flex items-center gap-1">
                    <Users size={11} /><strong className="[color:var(--pf-text)]">{session._count?.attendanceRecords ?? 0}</strong><span>/{members.length}</span>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openAttendance(session)}
                    disabled={members.length === 0}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] disabled:opacity-40"
                  >
                    <CheckSquare size={14} />Điểm danh
                  </button>
                  <button onClick={() => openEdit(session)} aria-label="Sửa buổi" className="flex h-11 w-11 items-center justify-center rounded-lg border [border-color:var(--pf-border)] [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] hover:[color:var(--pf-primary)]">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => setDeleteId(session.id)} aria-label="Xóa buổi" className="flex h-11 w-11 items-center justify-center rounded-lg border [border-color:var(--pf-border)] [color:var(--pf-color-danger)] hover:[background:var(--pf-color-danger-soft)]">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance modal */}
      {selectedSession && (
        <Modal open={!!selectedSession} onClose={() => setSelectedSession(null)}
          title={`Điểm danh — ${formatDate(selectedSession.sessionDate)}`}
          subtitle={`${selectedSession.courtName ?? ''} · ${selectedSession.startTime}–${selectedSession.endTime}`}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-sm [color:var(--pf-color-muted)]">Có mặt: <strong className="text-emerald-600">{presentCount}</strong> / {activeMemberList.length}</span>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSelectedSession(null)}>Hủy</Button>
                <Button onClick={handleSaveAttendance}>Lưu điểm danh</Button>
              </div>
            </div>
          }
        >
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {activeMemberList.map(m => (
              <label key={m.id} className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 cursor-pointer transition-colors ${
                attendance[m.id] ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white hover:bg-slate-50'
              }`}>
                <input type="checkbox" checked={!!attendance[m.id]} onChange={() => handleToggle(m.id)}
                  className="h-4 w-4 rounded accent-emerald-500 shrink-0" />
                <MemberAvatar name={m.fullName} id={m.id} />
                <span className="font-medium text-slate-900 flex-1 text-sm">{m.fullName}</span>
                <span className={`text-xs font-medium ${attendance[m.id] ? 'text-emerald-600' : 'text-slate-300'}`}>
                  {attendance[m.id] ? 'Có mặt' : 'Vắng'}
                </span>
              </label>
            ))}
          </div>
        </Modal>
      )}

      {/* Edit session modal */}
      <Modal open={!!editSession} onClose={() => setEditSession(null)} title="Sửa Buổi Chơi"
        subtitle="Cập nhật thông tin buổi chơi"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setEditSession(null)} disabled={isSaving}>Hủy</Button>
            <Button type="submit" form="form-edit-session" disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</Button>
          </div>
        }
      >
        <form id="form-edit-session" onSubmit={handleEditSession} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày chơi <span className="text-red-500">*</span></label>
            <input required type="date" value={editForm.sessionDate} onChange={e => setEditForm({ ...editForm, sessionDate: e.target.value })} className="input-base" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Giờ bắt đầu</label>
              <input type="time" value={editForm.startTime} onChange={e => setEditForm({ ...editForm, startTime: e.target.value })} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Giờ kết thúc</label>
              <input type="time" value={editForm.endTime} onChange={e => setEditForm({ ...editForm, endTime: e.target.value })} className="input-base" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tên sân <span className="text-red-500">*</span></label>
            <input required value={editForm.courtName} onChange={e => setEditForm({ ...editForm, courtName: e.target.value })} placeholder="VD: Sân Mỹ Đình Indoor" className="input-base" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tiền sân (VNĐ) <span className="text-red-500">*</span></label>
            <input type="number" required min="1" value={editForm.courtFee} onChange={e => setEditForm({ ...editForm, courtFee: Number(e.target.value) })} className="input-base" />
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Xóa buổi chơi"
        subtitle="Hành động này không thể hoàn tác"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting}>Hủy</Button>
            <Button onClick={handleDeleteSession} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white border-red-600">
              {isDeleting ? 'Đang xóa...' : 'Xóa buổi chơi'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">Bạn có chắc muốn xóa buổi chơi này? Toàn bộ dữ liệu điểm danh của buổi này sẽ bị xóa vĩnh viễn.</p>
      </Modal>

      {/* Move period modal */}
      <Modal open={showMovePeriod} onClose={() => setShowMovePeriod(false)} title="Chuyển sang kỳ quỹ khác" subtitle={`Sẽ chuyển ${sessions.length} buổi chơi đang hiển thị`}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowMovePeriod(false)} disabled={isMoving}>Hủy</Button>
            <Button onClick={handleMovePeriod} disabled={isMoving || !moveToPeriodId} className="[background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] text-white [border-color:var(--pf-primary)]">
              {isMoving ? 'Đang chuyển...' : 'Xác nhận chuyển'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Chọn kỳ quỹ đích để chuyển toàn bộ <strong>{sessions.length}</strong> buổi đang hiển thị:</p>
          <select value={moveToPeriodId} onChange={e => setMoveToPeriodId(e.target.value)} className="input-base">
            <option value="">— Chọn kỳ quỹ —</option>
            {allPeriods.filter(p => p.id !== selectedPeriodId).map(p => (
              <option key={p.id} value={p.id}>{p.name} {p.status === 'active' ? '(Đang mở)' : ''}</option>
            ))}
          </select>
        </div>
      </Modal>

      {/* Create session modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo Buổi Chơi Mới"
        subtitle="Lên lịch buổi chơi cho kỳ quỹ hiện tại"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)} disabled={isSaving}>Hủy bỏ</Button>
            <Button type="submit" form="form-session" disabled={isSaving}>{isSaving ? 'Đang tạo...' : 'Tạo buổi chơi'}</Button>
          </div>
        }
      >
        <form id="form-session" onSubmit={handleCreateSession} className="space-y-4">
          {!activePeriod && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              Chưa có kỳ quỹ đang hoạt động. Vui lòng tạo kỳ quỹ trước khi tạo buổi chơi.
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày chơi <span className="text-red-500">*</span></label>
            <input required type="date" value={form.sessionDate}
              onChange={e => setForm({ ...form, sessionDate: e.target.value })} className="input-base" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Giờ bắt đầu</label>
              <input type="time" value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value })} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Giờ kết thúc</label>
              <input type="time" value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })} className="input-base" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tên sân <span className="text-red-500">*</span></label>
            <input required value={form.courtName} onChange={e => setForm({ ...form, courtName: e.target.value })}
              placeholder="VD: Sân Mỹ Đình Indoor" className="input-base" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tiền sân (VNĐ) <span className="text-red-500">*</span></label>
            <input type="number" required min="1" value={form.courtFee}
              onChange={e => setForm({ ...form, courtFee: Number(e.target.value) })} className="input-base" />
          </div>
        </form>
      </Modal>
    </PageShell>
  )
}
