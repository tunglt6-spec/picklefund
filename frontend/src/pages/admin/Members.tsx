/**
 * UI-03 — Member Management Enterprise Workspace (PickleFund v2.1)
 * Kế thừa UI-02 Dashboard 4.0 (Golden Reference). Tuân thủ UIP-03 (Member Workspace
 * Pattern) + UDP-01 (Design SoT) + DESIGN-01 (Foundation Freeze) + GOV-01.
 *
 * Chỉ trình bày (UI): dùng shared components (PageShell/PageHeader/MetricCard/
 * FilterBar/DataTable/MobileCardList/StatusBadge/ActionButton/EmptyState/LoadingState)
 * + token --pf-*. KHÔNG đổi logic/API/finance/attendance/account. UI chỉ render dữ liệu
 * hiện có; thiếu dữ liệu → EmptyState / "Chưa có dữ liệu" (không bịa số).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Users, UserCheck, UserMinus, Sparkles, X, Edit2, Trash2, Power,
  FileSpreadsheet, FileText, Phone, Mail, Calendar, Wallet, KeyRound,
  ClipboardList, Eye, CircleUserRound, AlertTriangle, RefreshCw,
} from 'lucide-react'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { Member } from '../../types'
import { formatDate, formatVND } from '../../lib/utils'
import { exportMembersExcel, exportMembersPDF } from '../../lib/export'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  PageShell, PageHeader, MetricCard, FilterBar, DataTable, type Column,
  StatusBadge, type StatusTone, ActionButton, EmptyState, LoadingState, MobileCardList,
} from '../../components/shared'
import { accentVars, type ModuleAccent } from '../../components/shared/tokens'

/** Session demo/local (không gọi API thật) — đồng bộ với useApiSync. */
function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}

const emptyForm = { fullName: '', phone: '', email: '', joinDate: new Date().toISOString().slice(0, 10), notes: '' }

/** Hiển thị ngày an toàn: dữ liệu thiếu/không hợp lệ → "—" (không hiện "Invalid Date"). */
function safeDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN')
}

/* ── Status mapping (UDP-01: badge có text, không chỉ màu) ── */
const STATUS_TONE: Record<string, StatusTone> = { active: 'success', inactive: 'warning', left: 'neutral' }
const STATUS_LABEL: Record<string, string> = { active: 'Đang hoạt động', inactive: 'Tạm ngưng', left: 'Đã rời CLB' }
/** Label dùng cho export — GIỮ NGUYÊN chuỗi cũ để không đổi output báo cáo. */
const EXPORT_STATUS_LABEL: Record<string, string> = { active: 'Hoạt động', inactive: 'Tạm nghỉ', left: 'Đã rời' }

type StatusFilter = 'all' | 'active' | 'inactive' | 'left'
const STATUS_FILTERS: [StatusFilter, string][] = [
  ['all', 'Tất cả'], ['active', 'Đang hoạt động'], ['inactive', 'Tạm ngưng'], ['left', 'Đã rời CLB'],
]

/* ── Member-specific component: Avatar (accent theo id, dùng token --pf-*) ── */
function MemberAvatar({ name, id, size = 36 }: { name: string; id: string; size?: number }) {
  const palette: ModuleAccent[] = ['green', 'blue', 'violet', 'amber', 'teal', 'rose']
  const accent = palette[(id.charCodeAt(id.length - 1) || 0) % palette.length]
  const a = accentVars(accent)
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold uppercase select-none"
      style={{ height: size, width: size, background: a.soft, color: a.color, fontSize: size * 0.4 }}
      aria-hidden
    >
      {name.slice(0, 1)}
    </div>
  )
}

