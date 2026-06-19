import { useState, useMemo } from 'react'
import {
  Plus, Search, Filter, Eye, Trash2, Receipt,
  CheckCircle, Clock, Pencil,
  FileText, X, ArrowLeft, Calendar, Users, Wallet, DollarSign,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { AllocationRule, LivingExpense, ExpenseStatus, FundSource, MiniExpenseType } from '../../types'
import { MINI_EXPENSE_TYPE_LABELS } from '../../types'
import { formatVND, formatDate } from '../../lib/utils'
import api from '../../lib/api'
import { useIsMobile } from '../../hooks/useIsMobile'
import { MobileTransactionCard } from '../../components/mobile/MobileTransactionCard'
import toast from 'react-hot-toast'

/* ── Constants ── */
const ruleLabels: Record<AllocationRule, string> = {
  ATTENDANCE:   'Theo số buổi tham gia',
  EQUAL:        'Đều nhau',
  PRESENT_ONLY: 'Theo số người tham gia',
  FUND_ONLY:    'Quỹ chung',
}
const ruleHint: Record<AllocationRule, string> = {
  ATTENDANCE:   'Phân bổ chi phí theo số buổi tham gia thực tế của từng thành viên',
  EQUAL:        'Chia đều cho tất cả thành viên CLB',
  PRESENT_ONLY: 'Chỉ tính cho người có mặt buổi đó',
  FUND_ONLY:    'Chi quỹ chung, không phân bổ cá nhân',
}

const statusCfg: Record<ExpenseStatus, { label: string; variant: 'green' | 'yellow' | 'indigo' | 'red' }> = {
  approved: { label: 'Đã duyệt',      variant: 'green' },
  pending:  { label: 'Chờ duyệt',     variant: 'yellow' },
  paid:     { label: 'Đã thanh toán', variant: 'indigo' },
  rejected: { label: 'Từ chối',       variant: 'red' },
}

const TABS = [
  { key: 'all',      label: 'Tất cả' },
  { key: 'pending',  label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'paid',     label: 'Đã thanh toán' },
  { key: 'rejected', label: 'Từ chối' },
] as const

/* ── RichExpense: UI-only view derived from LivingExpense ── */
interface RichExpense extends LivingExpense {
  code: string
  status: ExpenseStatus   // narrowed from optional
  notes: string
}

function toRich(e: LivingExpense, index: number): RichExpense {
  return {
    ...e,
    code: `EXP-${e.expenseDate.replace(/-/g, '').slice(2)}-${String(index + 1).padStart(3, '0')}`,
    status: e.status ?? 'pending',
    notes: '',
  }
}

/* ── Sub-components ── */

function KpiCard({ icon, iconBg, iconColor, label, value, isCount, unit }: {
  icon: React.ReactNode; iconBg: string; iconColor: string
  label: string; value: number; isCount?: boolean; unit?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`h-9 w-9 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>{icon}</div>
      </div>
      <p className="text-xl font-bold text-slate-900 leading-tight">
        {isCount ? `${value.toLocaleString('vi-VN')} ${unit}` : formatVND(value)}
      </p>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1">{label}</p>
    </div>
  )
}

const emptyForm = {
  fundSource: 'COMMON' as FundSource,
  description: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10),
  allocationRule: 'ATTENDANCE' as AllocationRule, notes: '',
  miniExpenseType: 'GAME_REWARD' as MiniExpenseType,
  receiverName: '',
}

function AddDrawer({ open, onClose, onSave, editExpense }: {
  open: boolean; onClose: () => void; onSave: (form: typeof emptyForm) => void
  editExpense?: LivingExpense | null
}) {
  const isEdit = !!editExpense
  const [form, setForm] = useState(emptyForm)
  // Sync form when editExpense changes
  if (open && isEdit && form.description !== (editExpense?.description ?? '') && form.description === emptyForm.description) {
    setForm({
      fundSource: editExpense!.fundSource ?? 'COMMON',
      description: editExpense!.description,
      amount: String(editExpense!.amount),
      expenseDate: editExpense!.expenseDate,
      allocationRule: (editExpense as any).allocationRule ?? 'ATTENDANCE',
      notes: (editExpense as any).notes ?? '',
      miniExpenseType: (editExpense as any).miniExpenseType ?? 'GAME_REWARD',
      receiverName: (editExpense as any).receiverName ?? '',
    })
  }
  if (!open) return null
  const isMini = form.fundSource === 'MINI'
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-md bg-white flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{isEdit ? 'Sửa khoản chi' : 'Thêm khoản chi mới'}</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); setForm(emptyForm) }} className="flex-1 flex flex-col overflow-hidden" key={editExpense?.id ?? 'new'}>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Fund source selector */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Chi từ nguồn quỹ</p>
              <div className="grid grid-cols-2 gap-2">
                {(['COMMON', 'MINI'] as FundSource[]).map(fs => (
                  <button key={fs} type="button"
                    onClick={() => setForm(f => ({ ...f, fundSource: fs }))}
                    className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2 ${
                      form.fundSource === fs
                        ? fs === 'COMMON'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}>
                    {fs === 'COMMON' ? <DollarSign size={14} /> : <Wallet size={14} />}
                    {fs === 'COMMON' ? 'Quỹ Chung' : 'Quỹ Mini'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <FileText size={11} />Thông tin khoản chi
              </p>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Nội dung chi <span className="text-red-500">*</span></label>
                  <input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder={isMini ? 'VD: Thưởng đội vô địch, Chi liên hoan...' : 'VD: Tiền sân buổi sáng T7, Nước uống...'}
                    className="input-base" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Số Tiền (VND) <span className="text-red-500">*</span></label>
                    <input required type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                      placeholder="Nhập số tiền" className="input-base" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày chi <span className="text-red-500">*</span></label>
                    <input required type="date" value={form.expenseDate} onChange={e => setForm({ ...form, expenseDate: e.target.value })} className="input-base" />
                  </div>
                </div>
              </div>
            </div>

            {isMini ? (
              <div className="space-y-3.5">
                <div>
                  <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Wallet size={11} />Chi tiết Quỹ Mini
                  </p>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Loại chi <span className="text-red-500">*</span></label>
                  <select required value={form.miniExpenseType}
                    onChange={e => setForm({ ...form, miniExpenseType: e.target.value as MiniExpenseType })} className="input-base">
                    {(Object.entries(MINI_EXPENSE_TYPE_LABELS) as [MiniExpenseType, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Người nhận (nếu có)</label>
                  <input value={form.receiverName} onChange={e => setForm({ ...form, receiverName: e.target.value })}
                    placeholder="Tên người/đội nhận tiền" className="input-base" />
                </div>
                <div className="bg-violet-50 rounded-lg px-3 py-2 text-xs text-violet-700">
                  Khoản chi này không phân bổ cho thành viên và không ảnh hưởng đến công nợ cá nhân.
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Users size={11} />Quy tắc phân bổ <span className="text-red-500 font-normal normal-case tracking-normal">*</span>
                </p>
                <select value={form.allocationRule}
                  onChange={e => setForm({ ...form, allocationRule: e.target.value as AllocationRule })} className="input-base">
                  {(Object.entries(ruleLabels) as [AllocationRule, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5">{ruleHint[form.allocationRule]}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Ghi chú <span className="text-slate-400 font-normal">(nếu có)</span></label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                maxLength={200} rows={3} className="input-base resize-none"
                placeholder="Nhập ghi chú (nếu có)" />
              <p className="text-right text-[10px] text-slate-400 mt-1">{form.notes.length}/200</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <Button type="button" variant="outline" onClick={() => { setForm(emptyForm); onClose() }} className="flex-1">Hủy bỏ</Button>
            <Button type="submit" className="flex-1"><CheckCircle size={14} />{isEdit ? 'Lưu thay đổi' : 'Thêm khoản chi'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface FilterValues { status: string; rule: string; from: string; to: string }

function FilterPanel({ open, onClose, values, onApply }: {
  open: boolean; onClose: () => void; values: FilterValues
  onApply: (v: FilterValues) => void
}) {
  const [status, setStatus] = useState(values.status)
  const [rule, setRule]     = useState(values.rule)
  const [from, setFrom]     = useState(values.from)
  const [to, setTo]         = useState(values.to)

  if (!open) return null
  const handleApply = () => {
    onApply({ status, rule, from, to })
    toast.success('Đã áp dụng bộ lọc')
    onClose()
  }
  const handleClear = () => {
    setStatus('all'); setRule('all'); setFrom(''); setTo('')
    onApply({ status: 'all', rule: 'all', from: '', to: '' })
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-80 bg-white flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Bộ lọc</h2>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Trạng thái</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input-base">
              <option value="all">Tất cả</option>
              <option value="approved">Đã duyệt</option>
              <option value="pending">Chờ duyệt</option>
              <option value="paid">Đã thanh toán</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Quy tắc phân bổ</label>
            <select value={rule} onChange={e => setRule(e.target.value)} className="input-base">
              <option value="all">Tất cả</option>
              {(Object.entries(ruleLabels) as [AllocationRule, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Khoảng thời gian</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-base text-xs" />
              <input type="date" value={to}   onChange={e => setTo(e.target.value)}   className="input-base text-xs" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100">
          <Button variant="outline" className="flex-1" onClick={handleClear}>Xóa bộ lọc</Button>
          <Button className="flex-1" onClick={handleApply}>Áp dụng</Button>
        </div>
      </div>
    </div>
  )
}

function DetailView({ exp, onClose, onDelete, onApprove, onEdit }: {
  exp: RichExpense; onClose: () => void; onDelete: () => void; onApprove: () => void; onEdit: () => void
}) {
  const cfg = statusCfg[exp.status]
  const isMini = (exp.fundSource ?? 'COMMON') === 'MINI'
  const miniType = (exp as any).miniExpenseType as MiniExpenseType | undefined
  const receiverName = (exp as any).receiverName as string | undefined

  type FieldRow = { label: string; value: React.ReactNode; span?: boolean }
  const fields: FieldRow[] = [
    { label: 'Mã chi',     value: <span className="font-mono text-xs text-indigo-600">{exp.code}</span> },
    { label: 'Nguồn quỹ', value: isMini
      ? <Badge variant="indigo"><Wallet size={11} className="inline mr-1" />Quỹ Mini</Badge>
      : <Badge variant="gray"><DollarSign size={11} className="inline mr-1" />Quỹ Chung</Badge> },
    { label: 'Nội dung',   value: <span className="font-medium">{exp.description}</span>, span: true },
    { label: 'Số tiền',    value: <span className="text-lg font-bold text-slate-900">{formatVND(exp.amount)}</span> },
    { label: 'Ngày chi',   value: exp.expenseDate },
    ...(isMini
      ? [
          { label: 'Loại chi',    value: miniType ? MINI_EXPENSE_TYPE_LABELS[miniType] : '—' },
          { label: 'Người nhận', value: receiverName || '—' },
        ]
      : [
          { label: 'Quy tắc phân bổ', value: ruleLabels[exp.allocationRule] },
        ]
    ),
    { label: 'Trạng thái', value: <Badge variant={cfg.variant} dot>{cfg.label}</Badge> },
    { label: 'Ngày tạo',   value: exp.createdAt.slice(0, 10) },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-lg bg-white flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <button onClick={onClose} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft size={15} />Chi tiết khoản chi
          </button>
          <div className="flex gap-2">
            {exp.status === 'pending' && (
              <Button size="sm" onClick={onApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle size={13} />Duyệt chi</Button>
            )}
            <Button size="sm" variant="outline" onClick={onEdit}><Pencil size={13} />Sửa</Button>
            <Button size="sm" onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white"><Trash2 size={13} />Xóa</Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-4">
            {fields.map((f, i) => (
              <div key={i} className={f.span ? 'col-span-2' : ''}>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{f.label}</p>
                <div className="text-xs text-slate-700">{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ── */
export function Expenses() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
  const { getClubData, setExpenses } = useClubDataStore()
  const clubData = getClubData(clubId)
  const activePeriod = clubData.fundPeriods.find(p => p.status === 'active')

  // Derive display view from store — no local copy
  const richExpenses = useMemo<RichExpense[]>(
    () => clubData.expenses.map((e, i) => toRich(e, i)),
    [clubData.expenses]
  )

  const save = (next: LivingExpense[]) => setExpenses(clubId, next)

  const [tab, setTab] = useState<'all' | ExpenseStatus>('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<LivingExpense | null>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [filterValues, setFilterValues] = useState<FilterValues>({ status: 'all', rule: 'all', from: '', to: '' })
  const [detailExp, setDetailExp] = useState<RichExpense | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const filtered = useMemo(() => richExpenses.filter(e => {
    const matchTab = tab === 'all' || e.status === tab
    const q = search.toLowerCase()
    const matchQ = !q || e.description.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)
    const matchStatus = filterValues.status === 'all' || e.status === filterValues.status
    const matchRule = filterValues.rule === 'all' || e.allocationRule === filterValues.rule
    const matchFrom = !filterValues.from || e.expenseDate >= filterValues.from
    const matchTo   = !filterValues.to   || e.expenseDate <= filterValues.to
    return matchTab && matchQ && matchStatus && matchRule && matchFrom && matchTo
  }), [richExpenses, tab, search, filterValues])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const commonExpenses = richExpenses.filter(e => (e.fundSource ?? 'COMMON') === 'COMMON')
  const miniExpenses   = richExpenses.filter(e => e.fundSource === 'MINI')
  const commonAmt   = commonExpenses.reduce((s, e) => s + e.amount, 0)
  const miniAmt     = miniExpenses.reduce((s, e) => s + e.amount, 0)
  const approvedAmt = richExpenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0)
  const pendingAmt  = richExpenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0)
  const pendingCount = richExpenses.filter(e => e.status === 'pending').length

  const handleAdd = async (form: typeof emptyForm) => {
    const isMini = form.fundSource === 'MINI'
    const payload = {
      fundSource: form.fundSource,
      fundPeriodId: isMini ? undefined : (activePeriod?.id ?? ''),
      description: form.description,
      amount: Number(form.amount),
      expenseDate: form.expenseDate,
      allocationRule: isMini ? 'FUND_ONLY' : form.allocationRule,
      allocationEnabled: !isMini,
      miniExpenseType: isMini ? form.miniExpenseType : undefined,
      receiverName: isMini && form.receiverName ? form.receiverName : undefined,
    }
    try {
      const res = await api.post('/expenses', payload)
      const newE: LivingExpense = { ...res.data?.data, amount: Number(res.data?.data?.amount ?? payload.amount), fundSource: form.fundSource, createdAt: new Date().toISOString(), createdBy: user?.username ?? 'Admin' }
      save([newE, ...clubData.expenses])
      setShowAdd(false)
      toast.success(isMini ? 'Đã thêm khoản chi Quỹ Mini!' : 'Đã thêm khoản chi Quỹ Chung!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Thêm khoản chi thất bại')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/expenses/${id}`)
      save(clubData.expenses.filter(e => e.id !== id))
      setDetailExp(null)
      setConfirmId(null)
      toast.success('Đã xóa khoản chi')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xóa khoản chi thất bại')
    }
  }

  const handleEdit = async (form: typeof emptyForm) => {
    if (!editTarget) return
    const payload = {
      description: form.description,
      amount: Number(form.amount),
      expenseDate: form.expenseDate,
      allocationRule: form.fundSource === 'MINI' ? 'FUND_ONLY' : form.allocationRule,
      notes: form.notes,
      miniExpenseType: form.fundSource === 'MINI' ? form.miniExpenseType : undefined,
      receiverName: form.fundSource === 'MINI' && form.receiverName ? form.receiverName : undefined,
    }
    try {
      await api.put(`/expenses/${editTarget.id}`, payload)
      save(clubData.expenses.map(e => e.id === editTarget.id ? { ...e, ...payload } : e))
      setEditTarget(null)
      toast.success('Đã cập nhật khoản chi!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật khoản chi thất bại')
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/expenses/${id}/status`, { status: 'approved' })
      save(clubData.expenses.map(e => e.id === id ? { ...e, status: 'approved' as ExpenseStatus } : e))
      setDetailExp(null)
      toast.success('Đã duyệt khoản chi!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Duyệt khoản chi thất bại')
    }
  }

  const isMobile = useIsMobile()

  /* ── Mobile layout ── */
  if (isMobile) {
    const sorted = [...clubData.expenses].sort((a, b) => (b.expenseDate ?? b.id).localeCompare(a.expenseDate ?? a.id))
    const commonTotal = clubData.expenses.filter(e => (e.fundSource ?? 'COMMON') === 'COMMON').reduce((s, e) => s + e.amount, 0)
    const miniTotal = clubData.expenses.filter(e => e.fundSource === 'MINI').reduce((s, e) => s + e.amount, 0)
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-[700] text-slate-900">Chi Phí</h2>
            <p className="text-[12px] text-slate-400">Quản lý khoản chi của CLB</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}>
            <Plus size={18} />
          </button>
        </div>
        <div className="px-4 pt-3 pb-1 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-[16px] border border-slate-100 px-4 py-3 shadow-sm">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Quỹ Chung</p>
            <p className="text-[18px] font-[700] text-indigo-600 tabular-nums">{formatVND(commonTotal)}</p>
          </div>
          <div className="bg-white rounded-[16px] border border-slate-100 px-4 py-3 shadow-sm">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Quỹ Mini</p>
            <p className="text-[18px] font-[700] text-cyan-600 tabular-nums">{formatVND(miniTotal)}</p>
          </div>
        </div>
        <div className="px-4 pt-3 pb-6 space-y-2">
          {sorted.length === 0 ? (
            <div className="text-center py-14 text-slate-400 text-sm">
              <Receipt size={36} className="mx-auto text-slate-200 mb-3" />
              Chưa có khoản chi nào
            </div>
          ) : sorted.map(e => (
            <div key={e.id} className="relative">
              <MobileTransactionCard
                name={e.description}
                description={e.expenseDate ?? ''}
                amount={e.amount}
                type="expense"
                fundSource={e.fundSource ?? 'COMMON'}
                status={e.status === 'approved' ? 'Đã duyệt' : e.status === 'pending' ? 'Chờ duyệt' : undefined}
              />
              <div className="absolute right-2 top-2 flex gap-0.5">
                <button onClick={() => setEditTarget(e)}
                  className="text-slate-300 active:text-indigo-500 p-1.5">
                  <Pencil size={13} />
                </button>
                <button onClick={() => setConfirmId(e.id)}
                  className="text-slate-300 active:text-red-500 p-1.5">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <ConfirmDialog open={!!confirmId} title="Xóa khoản chi?" message="Hành động này không thể hoàn tác." onConfirm={() => { if (confirmId) handleDelete(confirmId) }} onCancel={() => setConfirmId(null)} />
        <AddDrawer open={!!editTarget} onClose={() => setEditTarget(null)} onSave={handleEdit} editExpense={editTarget} />
        <AddDrawer open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAdd} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900">Chi Phí</h1>
            <p className="text-xs text-slate-500 mt-0.5">Quản lý và theo dõi các khoản chi của CLB</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <Calendar size={13} className="text-slate-400" />
              <span>
                {activePeriod
                  ? `${formatDate(activePeriod.startDate)} – ${formatDate(activePeriod.endDate)}`
                  : 'Chưa có kỳ quỹ'}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilter(true)}><Filter size={13} />Bộ lọc</Button>
            <Button onClick={() => setShowAdd(true)}><Plus size={14} />Thêm khoản chi</Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto space-y-5">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <KpiCard icon={<DollarSign size={18} />}  iconBg="bg-indigo-50"  iconColor="text-indigo-600"  label="Chi Quỹ Chung"  value={commonAmt} />
          <KpiCard icon={<Wallet size={18} />}      iconBg="bg-violet-50"  iconColor="text-violet-600"  label="Chi Quỹ Mini"   value={miniAmt} />
          <KpiCard icon={<CheckCircle size={18} />} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Chi đã duyệt"   value={approvedAmt} />
          <KpiCard icon={<Clock size={18} />}       iconBg="bg-amber-50"   iconColor="text-amber-600"   label="Chờ duyệt"      value={pendingAmt} />
          <KpiCard icon={<FileText size={18} />}    iconBg="bg-orange-50"  iconColor="text-orange-500"  label="Số khoản chi"   value={richExpenses.length} isCount unit="khoản" />
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)]">
          {/* Tabs + Search */}
          <div className="flex items-center justify-between px-5 pt-4 pb-0 border-b border-slate-100 flex-wrap gap-3">
            <div className="flex items-center gap-0.5 -mb-px">
              {TABS.map(t => (
                <button key={t.key} onClick={() => { setTab(t.key as 'all' | ExpenseStatus); setPage(1) }}
                  className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    tab === t.key
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}>
                  {t.label}
                  {t.key === 'pending' && pendingCount > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold px-1">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative pb-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Tìm kiếm khoản chi..." className="input-base pl-8 w-56 h-8 text-xs" />
            </div>
          </div>

          {/* Table */}
          {paginated.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">Không có khoản chi nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Mã chi</th>
                    <th>Nội dung</th>
                    <th className="text-center">Nguồn quỹ</th>
                    <th className="text-center">Ngày chi</th>
                    <th className="text-right">Số Tiền (VND)</th>
                    <th>Phân bổ</th>
                    <th className="text-center">Trạng thái</th>
                    <th className="text-center w-24">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(exp => {
                    const cfg = statusCfg[exp.status]
                    const isMini = (exp.fundSource ?? 'COMMON') === 'MINI'
                    return (
                      <tr key={exp.id}>
                        <td className="font-mono text-xs text-indigo-600">{exp.code}</td>
                        <td className="font-medium text-slate-900 max-w-[200px] truncate">{exp.description}</td>
                        <td className="text-center">
                          {isMini
                            ? <Badge variant="indigo">Quỹ Mini</Badge>
                            : <Badge variant="gray">Quỹ Chung</Badge>}
                        </td>
                        <td className="text-center text-slate-500 text-xs">{exp.expenseDate}</td>
                        <td className="text-right font-semibold text-slate-900">{formatVND(exp.amount)}</td>
                        <td className="text-slate-600 text-xs">{isMini
                          ? (exp.miniExpenseType ? MINI_EXPENSE_TYPE_LABELS[exp.miniExpenseType] : 'Quỹ Mini')
                          : ruleLabels[exp.allocationRule]}</td>
                        <td className="text-center">
                          <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            {exp.status === 'pending' && (
                              <button onClick={() => handleApprove(exp.id)} title="Duyệt chi"
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                                <CheckCircle size={13} />
                              </button>
                            )}
                            <button onClick={() => setDetailExp(exp)} title="Xem"
                              className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                              <Eye size={13} />
                            </button>
                            <button onClick={() => setConfirmId(exp.id)} title="Xóa"
                              className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-50">
            <span className="text-xs text-slate-500">
              {filtered.length === 0
                ? 'Không có kết quả'
                : `Hiển thị ${Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)} đến ${Math.min(page * PAGE_SIZE, filtered.length)} của ${filtered.length} khoản chi`}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="h-7 px-2.5 rounded-lg border border-slate-200 text-xs hover:bg-slate-50 disabled:opacity-40">‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium ${page === p ? 'bg-indigo-600 text-white' : 'border border-slate-200 hover:bg-slate-50'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="h-7 px-2.5 rounded-lg border border-slate-200 text-xs hover:bg-slate-50 disabled:opacity-40">›</button>
            </div>
          </div>
        </div>
      </div>

      {/* Drawers & modals */}
      <AddDrawer open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAdd} />
      <FilterPanel open={showFilter} onClose={() => setShowFilter(false)} values={filterValues} onApply={setFilterValues} />
      {detailExp && (
        <DetailView
          exp={detailExp}
          onClose={() => setDetailExp(null)}
          onDelete={() => setConfirmId(detailExp.id)}
          onApprove={() => handleApprove(detailExp.id)}
          onEdit={() => { setEditTarget(detailExp); setDetailExp(null) }}
        />
      )}
      <ConfirmDialog
        open={confirmId !== null}
        title="Bạn có chắc chắn muốn xóa?"
        message="Khoản chi này sẽ bị xóa vĩnh viễn và không thể khôi phục lại."
        confirmLabel="Xóa"
        onConfirm={() => confirmId && handleDelete(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
