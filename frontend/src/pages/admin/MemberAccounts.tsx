import { countSignal } from '../../lib/statusDesign'
import { MobileSummary } from '../../components/mobile/MobileSummary'
import { PhoneToolbar } from '../../components/mobile/PhoneToolbar'
import { ActionMenu } from '../../components/shared/ActionMenu'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useDialogA11y } from '../../hooks/useDialogA11y'
import {
  Users, UserPlus, RefreshCw, Lock, Unlock, CheckCircle2,
  AlertCircle, Clock, XCircle, Search, ChevronDown
} from '../../components/icons/mobileLucide'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useEmbedded, ErrorState } from '../../components/shared'
import { useClubDataStore } from '../../store/clubDataStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import { Button } from '../../components/ui/Button'
import { Portal } from '../../components/ui/Portal'
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
  must_change: { label: 'Cần đổi mật khẩu', color: 'max-lg:bg-[var(--pf-color-warning-soft)] max-lg:text-[var(--pf-color-warning)] bg-blue-50 text-blue-700 border-blue-200',          icon: <AlertCircle size={12} /> },
  locked:      { label: 'Bị khóa',           color: 'bg-red-50 text-red-700 border-red-200',             icon: <XCircle size={12} /> },
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ acc }: { acc: MemberUserAccount }) {
  const s = getStatus(acc)
  const cfg = STATUS_CONFIG[s]
  return (
    <span className={`pf-account-status inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
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
    if (n.has(id)) { n.delete(id) } else { n.add(id) }
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
      const failed = results.filter(r => !r.success)
      if (ok > 0) toast.success(`Đã tạo ${ok} tài khoản thành công`)
      if (failed.length > 0) {
        const firstErr = failed[0].error ? `: ${failed[0].error}` : ''
        toast.error(`${failed.length} tài khoản tạo thất bại${firstErr}`)
      }
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Tạo hàng loạt thất bại')
    } finally {
      setSaving(false)
    }
  }

  const panelRef = useRef<HTMLDivElement>(null)
  useDialogA11y(true, panelRef, onClose)
  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Tạo tài khoản hàng loạt" tabIndex={-1} className="[background:var(--pf-surface)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col outline-none">
        <div className="px-6 py-5 border-b border-[color:var(--pf-border)]">
          <h2 className="text-base font-bold [color:var(--pf-text)]">Tạo tài khoản hàng loạt</h2>
          <p className="text-sm [color:var(--pf-color-muted)] mt-0.5">{available.length} thành viên chưa có tài khoản</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {available.length === 0 ? (
            <p className="text-sm [color:var(--pf-color-muted)] text-center py-8">Tất cả thành viên đã có tài khoản</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setSelected(new Set(available.map(m => m.id)))}
                  className="text-xs [color:var(--pf-primary-text)] hover:underline">Chọn tất cả</button>
                <button onClick={() => setSelected(new Set())}
                  className="text-xs [color:var(--pf-color-muted)] hover:underline">Bỏ chọn tất cả</button>
              </div>

              {/* Header */}
              <div className="hidden lg:grid grid-cols-[auto_1fr_1fr_1fr] gap-3 px-3 py-2 text-xs font-medium [color:var(--pf-color-muted)] [background:var(--pf-surface-muted)] rounded-lg mb-1">
                <span />
                <span>Thành viên</span>
                <span>Username dự kiến</span>
                <span>Mật khẩu</span>
              </div>

              <div className="space-y-1">
                {available.map(m => (
                  <label key={m.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_1fr_1fr_1fr] gap-x-3 gap-y-1 items-center px-3 py-2.5 rounded-lg hover:[background:var(--pf-surface-muted)] cursor-pointer border border-transparent has-[:checked]:[border-color:var(--pf-primary-soft)] has-[:checked]:[background:var(--pf-primary-soft)] transition-colors">
                    <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)}
                      className="rounded [color:var(--pf-primary-text)]" />
                    <span className="text-sm font-medium [color:var(--pf-text)]">{m.fullName}</span>
                    <span className="max-lg:col-start-2 text-sm [color:var(--pf-color-muted)] font-mono break-all"><span className="lg:hidden font-sans">Tài khoản: </span>{slugify(m.fullName) || 'user'}</span>
                    <span className="max-lg:col-start-2 text-sm [color:var(--pf-color-muted)] font-mono"><span className="lg:hidden font-sans">Mật khẩu: </span>123456</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[color:var(--pf-border)] flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm [color:var(--pf-color-muted)]">Đã chọn: <strong>{selected.size}</strong> thành viên</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
            <Button onClick={handleCreate} disabled={selected.size === 0 || saving}>
              {saving ? 'Đang tạo...' : `Tạo ${selected.size} tài khoản`}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </Portal>
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

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-[color:var(--pf-border)] text-sm focus:outline-none focus:[border-color:var(--pf-primary)] focus:ring-2 focus:ring-[color:var(--pf-primary-text)]'
  const labelCls = 'block text-sm font-medium [color:var(--pf-text)] mb-1.5'

  const panelRef = useRef<HTMLDivElement>(null)
  useDialogA11y(true, panelRef, onClose)
  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Tạo tài khoản thành viên" tabIndex={-1} className="[background:var(--pf-surface)] rounded-2xl shadow-2xl w-full max-w-md outline-none">
        <div className="px-6 py-5 border-b border-[color:var(--pf-border)]">
          <h2 className="text-base font-bold [color:var(--pf-text)]">Tạo tài khoản thành viên</h2>
        </div>
        <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="f-MemberAccounts-1" className={labelCls}>Chọn thành viên <span className="text-red-500">*</span></label>
            <div className="relative">
              <select id="f-MemberAccounts-1" value={memberId} onChange={e => setMemberId(e.target.value)}
                className={`${inputCls} pr-8 appearance-none`} required>
                {available.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)] pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="ma-username" className={labelCls}>Username</label>
            <input id="ma-username" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Tự động sinh từ tên" className={inputCls} />
            <p className="text-xs [color:var(--pf-color-muted)] mt-1">Để trống sẽ tự động sinh từ tên thành viên</p>
          </div>

          <div>
            <label htmlFor="ma-defpass" className={labelCls}>Mật khẩu mặc định</label>
            <input id="ma-defpass" value="123456" readOnly className={`${inputCls} [background:var(--pf-surface-muted)] [color:var(--pf-color-muted)] font-mono cursor-not-allowed`} />
            <p className="text-xs [color:var(--pf-color-muted)] mt-1">Thành viên phải đổi mật khẩu khi đăng nhập lần đầu</p>
          </div>

          <div className="flex items-center gap-3 py-1">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-4 h-4 rounded [background:var(--pf-primary)] flex items-center justify-center">
                <CheckCircle2 size={10} className="text-white" />
              </div>
              <span className="text-sm [color:var(--pf-color-muted)]">Bắt buộc đổi mật khẩu</span>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-4 h-4 rounded [background:var(--pf-primary)] flex items-center justify-center">
                <CheckCircle2 size={10} className="text-white" />
              </div>
              <span className="text-sm [color:var(--pf-color-muted)]">Bật nhận thông báo</span>
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
    </Portal>
  )
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────
function ConfirmModal({ title, body, onConfirm, onClose, danger = false }: {
  title: string; body: string; onConfirm: () => void; onClose: () => void; danger?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogA11y(true, panelRef, onClose)
  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="[background:var(--pf-surface)] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 outline-none">
        <h3 className="font-bold [color:var(--pf-text)]">{title}</h3>
        <p className="text-sm [color:var(--pf-color-muted)]">{body}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>Xác nhận</Button>
        </div>
      </div>
    </div>
    </Portal>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function MemberAccounts() {
  const { user } = useAuthStore()
  const embedded = useEmbedded() // trong module Thành viên: ẩn h1 trùng
  const { getClubData } = useClubDataStore()
  const isMobile = useIsMobile(1024)
  const clubData = getClubData(user?.clubId ?? '')
  const members = clubData.members.filter(m => m.status === 'active')

  const [accounts, setAccounts] = useState<MemberUserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [accountError, setAccountError] = useState(false)
  const [search, setSearch] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [showSingle, setShowSingle] = useState(false)
  const [confirm, setConfirm] = useState<null | { title: string; body: string; danger?: boolean; onConfirm: () => void }>(null)

  const fetchAccounts = async () => {
    setLoading(true)
    setAccountError(false)
    try {
      const res = await api.get('/member-users')
      setAccounts(res.data.data)
    } catch {
      setAccountError(true)
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
      <div className="pf-account-workspace min-h-full [background:var(--pf-bg)]">
        <div className="[background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-4">
          <PhoneToolbar label="Công cụ tài khoản" tools={[
            {key:'search',label:'Tìm',icon:<Search />,active:!!search,content:<input aria-label="Tìm tài khoản" className="input-base" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm thành viên, username…" />},
            {key:'add',label:'Tạo',icon:<UserPlus />,primary:true,onClick:()=>setShowSingle(true)},
          ]} more={noAccountMembers.length?<ActionMenu iconOnly label="Thao tác tài khoản" items={[{key:'bulk',label:`Tạo hàng loạt (${noAccountMembers.length} thành viên)`,onClick:()=>setShowBulk(true)}]} />:undefined} fallback={null} />
          <div className="flex items-center justify-between mb-3 pf-phone-hide">
            <div>
              {!embedded && <h1 className="text-base font-bold [color:var(--pf-text)]">Tài khoản thành viên</h1>}
              <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">Tài khoản truy cập CLB</p>
            </div>
            <div className="flex items-center gap-1.5">
              <ActionMenu iconOnly label="Thao tác tài khoản" items={noAccountMembers.length ? [{key:'bulk',label:`Tạo hàng loạt (${noAccountMembers.length} thành viên)`,onClick:()=>setShowBulk(true)}] : []} />
              <Button size="sm" onClick={() => setShowSingle(true)} aria-label="Tạo tài khoản">
                <UserPlus size={14} /> Tạo tài khoản
              </Button>
            </div>
          </div>
          <MobileSummary module="members" label="Tài khoản thành viên" tone={loading || accountError ? 'neutral' : countSignal(accounts.length, 'healthy')} value={loading ? '…' : accountError ? '—' : accounts.length} items={accountError ? [] : [
            {label:'Hoạt động',value:loading ? '…' : accounts.filter(a=>getStatus(a)==='active').length,tone:loading ? 'neutral' : 'success'},
            {label:'Chờ kích hoạt / đổi mật khẩu',value:loading ? '…' : accounts.filter(a=>['pending','must_change'].includes(getStatus(a))).length,tone:loading ? 'neutral' : countSignal(accounts.filter(a=>['pending','must_change'].includes(getStatus(a))).length,'pending')},
            {label:'Đã khóa',value:loading ? '…' : accounts.filter(a=>getStatus(a)==='locked').length,tone:loading ? 'neutral' : countSignal(accounts.filter(a=>getStatus(a)==='locked').length,'failure')},
          ]} />
          <div className="relative pf-phone-hide">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm thành viên, username..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-[color:var(--pf-border)] text-sm focus:outline-none focus:[border-color:var(--pf-primary)]" />
          </div>
        </div>

        <div className="pf-mobile-records">
          {loading ? (
            <div className="text-center py-12 [color:var(--pf-color-muted)] text-sm">Đang tải...</div>
          ) : accountError ? <ErrorState onRetry={fetchAccounts} /> : filtered.length === 0 ? (
            <div className="text-center py-12 [color:var(--pf-color-muted)] text-sm">
              {accounts.length === 0 ? 'Chưa có tài khoản nào' : 'Không tìm thấy'}
            </div>
          ) : (
            filtered.map(acc => (
              <article key={acc.id} className="pf-mobile-record flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold [color:var(--pf-text)]">{acc.member?.fullName ?? acc.username}</p>
                  <p className="mt-1 break-all text-xs [color:var(--pf-text-muted)]">@{acc.username}</p>
                  <div className="mt-2"><StatusBadge acc={acc} /></div>
                  <p className="mt-2 text-xs [color:var(--pf-text-muted)]">Đăng nhập cuối: {formatDate(acc.lastLoginAt)}</p>
                </div>
                <ActionMenu iconOnly label={`Thao tác tài khoản ${acc.username}`} items={[
                  {key:'reset',label:'Đặt lại mật khẩu',onClick:()=>handleReset(acc)},
                  {key:'lock',label:acc.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản',onClick:()=>handleToggleLock(acc),danger:acc.isActive},
                ]} />
              </article>
            ))
          )}
        </div>

        {showSingle && (
          <CreateSingleModal members={members} existingMemberIds={existingMemberIds}
            onClose={() => setShowSingle(false)} onCreated={fetchAccounts} />
        )}
        {showBulk && (
          <BulkCreateModal members={members} existingMemberIds={existingMemberIds}
            onClose={() => setShowBulk(false)} onCreated={fetchAccounts} />
        )}
        {confirm && (
          <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />
        )}
      </div>
    )
  }

  // ── Desktop table ─────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-bg)]">
      {/* Header */}
      <div className="[background:var(--pf-surface)] border-b border-[var(--pf-border)] px-6 py-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            {!embedded && <h1 className="text-base font-bold text-[var(--pf-text)]">Tài khoản thành viên</h1>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBulk(true)} disabled={noAccountMembers.length === 0}>
              <Users size={14} /> Tạo hàng loạt
              {noAccountMembers.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary-text)] text-xs">{noAccountMembers.length}</span>
              )}
            </Button>
            <Button onClick={() => setShowSingle(true)} disabled={noAccountMembers.length === 0}>
              <UserPlus size={14} /> Tạo tài khoản
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tổng tài khoản', value: accounts.length, color: '[color:var(--pf-primary-text)]', bg: '[background:var(--pf-primary-soft)]' },
            { label: 'Hoạt động', value: accounts.filter(a => getStatus(a) === 'active').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Chưa kích hoạt', value: accounts.filter(a => ['pending', 'must_change'].includes(getStatus(a))).length, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Bị khóa', value: accounts.filter(a => getStatus(a) === 'locked').length, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className="pf-stat-card flex items-center gap-3 rounded-xl p-3 lg:block lg:p-4">
              <div className={`inline-flex shrink-0 p-2 rounded-lg ${s.bg} lg:mb-2`}>
                <Users size={16} className={s.color} />
              </div>
              <div className="pf-stat-cell min-w-0 flex-1 rounded-lg px-2 py-2.5 text-left lg:text-center">
                <p className="text-[10px] uppercase font-semibold tracking-wide [color:var(--pf-color-muted)] mb-0.5 lg:mb-1">{s.label}</p>
                <p className="text-xl font-bold leading-tight text-[var(--pf-text)] lg:text-lg">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card (search header + table) */}
        <div className="pf-glass-strong rounded-[16px] border-[var(--pf-border)] shadow-[0_8px_24px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[color:var(--pf-border)] flex items-center gap-3">
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)] pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tìm thành viên, username..."
                className="input-base pl-8 h-8 text-xs" />
            </div>
            <span className="text-xs [color:var(--pf-color-muted)] ml-auto">{filtered.length} tài khoản</span>
          </div>
          {loading ? (
            <div className="text-center py-16 [color:var(--pf-color-muted)] text-sm">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Users size={40} className="mx-auto text-slate-200" />
              <p className="[color:var(--pf-color-muted)] text-sm">
                {accounts.length === 0
                  ? 'Chưa có tài khoản nào. Nhấn "Tạo hàng loạt" để bắt đầu.'
                  : 'Không tìm thấy kết quả phù hợp'}
              </p>
            </div>
          ) : (
            <>
            <ul className="pf-record-grid pf-cardlist grid grid-cols-1 min-[600px]:grid-cols-2 gap-3 p-3 lg:hidden">
              {filtered.map(acc => (
                <li key={acc.id} className="pf-rowcard p-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate font-semibold [color:var(--pf-text)]">{acc.member?.fullName ?? '—'}</p>
                      <p className="truncate text-xs [color:var(--pf-color-muted)]">{acc.member?.phone ?? acc.email}</p>
                    </div>
                    <StatusBadge acc={acc} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs [color:var(--pf-color-muted)]">
                    <span className="rounded-md px-2 py-0.5 font-mono [background:var(--pf-color-muted-soft)] [color:var(--pf-text)]">{acc.username}</span>
                    <span className={`font-medium ${acc.mustChangePassword ? 'text-amber-600' : 'text-emerald-600'}`}>MK: {acc.mustChangePassword ? 'chưa đổi' : 'đã đổi'}</span>
                    <span>Đăng nhập: {formatDate(acc.lastLoginAt)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={() => handleReset(acc)}
                      className="inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border text-sm font-semibold [border-color:var(--pf-border)] [color:var(--pf-color-muted)]">
                      <RefreshCw size={14} /> Reset MK
                    </button>
                    <button onClick={() => handleToggleLock(acc)}
                      className={`inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border text-sm font-semibold ${acc.isActive ? 'border-red-200 text-red-600' : 'border-emerald-200 text-emerald-600'}`}>
                      {acc.isActive ? <><Lock size={14} /> Khóa</> : <><Unlock size={14} /> Mở khóa</>}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="pf-rows w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium [color:var(--pf-color-muted)] [background:var(--pf-surface-muted)] border-b border-[color:var(--pf-border)]">
                    <th scope="col" className="px-4 py-3 text-left">Thành viên</th>
                    <th scope="col" className="px-4 py-3 text-left">Username</th>
                    <th scope="col" className="px-4 py-3 text-left">Trạng thái</th>
                    <th scope="col" className="px-4 py-3 text-left">Đăng nhập cuối</th>
                    <th scope="col" className="px-4 py-3 text-left">Mật khẩu</th>
                    <th scope="col" className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--pf-border-soft)]">
                  {filtered.map(acc => (
                    <tr key={acc.id} className="hover:[background:var(--pf-color-muted-soft)] transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium [color:var(--pf-text)]">{acc.member?.fullName ?? '—'}</p>
                          <p className="text-xs [color:var(--pf-color-muted)]">{acc.member?.phone ?? acc.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs [background:var(--pf-color-muted-soft)] px-2 py-1 rounded-md [color:var(--pf-text)]">
                          {acc.username}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge acc={acc} /></td>
                      <td className="px-4 py-3 text-xs [color:var(--pf-color-muted)]">{formatDate(acc.lastLoginAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${acc.mustChangePassword ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {acc.mustChangePassword ? 'Chưa đổi' : 'Đã đổi'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleReset(acc)}
                            title="Reset mật khẩu"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium [color:var(--pf-color-muted)] border border-[color:var(--pf-border)] hover:[background:var(--pf-surface-muted)] transition-colors">
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
            </>
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