/* ── Drawer shell: desktop = right panel, mobile = bottom sheet ── */
function DrawerShell({
  open, onClose, title, subtitle, isMobile, children, footer,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string
  isMobile: boolean; children: React.ReactNode; footer?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className={`fixed inset-0 z-50 flex ${isMobile ? 'items-end' : 'justify-end'}`}>
      <div className="absolute inset-0" style={{ background: 'rgb(15 23 42 / 0.30)' }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex flex-col [background:var(--pf-surface)] ${
          isMobile
            ? 'w-full max-h-[88vh] rounded-t-[24px] animate-fadeIn'
            : 'h-full w-full max-w-md shadow-2xl animate-fadeIn'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4 border-[color:var(--pf-border)]">
          <div className="min-w-0">
            <h2 className="text-base font-semibold [color:var(--pf-text)]">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-xs [color:var(--pf-color-muted)]">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center gap-3 border-t px-5 py-4 border-[color:var(--pf-border)]">{footer}</div>
        )}
      </div>
    </div>
  )
}

/* ── Member form (Thêm / Chỉnh sửa) — logic giữ nguyên, chỉ đổi style sang token ── */
function MemberFormDrawer({
  open, onClose, editMember, onSave, isSaving, isMobile,
}: {
  open: boolean; onClose: () => void; editMember: Member | null
  onSave: (form: typeof emptyForm) => void; isSaving?: boolean; isMobile: boolean
}) {
  const [form, setForm] = useState(() => editMember
    ? { fullName: editMember.fullName, phone: editMember.phone || '', email: editMember.email || '', joinDate: editMember.joinDate, notes: editMember.notes || '' }
    : { ...emptyForm })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName.trim()) { toast.error('Vui lòng nhập họ tên'); return }
    onSave(form)
  }
  const isEdit = !!editMember

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      isMobile={isMobile}
      title={isEdit ? 'Chỉnh sửa thành viên' : 'Thêm thành viên mới'}
      subtitle={isEdit ? `Cập nhật thông tin của ${editMember!.fullName}` : 'Nhập thông tin thành viên CLB'}
      footer={
        <>
          <ActionButton type="button" variant="secondary" fullWidth onClick={onClose}>Hủy bỏ</ActionButton>
          <ActionButton type="submit" form="member-form" fullWidth disabled={isSaving}>
            {isSaving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm thành viên'}
          </ActionButton>
        </>
      }
    >
      <form id="member-form" onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Thông tin cá nhân</p>
          <div className="space-y-3.5">
            <div>
              <label htmlFor="mf-name" className="mb-1.5 block text-xs font-medium [color:var(--pf-text)]">
                Họ và tên <span style={{ color: 'var(--pf-color-danger)' }}>*</span>
              </label>
              <input id="mf-name" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                placeholder="Nguyễn Văn A" className="input-base" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="mf-phone" className="mb-1.5 block text-xs font-medium [color:var(--pf-text)]">Số điện thoại</label>
                <input id="mf-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="0912 345 678" className="input-base" />
              </div>
              <div>
                <label htmlFor="mf-join" className="mb-1.5 block text-xs font-medium [color:var(--pf-text)]">Ngày gia nhập</label>
                <input id="mf-join" type="date" value={form.joinDate} onChange={e => setForm({ ...form, joinDate: e.target.value })}
                  className="input-base" />
              </div>
            </div>
            <div>
              <label htmlFor="mf-email" className="mb-1.5 block text-xs font-medium [color:var(--pf-text)]">Email</label>
              <input id="mf-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="nguyenvana@gmail.com" className="input-base" />
            </div>
          </div>
        </div>
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Thông tin bổ sung</p>
          <div>
            <label htmlFor="mf-notes" className="mb-1.5 block text-xs font-medium [color:var(--pf-text)]">Ghi chú</label>
            <textarea id="mf-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Thông tin thêm về thành viên..." rows={3} className="input-base resize-none" />
          </div>
        </div>
      </form>
    </DrawerShell>
  )
}

interface MemberRow {
  member: Member
  attended: number
  totalSessions: number
  hasAttendance: boolean
  paid: boolean
  periodName: string | null
  contributions: { amount: number; paymentDate: string }[]
}

