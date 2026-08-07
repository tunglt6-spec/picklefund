/**
 * SuperUsers (Super Admin) — quản lý tài khoản toàn hệ thống. Elite 2026: PageShell + PageHeader
 * + MetricCard (thống kê vai trò) + FilterBar + DataTable + StatusBadge. Giữ nguyên logic khóa/mở
 * tài khoản + ConfirmDialog.
 */
import { useState, useEffect } from 'react'
import { UserCheck, UserX, Shield, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import {
  PageShell, PageHeader, FilterBar, DataTable, StatusBadge, MetricCard,
  LoadingState, EmptyState, type Column, type StatusTone,
} from '../../components/shared'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import type { Role } from '../../types'

interface UserRow {
  id: string
  username: string
  email: string
  role: Role
  club: string | null
  fullName: string
  isActive: boolean
}

const roleLabel: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin', CLUB_ADMIN: 'Club Admin', CLUB_TREASURER: 'Thủ Quỹ', MEMBER_VIEW: 'Thành Viên',
}
const roleTone: Record<Role, StatusTone> = {
  SUPER_ADMIN: 'ai', CLUB_ADMIN: 'info', CLUB_TREASURER: 'success', MEMBER_VIEW: 'neutral',
}

export function SuperUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')
  const [pendingToggle, setPendingToggle] = useState<UserRow | null>(null)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    api.get('/users').then((res) => {
      const raw = res.data?.data ?? []
      setUsers(raw.map((u: any) => ({
        id: u.id, username: u.username, email: u.email ?? '', role: u.role as Role,
        club: u.club?.name ?? null, fullName: u.member?.fullName ?? u.username, isActive: u.isActive ?? true,
      })))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const toggleActive = async (u: UserRow) => {
    const next = !u.isActive
    setToggling(true)
    try {
      await api.put(`/users/${u.id}`, { isActive: next })
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: next } : x)))
      toast.success(`${next ? 'Mở khóa' : 'Khóa'} tài khoản ${u.username}`)
    } catch {
      toast.error('Thao tác thất bại')
    } finally {
      setToggling(false)
      setPendingToggle(null)
    }
  }

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q)
    }
    return true
  })

  const roleOptions: { value: Role | 'all'; label: string }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'CLUB_ADMIN', label: 'Club Admin' },
    { value: 'CLUB_TREASURER', label: 'Thủ Quỹ' },
    { value: 'MEMBER_VIEW', label: 'Thành Viên' },
  ]
  const countBy = (r: Role) => users.filter((u) => u.role === r).length

  const columns: Column<UserRow>[] = [
    { key: 'username', header: 'Tài khoản', className: 'font-mono text-xs font-semibold', render: (u) => u.username },
    { key: 'fullName', header: 'Họ tên', render: (u) => u.fullName },
    { key: 'email', header: 'Email', className: 'text-xs [color:var(--pf-color-muted)]', render: (u) => u.email || '—' },
    { key: 'role', header: 'Vai trò', align: 'center', render: (u) => <StatusBadge tone={roleTone[u.role]}>{roleLabel[u.role]}</StatusBadge> },
    { key: 'club', header: 'CLB', className: 'text-xs [color:var(--pf-color-muted)]', render: (u) => u.club ?? '— Hệ thống' },
    { key: 'status', header: 'Trạng thái', align: 'center', render: (u) => <StatusBadge tone={u.isActive ? 'success' : 'neutral'} dot>{u.isActive ? 'Hoạt động' : 'Đã khóa'}</StatusBadge> },
    {
      key: 'actions', header: '', align: 'center', render: (u) => (
        <button
          onClick={() => setPendingToggle(u)}
          disabled={u.role === 'SUPER_ADMIN'}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            u.isActive ? '[color:var(--pf-color-muted)] hover:[background:var(--pf-color-danger-soft)] hover:[color:var(--pf-color-danger)]'
              : '[color:var(--pf-color-muted)] hover:[background:var(--pf-color-success-soft)] hover:[color:var(--pf-color-success)]'
          }`}
          title={u.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
        >
          {u.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
        </button>
      ),
    },
  ]

  return (
    <PageShell maxWidth={1200}>
      <PageHeader title="Quản lý người dùng" subtitle={`${users.length} tài khoản toàn hệ thống`} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Super Admin" value={countBy('SUPER_ADMIN')} icon={<Shield size={16} />} tone="brand" />
        <MetricCard label="Club Admin" value={countBy('CLUB_ADMIN')} icon={<UserCheck size={16} />} tone="info" />
        <MetricCard label="Thủ Quỹ" value={countBy('CLUB_TREASURER')} icon={<UserCheck size={16} />} tone="success" />
        <MetricCard label="Thành Viên" value={countBy('MEMBER_VIEW')} icon={<Users size={16} />} tone="neutral" />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterBar className="flex-1" searchValue={search} onSearchChange={setSearch} searchPlaceholder="Tìm theo tên, email, tài khoản…" />
        <div className="flex gap-1 self-start overflow-x-auto rounded-full border p-1 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
          {roleOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRoleFilter(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === opt.value ? 'text-white shadow-sm [background:var(--pf-primary)]' : '[color:var(--pf-color-muted)] hover:[color:var(--pf-text)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[20px] border p-2 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
        {loading ? (
          <LoadingState variant="table" rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users size={24} />} title="Không có tài khoản" description={users.length === 0 ? 'Chưa tải được dữ liệu.' : 'Không tìm thấy tài khoản phù hợp.'} />
        ) : (
          <DataTable columns={columns} rows={filtered} rowKey={(u) => u.id} />
        )}
      </div>

      <ConfirmDialog
        open={!!pendingToggle}
        variant={pendingToggle?.isActive ? 'danger' : 'warning'}
        title={pendingToggle?.isActive ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa tài khoản'}
        message={
          pendingToggle?.isActive
            ? `Khóa tài khoản "${pendingToggle?.username}"? Người dùng này sẽ không thể đăng nhập cho tới khi được mở khóa lại.`
            : `Mở khóa tài khoản "${pendingToggle?.username}"?`
        }
        confirmLabel={toggling ? 'Đang xử lý...' : pendingToggle?.isActive ? 'Khóa' : 'Mở khóa'}
        cancelLabel="Hủy bỏ"
        onCancel={() => setPendingToggle(null)}
        onConfirm={() => pendingToggle && toggleActive(pendingToggle)}
      />
    </PageShell>
  )
}
