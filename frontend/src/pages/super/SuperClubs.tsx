import { useState } from 'react'
import { Plus, Search, Lock, Unlock, Eye } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import type { Club } from '../../types'
import toast from 'react-hot-toast'

export function SuperClubs() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', address: '', contactEmail: '', contactPhone: '' })

  const filtered = clubs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  )

  const toggleStatus = (club: Club) => {
    setClubs(prev => prev.map(c => c.id === club.id ? { ...c, status: c.status === 'active' ? 'suspended' : 'active' } : c))
    toast.success(club.status === 'active' ? `Đã khóa ${club.name}` : `Đã mở khóa ${club.name}`)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const newClub: Club = {
      ...form, id: `club-${Date.now()}`, logoUrl: undefined, status: 'active',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      settings: {}, _count: { members: 0, fundPeriods: 0 }
    }
    setClubs(prev => [...prev, newClub])
    setShowCreate(false)
    setForm({ name: '', code: '', address: '', contactEmail: '', contactPhone: '' })
    toast.success(`Tạo CLB ${form.name} thành công!`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Quản lý CLB"
        subtitle={`${clubs.length} câu lạc bộ trong hệ thống`}
        actions={<Button onClick={() => setShowCreate(true)}><Plus size={16} />Tạo CLB mới</Button>}
      />

      <div className="p-6 space-y-4">
        {/* Search */}
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

        {/* Table */}
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
                    <div className="flex items-center justify-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800 p-1" title="Xem chi tiết">
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => toggleStatus(club)}
                        className={club.status === 'active' ? 'text-orange-500 hover:text-orange-700 p-1' : 'text-green-600 hover:text-green-800 p-1'}
                        title={club.status === 'active' ? 'Khóa CLB' : 'Mở khóa'}
                      >
                        {club.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create CLB Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo CLB mới" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên CLB *</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã CLB *</label>
              <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="VD: PBHN"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Điện thoại</label>
              <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email liên hệ</label>
              <input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Địa chỉ sân</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button type="submit">Tạo CLB</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
