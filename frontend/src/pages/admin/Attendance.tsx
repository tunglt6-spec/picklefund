import { countSignal } from '../../lib/statusDesign'
import { MobileSummary } from '../../components/mobile/MobileSummary'
import { useState, useMemo, useRef } from 'react'
import { HuyLabel } from '../../components/ui/HuyLabel'
import { DateInput, TimeInput } from '../../components/ui/DateTimeFields'
import { AmountHint } from '../../components/ui/AmountHint'
import { Plus, CheckSquare, CalendarX, Clock, MapPin, Users, Edit2, Trash2, CalendarDays, UserCheck, TrendingUp } from '../../components/icons/mobileLucide'
import { PhoneToolbar } from '../../components/mobile/PhoneToolbar'
import api from '../../lib/api'
import { PageShell, PageHeader, MetricCard, EmptyState, StatusBadge, ActionButton, ExportActions, runExport } from '../../components/shared'
import { ActionMenu } from '../../components/shared/ActionMenu'
import { useIsMobile } from '../../hooks/useIsMobile'
import { PeriodSelector } from '../../components/ui/PeriodSelector'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { AttendanceSession } from '../../types'
import { formatDate, formatVND, getActiveChungPeriod } from '../../lib/utils'
import toast from 'react-hot-toast'
import { exportGenericExcel, exportGenericTablePDF } from '../../lib/export'

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
  const activePeriod = getActiveChungPeriod(allPeriods)
    ?? allPeriods.find(p => p.status === 'active')
    ?? allPeriods[0]
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
  const [attendanceState, setAttendanceState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attendanceSaving, setAttendanceSaving] = useState(false)
  const attendanceRequest = useRef(0)
  const attendanceSaveLock = useRef(false)
  const closeAttendance = () => {
    if (attendanceSaveLock.current) return
    attendanceRequest.current += 1
    setSelectedSession(null)
  }
  const [showCreate, setShowCreate] = useState(false)
  // courtFee để TRỐNG mặc định (không gợi ý số tiền) — người dùng tự nhập mỗi buổi.
  const [form, setForm] = useState<{ sessionDate: string; startTime: string; endTime: string; courtFee: number | ''; courtName: string }>({ sessionDate: '', startTime: '08:00', endTime: '11:00', courtFee: '', courtName: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [editSession, setEditSession] = useState<AttendanceSession | null>(null)
  const [editForm, setEditForm] = useState({ sessionDate: '', startTime: '08:00', endTime: '11:00', courtFee: 450000, courtName: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showMovePeriod, setShowMovePeriod] = useState(false)
  const [moveToPeriodId, setMoveToPeriodId] = useState('')
  const [isMoving, setIsMoving] = useState(false)

  const openAttendance = async (session: AttendanceSession) => {
    const request = ++attendanceRequest.current
    setSelectedSession(session)
    setAttendanceState('loading')
    setAttendance({})
    // Apply the existing default only AFTER the server confirms this is a new attendance sheet.
    const defaultMap = Object.fromEntries(members.filter(m => m.status === 'active').map(m => [m.id, true]))
    try {
      const res = await api.get(`/attendance/${session.id}/attendance`)
      if (request !== attendanceRequest.current) return
      const records: { memberId: string; status: string }[] = res.data?.data
      if (!Array.isArray(records) || records.some(r => typeof r.memberId !== 'string' || !['PRESENT', 'ABSENT'].includes(r.status))) throw new Error('Invalid attendance response')
      if (records.length > 0) {
        const loaded = Object.fromEntries(records.map(r => [r.memberId, r.status === 'PRESENT']))
        setAttendance(loaded)
      } else setAttendance(defaultMap)
      setAttendanceState('ready')
    } catch {
      if (request === attendanceRequest.current) setAttendanceState('error')
    }
  }

  const handleToggle = (memberId: string) => {
    setAttendance(prev => ({ ...prev, [memberId]: !prev[memberId] }))
  }

  const handleSaveAttendance = async () => {
    if (!selectedSession || attendanceState !== 'ready' || attendanceSaveLock.current) return
    attendanceSaveLock.current = true
    setAttendanceSaving(true)
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
    } finally {
      attendanceSaveLock.current = false
      setAttendanceSaving(false)
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
      setForm({ sessionDate: '', startTime: '08:00', endTime: '11:00', courtFee: '', courtName: '' })
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
  const allPresent = activeMemberList.length > 0 && activeMemberList.every(m => attendance[m.id])
  const toggleAllAttendance = () =>
    setAttendance(allPresent ? {} : Object.fromEntries(activeMemberList.map(m => [m.id, true])))

  // ── Xuất lịch sử điểm danh theo buổi — đúng tập `sessions` đang hiển thị (đã lọc theo kỳ) ──
  const exportPeriodName = allPeriods.find(p => p.id === selectedPeriodId)?.name ?? activePeriod?.name ?? ''
  const exportSessions = [...sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
  const exportSlug = (exportPeriodName || 'tat_ca').replace(/\s+/g, '_').replace(/[/\?%*:|"<>]/g, '')
  const sessionTimeText = (s: AttendanceSession) => (s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : '')
  const doExportExcel = () => {
    if (exportSessions.length === 0) return
    return runExport(() => exportGenericExcel(`Diem_danh_${exportSlug}`, 'Điểm danh',
      ['Ngày', 'Giờ', 'Sân', 'Trạng thái', 'Số người tham gia', 'Phí sân (VNĐ)'],
      exportSessions.map(s => [formatDate(s.sessionDate), sessionTimeText(s), s.courtName ?? '', statusText(s.status), s._count?.attendanceRecords ?? 0, Number(s.courtFee) || 0]),
    ), 'Đã xuất Excel lịch sử điểm danh')
  }
  const doExportPdf = () => {
    if (exportSessions.length === 0) return
    return runExport(() => exportGenericTablePDF({
      fileBase: `Diem_danh_${exportSlug}`,
      title: 'Lịch Sử Điểm danh',
      subtitle: exportPeriodName ? `Kỳ ${exportPeriodName}` : undefined,
      metaLeft: `${exportSessions.length} buổi · ${completedSessions} hoàn thành · ${totalAttendance} lượt tham gia`,
      columns: [
        { header: 'Ngày', align: 'center' }, { header: 'Giờ', align: 'center' }, { header: 'Sân' },
        { header: 'Trạng thái', align: 'center' }, { header: 'Tham gia', align: 'center' }, { header: 'Phí sân', align: 'right' },
      ],
      rows: exportSessions.map(s => [formatDate(s.sessionDate), sessionTimeText(s) || '—', s.courtName ?? '—', statusText(s.status), s._count?.attendanceRecords ?? 0, formatVND(Number(s.courtFee) || 0)]),
    }), 'Đã xuất PDF lịch sử điểm danh')
  }

  // Mobile: buổi CẦN thao tác (đang mở, đã tới/qua ngày) lên đầu, rồi buổi sắp tới, cuối cùng buổi đã xong. Desktop: mới nhất trước như cũ.
  const mobile = useIsMobile(1024)
  const localToday = new Date()
  const todayStr = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`
  const prio = (x: AttendanceSession) => (x.status === 'scheduled' ? (x.sessionDate.slice(0, 10) <= todayStr ? 0 : 1) : 2)
  const orderedSessions = [...sessions].sort((a, b) => {
    if (mobile) {
      const d = prio(a) - prio(b)
      if (d !== 0) return d
      return prio(a) === 1 ? a.sessionDate.localeCompare(b.sessionDate) : b.sessionDate.localeCompare(a.sessionDate)
    }
    return b.sessionDate.localeCompare(a.sessionDate)
  })

  const needAttendance = orderedSessions.filter(s => s.status === 'scheduled' && s.sessionDate.slice(0,10) <= todayStr)
  const upcomingSessions = orderedSessions.filter(s => s.status === 'scheduled' && s.sessionDate.slice(0,10) > todayStr)
  const previousSessions = orderedSessions.filter(s => s.status !== 'scheduled')
  const sessionCard = (session: AttendanceSession) => (
<div key={session.id} className="pf-session-card pf-glass rounded-2xl p-4" style={{ boxShadow: 'var(--pf-shadow)' }}>
                <div className="pf-session-heading flex items-start justify-between gap-2">
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

                <div className="pf-session-finance mt-3 flex items-center justify-between border-t pt-3 text-xs [border-color:var(--pf-border)] [color:var(--pf-color-muted)]">
                  <span>Tiền sân: <strong className="[color:var(--pf-text)]">{formatVND(session.courtFee)}</strong></span>
                  <div className="flex items-center gap-1">
                    <Users size={11} /><strong className="[color:var(--pf-text)]">{session._count?.attendanceRecords ?? 0}</strong><span>/{members.length}</span>
                  </div>
                </div>

                <div className="pf-session-actions mt-3 flex gap-2">
                  <button
                    onClick={() => openAttendance(session)}
                    disabled={members.length === 0}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)] disabled:opacity-40"
                  >
                    <CheckSquare size={14} />Điểm danh
                  </button>
                  {mobile ? <ActionMenu iconOnly label={`Thao tác buổi ${formatDate(session.sessionDate)}`} items={[
                    {key:'edit',label:'Sửa buổi',onClick:()=>openEdit(session)},
                    {key:'delete',label:'Xóa buổi',onClick:()=>setDeleteId(session.id),danger:true},
                  ]} /> : <>                  <button onClick={() => openEdit(session)} aria-label="Sửa buổi" className="flex h-11 w-11 items-center justify-center rounded-lg border [border-color:var(--pf-border)] [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] hover:[color:var(--pf-primary-text)]">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => setDeleteId(session.id)} aria-label="Xóa buổi" className="flex h-11 w-11 items-center justify-center rounded-lg border [border-color:var(--pf-border)] [color:var(--pf-color-danger)] hover:[background:var(--pf-color-danger-soft)]">
                    <Trash2 size={15} />
                  </button>
</>}
                </div>
              </div>
  )

  return (
    <PageShell>
      <PageHeader
        title="Điểm danh"
        className="pf-phone-header"
        actions={
          <PhoneToolbar label="Công cụ điểm danh" tools={[
            ...(allPeriods.length>1?[{key:'period',label:'Kỳ quỹ',icon:<CalendarDays />,detail:allPeriods.find(p=>p.id===selectedPeriodId)?.name,content:<PeriodSelector periods={allPeriods} selectedId={selectedPeriodId} onChange={setSelectedPeriodId} label="Kỳ quỹ"/>}]:[]),
            {key:'add',label:'Tạo buổi',icon:<Plus />,primary:true,onClick:()=>setShowCreate(true)},
          ]} more={<ActionMenu iconOnly label="Thao tác điểm danh" items={[
            ...(allPeriods.length>1&&sessions.length?[{key:'move',label:`Chuyển kỳ (${sessions.length} buổi)`,onClick:()=>setShowMovePeriod(true)}]:[]),
            ...(exportSessions.length?[{key:'xlsx',label:'Xuất Excel',onClick:doExportExcel},{key:'pdf',label:'Xuất PDF',onClick:doExportPdf}]:[]),
          ]}/>} fallback={
          <>
            {allPeriods.length > 1 && (
              <PeriodSelector periods={allPeriods} selectedId={selectedPeriodId} onChange={setSelectedPeriodId} label="Kỳ quỹ" />
            )}
            {allPeriods.length > 1 && sessions.length > 0 && (
              <button
                onClick={() => setShowMovePeriod(true)}
                className="max-lg:hidden min-h-11 rounded-lg border px-3 text-sm font-semibold [color:var(--pf-primary-text)] [border-color:var(--pf-primary-soft)] hover:[background:var(--pf-primary-soft)] transition-colors"
              >
                Chuyển kỳ ({sessions.length} buổi)
              </button>
            )}
            {exportSessions.length > 0 && <div className="contents max-lg:hidden"><ExportActions onExcel={doExportExcel} onPdf={doExportPdf} /></div>}
            <ActionButton icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Tạo buổi chơi</ActionButton>
            {/* Mobile: thao tác phụ gom vào menu "Thao tác" */}
            <ActionMenu items={[
              ...(allPeriods.length > 1 && sessions.length > 0 ? [{ key: 'move', label: `Chuyển kỳ (${sessions.length} buổi)`, onClick: () => setShowMovePeriod(true) }] : []),
              ...(exportSessions.length > 0 ? [
                { key: 'xlsx', label: 'Xuất Excel', onClick: doExportExcel },
                { key: 'pdf', label: 'Xuất PDF', onClick: doExportPdf },
              ] : []),
            ]} />
          </> } />
        }
      />

      <div className="flex flex-col gap-5">
        {/* KPI */}
        {sessions.length > 0 && <MobileSummary module="activity" label="Buổi cần điểm danh" tone={countSignal(needAttendance.length, 'pending')} value={needAttendance.length} note={`${completedSessions} buổi đã hoàn thành`} items={[
          {label:'Tổng buổi trong kỳ',value:sessions.length},{label:'Lượt tham gia',value:totalAttendance},{label:'Trung bình / buổi',value:completedSessions ? (totalAttendance/completedSessions).toFixed(1) : '—'},
        ]} />}
        {sessions.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 max-lg:hidden">
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
          mobile ? <div className="pf-mobile-session-list">
            {needAttendance.length > 0 && <><h2>Cần điểm danh · {needAttendance.length} buổi</h2><div className="pf-record-grid">{needAttendance.map(sessionCard)}</div></>}
            {previousSessions.length > 0 && <><h2>Buổi gần nhất</h2><div className="pf-record-grid">{previousSessions.slice(0,2).map(sessionCard)}</div>
              {previousSessions.length > 2 && <details><summary className="min-h-11 py-3 text-sm font-semibold [color:var(--pf-primary-text)]">Lịch sử · {previousSessions.length - 2} buổi khác</summary><div className="pf-record-grid space-y-2.5">{previousSessions.slice(2).map(sessionCard)}</div></details>}
            </>}
            {upcomingSessions.length > 0 && <details open={needAttendance.length === 0 && previousSessions.length === 0}><summary className="min-h-11 py-3 text-sm font-semibold [color:var(--pf-primary-text)]">Sắp tới · {upcomingSessions.length} buổi</summary><div className="pf-record-grid space-y-2.5">{upcomingSessions.map(sessionCard)}</div></details>}
          </div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{orderedSessions.map(sessionCard)}</div>
        )}
      </div>

      {/* Attendance modal */}
      {selectedSession && (
        <Modal open={!!selectedSession} onClose={closeAttendance}
          title={`Điểm danh — ${formatDate(selectedSession.sessionDate)}`}
          subtitle={`${selectedSession.courtName ?? ''} · ${selectedSession.startTime}–${selectedSession.endTime}`}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-sm [color:var(--pf-color-muted)]">{attendanceState === 'ready' ? <>Có mặt: <strong className="text-emerald-600">{presentCount}</strong> / {activeMemberList.length}</> : 'Chưa sẵn sàng'}</span>
              <div className="flex gap-3">
                <Button variant="outline" disabled={attendanceSaving} onClick={closeAttendance}>Hủy</Button>
                <Button disabled={attendanceState !== 'ready' || attendanceSaving} onClick={handleSaveAttendance}>{attendanceSaving ? 'Đang lưu…' : 'Lưu điểm danh'}</Button>
              </div>
            </div>
          }
        >
          {attendanceState === 'loading' ? <div role="status" className="pf-mobile-loading">Đang tải điểm danh…</div>
            : attendanceState === 'error' ? <div role="alert" className="space-y-3 py-5 text-sm [color:var(--pf-text)]"><p>Không tải được điểm danh. Chưa có thay đổi nào được lưu.</p><Button variant="outline" onClick={() => void openAttendance(selectedSession)}>Thử lại</Button></div>
            : <>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs [color:var(--pf-color-muted)]">{activeMemberList.length} thành viên</span>
            <button type="button" disabled={attendanceSaving} onClick={toggleAllAttendance}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold [color:var(--pf-primary-text)] hover:[background:var(--pf-primary-soft)] transition-colors">
              <CheckSquare size={13} />{allPresent ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {activeMemberList.map(m => (
              <label key={m.id} data-active={attendance[m.id] ? '' : undefined} className="pf-rowcard flex items-center gap-3 px-4 py-2.5 cursor-pointer">
                <input type="checkbox" disabled={attendanceSaving} checked={!!attendance[m.id]} onChange={() => handleToggle(m.id)}
                  className="h-4 w-4 rounded accent-emerald-500 shrink-0" />
                <MemberAvatar name={m.fullName} id={m.id} />
                <span className="font-medium [color:var(--pf-text)] flex-1 text-sm">{m.fullName}</span>
                <span className={`text-xs font-medium ${attendance[m.id] ? '[color:var(--pf-green)]' : '[color:var(--pf-color-muted)]'}`}>
                  {attendance[m.id] ? 'Có mặt' : 'Vắng'}
                </span>
              </label>
            ))}
          </div></>}
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
            <label htmlFor="f-Attendance-1" className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Ngày chơi <span className="text-red-500">*</span></label>
            <DateInput id="f-Attendance-1" required value={editForm.sessionDate} onChange={e => setEditForm({ ...editForm, sessionDate: e.target.value })} className="input-base" />
          </div>
          <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
            <div>
              <label htmlFor="f-Attendance-2" className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Giờ bắt đầu</label>
              <TimeInput id="f-Attendance-2" value={editForm.startTime} onChange={e => setEditForm({ ...editForm, startTime: e.target.value })} className="input-base" />
            </div>
            <div>
              <label htmlFor="f-Attendance-3" className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Giờ kết thúc</label>
              <TimeInput id="f-Attendance-3" value={editForm.endTime} onChange={e => setEditForm({ ...editForm, endTime: e.target.value })} className="input-base" />
            </div>
          </div>
          <div>
            <label htmlFor="f-Attendance-4" className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Tên sân <span className="text-red-500">*</span></label>
            <input id="f-Attendance-4" required value={editForm.courtName} onChange={e => setEditForm({ ...editForm, courtName: e.target.value })} placeholder="VD: Sân Mỹ Đình Indoor" className="input-base" />
          </div>
          <div>
            <label htmlFor="f-Attendance-5" className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Tiền sân (VNĐ) <span className="text-red-500">*</span></label>
            <input id="f-Attendance-5" type="number" required min="1" value={editForm.courtFee} onChange={e => setEditForm({ ...editForm, courtFee: Number(e.target.value) })} className="input-base" />
<AmountHint value={editForm.courtFee} />
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Xóa buổi chơi"
        subtitle="Hành động này không thể hoàn tác"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting}>Hủy</Button>
            <Button onClick={handleDeleteSession} disabled={isDeleting} className="bg-red-500 hover:bg-red-500 text-white border-red-600">
              {isDeleting ? 'Đang xóa...' : 'Xóa buổi chơi'}
            </Button>
          </div>
        }
      >
        <p className="text-sm [color:var(--pf-color-muted)]">Bạn có chắc muốn xóa buổi chơi này? Toàn bộ dữ liệu điểm danh của buổi này sẽ bị xóa vĩnh viễn.</p>
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
          <p className="text-sm [color:var(--pf-color-muted)]">Chọn kỳ quỹ đích để chuyển toàn bộ <strong>{sessions.length}</strong> buổi đang hiển thị:</p>
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
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)} disabled={isSaving}><HuyLabel /></Button>
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
            <label htmlFor="f-Attendance-6" className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Ngày chơi <span className="text-red-500">*</span></label>
            <DateInput id="f-Attendance-6" required value={form.sessionDate}
              onChange={e => setForm({ ...form, sessionDate: e.target.value })} className="input-base" />
          </div>
          <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
            <div>
              <label htmlFor="f-Attendance-7" className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Giờ bắt đầu</label>
              <TimeInput id="f-Attendance-7" value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value })} className="input-base" />
            </div>
            <div>
              <label htmlFor="f-Attendance-8" className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Giờ kết thúc</label>
              <TimeInput id="f-Attendance-8" value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })} className="input-base" />
            </div>
          </div>
          <div>
            <label htmlFor="f-Attendance-9" className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Tên sân <span className="text-red-500">*</span></label>
            <input id="f-Attendance-9" required value={form.courtName} onChange={e => setForm({ ...form, courtName: e.target.value })}
              placeholder="VD: Sân Mỹ Đình Indoor" className="input-base" />
          </div>
          <div>
            <label htmlFor="f-Attendance-10" className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Tiền sân (VNĐ) <span className="text-red-500">*</span></label>
            <input id="f-Attendance-10" type="number" required min="1" value={form.courtFee} placeholder="Nhập tiền sân"
              onChange={e => setForm({ ...form, courtFee: e.target.value === '' ? '' : Number(e.target.value) })} className="input-base" />
<AmountHint value={form.courtFee} />
          </div>
        </form>
      </Modal>
    </PageShell>
  )
}