/* ── Member detail (Right drawer desktop / bottom sheet mobile) ── */
function MemberDetailDrawer({
  row, onClose, isMobile, onEdit, onToggle, onDelete,
}: {
  row: MemberRow | null; onClose: () => void; isMobile: boolean
  onEdit: (m: Member) => void; onToggle: (m: Member) => void; onDelete: (m: Member) => void
}) {
  if (!row) return null
  const m = row.member
  return (
    <DrawerShell
      open={!!row}
      onClose={onClose}
      isMobile={isMobile}
      title="Hồ sơ thành viên"
      subtitle={m.fullName}
      footer={
        <>
          <ActionButton variant="secondary" icon={<Edit2 size={15} />} onClick={() => onEdit(m)}>Chỉnh sửa</ActionButton>
          {m.status !== 'left' && (
            <ActionButton variant="secondary" icon={<Power size={15} />} onClick={() => onToggle(m)}>
              {m.status === 'active' ? 'Tạm ngưng' : 'Kích hoạt'}
            </ActionButton>
          )}
          <ActionButton variant="ghost" iconOnly ariaLabel="Xóa thành viên" icon={<Trash2 size={16} />} onClick={() => onDelete(m)} />
        </>
      }
    >
      <div className="space-y-5 px-5 py-5">
        {/* Header identity */}
        <div className="flex items-center gap-3">
          <MemberAvatar name={m.fullName} id={m.id} size={52} />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold [color:var(--pf-text)]">{m.fullName}</p>
            <div className="mt-1">
              <StatusBadge tone={STATUS_TONE[m.status] ?? 'neutral'} dot>{STATUS_LABEL[m.status] ?? m.status}</StatusBadge>
            </div>
          </div>
        </div>

        {/* Thông tin cá nhân */}
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Thông tin cá nhân</p>
          <dl className="space-y-2 text-sm">
            <DetailRow icon={<Phone size={14} />} label="Số điện thoại" value={m.phone || 'Chưa có'} />
            <DetailRow icon={<Mail size={14} />} label="Email" value={m.email || 'Chưa có'} />
            <DetailRow icon={<Calendar size={14} />} label="Ngày gia nhập" value={safeDate(m.joinDate)} />
            <DetailRow icon={<CircleUserRound size={14} />} label="Tài khoản app" value={m.userId ? 'Đã liên kết' : 'Chưa liên kết'} />
          </dl>
        </section>

        {/* Kỳ quỹ + điểm danh */}
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Kỳ quỹ hiện tại</p>
          {row.periodName ? (
            <div className="rounded-2xl border p-4 border-[color:var(--pf-border)]">
              <div className="flex items-center justify-between text-sm">
                <span className="[color:var(--pf-color-muted)]">{row.periodName}</span>
                <StatusBadge tone={row.paid ? 'success' : 'warning'}>{row.paid ? 'Đã đóng quỹ' : 'Chưa đóng quỹ'}</StatusBadge>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm [color:var(--pf-text)]">
                <ClipboardList size={14} className="[color:var(--pf-color-muted)]" />
                {row.hasAttendance ? (
                  <span className="tabular-nums">{row.attended}/{row.totalSessions} buổi tham gia</span>
                ) : (
                  <span className="[color:var(--pf-color-muted)]">Chưa có dữ liệu điểm danh</span>
                )}
              </div>
            </div>
          ) : (
            <EmptyState icon={<Calendar size={22} />} title="Chưa có kỳ quỹ" description="CLB chưa có kỳ quỹ đang hoạt động." />
          )}
        </section>

        {/* Lịch sử đóng quỹ */}
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Lịch sử đóng quỹ</p>
          {row.contributions.length === 0 ? (
            <p className="rounded-2xl border px-4 py-6 text-center text-sm border-[color:var(--pf-border)] [color:var(--pf-color-muted)]">Chưa có dữ liệu đóng quỹ</p>
          ) : (
            <ul className="space-y-2">
              {row.contributions.map((c, i) => (
                <li key={i} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm border-[color:var(--pf-border)]">
                  <span className="[color:var(--pf-color-muted)]">{safeDate(c.paymentDate)}</span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--pf-green)' }}>+{formatVND(c.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Ghi chú */}
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Ghi chú</p>
          <p className="text-sm [color:var(--pf-text)]">{m.notes?.trim() || <span className="[color:var(--pf-color-muted)]">Không có ghi chú</span>}</p>
        </section>
      </div>
    </DrawerShell>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 [color:var(--pf-color-muted)]">
        <span className="[color:var(--pf-color-muted)]">{icon}</span>{label}
      </dt>
      <dd className="text-right font-medium [color:var(--pf-text)]">{value}</dd>
    </div>
  )
}

export function Members() {
  const { user, accessToken } = useAuthStore()
  const navigate = useNavigate()
  const clubId = user?.clubId ?? ''
  const { getClubData, setMembers: saveMembers } = useClubDataStore()
  const clubData = getClubData(clubId)
  const members = clubData.members
  const clubName = (clubData.settings?.name as string | undefined) ?? 'CLB Pickleball'
  const isMobile = useIsMobile()

  const setMembers = (fn: (prev: Member[]) => Member[]) =>
    saveMembers(clubId, fn(getClubData(clubId).members))

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [joinFrom, setJoinFrom] = useState('')
  const [joinTo, setJoinTo] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle')

  /* ── Workspace fetch (dùng ĐÚNG API hiện có: GET /members?clubId=…) ──
     Không đổi business logic — chỉ nạp danh sách vào store + điều khiển Loading/Error.
     Bỏ qua session demo/local (không gọi API thật). */
  const fetchMembers = useCallback(async () => {
    if (!clubId || isLocalToken(accessToken)) { setLoadState('idle'); return }
    setLoadState('loading')
    try {
      const res = await api.get(`/members?clubId=${clubId}`)
      const raw = res.data?.data ?? []
      const list: Member[] = raw.map((m: any) => ({
        id: m.id,
        clubId: m.clubId,
        fullName: m.fullName,
        phone: m.phone ?? undefined,
        email: m.email ?? undefined,
        joinDate: m.joinDate?.slice(0, 10) ?? '',
        status: m.status ?? 'active',
        avatarUrl: m.avatarUrl ?? undefined,
        notes: m.notes ?? undefined,
      }))
      saveMembers(clubId, list)
      setLoadState('idle')
    } catch {
      setLoadState('error')
    }
  }, [clubId, accessToken, saveMembers])

  // Nạp lần đầu chỉ khi store chưa có dữ liệu (useApiSync có thể đã đồng bộ sẵn).
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (isLocalToken(accessToken)) return
    if (getClubData(clubId).members.length === 0) void fetchMembers()
  }, [accessToken, clubId, fetchMembers, getClubData])

  /* ── Kỳ quỹ hiện tại + dữ liệu phái sinh (chỉ đọc, dữ liệu thật) ──
     React Compiler tự memo hoá (không dùng useMemo thủ công để tránh xung đột). */
  const periods = clubData.fundPeriods ?? []
  const currentPeriod =
    periods.find(p => p.status === 'active')
    ?? [...periods].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))[0]
    ?? null

  const attendanceByMember = new Map<string, { attended: number; total: number }>()
  for (const s of clubData.memberAttendanceSummary ?? [])
    attendanceByMember.set(s.memberId, { attended: s.attendedSessions, total: s.totalSessions })

  const contribByMember = new Map<string, { amount: number; paymentDate: string }[]>()
  for (const c of clubData.contributions ?? []) {
    if (c.fundSource !== 'COMMON' || !c.memberId) continue
    const arr = contribByMember.get(c.memberId) ?? []
    arr.push({ amount: c.amount, paymentDate: c.paymentDate })
    contribByMember.set(c.memberId, arr)
  }

  const paidThisPeriod = new Set<string>()
  if (currentPeriod)
    for (const c of clubData.contributions ?? [])
      if (c.fundSource === 'COMMON' && c.fundPeriodId === currentPeriod.id && c.memberId) paidThisPeriod.add(c.memberId)

  const toRow = (m: Member): MemberRow => {
    const att = attendanceByMember.get(m.id)
    return {
      member: m,
      attended: att?.attended ?? 0,
      totalSessions: att?.total ?? (currentPeriod?.totalSessions ?? 0),
      hasAttendance: !!att,
      paid: paidThisPeriod.has(m.id),
      periodName: currentPeriod?.name ?? null,
      contributions: contribByMember.get(m.id) ?? [],
    }
  }

  /* ── Filter (GIỮ NGUYÊN logic lọc: tên/SĐT + trạng thái + ngày gia nhập) ── */
  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    const matchQ = m.fullName.toLowerCase().includes(q) || (m.phone || '').includes(q) || (m.email || '').toLowerCase().includes(q)
    const matchS = statusFilter === 'all' || m.status === statusFilter
    const matchFrom = !joinFrom || (m.joinDate ?? '') >= joinFrom
    const matchTo = !joinTo || (m.joinDate ?? '') <= joinTo
    return matchQ && matchS && matchFrom && matchTo
  })
  const rows = filtered.map(toRow)

  /* ── KPI (dữ liệu thật) ── */
  const totalMembers = members.length
  const activeCount = members.filter(m => m.status === 'active').length
  const inactiveCount = members.filter(m => m.status === 'inactive').length
  const leftCount = members.filter(m => m.status === 'left').length

  /* ── Actions (GIỮ NGUYÊN toàn bộ API/logic) ── */
  const openCreate = () => { setEditMember(null); setShowForm(true) }
  const openEdit = (m: Member) => { setDetailId(null); setEditMember(m); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditMember(null) }

  const handleSave = async (form: typeof emptyForm) => {
    setIsSaving(true)
    try {
      if (editMember) {
        const res = await api.put(`/members/${editMember.id}`, form)
        const updated = res.data?.data ?? { ...editMember, ...form }
        setMembers(prev => prev.map(m => m.id === editMember.id ? { ...m, ...updated } : m))
        closeForm()
        toast.success('Cập nhật thành viên thành công!')
      } else {
        const res = await api.post('/members', { ...form, clubId })
        const created = res.data?.data
        setMembers(prev => [...prev, { ...created }])
        closeForm()
        toast.success(`Đã thêm ${form.fullName}!`)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu thành viên thất bại')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (m: Member) => {
    if (!window.confirm(`Xóa thành viên ${m.fullName}?`)) return
    try {
      await api.delete(`/members/${m.id}`)
      setMembers(prev => prev.filter(x => x.id !== m.id))
      setDetailId(null)
      toast.success('Đã xóa thành viên')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xóa thành viên thất bại')
    }
  }

  const handleToggleStatus = async (m: Member) => {
    const next = m.status === 'active' ? 'inactive' : 'active'
    try {
      await api.put(`/members/${m.id}`, { status: next })
      setMembers(prev => prev.map(x => x.id === m.id ? { ...x, status: next } : x))
      toast.success(next === 'active' ? `${m.fullName} đã kích hoạt lại` : `${m.fullName} đã tạm nghỉ`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật trạng thái thất bại')
    }
  }

  const exportRows = () => filtered.map(m => ({
    name: m.fullName, phone: m.phone ?? '', email: m.email ?? '',
    joinDate: formatDate(m.joinDate), status: EXPORT_STATUS_LABEL[m.status] ?? m.status,
  }))
  const doExportExcel = () => { exportMembersExcel('CLB', exportRows()); toast.success('Đã xuất Excel danh sách thành viên!') }
  const doExportPDF = () => { exportMembersPDF(clubName, exportRows()); toast.success('Đã xuất PDF danh sách thành viên!') }

  const resetFilters = () => { setStatusFilter('all'); setJoinFrom(''); setJoinTo(''); setSearch('') }
  const hasActiveFilter = !!search || statusFilter !== 'all' || !!joinFrom || !!joinTo
  const detailRow = detailId ? rows.find(r => r.member.id === detailId) ?? (members.find(m => m.id === detailId) ? toRow(members.find(m => m.id === detailId)!) : null) : null

  /* ── DataTable columns (desktop) ── */
  const columns: Column<MemberRow>[] = [
    {
      key: 'name', header: 'Thành viên',
      render: (r) => (
        <div className="flex items-center gap-3">
          <MemberAvatar name={r.member.fullName} id={r.member.id} />
          <div className="min-w-0">
            <p className="truncate font-medium [color:var(--pf-text)]">{r.member.fullName}</p>
            <p className="text-xs [color:var(--pf-color-muted)]">#{r.member.id.slice(-4)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact', header: 'Liên hệ',
      render: (r) => (
        <div className="text-xs">
          {r.member.phone && <p className="[color:var(--pf-text)]">{r.member.phone}</p>}
          {r.member.email && <p className="[color:var(--pf-color-muted)]">{r.member.email}</p>}
          {!r.member.phone && !r.member.email && <span className="[color:var(--pf-color-muted)]">—</span>}
        </div>
      ),
    },
    {
      key: 'attended', header: 'Số buổi', align: 'right',
      render: (r) => r.hasAttendance
        ? <span className="tabular-nums [color:var(--pf-text)]">{r.attended}/{r.totalSessions}</span>
        : <span className="[color:var(--pf-color-muted)]">—</span>,
    },
    {
      key: 'paid', header: 'Đóng quỹ', align: 'center',
      render: (r) => r.periodName
        ? <StatusBadge tone={r.paid ? 'success' : 'warning'}>{r.paid ? 'Đã đóng' : 'Chưa đóng'}</StatusBadge>
        : <span className="[color:var(--pf-color-muted)]">—</span>,
    },
    {
      key: 'period', header: 'Kỳ quỹ',
      render: (r) => <span className="text-xs [color:var(--pf-color-muted)]">{r.periodName ?? 'Chưa có kỳ'}</span>,
    },
    { key: 'join', header: 'Ngày gia nhập', render: (r) => <span className="text-xs [color:var(--pf-color-muted)]">{safeDate(r.member.joinDate)}</span> },
    {
      key: 'status', header: 'Trạng thái',
      render: (r) => <StatusBadge tone={STATUS_TONE[r.member.status] ?? 'neutral'} dot>{STATUS_LABEL[r.member.status] ?? r.member.status}</StatusBadge>,
    },
    {
      key: 'actions', header: 'Hành động', align: 'center',
      render: (r) => (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          <IconBtn label="Xem chi tiết" onClick={() => setDetailId(r.member.id)}><Eye size={15} /></IconBtn>
          <IconBtn label="Chỉnh sửa" onClick={() => openEdit(r.member)}><Edit2 size={15} /></IconBtn>
          {r.member.status !== 'left' && (
            <IconBtn label={r.member.status === 'active' ? 'Tạm ngưng' : 'Kích hoạt'} onClick={() => handleToggleStatus(r.member)}><Power size={15} /></IconBtn>
          )}
          <IconBtn label="Xóa" danger onClick={() => handleDelete(r.member)}><Trash2 size={15} /></IconBtn>
        </div>
      ),
    },
  ]

  /* ── Header actions (chỉ hiển thị action có backend hỗ trợ) ── */
  const headerActions = (
    <>
      <ActionButton variant="secondary" iconOnly ariaLabel="Xuất Excel" icon={<FileSpreadsheet size={16} />} onClick={doExportExcel} />
      <ActionButton variant="secondary" iconOnly ariaLabel="Xuất PDF" icon={<FileText size={16} />} onClick={doExportPDF} />
      <ActionButton variant="secondary" icon={<KeyRound size={15} />} onClick={() => navigate('/member-accounts')}>Tạo tài khoản</ActionButton>
      <ActionButton icon={<Plus size={16} />} onClick={openCreate}>Thêm thành viên</ActionButton>
    </>
  )

  /* ── Status filter chips (desktop inline) ── */
  const statusChips = (
    <div className="flex items-center gap-1 rounded-full border p-1 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
      {STATUS_FILTERS.map(([v, l]) => (
        <button
          key={v}
          onClick={() => setStatusFilter(v)}
          aria-pressed={statusFilter === v}
          className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
          style={statusFilter === v
            ? { background: 'var(--pf-green)', color: 'var(--pf-text-on-primary)' }
            : { color: 'var(--pf-color-muted)' }}
        >
          {l}
        </button>
      ))}
    </div>
  )

  return (
    <PageShell>
      <PageHeader
        title="Thành viên"
        subtitle="Quản lý hồ sơ, trạng thái, tài khoản và hoạt động thành viên trong CLB."
        actions={headerActions}
      />

      {loadState === 'loading' ? (
        /* ── Workspace Loading (shared LoadingState) ── */
        <>
          <LoadingState variant="cards" rows={5} />
          <div className="mt-4"><LoadingState variant="list" rows={6} /></div>
        </>
      ) : loadState === 'error' ? (
        /* ── Workspace Error + Retry (gọi lại đúng API hiện có) ── */
        <div className="mt-4 rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
          <EmptyState
            icon={<AlertTriangle size={26} />}
            title="Không tải được danh sách thành viên"
            description="Đã xảy ra lỗi khi tải dữ liệu thành viên. Vui lòng thử lại."
            action={<ActionButton icon={<RefreshCw size={15} />} onClick={() => void fetchMembers()}>Thử lại</ActionButton>}
          />
        </div>
      ) : (
      <>
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Tổng thành viên" value={totalMembers.toLocaleString('vi-VN')} sub="Toàn CLB" accent="blue" icon={<Users size={18} />} />
        <MetricCard label="Đang hoạt động" value={activeCount.toLocaleString('vi-VN')} sub="Thành viên active" accent="green" icon={<UserCheck size={18} />} />
        <MetricCard label="Tạm ngưng" value={inactiveCount.toLocaleString('vi-VN')} sub="Tạm nghỉ sinh hoạt" accent="amber" icon={<Power size={18} />} />
        <MetricCard label="Đã rời CLB" value={leftCount.toLocaleString('vi-VN')} sub="Không còn sinh hoạt" accent="rose" icon={<UserMinus size={18} />} />
        <MetricCard label="AI Rating TB" value="Chưa có" sub="Chưa có dữ liệu" accent="violet" icon={<Sparkles size={18} />} />
      </div>

      {/* ── Filter / Search ── */}
      <div className="mt-4">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm theo tên, số điện thoại, email…"
          filters={statusChips}
          onOpenFilters={() => setShowFilterSheet(true)}
        />
      </div>

      {/* ── Member list: DataTable (desktop) / MobileCardList (mobile) ── */}
      <div className="mt-4 rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
        {rows.length === 0 ? (
          hasActiveFilter ? (
            /* Lọc/tìm kiếm trả về 0 kết quả */
            <EmptyState
              icon={<Users size={26} />}
              title="Không tìm thấy thành viên"
              description="Không có thành viên khớp bộ lọc/từ khóa hiện tại."
              action={<ActionButton variant="secondary" icon={<RefreshCw size={15} />} onClick={resetFilters}>Xóa bộ lọc</ActionButton>}
            />
          ) : (
            /* CLB chưa có thành viên nào */
            <EmptyState
              icon={<Users size={26} />}
              title="Chưa có thành viên nào"
              description="Thêm thành viên đầu tiên để bắt đầu quản lý CLB."
              action={<ActionButton icon={<Plus size={15} />} onClick={openCreate}>Thêm thành viên</ActionButton>}
            />
          )
        ) : isMobile ? (
          <div className="p-3">
            <MobileCardList
              items={rows}
              itemKey={(r) => r.member.id}
              onItemClick={(r) => setDetailId(r.member.id)}
              renderCard={(r) => (
                <div className="flex items-center gap-3">
                  <MemberAvatar name={r.member.fullName} id={r.member.id} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold [color:var(--pf-text)]">{r.member.fullName}</p>
                      <StatusBadge tone={STATUS_TONE[r.member.status] ?? 'neutral'} dot>{STATUS_LABEL[r.member.status] ?? r.member.status}</StatusBadge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs [color:var(--pf-color-muted)]">
                      <span className="flex items-center gap-1"><ClipboardList size={12} />{r.hasAttendance ? `${r.attended}/${r.totalSessions} buổi` : '— buổi'}</span>
                      <span className="flex items-center gap-1"><Wallet size={12} />{r.periodName ? (r.paid ? 'Đã đóng' : 'Chưa đóng') : '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <IconBtn label="Chỉnh sửa" onClick={() => openEdit(r.member)}><Edit2 size={15} /></IconBtn>
                    {r.member.status !== 'left' && (
                      <IconBtn label={r.member.status === 'active' ? 'Tạm ngưng' : 'Kích hoạt'} onClick={() => handleToggleStatus(r.member)}><Power size={15} /></IconBtn>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        ) : (
          <>
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.member.id} onRowClick={(r) => setDetailId(r.member.id)} />
            <div className="flex items-center justify-between border-t px-4 py-3 text-xs border-[color:var(--pf-border-soft)] [color:var(--pf-color-muted)]">
              <span>Hiển thị {rows.length} / {members.length} thành viên</span>
            </div>
          </>
        )}
      </div>
      </>
      )}

      {/* ── Mobile sticky quick action: Thêm thành viên ── */}
      {isMobile && (
        <div className="pointer-events-none fixed bottom-20 right-4 z-30">
          <ActionButton
            className="pointer-events-auto h-12 w-12 shadow-lg"
            iconOnly
            ariaLabel="Thêm thành viên"
            icon={<Plus size={20} />}
            onClick={openCreate}
          />
        </div>
      )}

      {/* ── Mobile filter bottom sheet ── */}
      {showFilterSheet && (
        <DrawerShell
          open={showFilterSheet}
          onClose={() => setShowFilterSheet(false)}
          isMobile
          title="Bộ lọc"
          subtitle="Lọc danh sách thành viên"
          footer={
            <>
              <ActionButton variant="secondary" fullWidth onClick={() => { resetFilters(); setShowFilterSheet(false) }}>Xóa lọc</ActionButton>
              <ActionButton fullWidth onClick={() => setShowFilterSheet(false)}>Áp dụng</ActionButton>
            </>
          }
        >
          <div className="space-y-5 px-5 py-5">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Trạng thái</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setStatusFilter(v)}
                    aria-pressed={statusFilter === v}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                    style={statusFilter === v
                      ? { background: 'var(--pf-green)', color: 'var(--pf-text-on-primary)', borderColor: 'var(--pf-green)' }
                      : { color: 'var(--pf-color-muted)', borderColor: 'var(--pf-border)' }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Ngày gia nhập</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ff-from" className="mb-1 block text-xs [color:var(--pf-color-muted)]">Từ ngày</label>
                  <input id="ff-from" type="date" value={joinFrom} onChange={e => setJoinFrom(e.target.value)} className="input-base" />
                </div>
                <div>
                  <label htmlFor="ff-to" className="mb-1 block text-xs [color:var(--pf-color-muted)]">Đến ngày</label>
                  <input id="ff-to" type="date" value={joinTo} onChange={e => setJoinTo(e.target.value)} className="input-base" />
                </div>
              </div>
            </div>
          </div>
        </DrawerShell>
      )}

      {/* ── Member form (add/edit) ── */}
      <MemberFormDrawer open={showForm} onClose={closeForm} editMember={editMember} onSave={handleSave} isSaving={isSaving} isMobile={isMobile} />

      {/* ── Member detail drawer ── */}
      <MemberDetailDrawer
        row={detailRow}
        onClose={() => setDetailId(null)}
        isMobile={isMobile}
        onEdit={openEdit}
        onToggle={handleToggleStatus}
        onDelete={handleDelete}
      />
    </PageShell>
  )
}

/* ── Icon button (a11y: aria-label bắt buộc; touch target ≥ 40px) ── */
function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:[background:var(--pf-color-muted-soft)]"
      style={{ color: danger ? 'var(--pf-color-danger)' : 'var(--pf-color-muted)' }}
    >
      {children}
    </button>
  )
}
