/**
 * RolesPermissions (v2.1) — Vai trò & phân quyền (Mức A): CLUB_ADMIN xem tài khoản trong CLB,
 * GÁN vai trò (Quản trị/Thủ quỹ/Thành viên) và khóa/mở. Tái dùng API /users sẵn có (backend
 * chặn: CLUB_ADMIN không cấp được SUPER_ADMIN). KHÔNG thêm nghiệp vụ mới ngoài quản trị tài khoản.
 */
import { useEffect, useState } from 'react'
import { UserX, UserCheck } from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { PageShell, PageHeader } from '../../components/shared'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { cn } from '../../lib/utils'
import type { Role } from '../../types'
import toast from 'react-hot-toast'

interface UserRow { id: string; username: string; email: string; role: Role; fullName: string; isActive: boolean }

const roleLabel: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin', CLUB_ADMIN: 'Quản trị CLB', CLUB_TREASURER: 'Thủ quỹ', MEMBER_VIEW: 'Thành viên (xem)',
}
const roleVariant: Record<Role, 'purple' | 'blue' | 'green' | 'gray'> = {
  SUPER_ADMIN: 'purple', CLUB_ADMIN: 'blue', CLUB_TREASURER: 'green', MEMBER_VIEW: 'gray',
}
// CLUB_ADMIN chỉ được gán 3 vai trò này (không có SUPER_ADMIN).
const ASSIGNABLE: Role[] = ['CLUB_ADMIN', 'CLUB_TREASURER', 'MEMBER_VIEW']

export function RolesPermissions() {
  const me = useAuthStore((s) => s.user)
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingToggle, setPendingToggle] = useState<UserRow | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get('/users').then((res) => {
      const raw = res.data?.data ?? []
      setUsers(raw.map((u: any) => ({
        id: u.id, username: u.username, email: u.email ?? '', role: u.role as Role,
        fullName: u.member?.fullName ?? u.username, isActive: u.isActive ?? true,
      })))
    }).catch(() => toast.error('Không tải được danh sách tài khoản')).finally(() => setLoading(false))
  }, [])

  const changeRole = async (u: UserRow, role: Role) => {
    if (role === u.role) return
    const prev = u.role
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role } : x)))
    try {
      await api.put(`/users/${u.id}`, { role })
      toast.success(`Đã đổi vai trò ${u.username} → ${roleLabel[role]}`)
    } catch {
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: prev } : x)))
      toast.error('Đổi vai trò thất bại')
    }
  }

  const toggleActive = async (u: UserRow) => {
    const next = !u.isActive
    setBusy(true)
    try {
      await api.put(`/users/${u.id}`, { isActive: next })
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, isActive: next } : x)))
      toast.success(`${next ? 'Mở khóa' : 'Khóa'} tài khoản ${u.username}`)
    } catch {
      toast.error('Thao tác thất bại')
    } finally {
      setBusy(false); setPendingToggle(null)
    }
  }

  return (
    <PageShell>
      <PageHeader title="Vai trò & phân quyền" subtitle={`${users.length} tài khoản trong CLB · gán vai trò, khóa/mở đăng nhập`} />

      <div className="overflow-x-auto rounded-[20px] border [border-color:var(--pf-border)] [background:var(--pf-surface)] [box-shadow:var(--pf-shadow)]">
        <table className="table-base">
          <thead>
            <tr>
              <th>Tài khoản</th><th>Họ tên</th><th>Email</th>
              <th className="text-center w-44">Vai trò</th>
              <th className="text-center w-28">Trạng thái</th>
              <th className="text-center w-20">Khóa/Mở</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = me?.username === u.username
              const locked = u.role === 'SUPER_ADMIN' || isMe
              return (
                <tr key={u.id}>
                  <td className="font-mono text-xs font-semibold text-slate-900">
                    {u.username}{isMe && <span className="ml-1 text-[10px] text-slate-400">(bạn)</span>}
                  </td>
                  <td className="text-slate-700">{u.fullName}</td>
                  <td className="text-xs text-slate-500">{u.email}</td>
                  <td className="text-center">
                    {locked ? (
                      <Badge variant={roleVariant[u.role]}>{roleLabel[u.role]}</Badge>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                        className="input-base py-1 text-xs"
                      >
                        {ASSIGNABLE.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="text-center">
                    {u.isActive ? <Badge variant="green" dot>Hoạt động</Badge> : <Badge variant="gray" dot>Đã khóa</Badge>}
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => setPendingToggle(u)}
                      disabled={locked}
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                        u.isActive ? 'hover:bg-red-50 hover:text-red-500' : 'hover:bg-emerald-50 hover:text-emerald-600',
                      )}
                      title={locked ? 'Không thể thao tác' : (u.isActive ? 'Khóa tài khoản' : 'Mở khóa')}
                    >
                      {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                    </button>
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">{loading ? 'Đang tải...' : 'Chưa có tài khoản'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs [color:var(--pf-color-muted)]">
        Lưu ý: không thể tự đổi vai trò của chính mình; tài khoản Super Admin do hệ thống quản lý.
      </p>

      <ConfirmDialog
        open={!!pendingToggle}
        variant={pendingToggle?.isActive ? 'danger' : 'warning'}
        title={pendingToggle?.isActive ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
        message={pendingToggle?.isActive
          ? `Khóa "${pendingToggle?.username}"? Người này sẽ không đăng nhập được cho tới khi mở lại.`
          : `Mở khóa "${pendingToggle?.username}"?`}
        confirmLabel={busy ? 'Đang xử lý...' : (pendingToggle?.isActive ? 'Khóa' : 'Mở khóa')}
        cancelLabel="Hủy bỏ"
        onCancel={() => setPendingToggle(null)}
        onConfirm={() => pendingToggle && toggleActive(pendingToggle)}
      />
    </PageShell>
  )
}
