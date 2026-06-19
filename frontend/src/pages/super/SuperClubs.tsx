import { useState, useEffect } from 'react'
import { Plus, Search, Lock, Unlock, Eye, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { Club } from '../../types'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'CLUB_ADMIN', label: 'Admin CLB' },
  { value: 'CLUB_TREASURER', label: 'Thủ quỹ' },
  { value: 'CLUB_MEMBER', label: 'Thành viên' },
]

interface ClubUser {
  id: string
  username: string
  email: string
  role: string
  isActive: boolean
}

const inputCls = 'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white'

export function SuperClubs() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [clubs, setClubs] = useState<Club[]>([])
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', address: '', contactEmail: '', contactPhone: '' })

  // Edit modal
  const [editClub, setEditClub] = useState<Club | null>(null)
  const [editForm, setEditForm] = useState({ name: '', address: '', contactEmail: '', contactPhone: '' })

  // Delete confirmation
  const [deleteClub, setDeleteClub] = useState<Club | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Roles modal
  const [rolesClub, setRolesClub] = useState<Club | null>(null)
  const [clubUsers, setClubUsers] = useState<ClubUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [usersError, setUsersError] = useState(false)
  const [savingRole, setSavingRole] = useState<string | null>(null)

  useEffect(() => {
    api.get('/clubs').then(res => {
      const raw = res.data?.data?.clubs ?? res.data?.data ?? []
      setClubs(raw.map((c: any) => ({
        id: c.id, name: c.name, code: c.code, address: c.address ?? '', logoUrl: undefined,
        contactEmail: c.contactEmail ?? '', contactPhone: c.contactPhone ?? '',
        status: c.status ?? 'active', settings: {},
        createdAt: c.createdAt, updatedAt: c.updatedAt,
        _count: c._count ?? { members: 0, fundPeriods: 0 },
      })))
    }).catch(() => {})
  }, [])

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.post('/clubs', form)
      const d = res.data?.data
      setClubs(prev => [...prev, { ...d, logoUrl: undefined, settings: {}, _count: { members: 0, fundPeriods: 0 } }])
      setShowCreate(false)
      setForm({ name: '', code: '', address: '', contactEmail: '', contactPhone: '' })
      toast.success(`Tạo CLB ${form.name} thành công!`)
    } catch { toast.error('Tạo CLB thất bại. Vui lòng thử lại.') }
  }

  const openEdit = (club: Club) => {
    setEditClub(club)
    setEditForm({ name: club.name, address: club.address ?? '', contactEmail: club.contactEmail ?? '', contactPhone: club.contactPhone ?? '' })
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editClub) return
    try {
      await api.put(`/clubs/${editClub.id}`, editForm)
      setClubs(prev => prev.map(c => c.id === editClub.id ? { ...c, ...editForm } : c))
      setEditClub(null)
      toast.success('Đã cập nhật thông tin CLB')
    } catch { toast.error('Cập nhật thất bại') }
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên CLB *</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã CLB *</label>
            <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="VD: PBHN" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Điện thoại</label>
            <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email liên hệ</label>
            <input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Địa chỉ sân</label>
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Hủy</Button>
          <Button type="submit">Tạo CLB</Button>
        </div>
      </form>
    </Modal>
  )

  const editModal = (
    <Modal open={!!editClub} onClose={() => setEditClub(null)} title={`Sửa: ${editClub?.name ?? ''}`} size="lg">
      <form onSubmit={handleEdit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên CLB *</label>
            <input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Điện thoại</label>
            <input value={editForm.contactPhone} onChange={e => setEditForm({ ...editForm, contactPhone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email liên hệ</label>
            <input type="email" value={editForm.contactEmail} onChange={e => setEditForm({ ...editForm, contactEmail: e.target.value })} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Địa chỉ sân</label>
            <input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <Button variant="secondary" type="button" onClick={() => setEditClub(null)}>Hủy</Button>
          <Button type="submit">Lưu thay đổi</Button>
        </div>
      </form>
    </Modal>
  )

  const deleteModal = (
    <Modal open={!!deleteClub} onClose={() => setDeleteClub(null)} title="Xác nhận xóa CLB" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Bạn có chắc muốn xóa CLB <span className="font-semibold text-gray-900">{deleteClub?.name}</span>? Hành động này không thể hoàn tác.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={() => setDeleteClub(null)}>Hủy</Button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60 transition-colors"
          >
            {deleting ? 'Đang xóa...' : 'Xóa CLB'}
          </button>
        </div>
      </div>
    </Modal>
  )

  const rolesModal = (
    <Modal open={!!rolesClub} onClose={() => setRolesClub(null)} title={`Phân quyền: ${rolesClub?.name ?? ''}`} size="lg">
      <div className="space-y-3">
        {loadingUsers && <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>}
        {!loadingUsers && usersError && (
          <div className="text-center py-8 text-red-400 text-sm">Không tải được danh sách. Vui lòng thử lại.</div>
        )}
        {!loadingUsers && !usersError && clubUsers.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">Chưa có thành viên nào</div>
        )}
        {!loadingUsers && !usersError && clubUsers.map(u => (
          <div key={u.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-100 bg-gray-50">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 text-sm truncate">{u.username}</div>
              <div className="text-xs text-gray-400 truncate">{u.email}</div>
            </div>
            <select
              value={u.role}
              disabled={savingRole === u.id}
              onChange={e => handleRoleChange(u.id, e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              {!ROLES.find(r => r.value === u.role) && (
                <option value={u.role}>{u.role}</option>
              )}
            </select>
          </div>
        ))}
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setRolesClub(null)}>Đóng</Button>
        </div>
      </div>
    </Modal>
  )

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900 text-base">Quản lý CLB</div>
            <div className="text-xs text-slate-400">{clubs.length} câu lạc bộ</div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm tên hoặc mã CLB..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        <div className="px-4 pb-6 space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Không tìm thấy CLB nào</div>
          )}
          {filtered.map(club => (
            <div
              key={club.id}
              className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm active:bg-slate-50"
              onClick={() => navigate(`/super/clubs/${club.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{club.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{club.code}{club.contactEmail ? ` · ${club.contactEmail}` : ''}</div>
                </div>
                <Badge variant={club.status === 'active' ? 'green' : 'orange'}>
                  {club.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                <div className="text-xs text-slate-500"><span className="font-semibold text-slate-900">{club._count?.members ?? 0}</span> TV</div>
                <div className="text-xs text-slate-500"><span className="font-semibold text-slate-900">{club._count?.fundPeriods ?? 0}</span> kỳ</div>
                <div className="flex-1" />
                <button onClick={e => { e.stopPropagation(); openEdit(club) }} className="p-2 rounded-lg text-indigo-500 bg-indigo-50">
                  <Pencil size={14} />
                </button>
                <button onClick={e => { e.stopPropagation(); openRoles(club) }} className="p-2 rounded-lg text-violet-500 bg-violet-50">
                  <ShieldCheck size={14} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); toggleStatus(club) }}
                  className={`p-2 rounded-lg ${club.status === 'active' ? 'text-orange-500 bg-orange-50' : 'text-green-600 bg-green-50'}`}
                >
                  {club.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                <button onClick={e => { e.stopPropagation(); setDeleteClub(club) }} className="p-2 rounded-lg text-red-500 bg-red-50">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {createModal}
        {editModal}
        {deleteModal}
        {rolesModal}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Quản lý CLB"
        subtitle={`${clubs.length} câu lạc bộ trong hệ thống`}
        actions={<Button onClick={() => setShowCreate(true)}><Plus size={16} />Tạo CLB mới</Button>}
      />

      <div className="p-6 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm CLB theo tên hoặc mã..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Tên CLB</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Địa chỉ</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Thành viên</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Kỳ quỹ</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Trạng thái</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(club => (
                <tr key={club.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{club.name}</div>
                    <div className="text-xs text-gray-400">{club.code} · {club.contactEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{club.address || '—'}</td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900">{club._count?.members}</td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900">{club._count?.fundPeriods}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={club.status === 'active' ? 'green' : 'orange'}>
                      {club.status === 'active' ? '✓ Hoạt động' : '✗ Bị khóa'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50" title="Xem chi tiết" onClick={() => navigate(`/super/clubs/${club.id}`)}>
                        <Eye size={15} />
                      </button>
                      <button className="text-indigo-600 hover:text-indigo-800 p-1.5 rounded hover:bg-indigo-50" title="Sửa thông tin" onClick={() => openEdit(club)}>
                        <Pencil size={15} />
                      </button>
                      <button className="text-violet-600 hover:text-violet-800 p-1.5 rounded hover:bg-violet-50" title="Phân quyền thành viên" onClick={() => openRoles(club)}>
                        <ShieldCheck size={15} />
                      </button>
                      <button
                        onClick={() => toggleStatus(club)}
                        className={club.status === 'active' ? 'text-orange-500 hover:text-orange-700 p-1.5 rounded hover:bg-orange-50' : 'text-green-600 hover:text-green-800 p-1.5 rounded hover:bg-green-50'}
                        title={club.status === 'active' ? 'Khóa CLB' : 'Mở khóa'}
                      >
                        {club.status === 'active' ? <Lock size={15} /> : <Unlock size={15} />}
                      </button>
                      <button className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50" title="Xóa CLB" onClick={() => setDeleteClub(club)}>
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
    </div>
  )
}
