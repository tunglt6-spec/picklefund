import { useState, useEffect, useMemo } from 'react'
import {
  Users, UserPlus, RefreshCw, Lock, Unlock, CheckCircle2,
  AlertCircle, Clock, XCircle, Search, ChevronDown
} from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore } from '../../store/clubDataStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import { Button } from '../../components/ui/Button'
import type { MemberUserAccount } from '../../types'
import toast from 'react-hot-toast'

// ── helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type AccountStatus = 'active' | 'pending' | 'locked' | 'must_change'

function getStatus(acc: MemberUserAccount): AccountStatus {
  if (!acc.isActive) return 'locked'
  if (acc.mustChangePassword) return 'must_change'
  if (!acc.lastLoginAt) return 'pending'
  return 'active'
}

const STATUS_CONFIG: Record<AccountStatus, { label: string; color: string; icon: React.ReactNode }> = {
  active:      { label: 'Hoạt động',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  pending:     { label: 'Chưa kích hoạt',   color: 'bg-amber-50 text-amber-700 border-amber-200',       icon: <Clock size={12} /> },
  must_change: { label: 'Cần đổi mật khẩu', color: 'bg-blue-50 text-blue-700 border-blue-200',          icon: <AlertCircle size={12} /> },
  locked:      { label: 'Bị khóa',           color: 'bg-red-50 text-red-700 border-red-200',             icon: <XCircle size={12} /> },
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ acc }: { acc: MemberUserAccount }) {
  const s = getStatus(acc)
  const cfg = STATUS_CONFIG[s]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

// ── BulkCreateModal ───────────────────────────────────────────────────────────
function BulkCreateModal({
  members,
  existingMemberIds,
  onClose,
  onCreated,
}: {
  members: { id: string; fullName: string }[]
  existingMemberIds: Set<string>
  onClose: () => void
  onCreated: () => void
}) {
  const available = members.filter(m => !existingMemberIds.has(m.id))
  const [selected, setSelected] = useState<Set<string>>(new Set(available.map(m => m.id)))
  const [saving, setSaving] = useState(false)

  const toggle = (id: string) => setSelected(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const handleCreate = async () => {
    if (selected.size === 0) return
    setSaving(true)
    try {
      const res = await api.post('/member-users/bulk-create', {
        memberIds: [...selected],
        mustChangePassword: true,
        notificationEnabled: true,
      })
      const results: { success: boolean; memberName: string; username: string; error?: string }[] = res.data.data
      const ok = results.filter(r => r.success).length
      const fail = results.filter(r => !r.success).length
      if (ok > 0) toast.success(`Đã tạo ${ok} tài khoản thành công`)
      if (fail > 0) toast.error(`${fail} tài khoản tạo thất bại`)
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Tạo hàng loạt thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Tạo tài khoản hàng loạt</h2>
          <p className="text-sm text-slate-500 mt-0.5">{available.length} thành viên chưa có tài khoản</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {available.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Tất cả thành viên đã có tài khoản</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setSelected(new Set(available.map(m => m.id)))}
                  className="text-xs text-indigo-600 hover:underline">Chọn tất cả</button>
                <button onClick={() => setSelected(new Set())}
                  className="text-xs text-slate-500 hover:underline">Bỏ chọn tất cả</button>
              </div>

              {/* Header */}
              <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-3 px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg mb-1">
                <span />
                <span>Thành viên</span>
                <span>Username dự kiến</span>
                <span>Mật khẩu</span>
              </div>

              <div className="space-y-1">
                {available.map(m => (
                  <label key={m.id}
                    className="grid grid-cols-[auto_1fr_1fr_1fr] gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent has-[:checked]:border-indigo-200 has-[:checked]:bg-indigo-50/50 transition-colors">
                    <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)}
                      className="rounded text-indigo-600" />
                    <span className="text-sm font-medium text-slate-800">{m.fullName}</span>
                    <span className="text-sm text-slate-500 font-mono">{slugify(m.fullName) || 'user'}</span>
                    <span className="text-sm text-slate-400 font-mono">123456</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-sm text-slate-500">Đã chọn: <strong>{selected.size}</strong> thành viên</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
            <Button onClick={handleCreate} disabled={selected.size === 0 || saving}>
              {saving ? 'Đang tạo...' : `Tạo ${selected.size} tài khoản`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── CreateSingleModal ─────────────────────────────────────────────────────────
function CreateSingleModal({
  members,
  existingMemberIds,
  onClose,
  onCreated,
}: {
  members: { id: string; fullName: string }[]
  existingMemberIds: Set<string>
  onClose: () => void
  onCreated: () => void
}) {
  const available = members.filter(m => !existingMemberIds.has(m.id))
  const [memberId, setMemberId] = useState(available[0]?.id ?? '')
  const selectedMember = available.find(m => m.id === memberId)
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)

  // auto-suggest username
  useEffect(() => {
    if (selectedMember) setUsername(slugify(selectedMember.fullName))
  }, [memberId, selectedMember])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberId) return
    setSaving(true)
    try {
      await api.post('/member-users', {
        memberId,
        username: username.trim() || undefined,
        mustChangePassword: true,
        notificationEnabled: true,
      })
      toast.success('Tạo tài khoản thành công')
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Tạo tài khoản thất bại')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Tạo tài khoản thành viên</h2>
        </div>
        <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Chọn thành viên <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={memberId} onChange={e => setMemberId(e.target.value)}
                className={`${inputCls} pr-8 appearance-none`} required>
                {available.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Tự động sinh từ tên" className={inputCls} />
            <p className="text-xs text-slate-400 mt-1">Để trống sẽ tự động sinh từ tên thành viên</p>
          </div>

          <div>
            <label className={labelCls}>Mật khẩu mặc định</label>
            <input value="123456" readOnly className={`${inputCls} bg-slate-50 text-slate-500 font-mono cursor-not-allowed`} />
            <p className="text-xs text-slate-400 mt-1">Thành viên phải đổi mật khẩu khi đăng nhập lần đầu</p>
          </div>

          <div className="flex items-center gap-3 py-1">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center">
                <CheckCircle2 size={10} className="text-white" />
              </div>
              <span className="text-sm text-slate-600">Bắt buộc đổi mật khẩu</span>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center">
                <CheckCircle2 size={10} className="text-white" />
              </div>
              <span className="text-sm text-slate-600">Bật nhận thông báo</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" type="button" onClick={onClose} disabled={saving} className="flex-1">Hủy</Button>
            <Button type="submit" disabled={!memberId || saving} className="flex-1">
              {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────
function ConfirmModal({ title, body, onConfirm, onClose, danger = false }: {
  title: string; body: string; onConfirm: () => void; onClose: () => void; danger?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{body}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>Xác nhận</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function MemberAccounts() {
  const { user } = useAuthStore()
  const { getClubData } = useClubDataStore()
  const isMobile = useIsMobile()
  const clubData = getClubData(user?.clubId ?? '')
  const members = clubData.members.filter(m => m.status === 'active')

  const [accounts, setAccounts] = useState<MemberUserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [showSingle, setShowSingle] = useState(false)
  const [confirm, setConfirm] = useState<null | { title: string; body: string; danger?: boolean; onConfirm: () => void }>(null)

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/member-users')
      setAccounts(res.data.data)
    } catch {
      toast.error('Không tải được danh sách tài khoản')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAccounts() }, [])

  const existingMemberIds = useMemo(() => new Set(accounts.map(a => a.member?.id).filter(Boolean) as string[]), [accounts])

  const filtered = useMemo(() => {
    if (!search.trim()) return accounts
    const q = search.toLowerCase()
    return accounts.filter(a =>
      a.member?.fullName?.toLowerCase().includes(q) ||
      a.username.toLowerCase().includes(q)
    )
  }, [accounts, search])

  const handleReset = (acc: MemberUserAccount) => {
    setConfirm({
      title: 'Reset mật khẩu',
      body: `Bạn có chắc muốn reset mật khẩu tài khoản "${acc.username}" về 123456? Thành viên sẽ phải đổi mật khẩu khi đăng nhập lại.`,
      onConfirm: async () => {
        try {
          await api.post(`/member-users/${acc.id}/reset-password`)
          toast.success('Đã reset mật khẩu về 123456')
          await fetchAccounts()
        } catch (err: any) {
          toast.error(err?.response?.data?.message ?? 'Reset thất bại')
        }
        setConfirm(null)
      },
    })
  }

  const handleToggleLock = (acc: MemberUserAccount) => {
    const toLock = acc.isActive
    setConfirm({
      title: toLock ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
      body: toLock
        ? `Khóa tài khoản "${acc.username}"? Thành viên sẽ không thể đăng nhập.`
        : `Mở khóa tài khoản "${acc.username}"?`,
      danger: toLock,
      onConfirm: async () => {
        try {
          await api.patch(`/member-users/${acc.id}/status`, { isActive: !toLock })
          toast.success(toLock ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản')
          await fetchAccounts()
        } catch (err: any) {
          toast.error(err?.response?.data?.message ?? 'Thao tác thất bại')
        }
        setConfirm(null)
      },
    })
  }

  const noAccountMembers = members.filter(m => !existingMemberIds.has(m.id))

  // ── Mobile card list ──────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="bg-white border-b border-slate-100 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-bold text-slate-900">Tài khoản thành viên</h1>
              <p className="text-xs text-slate-500 mt-0.5">{accounts.length} tài khoản</p>
            </div>
            <Button size="sm" onClick={() => setShowSingle(true)}>
              <UserPlus size={14} />
            </Button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm thành viên, username..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400" />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              {accounts.length === 0 ? 'Chưa có tài khoản nào' : 'Không tìm thấy'}
            </div>
          ) : (
            filtered.map(acc => (
              <div key={acc.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{acc.member?.fullName ?? '—'}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">@{acc.username}</p>
                  </div>
                  <StatusBadge acc={acc} />
                </div>
                <div className="text-xs text-slate-400 mb-3">
                  Đăng nhập cuối: {formatDate(acc.lastLoginAt)}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReset(acc)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    <RefreshCw size={12} /> Reset MK
                  </button>
                  <button onClick={() => handleToggleLock(acc)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      acc.isActive
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                    }`}>
                    {acc.isActive ? <><Lock size={12} /> Khóa</> : <><Unlock size={12} /> Mở</> }
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {showSingle && (
          <CreateSingleModal members={members} existingMemberIds={existingMemberIds}
            onClose={() => setShowSingle(false)} onCreated={fetchAccounts} />
        )}
        {confirm && (
          <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />
        )}
      </div>
    )
  }

  // ── Desktop table ─────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-base font-bold text-[#0F172A]">Tài khoản thành viên</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Cấp quyền đăng nhập view-only cho thành viên CLB
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBulk(true)} disabled={noAccountMembers.length === 0}>
              <Users size={14} /> Tạo hàng loạt
              {noAccountMembers.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs">{noAccountMembers.length}</span>
              )}
            </Button>
            <Button onClick={() => setShowSingle(true)} disabled={noAccountMembers.length === 0}>
              <UserPlus size={14} /> Tạo tài khoản
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tổng tài khoản', value: accounts.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Hoạt động', value: accounts.filter(a => getStatus(a) === 'active').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Chưa kích hoạt', value: accounts.filter(a => ['pending', 'must_change'].includes(getStatus(a))).length, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Bị khóa', value: accounts.filter(a => getStatus(a) === 'locked').length, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-[18px] border border-[#E2E8F0] shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-4">
              <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}>
                <Users size={16} className={s.color} />
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{s.value}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table card (search header + table) */}
        <div className="bg-white rounded-[18px] border border-[#E2E8F0] shadow-[0_8px_24px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tìm thành viên, username..."
                className="input-base pl-8 h-8 text-xs" />
            </div>
            <span className="text-xs text-slate-500 ml-auto">{filtered.length} tài khoản</span>
          </div>
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Users size={40} className="mx-auto text-slate-200" />
              <p className="text-slate-400 text-sm">
                {accounts.length === 0
                  ? 'Chưa có tài khoản nào. Nhấn "Tạo hàng loạt" để bắt đầu.'
                  : 'Không tìm thấy kết quả phù hợp'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-slate-500 bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left">Thành viên</th>
                    <th className="px-4 py-3 text-left">Username</th>
                    <th className="px-4 py-3 text-left">Trạng thái</th>
                    <th className="px-4 py-3 text-left">Đăng nhập cuối</th>
                    <th className="px-4 py-3 text-left">Mật khẩu</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(acc => (
                    <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-800">{acc.member?.fullName ?? '—'}</p>
                          <p className="text-xs text-slate-400">{acc.member?.phone ?? acc.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700">
                          {acc.username}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge acc={acc} /></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(acc.lastLoginAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${acc.mustChangePassword ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {acc.mustChangePassword ? 'Chưa đổi' : 'Đã đổi'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleReset(acc)}
                            title="Reset mật khẩu"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                            <RefreshCw size={12} /> Reset MK
                          </button>
                          <button onClick={() => handleToggleLock(acc)}
                            title={acc.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              acc.isActive
                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}>
                            {acc.isActive ? <><Lock size={12} /> Khóa</> : <><Unlock size={12} /> Mở khóa</>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showBulk && (
        <BulkCreateModal members={members} existingMemberIds={existingMemberIds}
          onClose={() => setShowBulk(false)} onCreated={fetchAccounts} />
      )}
      {showSingle && (
        <CreateSingleModal members={members} existingMemberIds={existingMemberIds}
          onClose={() => setShowSingle(false)} onCreated={fetchAccounts} />
      )}
      {confirm && (
        <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />
      )}
    </div>
  )
}
