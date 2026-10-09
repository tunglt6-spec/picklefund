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
  LoadingState, EmptyState, ErrorState, type Column, type StatusTone,
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
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25

  const [loadError, setLoadError] = useState(false)

  const [total, setTotal] = useState(0)
  const [sum, setSum] = useState<{ total: number; active: number; inactive: number; byRole: Record<string, number>; clubs: number } | null>(null)

  const loadSummary = () => {
    api.get('/users/summary').then((r) => setSum(r.data?.data ?? null)).catch(() => setSum(null))
  }

  const load = () => {
    setLoading(true)
    setLoadError(false)
    api.get('/users/paged', { params: { page, limit: PAGE_SIZE, search: search.trim() || undefined, role: roleFilter === 'all' ? undefined : roleFilter } }).then((res) => {
      const d = res.data?.data
      setTotal(d?.total ?? 0)
      setUsers((d?.items ?? []).map((u: any) => ({
        id: u.id, username: u.username, email: u.email ?? '', role: u.role as Role,
        club: u.club?.name ?? null, fullName: u.member?.fullName ?? u.username, isActive: u.isActive ?? true,
      })))
    }).catch(() => setLoadError(true)).finally(() => setLoading(false))
  }
  // Tìm kiếm chờ 300ms; đổi bộ lọc/trang → nạp lại từ máy chủ.
  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, roleFilter])
  useEffect(() => { loadSummary() }, [])
  useEffect(() => { setPage(1) }, [search, roleFilter])

  const toggleActive = async (u: UserRow) => {
    const next = !u.isActive
    setToggling(true)
    try {
      await api.put(`/users/${u.id}`, { isActive: next })
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: next } : x)))
      toast.success(`${next ? 'Mở khóa' : 'Khóa'} tài khoản ${u.username}`)
      loadSummary()
    } catch {
      toast.error('Thao tác thất bại')
    } finally {
      setToggling(false)
      setPendingToggle(null)
    }
  }

  const roleOptions: { value: Role | 'all'; label: string }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'CLUB_ADMIN', label: 'Club Admin' },
    { value: 'CLUB_TREASURER', label: 'Thủ Quỹ' },
    { value: 'MEMBER_VIEW', label: 'Thành Viên' },
  ]
  const by = (r: Role) => sum?.byRole?.[r] ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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
          aria-label={u.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
        >
          {u.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
        </button>
      ),
    },
  ]

  return (
    <PageShell maxWidth={1760}>
      <PageHeader title="Quản lý người dùng" subtitle={`${(sum?.total ?? total).toLocaleString('vi-VN')} tài khoản toàn hệ thống`} />

      <div className="pf-kpi-row mb-4" data-sa-look="ledger">
        <MetricCard compact label="Tổng tài khoản" value={(sum?.total ?? 0).toLocaleString('vi-VN')} icon={<Users size={16} />} sub={`${sum?.clubs ?? 0} CLB`} />
        <MetricCard compact label="Đang hoạt động" value={(sum?.active ?? 0).toLocaleString('vi-VN')} icon={<UserCheck size={16} />} sub={`${sum?.total ? Math.round((sum.active / sum.total) * 100) : 0}% tổng tài khoản`} />
        <MetricCard compact label="Bị khóa" value={(sum?.inactive ?? 0).toLocaleString('vi-VN')} icon={<UserX size={16} />} tone={(sum?.inactive ?? 0) > 0 ? 'warning' : undefined} />
        <MetricCard compact label="Super Admin" value={by('SUPER_ADMIN')} icon={<Shield size={16} />} />
        <MetricCard compact label="Quản trị CLB" value={(by('CLUB_ADMIN') + by('CLUB_TREASURER')).toLocaleString('vi-VN')} icon={<UserCheck size={16} />} sub={`${by('CLUB_ADMIN')} Admin · ${by('CLUB_TREASURER')} Thủ quỹ`} />
        <MetricCard compact label="Thành viên" value={by('MEMBER_VIEW')} icon={<Users size={16} />} />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterBar className="flex-1" searchValue={search} onSearchChange={setSearch} searchPlaceholder="Tìm theo tên, email, tài khoản…" />
        <div className="flex gap-1 self-start overflow-x-auto rounded-full border p-1 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
          {roleOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRoleFilter(opt.value)}
              aria-pressed={roleFilter === opt.value}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === opt.value ? 'text-white shadow-sm [background:var(--pf-primary)]' : '[color:var(--pf-color-muted)] hover:[color:var(--pf-text)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pf-glass rounded-[16px] p-2">
        {loading ? (
          <LoadingState variant="table" rows={6} />
        ) : loadError ? (
          <ErrorState onRetry={load} />
        ) : users.length === 0 ? (
          <EmptyState icon={<Users size={24} />} title="Không có tài khoản" description="Không tìm thấy tài khoản phù hợp bộ lọc." />
        ) : (
          <>
            <DataTable className="pf-compact-table" columns={columns} rows={users} rowKey={(u) => u.id} />
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs [color:var(--pf-color-muted)]">
                <span>{total.toLocaleString('vi-VN')} tài khoản · trang {page}/{totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40 [border-color:var(--pf-border)]">Trước</button>
                  <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40 [border-color:var(--pf-border)]">Sau</button>
                </div>
              </div>
            )}
          </>
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
