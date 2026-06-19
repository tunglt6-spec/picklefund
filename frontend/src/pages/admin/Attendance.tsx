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
  const clubId = user?.clubId ?? ''
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

  const openAttendance = async (session: AttendanceSession) => {
    setSelectedSession(session)
    // Default all present, then load existing records from server
    const defaultMap = Object.fromEntries(members.map(m => [m.id, true]))
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
    const records = members.map(m => ({ memberId: m.id, status: attendance[m.id] ? 'PRESENT' : 'ABSENT' as const }))
    const count = records.filter(r => r.status === 'PRESENT').length
    try {
      await api.put(`/attendance/${selectedSession.id}/attendance`, { attendance: records })
      setSessions(prev => prev.map(s => s.id === selectedSession.id
        ? { ...s, _count: { attendanceRecords: count }, status: 'completed' }
        : s
      ))
      setSelectedSession(null)
      toast.success(`ÄÃ£ lÆ°u Ä‘iá»ƒm danh: ${count}/${members.length} ngÆ°á»i`)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'LÆ°u Ä‘iá»ƒm danh tháº¥t báº¡i'
      toast.error(msg)
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { fundPeriodId: activePeriod?.id ?? '', ...form, courtFee: Number(form.courtFee) }
    try {
      const res = await api.post('/attendance', payload)
      const d = res.data?.data
      setSessions(prev => [...prev, { ...d, courtFee: Number(d?.courtFee ?? form.courtFee), _count: { attendanceRecords: 0 } }])
      setShowCreate(false)
      toast.success('ÄÃ£ táº¡o buá»•i chÆ¡i má»›i!')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Táº¡o buá»•i tháº¥t báº¡i'
      toast.error(msg)
    }
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
          <span className="text-[17px] font-[800] text-slate-900">Äiá»ƒm Danh</span>
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[13px] font-[600] text-white active:opacity-80 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} />Táº¡o buá»•i
          </button>
        </div>

        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* KPI row */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Buá»•i chÆ¡i', value: sessions.length, sub: `${completedSessions} xong` },
                { label: 'LÆ°á»£t tham gia', value: totalAttendance, sub: 'lÆ°á»£t' },
                { label: 'TB/buá»•i', value: completedSessions > 0 ? (totalAttendance / completedSessions).toFixed(1) : 'â€”', sub: 'ngÆ°á»i' },
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
              <p className="text-[14px] font-[600] text-slate-500">ChÆ°a cÃ³ buá»•i chÆ¡i nÃ o</p>
              <p className="text-[12px] text-slate-400 mt-1">
                {!activePeriod ? 'Táº¡o ká»³ quá»¹ trÆ°á»›c' : members.length === 0 ? 'ThÃªm thÃ nh viÃªn trÆ°á»›c' : 'Nháº¥n + Ä‘á»ƒ táº¡o buá»•i chÆ¡i'}
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
                        <Clock size={11} />{session.startTime} â€“ {session.endTime}
                      </div>
                      {session.courtName && (
                        <div className="flex items-center gap-1 text-[12px] text-slate-400 mt-0.5">
                          <MapPin size={11} />{session.courtName}
                        </div>
                      )}
                    </div>
                    <Badge variant={session.status === 'completed' ? 'green' : session.status === 'cancelled' ? 'red' : 'indigo'} dot>
                      {session.status === 'completed' ? 'Xong' : session.status === 'cancelled' ? 'Há»§y' : 'Chá»'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-slate-500 pt-2.5 border-t border-slate-50 mb-3">
                    <span>Tiá»n sÃ¢n: <strong className="text-slate-700">{formatVND(session.courtFee)}</strong></span>
                    <span className="flex items-center gap-1">
                      <Users size={11} /><strong>{session._count?.attendanceRecords}</strong>/{members.length}
                    </span>
                  </div>
                  <button
                    className="w-full py-2 rounded-[10px] text-[13px] font-[600] text-indigo-600 border border-indigo-200 flex items-center justify-center gap-1 active:bg-indigo-50"
                    onClick={() => openAttendance(session)}
                  >
                    <CheckSquare size={14} />Äiá»ƒm danh
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedSession && (
          <Modal open={!!selectedSession} onClose={() => setSelectedSession(null)}
            title={`Äiá»ƒm danh â€” ${formatDate(selectedSession.sessionDate)}`}
            subtitle={`${selectedSession.courtName} Â· ${selectedSession.startTime}â€“${selectedSession.endTime}`}
            footer={
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">CÃ³ máº·t: <strong className="text-emerald-600">{presentCount}</strong> / {members.length}</span>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setSelectedSession(null)}>Há»§y</Button>
                  <Button onClick={handleSaveAttendance}>LÆ°u</Button>
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
                  <span className={`text-xs font-medium ${attendance[m.id] ? 'text-emerald-600' : 'text-slate-300'}`}>{attendance[m.id] ? 'CÃ³ máº·t' : 'Váº¯ng'}</span>
                </label>
              ))}
            </div>
          </Modal>
        )}
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Táº¡o Buá»•i ChÆ¡i Má»›i" subtitle="LÃªn lá»‹ch buá»•i chÆ¡i"
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Há»§y bá»</Button>
              <Button type="submit" form="form-session-m">Táº¡o buá»•i chÆ¡i</Button>
            </div>
          }
        >
          <form id="form-session-m" onSubmit={handleCreateSession} className="space-y-4">
            {!activePeriod && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                ChÆ°a cÃ³ ká»³ quá»¹ Ä‘ang hoáº¡t Ä‘á»™ng. Buá»•i chÆ¡i sáº½ Ä‘Æ°á»£c lÆ°u cá»¥c bá»™ cho Ä‘áº¿n khi táº¡o ká»³ quá»¹.
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">NgÃ y chÆ¡i <span className="text-red-500">*</span></label>
              <input required type="date" value={form.sessionDate} onChange={e => setForm({ ...form, sessionDate: e.target.value })} className="input-base" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Giá» báº¯t Ä‘áº§u</label>
                <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Giá» káº¿t thÃºc</label>
                <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className="input-base" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">TÃªn sÃ¢n <span className="text-red-500">*</span></label>
              <input required value={form.courtName} onChange={e => setForm({ ...form, courtName: e.target.value })} placeholder="VD: SÃ¢n Má»¹ ÄÃ¬nh Indoor" className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Tiá»n sÃ¢n (VNÄ)</label>
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
        title="Äiá»ƒm Danh"
        subtitle="Quáº£n lÃ½ Ä‘iá»ƒm danh tá»«ng buá»•i chÆ¡i pickleball"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={15} />Táº¡o buá»•i chÆ¡i
          </Button>
        }
      />

      <div className="p-6 max-w-[1200px] mx-auto space-y-5">
        {sessions.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Tá»•ng buá»•i chÆ¡i</p>
              <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">{completedSessions} Ä‘Ã£ hoÃ n thÃ nh</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Tá»•ng lÆ°á»£t tham gia</p>
              <p className="text-2xl font-bold text-indigo-600">{totalAttendance}</p>
              <p className="text-xs text-slate-400 mt-0.5">lÆ°á»£t</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Trung bÃ¬nh/buá»•i</p>
              <p className="text-2xl font-bold text-emerald-600">
                {completedSessions > 0 ? (totalAttendance / completedSessions).toFixed(1) : 'â€”'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">ngÆ°á»i/buá»•i</p>
            </div>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <CalendarX size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">ChÆ°a cÃ³ buá»•i chÆ¡i nÃ o</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              {!activePeriod ? 'Táº¡o ká»³ quá»¹ trÆ°á»›c khi táº¡o buá»•i chÆ¡i' : members.length === 0 ? 'ThÃªm thÃ nh viÃªn trÆ°á»›c khi táº¡o buá»•i chÆ¡i' : 'Táº¡o buá»•i chÆ¡i Ä‘áº§u tiÃªn cho ká»³ nÃ y'}
            </p>
            {activePeriod && members.length > 0 && (
              <Button onClick={() => setShowCreate(true)} size="sm"><Plus size={14} />Táº¡o buá»•i chÆ¡i Ä‘áº§u tiÃªn</Button>
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
                      <span>{session.startTime} â€“ {session.endTime}</span>
                    </div>
                    {session.courtName && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                        <MapPin size={11} />
                        <span>{session.courtName}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant={session.status === 'completed' ? 'green' : session.status === 'cancelled' ? 'red' : 'indigo'} dot>
                    {session.status === 'completed' ? 'HoÃ n thÃ nh' : session.status === 'cancelled' ? 'ÄÃ£ há»§y' : 'Chá»'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-50">
                  <span>Tiá»n sÃ¢n: <strong className="text-slate-700">{formatVND(session.courtFee)}</strong></span>
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
                  <CheckSquare size={13} />Äiá»ƒm danh
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance modal */}
      {selectedSession && (
        <Modal open={!!selectedSession} onClose={() => setSelectedSession(null)}
          title={`Äiá»ƒm danh â€” ${formatDate(selectedSession.sessionDate)}`}
          subtitle={`${selectedSession.courtName} Â· ${selectedSession.startTime}â€“${selectedSession.endTime}`}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">CÃ³ máº·t: <strong className="text-emerald-600">{presentCount}</strong> / {members.length}</span>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSelectedSession(null)}>Há»§y</Button>
                <Button onClick={handleSaveAttendance}>LÆ°u Ä‘iá»ƒm danh</Button>
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
                  {attendance[m.id] ? 'CÃ³ máº·t' : 'Váº¯ng'}
                </span>
              </label>
            ))}
          </div>
        </Modal>
      )}

      {/* Create session modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Táº¡o Buá»•i ChÆ¡i Má»›i"
        subtitle="LÃªn lá»‹ch buá»•i chÆ¡i cho ká»³ quá»¹ hiá»‡n táº¡i"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Há»§y bá»</Button>
            <Button type="submit" form="form-session">Táº¡o buá»•i chÆ¡i</Button>
          </div>
        }
      >
        <form id="form-session" onSubmit={handleCreateSession} className="space-y-4">
          {!activePeriod && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              ChÆ°a cÃ³ ká»³ quá»¹ Ä‘ang hoáº¡t Ä‘á»™ng. Buá»•i chÆ¡i sáº½ Ä‘Æ°á»£c lÆ°u cá»¥c bá»™ cho Ä‘áº¿n khi táº¡o ká»³ quá»¹.
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">NgÃ y chÆ¡i <span className="text-red-500">*</span></label>
            <input required type="date" value={form.sessionDate}
              onChange={e => setForm({ ...form, sessionDate: e.target.value })} className="input-base" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Giá» báº¯t Ä‘áº§u</label>
              <input type="time" value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value })} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Giá» káº¿t thÃºc</label>
              <input type="time" value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })} className="input-base" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">TÃªn sÃ¢n <span className="text-red-500">*</span></label>
            <input required value={form.courtName} onChange={e => setForm({ ...form, courtName: e.target.value })}
              placeholder="VD: SÃ¢n Má»¹ ÄÃ¬nh Indoor" className="input-base" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tiá»n sÃ¢n (VNÄ)</label>
            <input type="number" value={form.courtFee}
              onChange={e => setForm({ ...form, courtFee: Number(e.target.value) })} className="input-base" />
          </div>
        </form>
      </Modal>
    </div>
  )
}

