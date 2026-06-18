import { useState } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { Plus, CheckSquare, CalendarX, Clock, MapPin, Users } from 'lucide-react'
import api from '../../lib/api'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { AttendanceSession } from '../../types'
import { formatDate, formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

function MemberAvatar({ name, id }: { name: string; id: string }) {
  const colors = ['bg-indigo-500','bg-emerald-500','bg-orange-500','bg-purple-500','bg-cyan-500','bg-rose-500']
  const color  = colors[id.charCodeAt(id.length - 1) % colors.length]
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color} text-white text-xs font-bold select-none`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}

export function Attendance() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
  const { getClubData, setSessions: saveSessions } = useClubDataStore()
  const data = getClubData(clubId)
  const sessions = data.sessions
  const members = data.members
  const activePeriod = data.fundPeriods.find(p => p.status === 'active')

  const setSessions = (fn: (prev: AttendanceSession[]) => AttendanceSession[]) =>
    saveSessions(clubId, fn(getClubData(clubId).sessions))

  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null)
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ sessionDate: '', startTime: '08:00', endTime: '11:00', courtFee: 450000, courtName: '' })

  const openAttendance = (session: AttendanceSession) => {
    setSelectedSession(session)
    setAttendance(Object.fromEntries(members.map(m => [m.id, true])))
  }

  const handleToggle = (memberId: string) => {
    setAttendance(prev => ({ ...prev, [memberId]: !prev[memberId] }))
  }

  const handleSaveAttendance = async () => {
    if (!selectedSession) return
    const records = members.map(m => ({ memberId: m.id, status: attendance[m.id] ? 'PRESENT' : 'ABSENT' as const }))
    const count = records.filter(r => r.status === 'PRESENT').length
    try {
      await api.put(`/attendance/${selectedSession.id}/attendance`, { attendance: records })
    } catch { /* local update still applies */ }
    setSessions(prev => prev.map(s => s.id === selectedSession.id
      ? { ...s, _count: { attendanceRecords: count }, status: 'completed' }
      : s
    ))
    setSelectedSession(null)
    toast.success(`Đã lưu điểm danh: ${count}/${members.length} người`)
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { fundPeriodId: activePeriod?.id ?? '', ...form, courtFee: Number(form.courtFee) }
    try {
      const res = await api.post('/attendance', payload)
      const d = res.data?.data
      setSessions(prev => [...prev, { ...d, courtFee: Number(d?.courtFee ?? form.courtFee), _count: { attendanceRecords: 0 } }])
    } catch {
      const newSession: AttendanceSession = {
        id: `sess-${Date.now()}`, clubId, fundPeriodId: activePeriod?.id ?? '',
        status: 'scheduled', createdBy: user?.id ?? 'user-1', _count: { attendanceRecords: 0 },
        ...form, courtFee: Number(form.courtFee)
      }
      setSessions(prev => [...prev, newSession])
    }
    setShowCreate(false)
    toast.success('Đã tạo buổi chơi mới!')
  }

  const isMobile = useIsMobile()
  const presentCount = Object.values(attendance).filter(Boolean).length
  const completedSessions = sessions.filter(s => s.status === 'completed').length
  const totalAttendance = sessions.reduce((s, sess) => s + (sess._count?.attendanceRecords ?? 0), 0)

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <span className="text-[17px] font-[800] text-slate-900">Điểm Danh</span>
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[13px] font-[600] text-white active:opacity-80 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} />Tạo buổi
          </button>
        </div>

        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* KPI row */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Buổi chơi', value: sessions.length, sub: `${completedSessions} xong` },
                { label: 'Lượt tham gia', value: totalAttendance, sub: 'lượt' },
                { label: 'TB/buổi', value: completedSessions > 0 ? (totalAttendance / completedSessions).toFixed(1) : '—', sub: 'người' },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-[14px] border border-slate-100 p-3 text-center shadow-sm">
                  <div className="text-[18px] font-[800] text-indigo-600">{k.value}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{k.sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* Sessions */}
          {sessions.length === 0 ? (
            <div className="bg-white rounded-[16px] border border-dashed border-slate-200 py-14 text-center">
              <CalendarX size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-[14px] font-[600] text-slate-500">Chưa có buổi chơi nào</p>
              <p className="text-[12px] text-slate-400 mt-1">
                {!activePeriod ? 'Tạo kỳ quỹ trước' : members.length === 0 ? 'Thêm thành viên trước' : 'Nhấn + để tạo buổi chơi'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)).map(session => (
                <div key={session.id} className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-[15px] font-[700] text-slate-900">{formatDate(session.sessionDate)}</div>
                      <div className="flex items-center gap-1 text-[12px] text-slate-500 mt-0.5">
                        <Clock size={11} />{session.startTime} – {session.endTime}
                      </div>
                      {session.courtName && (
                        <div className="flex items-center gap-1 text-[12px] text-slate-400 mt-0.5">
                          <MapPin size={11} />{session.courtName}
                        </div>
                      )}
                    </div>
                    <Badge variant={session.status === 'completed' ? 'green' : session.status === 'cancelled' ? 'red' : 'indigo'} dot>
                      {session.status === 'completed' ? 'Xong' : session.status === 'cancelled' ? 'Hủy' : 'Chờ'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-slate-500 pt-2.5 border-t border-slate-50 mb-3">
                    <span>Tiền sân: <strong className="text-slate-700">{formatVND(session.courtFee)}</strong></span>
                    <span className="flex items-center gap-1">
                      <Users size={11} /><strong>{session._count?.attendanceRecords}</strong>/{members.length}
                    </span>
                  </div>
                  <button
                    className="w-full py-2 rounded-[10px] text-[13px] font-[600] text-indigo-600 border border-indigo-200 flex items-center justify-center gap-1 active:bg-indigo-50"
                    onClick={() => openAttendance(session)}
                  >
                    <CheckSquare size={14} />Điểm danh
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedSession && (
          <Modal open={!!selectedSession} onClose={() => setSelectedSession(null)}
            title={`Điểm danh — ${formatDate(selectedSession.sessionDate)}`}
            subtitle={`${selectedSession.courtName} · ${selectedSession.startTime}–${selectedSession.endTime}`}
            footer={
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Có mặt: <strong className="text-emerald-600">{presentCount}</strong> / {members.length}</span>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setSelectedSession(null)}>Hủy</Button>
                  <Button onClick={handleSaveAttendance}>Lưu</Button>
                </div>
              </div>
            }
          >
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {members.map(m => (
                <label key={m.id} className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 cursor-pointer transition-colors ${
                  attendance[m.id] ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white hover:bg-slate-50'
                }`}>
                  <input type="checkbox" checked={!!attendance[m.id]} onChange={() => handleToggle(m.id)} className="h-4 w-4 rounded accent-emerald-500 shrink-0" />
                  <MemberAvatar name={m.fullName} id={m.id} />
                  <span className="font-medium text-slate-900 flex-1 text-sm">{m.fullName}</span>
                  <span className={`text-xs font-medium ${attendance[m.id] ? 'text-emerald-600' : 'text-slate-300'}`}>{attendance[m.id] ? 'Có mặt' : 'Vắng'}</span>
                </label>
              ))}
            </div>
          </Modal>
        )}
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo Buổi Chơi Mới" subtitle="Lên lịch buổi chơi"
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Hủy bỏ</Button>
              <Button type="submit" form="form-session-m">Tạo buổi chơi</Button>
            </div>
          }
        >
          <form id="form-session-m" onSubmit={handleCreateSession} className="space-y-4">
            {!activePeriod && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                Chưa có kỳ quỹ đang hoạt động. Buổi chơi sẽ được lưu cục bộ cho đến khi tạo kỳ quỹ.
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày chơi <span className="text-red-500">*</span></label>
              <input required type="date" value={form.sessionDate} onChange={e => setForm({ ...form, sessionDate: e.target.value })} className="input-base" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Giờ bắt đầu</label>
                <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Giờ kết thúc</label>
                <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className="input-base" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Tên sân <span className="text-red-500">*</span></label>
              <input required value={form.courtName} onChange={e => setForm({ ...form, courtName: e.target.value })} placeholder="VD: Sân Mỹ Đình Indoor" className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Tiền sân (VNĐ)</label>
              <input type="number" value={form.courtFee} onChange={e => setForm({ ...form, courtFee: Number(e.target.value) })} className="input-base" />
            </div>
          </form>
        </Modal>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Điểm Danh"
        subtitle="Quản lý điểm danh từng buổi chơi pickleball"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={15} />Tạo buổi chơi
          </Button>
        }
      />

      <div className="p-6 max-w-[1200px] mx-auto space-y-5">
        {sessions.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Tổng buổi chơi</p>
              <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">{completedSessions} đã hoàn thành</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Tổng lượt tham gia</p>
              <p className="text-2xl font-bold text-indigo-600">{totalAttendance}</p>
              <p className="text-xs text-slate-400 mt-0.5">lượt</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Trung bình/buổi</p>
              <p className="text-2xl font-bold text-emerald-600">
                {completedSessions > 0 ? (totalAttendance / completedSessions).toFixed(1) : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">người/buổi</p>
            </div>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <CalendarX size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">Chưa có buổi chơi nào</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              {!activePeriod ? 'Tạo kỳ quỹ trước khi tạo buổi chơi' : members.length === 0 ? 'Thêm thành viên trước khi tạo buổi chơi' : 'Tạo buổi chơi đầu tiên cho kỳ này'}
            </p>
            {activePeriod && members.length > 0 && (
              <Button onClick={() => setShowCreate(true)} size="sm"><Plus size={14} />Tạo buổi chơi đầu tiên</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sessions.map(session => (
              <div key={session.id} className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4 hover:shadow-[var(--shadow-card-hover)] transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">{formatDate(session.sessionDate)}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                      <Clock size={11} />
                      <span>{session.startTime} – {session.endTime}</span>
                    </div>
                    {session.courtName && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                        <MapPin size={11} />
                        <span>{session.courtName}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant={session.status === 'completed' ? 'green' : session.status === 'cancelled' ? 'red' : 'indigo'} dot>
                    {session.status === 'completed' ? 'Hoàn thành' : session.status === 'cancelled' ? 'Đã hủy' : 'Chờ'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-50">
                  <span>Tiền sân: <strong className="text-slate-700">{formatVND(session.courtFee)}</strong></span>
                  <div className="flex items-center gap-1">
                    <Users size={11} />
                    <strong className="text-slate-700">{session._count?.attendanceRecords}</strong>
                    <span>/{members.length}</span>
                  </div>
                </div>

                <Button
                  variant="outline" size="sm" className="w-full mt-3 justify-center"
                  onClick={() => openAttendance(session)}
                  disabled={members.length === 0}
                >
                  <CheckSquare size={13} />Điểm danh
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance modal */}
      {selectedSession && (
        <Modal open={!!selectedSession} onClose={() => setSelectedSession(null)}
          title={`Điểm danh — ${formatDate(selectedSession.sessionDate)}`}
          subtitle={`${selectedSession.courtName} · ${selectedSession.startTime}–${selectedSession.endTime}`}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Có mặt: <strong className="text-emerald-600">{presentCount}</strong> / {members.length}</span>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSelectedSession(null)}>Hủy</Button>
                <Button onClick={handleSaveAttendance}>Lưu điểm danh</Button>
              </div>
            </div>
          }
        >
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {members.map(m => (
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

      {/* Create session modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo Buổi Chơi Mới"
        subtitle="Lên lịch buổi chơi cho kỳ quỹ hiện tại"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Hủy bỏ</Button>
            <Button type="submit" form="form-session">Tạo buổi chơi</Button>
          </div>
        }
      >
        <form id="form-session" onSubmit={handleCreateSession} className="space-y-4">
          {!activePeriod && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              Chưa có kỳ quỹ đang hoạt động. Buổi chơi sẽ được lưu cục bộ cho đến khi tạo kỳ quỹ.
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
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tiền sân (VNĐ)</label>
            <input type="number" value={form.courtFee}
              onChange={e => setForm({ ...form, courtFee: Number(e.target.value) })} className="input-base" />
          </div>
        </form>
      </Modal>
    </div>
  )
}
