import { useState, useEffect } from 'react'
import { Search, UserCheck, UserX, Shield, Users } from 'lucide-react'
import api from '../../lib/api'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import type { Role } from '../../types'
import toast from 'react-hot-toast'

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
  SUPER_ADMIN: 'Super Admin', CLUB_ADMIN: 'Club Admin', CLUB_TREASURER: 'Thủ Quỹ', CLUB_MEMBER: 'Thành Viên'
}
const roleVariant: Record<Role, 'purple' | 'blue' | 'green' | 'gray'> = {
  SUPER_ADMIN: 'purple', CLUB_ADMIN: 'blue', CLUB_TREASURER: 'green', CLUB_MEMBER: 'gray'
}

export function SuperUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')

  useEffect(() => {
    api.get('/users').then(res => {
      const raw = res.data?.data ?? []
      setUsers(raw.map((u: any) => ({
        id: u.id,
        username: u.username,
        email: u.email ?? '',
        role: u.role as Role,
        club: u.club?.name ?? null,
        fullName: u.member?.fullName ?? u.username,
        isActive: u.isActive ?? true,
      })))
    }).catch(() => { /* stay empty, super admin will notice */ })
  }, [])

  const toggleActive = async (u: UserRow) => {
    const next = !u.isActive
    try {
      await api.put(`/users/${u.id}`, { isActive: next })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: next } : x))
      toast.success(`${next ? 'Mở khóa' : 'Khóa'} tài khoản ${u.username}`)
    } catch {
      toast.error('Thao tác thất bại')
    }
  }

  const filtered = users.filter(u => {
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
    { value: 'CLUB_MEMBER', label: 'Thành Viên' },
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Quản lý Người Dùng"
        subtitle={`${users.length} tài khoản toàn hệ thống`}
      />

      <div className="p-6 max-w-[1100px] mx-auto space-y-5">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Super Admin', role: 'SUPER_ADMIN', color: 'text-purple-600', bg: 'bg-purple-50', icon: <Shield size={14} className="text-purple-500" /> },
            { label: 'Club Admin', role: 'CLUB_ADMIN', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: <UserCheck size={14} className="text-indigo-500" /> },
            { label: 'Thủ Quỹ', role: 'CLUB_TREASURER', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <UserCheck size={14} className="text-emerald-500" /> },
            { label: 'Thành Viên', role: 'CLUB_MEMBER', color: 'text-slate-600', bg: 'bg-slate-100', icon: <Users size={14} className="text-slate-500" /> },
          ].map(item => (
            <div key={item.role} className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-7 w-7 rounded-lg ${item.bg} flex items-center justify-center`}>{item.icon}</div>
                <p className="text-xs font-semibold text-slate-500">{item.label}</p>
              </div>
              <p className={`text-2xl font-bold ${item.color}`}>
                {users.filter(u => u.role === item.role).length}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, tài khoản..."
              className="input-base pl-9"
            />
          </div>
          <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1">
            {roleOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRoleFilter(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  roleFilter === opt.value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
          <table className="table-base">
            <thead>
              <tr>
                <th>Tài khoản</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th className="text-center">Vai trò</th>
                <th>CLB</th>
                <th className="text-center w-24">Trạng thái</th>
                <th className="text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td className="font-semibold text-slate-900 font-mono text-xs">{u.username}</td>
                  <td className="text-slate-700">{u.fullName}</td>
                  <td className="text-slate-500 text-xs">{u.email}</td>
                  <td className="text-center">
                    <Badge variant={roleVariant[u.role]}>{roleLabel[u.role]}</Badge>
                  </td>
                  <td className="text-slate-500 text-xs">{u.club ?? '— Hệ thống'}</td>
                  <td className="text-center">
                    {u.isActive
                      ? <Badge variant="green" dot>Hoạt động</Badge>
                      : <Badge variant="gray" dot>Đã khóa</Badge>}
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={u.role === 'SUPER_ADMIN'}
                      className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                        ${u.isActive
                          ? 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                          : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                      title={u.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                    >
                      {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                    {users.length === 0 ? 'Đang tải...' : 'Không tìm thấy tài khoản phù hợp'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
