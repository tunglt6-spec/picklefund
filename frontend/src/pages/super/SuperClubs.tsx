import { useState, useEffect } from 'react'
import { Plus, Search, Lock, Unlock, Eye, Pencil, Trash2, ShieldCheck, Building2, Activity, Users, Wallet, CreditCard, CalendarClock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { PageShell, PageHeader, StatusBadge, ExportActions, ErrorState, runExport, MetricCard } from '../../components/shared'
import { exportGenericExcel, exportGenericTablePDF } from '../../lib/export'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { RecordPlanPaymentModal } from '../../components/super/RecordPlanPaymentModal'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { Club, ServicePlan } from '../../types'
import toast from 'react-hot-toast'

const PLAN_LABEL: Record<ServicePlan, string> = {
  STARTER: 'Starter',
  PRO: 'Pro',
  CLUB_PLUS: 'Enterprise',
}
const PLAN_OPTIONS: ServicePlan[] = ['STARTER', 'PRO', 'CLUB_PLUS']

/** Select đổi gói dịch vụ (SUPER_ADMIN). */
function PlanSelect({
  club,
  onChange,
  onClick,
}: {
  club: Club
  onChange: (plan: ServicePlan) => void
  onClick?: (e: React.MouseEvent) => void
}) {
  return (
    <select
      value={club.plan ?? 'STARTER'}
      onClick={onClick}
      onChange={(e) => onChange(e.target.value as ServicePlan)}
      className="rounded-full border border-[color:var(--pf-border)] [background:var(--pf-surface)] px-2.5 py-1 text-xs font-semibold [color:var(--pf-text)] focus:outline-none focus:[border-color:var(--pf-primary)]"
      style={{ color: 'var(--pf-primary)' }}
      title="Gói dịch vụ"
    >
      {PLAN_OPTIONS.map((p) => (
        <option key={p} value={p} style={{ color: 'var(--pf-text)' }}>Gói {PLAN_LABEL[p]}</option>
      ))}
    </select>
  )
}

const ROLES = [
  { value: 'CLUB_ADMIN', label: 'Admin CLB' },
  { value: 'CLUB_TREASURER', label: 'Thủ quỹ' },
  { value: 'MEMBER_VIEW', label: 'Thành viên' },
]

interface ClubUser {
  id: string
  username: string
  email: string
  role: string
  isActive: boolean
}

const inputCls = 'w-full rounded-lg border border-[color:var(--pf-border)] px-4 py-2.5 text-sm focus:[border-color:var(--pf-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary-text)] [background:var(--pf-surface)]'

export function SuperClubs() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [clubs, setClubs] = useState<Club[]>([])
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [payClub, setPayClub] = useState<Club | null>(null)
  const [form, setForm] = useState({
    name: '', code: '', address: '', contactEmail: '', contactPhone: '',
    adminUsername: '', adminEmail: '', adminPassword: '',
  })

  // Edit modal
  const [editClub, setEditClub] = useState<Club | null>(null)
  const [editForm, setEditForm] = useState({ name: '', address: '', contactEmail: '', contactPhone: '' })
  const [isSaving, setIsSaving] = useState(false)

  // Delete confirmation
  const [deleteClub, setDeleteClub] = useState<Club | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Confirm dialog cho thao tác nhạy cảm ảnh hưởng toàn CLB (khóa/mở khóa, đổi gói) —
  // trước đây gọi API ngay khi click, không có xác nhận (khác handleDelete đã có modal).
  const [pendingAction, setPendingAction] = useState<
    { club: Club; kind: 'status'; nextPlan?: undefined } | { club: Club; kind: 'plan'; nextPlan: ServicePlan } | null
  >(null)
  const [confirmingAction, setConfirmingAction] = useState(false)

  // Roles modal
  const [rolesClub, setRolesClub] = useState<Club | null>(null)
  const [clubUsers, setClubUsers] = useState<ClubUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [usersError, setUsersError] = useState(false)
  const [savingRole, setSavingRole] = useState<string | null>(null)

  const [clubsError, setClubsError] = useState(false)
  const loadClubs = () => {
    setClubsError(false)
    api.get('/clubs').then(res => {
      const raw = res.data?.data?.clubs ?? res.data?.data ?? []
      setClubs(raw.map((c: any) => ({
        id: c.id, name: c.name, code: c.code, address: c.address ?? '', logoUrl: undefined,
        contactEmail: c.contactEmail ?? '', contactPhone: c.contactPhone ?? '',
        status: c.status ?? 'active', settings: {},
        plan: c.plan ?? 'STARTER', planExpiresAt: c.planExpiresAt ?? null,
        createdAt: c.createdAt, updatedAt: c.updatedAt,
        _count: c._count ?? { members: 0, fundPeriods: 0 },
      })))
    }).catch(() => setClubsError(true))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadClubs() }, [])

  const filtered = clubs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  )

  const toggleStatus = async (club: Club) => {
    const next = club.status === 'active' ? 'suspended' : 'active'
    try {
      await api.patch(`/clubs/${club.id}/status`, { status: next })
      setClubs(prev => prev.map(c => c.id === club.id ? { ...c, status: next } : c))
      toast.success(next === 'suspended' ? `Đã khóa ${club.name}` : `Đã mở khóa ${club.name}`)
    } catch { toast.error('Thao tác thất bại') }
  }

  const changePlan = async (club: Club, plan: ServicePlan) => {
    try {
      await api.patch(`/clubs/${club.id}/plan`, { plan })
      setClubs(prev => prev.map(c => c.id === club.id ? { ...c, plan } : c))
      toast.success(`Đã đổi gói ${club.name} → ${PLAN_LABEL[plan]}`)
    } catch { toast.error('Đổi gói thất bại') }
  }

  const confirmPendingAction = async () => {
    if (!pendingAction) return
    setConfirmingAction(true)
    try {
      if (pendingAction.kind === 'status') await toggleStatus(pendingAction.club)
      else await changePlan(pendingAction.club, pendingAction.nextPlan)
    } finally {
      setConfirmingAction(false)
      setPendingAction(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    try {
      const res = await api.post('/clubs', form)
      const d = res.data?.data
      setClubs(prev => [...prev, { ...d, logoUrl: undefined, settings: {}, _count: { members: 0, fundPeriods: 0 } }])
      setShowCreate(false)
      setForm({
        name: '', code: '', address: '', contactEmail: '', contactPhone: '',
        adminUsername: '', adminEmail: '', adminPassword: '',
      })
      toast.success(`Tạo CLB ${form.name} thành công! Admin đăng nhập bằng ${form.adminUsername} và đổi mật khẩu lần đầu.`)
    } catch (err) {
      // Hiện thông báo cụ thể từ backend (email/username trùng, email .local, ...).
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(typeof msg === 'string' ? msg : 'Tạo CLB thất bại. Vui lòng thử lại.')
    }
    finally { setIsSaving(false) }
  }

  const openEdit = (club: Club) => {
    setEditClub(club)
    setEditForm({ name: club.name, address: club.address ?? '', contactEmail: club.contactEmail ?? '', contactPhone: club.contactPhone ?? '' })
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editClub || isSaving) return
    setIsSaving(true)
    try {
      await api.put(`/clubs/${editClub.id}`, editForm)
      setClubs(prev => prev.map(c => c.id === editClub.id ? { ...c, ...editForm } : c))
      setEditClub(null)
      toast.success('Đã cập nhật thông tin CLB')
    } catch { toast.error('Cập nhật thất bại') }
    finally { setIsSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteClub) return
    setDeleting(true)
    try {
      await api.delete(`/clubs/${deleteClub.id}`)
      setClubs(prev => prev.filter(c => c.id !== deleteClub.id))
      setDeleteClub(null)
      toast.success(`Đã xóa CLB ${deleteClub.name}`)
    } catch { toast.error('Xóa CLB thất bại') } finally { setDeleting(false) }
  }

  const openRoles = async (club: Club) => {
    setRolesClub(club)
    setClubUsers([])
    setUsersError(false)
    setLoadingUsers(true)
    try {
      const res = await api.get(`/users?clubId=${club.id}`)
      const raw = res.data?.data ?? []
      setClubUsers(raw.map((u: any) => ({ id: u.id, username: u.username ?? u.email, email: u.email, role: u.role, isActive: u.isActive ?? true })))
    } catch {
      setUsersError(true)
      toast.error('Không tải được danh sách thành viên')
    } finally { setLoadingUsers(false) }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setSavingRole(userId)
    try {
      await api.put(`/users/${userId}`, { role: newRole })
      setClubUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success('Đã cập nhật quyền')
    } catch { toast.error('Cập nhật quyền thất bại') } finally { setSavingRole(null) }
  }

  const createModal = (
    <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo CLB mới" size="lg">
      <form onSubmit={handleCreate} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="sc-name" className="block text-sm font-medium [color:var(--pf-text)] mb-1.5">Tên CLB *</label>
            <input id="sc-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label htmlFor="sc-code" className="block text-sm font-medium [color:var(--pf-text)] mb-1.5">Mã CLB *</label>
            <input id="sc-code" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="VD: PBHN" className={inputCls} />
          </div>
          <div>
            <label htmlFor="sc-phone" className="block text-sm font-medium [color:var(--pf-text)] mb-1.5">Điện thoại</label>
            <input id="sc-phone" value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label htmlFor="sc-email" className="block text-sm font-medium [color:var(--pf-text)] mb-1.5">Email liên hệ</label>
            <input id="sc-email" type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label htmlFor="sc-address" className="block text-sm font-medium [color:var(--pf-text)] mb-1.5">Địa chỉ sân</label>
            <input id="sc-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputCls} />
          </div>
        </div>

        {/* Tài khoản admin ban đầu — bắt buộc. Email admin dùng để gửi thông báo cho thành viên. */}
        <div className="rounded-lg border [border-color:var(--pf-primary-soft)] [background:var(--pf-primary-soft)] p-4">
          <p className="text-sm font-semibold [color:var(--pf-text)] mb-1">Tài khoản Admin CLB *</p>
          <p className="text-xs [color:var(--pf-color-muted)] mb-3">Người quản trị CLB. Email admin sẽ là email gửi thông báo tới thành viên. Admin phải đổi mật khẩu ở lần đăng nhập đầu.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sc-admin-user" className="block text-sm font-medium [color:var(--pf-text)] mb-1.5">Tên đăng nhập admin *</label>
              <input id="sc-admin-user" required value={form.adminUsername}
                onChange={e => setForm({ ...form, adminUsername: e.target.value.trim() })}
                placeholder="VD: admin_pbhn" className={inputCls} />
            </div>
            <div>
              <label htmlFor="sc-admin-pass" className="block text-sm font-medium [color:var(--pf-text)] mb-1.5">Mật khẩu admin *</label>
              <input id="sc-admin-pass" required type="password" minLength={6} value={form.adminPassword}
                onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                placeholder="Tối thiểu 6 ký tự" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label htmlFor="sc-admin-email" className="block text-sm font-medium [color:var(--pf-text)] mb-1.5">Email cá nhân admin *</label>
              <input id="sc-admin-email" required type="email" value={form.adminEmail}
                onChange={e => setForm({ ...form, adminEmail: e.target.value.trim() })}
                placeholder="email thật (không dùng đuôi .local)" className={inputCls} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[color:var(--pf-border)]">
          <Button variant="secondary" type="button" onClick={() => setShowCreate(false)} disabled={isSaving}>Hủy</Button>
          <Button type="submit" disabled={isSaving}>{isSaving ? 'Đang tạo...' : 'Tạo CLB'}</Button>
        </div>
      </form>
    </Modal>
  )

  const editModal = (
    <Modal open={!!editClub} onClose={() => setEditClub(null)} title={`Sửa: ${editClub?.name ?? ''}`} size="lg">
      <form onSubmit={handleEdit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="f-SuperClubs-1" className="block text-sm font-medium [color:var(--pf-text)] mb-1.5">Tên CLB *</label>
            <input id="f-SuperClubs-1" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label htmlFor="f-SuperClubs-2" className="block text-sm font-medium [color:var(--pf-text)] mb-1.5">Điện thoại</label>
            <input id="f-SuperClubs-2" value={editForm.contactPhone} onChange={e => setEditForm({ ...editForm, contactPhone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label htmlFor="f-SuperClubs-3" className="block text-sm font-medium [color:var(--pf-text)] mb-1.5">Email liên hệ</label>
            <input id="f-SuperClubs-3" type="email" value={editForm.contactEmail} onChange={e => setEditForm({ ...editForm, contactEmail: e.target.value })} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label htmlFor="f-SuperClubs-4" className="block text-sm font-medium [color:var(--pf-text)] mb-1.5">Địa chỉ sân</label>
            <input id="f-SuperClubs-4" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-[color:var(--pf-border)]">
          <Button variant="secondary" type="button" onClick={() => setEditClub(null)} disabled={isSaving}>Hủy</Button>
          <Button type="submit" disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</Button>
        </div>
      </form>
    </Modal>
  )

  const deleteModal = (
    <Modal open={!!deleteClub} onClose={() => setDeleteClub(null)} title="Xác nhận xóa CLB" size="sm">
      <div className="space-y-4">
        <p className="text-sm [color:var(--pf-color-muted)]">
          Bạn có chắc muốn xóa CLB <span className="font-semibold [color:var(--pf-text)]">{deleteClub?.name}</span>? Hành động này không thể hoàn tác.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={() => setDeleteClub(null)}>Hủy</Button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-60 transition-colors"
          >
            {deleting ? 'Đang xóa...' : 'Xóa CLB'}
          </button>
        </div>
      </div>
    </Modal>
  )

  const payModal = (
    <RecordPlanPaymentModal
      open={!!payClub}
      onClose={() => setPayClub(null)}
      clubs={clubs.map(c => ({ id: c.id, name: c.name, plan: c.plan, planExpiresAt: c.planExpiresAt ?? null }))}
      clubId={payClub?.id}
      onDone={loadClubs}
    />
  )

  const actionConfirmModal = (
    <Modal
      open={!!pendingAction}
      onClose={() => setPendingAction(null)}
      title={pendingAction?.kind === 'status' ? 'Xác nhận đổi trạng thái CLB' : 'Xác nhận đổi gói dịch vụ'}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-sm [color:var(--pf-color-muted)]">
          {pendingAction?.kind === 'status' ? (
            <>
              Bạn có chắc muốn {pendingAction.club.status === 'active' ? 'khóa' : 'mở khóa'} CLB{' '}
              <span className="font-semibold [color:var(--pf-text)]">{pendingAction.club.name}</span>?
              {pendingAction.club.status === 'active' && ' Toàn bộ thành viên CLB sẽ không thể đăng nhập cho tới khi mở khóa lại.'}
            </>
          ) : pendingAction?.kind === 'plan' ? (
            <>
              Bạn có chắc muốn đổi gói CLB{' '}
              <span className="font-semibold [color:var(--pf-text)]">{pendingAction.club.name}</span>{' '}
              sang <span className="font-semibold [color:var(--pf-text)]">{PLAN_LABEL[pendingAction.nextPlan]}</span>?
            </>
          ) : null}
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={() => setPendingAction(null)} disabled={confirmingAction}>Hủy</Button>
          <Button onClick={confirmPendingAction} disabled={confirmingAction}>
            {confirmingAction ? 'Đang xử lý...' : 'Xác nhận'}
          </Button>
        </div>
      </div>
    </Modal>
  )

  const rolesModal = (
    <Modal open={!!rolesClub} onClose={() => setRolesClub(null)} title={`Phân quyền: ${rolesClub?.name ?? ''}`} size="lg">
      <div className="space-y-3">
        {loadingUsers && <div className="text-center py-8 [color:var(--pf-color-muted)] text-sm">Đang tải...</div>}
        {!loadingUsers && usersError && (
          <div className="text-center py-8 text-red-400 text-sm">Không tải được danh sách. Vui lòng thử lại.</div>
        )}
        {!loadingUsers && !usersError && clubUsers.length === 0 && (
          <div className="text-center py-8 [color:var(--pf-color-muted)] text-sm">Chưa có thành viên nào</div>
        )}
        {!loadingUsers && !usersError && clubUsers.map(u => (
          <div key={u.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-[color:var(--pf-border)] [background:var(--pf-surface-muted)]">
            <div className="min-w-0 flex-1">
              <div className="font-medium [color:var(--pf-text)] text-sm truncate">{u.username}</div>
              <div className="text-xs [color:var(--pf-color-muted)] truncate">{u.email}</div>
            </div>
            <select
              value={u.role}
              disabled={savingRole === u.id}
              onChange={e => handleRoleChange(u.id, e.target.value)}
              className="rounded-lg border border-[color:var(--pf-border)] px-3 py-1.5 text-sm [background:var(--pf-surface)] focus:[border-color:var(--pf-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary-text)] disabled:opacity-60"
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              {!ROLES.find(r => r.value === u.role) && (
                <option value={u.role}>{u.role}</option>
              )}
            </select>
          </div>
        ))}
        <div className="flex justify-end pt-2 border-t border-[color:var(--pf-border)]">
          <Button variant="secondary" onClick={() => setRolesClub(null)}>Đóng</Button>
        </div>
      </div>
    </Modal>
  )

  // ── Xuất danh sách CLB — đúng tập `filtered` đang hiển thị (SUPER_ADMIN) ──
  const clubStatusText = (st?: string) => (st === 'suspended' ? 'Đã khóa' : 'Hoạt động')
  const clubPlanText = (c: Club) => `Gói ${PLAN_LABEL[(c.plan ?? 'STARTER') as ServicePlan] ?? c.plan ?? 'Starter'}`
  const doExportExcel = () => {
    if (filtered.length === 0) return
    return runExport(() => exportGenericExcel('Danh_sach_CLB', 'CLB',
      ['Tên CLB', 'Mã', 'Địa chỉ', 'Email liên hệ', 'SĐT liên hệ', 'Gói', 'Hết hạn gói', 'Thành viên', 'Kỳ quỹ', 'Trạng thái'],
      filtered.map(c => [c.name, c.code, c.address || '', c.contactEmail || '', c.contactPhone || '', clubPlanText(c), c.planExpiresAt ? String(c.planExpiresAt).slice(0, 10).split('-').reverse().join('/') : '', c._count?.members ?? 0, c._count?.fundPeriods ?? 0, clubStatusText(c.status)]),
    ), 'Đã xuất Excel danh sách CLB')
  }
  const doExportPdf = () => {
    if (filtered.length === 0) return
    return runExport(() => exportGenericTablePDF({
      fileBase: 'Danh_sach_CLB',
      title: 'Danh Sách Câu Lạc Bộ',
      metaLeft: `${filtered.length}${search ? `/${clubs.length}` : ''} câu lạc bộ`,
      columns: [
        { header: 'Tên CLB' }, { header: 'Mã', align: 'center' }, { header: 'Gói', align: 'center' },
        { header: 'Thành viên', align: 'center' }, { header: 'Kỳ quỹ', align: 'center' }, { header: 'Trạng thái', align: 'center' },
      ],
      rows: filtered.map(c => [c.name, c.code, clubPlanText(c), c._count?.members ?? 0, c._count?.fundPeriods ?? 0, clubStatusText(c.status)]),
    }), 'Đã xuất PDF danh sách CLB')
  }
  const exportButtons = filtered.length > 0 ? <ExportActions onExcel={doExportExcel} onPdf={doExportPdf} /> : undefined

  // KPI tổng hợp từ danh sách CLB đang tải (không thêm API).
  const kActive = clubs.filter(c => c.status === 'active').length
  const kSuspended = clubs.length - kActive
  const kMembers = clubs.reduce((a, c) => a + (c._count?.members ?? 0), 0)
  const kPeriods = clubs.reduce((a, c) => a + (c._count?.fundPeriods ?? 0), 0)
  const planCount = (p: ServicePlan) => clubs.filter(c => (c.plan ?? 'STARTER') === p).length
  const kPaid = planCount('PRO') + planCount('CLUB_PLUS')
  const kExpiring = clubs.filter(c => {
    if (!c.planExpiresAt) return false
    const t = new Date(c.planExpiresAt).getTime()
    return t > Date.now() && t - Date.now() <= 30 * 86400000
  }).length
  const kpiRow = (
    <div className="pf-kpi-row">
      <MetricCard compact icon={<Building2 size={16} />} label="Tổng CLB" value={clubs.length.toLocaleString('vi-VN')} />
      <MetricCard compact icon={<Activity size={16} />} label="Đang hoạt động" value={kActive.toLocaleString('vi-VN')} sub={`${clubs.length ? Math.round((kActive / clubs.length) * 100) : 0}% tổng CLB`} />
      <MetricCard compact icon={<Lock size={16} />} label="Bị khóa" value={kSuspended.toLocaleString('vi-VN')} tone={kSuspended > 0 ? 'warning' : undefined} />
      <MetricCard compact icon={<Users size={16} />} label="Tổng thành viên" value={kMembers.toLocaleString('vi-VN')} sub={clubs.length ? `TB ${Math.round(kMembers / clubs.length)} / CLB` : undefined} />
      <MetricCard compact icon={<Wallet size={16} />} label="Tổng kỳ quỹ" value={kPeriods.toLocaleString('vi-VN')} />
      <MetricCard compact icon={<CreditCard size={16} />} label="Gói trả phí" value={`${kPaid}/${clubs.length}`} sub={`Pro ${planCount('PRO')} · Ent ${planCount('CLUB_PLUS')} · Starter ${planCount('STARTER')}`} />
      {kExpiring > 0 && <MetricCard compact icon={<CalendarClock size={16} />} label="Sắp hết hạn (30 ngày)" value={kExpiring.toLocaleString('vi-VN')} tone="warning" />}
    </div>
  )

  if (isMobile) {
    return (
      <div className="min-h-screen [background:var(--pf-bg)]">
        <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <div className="font-bold [color:var(--pf-text)] text-base">Quản lý CLB</div>
            <div className="text-xs [color:var(--pf-color-muted)]">{clubs.length} câu lạc bộ</div>
          </div>
          {exportButtons}
          <button
            onClick={() => setShowCreate(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white"
            style={{ background: 'var(--pf-primary)' }}
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="px-4 pt-3">{kpiRow}</div>
        <div className="px-4 py-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 [color:var(--pf-color-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm tên hoặc mã CLB..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[color:var(--pf-border)] text-sm [background:var(--pf-surface)] focus:outline-none focus:[border-color:var(--pf-primary)]"
            />
          </div>
        </div>

        <div className="px-4 pb-6 space-y-3">
          {clubsError && clubs.length === 0 && <ErrorState onRetry={loadClubs} />}
          {filtered.length === 0 && !clubsError && (
            <div className="text-center py-12 [color:var(--pf-color-muted)] text-sm">Không tìm thấy CLB nào</div>
          )}
          {filtered.map(club => (
            <div
              key={club.id}
              className="pf-rowcard p-4"
              onClick={() => navigate(`/super/clubs/${club.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold [color:var(--pf-text)] truncate">{club.name}</div>
                  <div className="text-xs [color:var(--pf-color-muted)] mt-0.5">{club.code}{club.contactEmail ? ` · ${club.contactEmail}` : ''}</div>
                </div>
                <StatusBadge tone={club.status === 'active' ? 'success' : 'warning'} dot>
                  {club.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                </StatusBadge>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[color:var(--pf-border)]">
                <div className="text-xs [color:var(--pf-color-muted)]"><span className="font-semibold [color:var(--pf-text)]">{club._count?.members ?? 0}</span> TV</div>
                <div className="text-xs [color:var(--pf-color-muted)]"><span className="font-semibold [color:var(--pf-text)]">{club._count?.fundPeriods ?? 0}</span> kỳ</div>
                <PlanSelect club={club} onClick={e => e.stopPropagation()} onChange={(p) => setPendingAction({ club, kind: 'plan', nextPlan: p })} />
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={e => { e.stopPropagation(); setPayClub(club) }} aria-label="Gia hạn gói" className="p-2 rounded-lg [color:var(--pf-primary-text)] [background:var(--pf-primary-soft)]">
                    <CreditCard size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); openEdit(club) }} className="p-2 rounded-lg [color:var(--pf-primary-text)] [background:var(--pf-primary-soft)]">
                    <Pencil size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); openRoles(club) }} className="p-2 rounded-lg [color:var(--pf-primary-text)] [background:var(--pf-primary-soft)]">
                    <ShieldCheck size={14} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setPendingAction({ club, kind: 'status' }) }}
                    className="p-2 rounded-lg"
                    style={{ background: club.status === 'active' ? 'var(--pf-color-warning-soft)' : 'var(--pf-color-success-soft)', color: club.status === 'active' ? 'var(--pf-color-warning)' : 'var(--pf-color-success)' }}
                  >
                    {club.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDeleteClub(club) }} className="p-2 rounded-lg" style={{ background: 'var(--pf-color-danger-soft)', color: 'var(--pf-color-danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {createModal}
        {editModal}
        {deleteModal}
        {rolesModal}
        {actionConfirmModal}
        {payModal}
      </div>
    )
  }

  return (
    <PageShell maxWidth={1760}>
      <PageHeader
        title="Quản lý CLB"
        subtitle={`${clubs.length} câu lạc bộ trong hệ thống`}
        actions={
          <div className="flex items-center gap-2">
            {exportButtons}
            <Button variant="outline" onClick={() => navigate('/onboarding')}>Onboarding</Button>
            <Button onClick={() => setShowCreate(true)}><Plus size={16} />Tạo CLB mới</Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3">
        {kpiRow}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 [color:var(--pf-color-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm CLB theo tên hoặc mã..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[color:var(--pf-border)] text-sm focus:[border-color:var(--pf-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary-text)] [background:var(--pf-surface)]"
          />
        </div>

        {clubsError && clubs.length === 0 && <ErrorState onRetry={loadClubs} />}
        <div className="pf-glass-strong pf-compact-table rounded-2xl overflow-x-auto" style={{ boxShadow: 'var(--pf-shadow)' }}>
          <table className="pf-rows w-full min-w-[720px] text-sm [border-spacing:0_6px]">
            <thead className="[background:var(--pf-surface-muted)] border-b border-[color:var(--pf-border)]">
              <tr>
                <th scope="col" className="text-left px-3 py-2 font-semibold [color:var(--pf-text)]">Tên CLB</th>
                <th scope="col" className="text-left px-3 py-2 font-semibold [color:var(--pf-text)]">Địa chỉ</th>
                <th scope="col" className="text-center px-3 py-2 font-semibold [color:var(--pf-text)]">Thành viên</th>
                <th scope="col" className="text-center px-3 py-2 font-semibold [color:var(--pf-text)]">Kỳ quỹ</th>
                <th scope="col" className="text-center px-3 py-2 font-semibold [color:var(--pf-text)]">Gói</th>
                <th scope="col" className="text-center px-3 py-2 font-semibold [color:var(--pf-text)]">Trạng thái</th>
                <th scope="col" className="text-center px-3 py-2 font-semibold [color:var(--pf-text)]">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--pf-border-soft)]">
              {filtered.map(club => (
                <tr key={club.id} className="hover:[background:var(--pf-surface-muted)] transition-colors">
                  <td className="px-3 py-2">
                    <div className="font-semibold [color:var(--pf-text)]">{club.name}</div>
                    <div className="text-xs [color:var(--pf-color-muted)]">{club.code} · {club.contactEmail}</div>
                  </td>
                  <td className="px-3 py-2 [color:var(--pf-color-muted)]">{club.address || '—'}</td>
                  <td className="px-3 py-2 text-center font-semibold [color:var(--pf-text)]">{club._count?.members}</td>
                  <td className="px-3 py-2 text-center font-semibold [color:var(--pf-text)]">{club._count?.fundPeriods}</td>
                  <td className="px-3 py-2 text-center">
                    <PlanSelect club={club} onChange={(p) => setPendingAction({ club, kind: 'plan', nextPlan: p })} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusBadge tone={club.status === 'active' ? 'success' : 'warning'} dot>
                      {club.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 rounded [color:var(--pf-color-info)] hover:[background:var(--pf-color-info-soft)]" title="Xem chi tiết" onClick={() => navigate(`/super/clubs/${club.id}`)}>
                        <Eye size={15} />
                      </button>
                      <button className="[color:var(--pf-primary-text)] p-1.5 rounded hover:[background:var(--pf-primary-soft)]" title="Gia hạn / ghi nhận thanh toán gói" aria-label="Gia hạn gói" onClick={() => setPayClub(club)}>
                        <CreditCard size={15} />
                      </button>
                      <button className="[color:var(--pf-primary-text)] hover:[color:var(--pf-primary-text)] p-1.5 rounded hover:[background:var(--pf-primary-soft)]" title="Sửa thông tin" onClick={() => openEdit(club)}>
                        <Pencil size={15} />
                      </button>
                      <button className="[color:var(--pf-primary-text)] hover:[color:var(--pf-primary-text)] p-1.5 rounded hover:[background:var(--pf-primary-soft)]" title="Phân quyền thành viên" onClick={() => openRoles(club)}>
                        <ShieldCheck size={15} />
                      </button>
                      <button
                        onClick={() => setPendingAction({ club, kind: 'status' })}
                        className="p-1.5 rounded"
                        style={{ color: club.status === 'active' ? 'var(--pf-color-warning)' : 'var(--pf-color-success)' }}
                        title={club.status === 'active' ? 'Khóa CLB' : 'Mở khóa'}
                      >
                        {club.status === 'active' ? <Lock size={15} /> : <Unlock size={15} />}
                      </button>
                      <button className="p-1.5 rounded [color:var(--pf-color-danger)] hover:[background:var(--pf-color-danger-soft)]" title="Xóa CLB" onClick={() => setDeleteClub(club)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {createModal}
      {editModal}
      {deleteModal}
      {rolesModal}
      {actionConfirmModal}
      {payModal}
    </PageShell>
  )
}
