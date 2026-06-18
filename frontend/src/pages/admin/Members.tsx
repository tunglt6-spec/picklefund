import { useState } from 'react'
import { Plus, Search, Edit2, Trash2, Users, Filter, X, FileText, FileSpreadsheet } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { Member } from '../../types'
import { formatDate } from '../../lib/utils'
import { exportMembersExcel, exportMembersPDF } from '../../lib/export'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { useIsMobile } from '../../hooks/useIsMobile'

const emptyForm = { fullName: '', phone: '', email: '', joinDate: new Date().toISOString().slice(0, 10), notes: '' }

const statusVariant: Record<string, 'green' | 'yellow' | 'gray'> = {
  active: 'green', inactive: 'yellow', left: 'gray',
}
const statusLabel: Record<string, string> = {
  active: 'Hoạt động', inactive: 'Tạm nghỉ', left: 'Đã rời',
}

function MemberAvatar({ name, id }: { name: string; id: string }) {
  const colors = ['bg-indigo-500','bg-emerald-500','bg-orange-500','bg-purple-500','bg-cyan-500','bg-rose-500']
  const color  = colors[id.charCodeAt(id.length - 1) % colors.length]
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color} text-white text-xs font-bold select-none`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}

function MemberDrawer({
  open, onClose, editMember, onSave,
}: {
  open: boolean; onClose: () => void; editMember: Member | null
  onSave: (form: typeof emptyForm) => void
}) {
  const [form, setForm] = useState(() => editMember
    ? { fullName: editMember.fullName, phone: editMember.phone || '', email: editMember.email || '', joinDate: editMember.joinDate, notes: editMember.notes || '' }
    : { ...emptyForm }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName.trim()) { toast.error('Vui lòng nhập họ tên'); return }
    onSave(form)
  }

  if (!open) return null
  const isEdit = !!editMember

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-md bg-white flex flex-col shadow-2xl animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {isEdit ? 'Chỉnh sửa thành viên' : 'Thêm thành viên mới'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit ? `Cập nhật thông tin của ${editMember!.fullName}` : 'Nhập thông tin thành viên CLB'}
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Thông tin cá nhân</p>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Họ và tên <span className="text-red-500">*</span></label>
                  <input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Nguyễn Văn A" className="input-base" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Số điện thoại</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                      placeholder="0912 345 678" className="input-base" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày gia nhập</label>
                    <input type="date" value={form.joinDate} onChange={e => setForm({ ...form, joinDate: e.target.value })}
                      className="input-base" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="nguyenvana@gmail.com" className="input-base" />
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Thông tin bổ sung</p>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Ghi chú</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Thông tin thêm về thành viên..." rows={3} className="input-base resize-none" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Hủy bỏ</Button>
            <Button type="submit" className="flex-1">{isEdit ? 'Lưu thay đổi' : 'Thêm thành viên'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function Members() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
  const { getClubData, setMembers: saveMembers } = useClubDataStore()
  const members = getClubData(clubId).members

  const setMembers = (fn: (prev: Member[]) => Member[]) =>
    saveMembers(clubId, fn(getClubData(clubId).members))

  const [search, setSearch]       = useState('')
  const [showDrawer, setShowDrawer] = useState(false)
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'inactive'>('all')
  const [showFilter, setShowFilter] = useState(false)
  const [joinFrom, setJoinFrom] = useState('')
  const [joinTo, setJoinTo] = useState('')

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    const matchQ = m.fullName.toLowerCase().includes(q) || (m.phone || '').includes(q)
    const matchS = statusFilter === 'all' || m.status === statusFilter
    const matchFrom = !joinFrom || (m.joinDate ?? '') >= joinFrom
    const matchTo   = !joinTo   || (m.joinDate ?? '') <= joinTo
    return matchQ && matchS && matchFrom && matchTo
  })

  const openCreate = () => { setEditMember(null); setShowDrawer(true) }
  const openEdit   = (m: Member) => { setEditMember(m); setShowDrawer(true) }
  const closeDrawer = () => { setShowDrawer(false); setEditMember(null) }

  const handleSave = async (form: typeof emptyForm) => {
    try {
      if (editMember) {
        const res = await api.put(`/members/${editMember.id}`, form)
        const updated = res.data?.data ?? { ...editMember, ...form }
        setMembers(prev => prev.map(m => m.id === editMember.id ? { ...m, ...updated, amount: Number(updated.amount ?? m.id) } : m))
        toast.success('Cập nhật thành viên thành công!')
      } else {
        const res = await api.post('/members', { ...form, clubId })
        const created = res.data?.data ?? { id: `mem-${Date.now()}`, clubId, status: 'active', ...form }
        setMembers(prev => [...prev, { ...created }])
        toast.success(`Đã thêm ${form.fullName}!`)
      }
    } catch {
      // Fallback to local update if API fails
      if (editMember) {
        setMembers(prev => prev.map(m => m.id === editMember.id ? { ...m, ...form } : m))
        toast.success('Cập nhật thành viên thành công! (offline)')
      } else {
        setMembers(prev => [...prev, { id: `mem-${Date.now()}`, clubId, status: 'active', ...form }])
        toast.success(`Đã thêm ${form.fullName}! (offline)`)
      }
    }
    closeDrawer()
  }

  const handleDelete = async (m: Member) => {
    if (!window.confirm(`Xóa thành viên ${m.fullName}?`)) return
    try {
      await api.delete(`/members/${m.id}`)
    } catch {
      // Continue with local delete even if API fails
    }
    setMembers(prev => prev.filter(x => x.id !== m.id))
    toast.success('Đã xóa thành viên')
  }

  const activeCount = members.filter(m => m.status === 'active').length
  const isMobile = useIsMobile()

  /* ── Mobile layout ── */
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <MemberDrawer open={showDrawer} onClose={closeDrawer} editMember={editMember} onSave={handleSave} />

        {/* Sticky search bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tìm thành viên..." className="input-base pl-8 w-full text-sm" />
            </div>
            <button
              onClick={openCreate}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="flex gap-1.5">
            {([['all','Tất cả'],['active','Hoạt động'],['inactive','Tạm nghỉ']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === v ? 'text-white' : 'bg-slate-100 text-slate-500'
                }`}
                style={statusFilter === v ? { background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' } : {}}
              >{l}</button>
            ))}
            <span className="ml-auto text-xs text-slate-400 self-center">{activeCount} hoạt động</span>
          </div>
        </div>

        {/* Member cards */}
        <div className="px-4 pt-3 pb-6 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-14 text-slate-400 text-sm">
              <Users size={36} className="mx-auto text-slate-200 mb-3" />
              {search ? `Không tìm thấy "${search}"` : 'Chưa có thành viên'}
            </div>
          ) : filtered.map(m => (
            <div key={m.id} className="bg-white rounded-[16px] border border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm">
              <MemberAvatar name={m.fullName} id={m.id} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-[600] text-slate-900 truncate">{m.fullName}</div>
                <div className="text-[12px] text-slate-400">{m.phone || m.email || 'Không có SĐT'}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={statusVariant[m.status] ?? 'gray'}>{statusLabel[m.status] ?? m.status}</Badge>
                <button onClick={() => openEdit(m)} className="text-slate-400 active:text-indigo-600"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(m)} className="text-slate-300 active:text-red-500"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">Danh sách thành viên</h1>
          <p className="text-xs text-slate-500 mt-0.5">{activeCount} thành viên đang hoạt động</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            exportMembersExcel('CLB', filtered.map(m => ({ name: m.fullName, phone: m.phone ?? '', email: m.email ?? '', joinDate: formatDate(m.joinDate), status: m.status === 'active' ? 'Hoạt động' : m.status === 'inactive' ? 'Tạm nghỉ' : 'Đã rời' })))
            toast.success('Đã xuất Excel danh sách thành viên!')
          }}><FileSpreadsheet size={14} />Excel</Button>
          <Button variant="outline" onClick={() => {
            exportMembersPDF('CLB', filtered.map(m => ({ name: m.fullName, phone: m.phone ?? '', email: m.email ?? '', joinDate: formatDate(m.joinDate), status: m.status === 'active' ? 'Hoạt động' : m.status === 'inactive' ? 'Tạm nghỉ' : 'Đã rời' })))
            toast.success('Đã xuất PDF danh sách thành viên!')
          }}><FileText size={14} />PDF</Button>
          <Button onClick={openCreate}><Plus size={15} />Thêm thành viên</Button>
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên, SĐT..." className="input-base pl-8 w-64" />
          </div>
          <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
            {([['all','Tất cả'],['active','Hoạt động'],['inactive','Tạm nghỉ']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === v ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>{l}</button>
            ))}
          </div>
          <Button variant={showFilter ? 'primary' : 'outline'} size="sm" onClick={() => setShowFilter(v => !v)}><Filter size={13} />Lọc</Button>
        </div>

        {/* Inline filter panel */}
        {showFilter && (
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3 items-end mb-4 shadow-sm">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Gia nhập từ</label>
              <input type="date" value={joinFrom} onChange={e => setJoinFrom(e.target.value)} className="input-base text-sm h-8" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Đến ngày</label>
              <input type="date" value={joinTo} onChange={e => setJoinTo(e.target.value)} className="input-base text-sm h-8" />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setJoinFrom(''); setJoinTo('') }}>Xóa lọc</Button>
          </div>
        )}

        {/* Table / Empty */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <Users size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">
              {search ? `Không tìm thấy kết quả cho "${search}"` : 'Chưa có thành viên nào'}
            </p>
            {!search && <Button onClick={openCreate} className="mt-4" size="sm"><Plus size={14} />Thêm thành viên đầu tiên</Button>}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th>Thành viên</th>
                  <th>Liên hệ</th>
                  <th>Ngày gia nhập</th>
                  <th>Trạng thái</th>
                  <th className="text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id}>
                    <td className="text-slate-400 text-xs">{i + 1}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <MemberAvatar name={m.fullName} id={m.id} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{m.fullName}</p>
                          <p className="text-xs text-slate-400">#{m.id.slice(-4)}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs space-y-0.5">
                        {m.phone && <p className="text-slate-600">{m.phone}</p>}
                        {m.email && <p className="text-slate-400">{m.email}</p>}
                      </div>
                    </td>
                    <td className="text-xs text-slate-500">{formatDate(m.joinDate)}</td>
                    <td><Badge variant={statusVariant[m.status] ?? 'gray'} dot>{statusLabel[m.status] ?? m.status}</Badge></td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(m)} title="Chỉnh sửa"
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(m)} title="Xóa"
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-50">
              <span className="text-xs text-slate-500">Hiển thị {filtered.length} / {members.length} thành viên</span>
              <div className="flex items-center gap-1">
                <button className="h-7 px-2.5 rounded-lg border border-slate-200 text-xs hover:bg-slate-50 disabled:opacity-40" disabled>‹</button>
                <button className="h-7 px-2.5 rounded-lg bg-indigo-600 text-white text-xs font-medium">1</button>
                <button className="h-7 px-2.5 rounded-lg border border-slate-200 text-xs hover:bg-slate-50 disabled:opacity-40" disabled>›</button>
                <select className="ml-2 h-7 rounded-lg border border-slate-200 text-xs px-2 bg-white text-slate-600 focus:outline-none">
                  <option>10 / trang</option><option>25 / trang</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <MemberDrawer
        open={showDrawer}
        onClose={closeDrawer}
        editMember={editMember}
        onSave={handleSave}
      />
    </div>
  )
}
