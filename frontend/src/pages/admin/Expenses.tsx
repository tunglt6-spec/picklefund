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

/* â”€â”€ Constants â”€â”€ */
const ruleLabels: Record<AllocationRule, string> = {
  ATTENDANCE:   'Theo sá»‘ buá»•i tham gia',
  EQUAL:        'Äá»u nhau',
  PRESENT_ONLY: 'Theo sá»‘ ngÆ°á»i tham gia',
  FUND_ONLY:    'Quá»¹ chung',
}
const ruleHint: Record<AllocationRule, string> = {
  ATTENDANCE:   'PhÃ¢n bá»• chi phÃ­ theo sá»‘ buá»•i tham gia thá»±c táº¿ cá»§a tá»«ng thÃ nh viÃªn',
  EQUAL:        'Chia Ä‘á»u cho táº¥t cáº£ thÃ nh viÃªn CLB',
  PRESENT_ONLY: 'Chá»‰ tÃ­nh cho ngÆ°á»i cÃ³ máº·t buá»•i Ä‘Ã³',
  FUND_ONLY:    'Chi quá»¹ chung, khÃ´ng phÃ¢n bá»• cÃ¡ nhÃ¢n',
}

const statusCfg: Record<ExpenseStatus, { label: string; variant: 'green' | 'yellow' | 'indigo' | 'red' }> = {
  approved: { label: 'ÄÃ£ duyá»‡t',      variant: 'green' },
  pending:  { label: 'Chá» duyá»‡t',     variant: 'yellow' },
  paid:     { label: 'ÄÃ£ thanh toÃ¡n', variant: 'indigo' },
  rejected: { label: 'Tá»« chá»‘i',       variant: 'red' },
}

const TABS = [
  { key: 'all',      label: 'Táº¥t cáº£' },
  { key: 'pending',  label: 'Chá» duyá»‡t' },
  { key: 'approved', label: 'ÄÃ£ duyá»‡t' },
  { key: 'paid',     label: 'ÄÃ£ thanh toÃ¡n' },
  { key: 'rejected', label: 'Tá»« chá»‘i' },
] as const

/* â”€â”€ RichExpense: UI-only view derived from LivingExpense â”€â”€ */
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

/* â”€â”€ Sub-components â”€â”€ */

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
          <h2 className="text-base font-semibold text-slate-900">{isEdit ? 'Sá»­a khoáº£n chi' : 'ThÃªm khoáº£n chi má»›i'}</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); setForm(emptyForm) }} className="flex-1 flex flex-col overflow-hidden" key={editExpense?.id ?? 'new'}>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Fund source selector */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Chi tá»« nguá»“n quá»¹</p>
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
                    {fs === 'COMMON' ? 'Quá»¹ Chung' : 'Quá»¹ Mini'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <FileText size={11} />ThÃ´ng tin khoáº£n chi
              </p>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Ná»™i dung chi <span className="text-red-500">*</span></label>
                  <input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder={isMini ? 'VD: ThÆ°á»Ÿng Ä‘á»™i vÃ´ Ä‘á»‹ch, Chi liÃªn hoan...' : 'VD: Tiá»n sÃ¢n buá»•i sÃ¡ng T7, NÆ°á»›c uá»‘ng...'}
                    className="input-base" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Sá»‘ Tiá»n (VND) <span className="text-red-500">*</span></label>
                    <input required type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                      placeholder="Nháº­p sá»‘ tiá»n" className="input-base" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">NgÃ y chi <span className="text-red-500">*</span></label>
                    <input required type="date" value={form.expenseDate} onChange={e => setForm({ ...form, expenseDate: e.target.value })} className="input-base" />
                  </div>
                </div>
              </div>
            </div>

            {isMini ? (
              <div className="space-y-3.5">
                <div>
                  <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Wallet size={11} />Chi tiáº¿t Quá»¹ Mini
                  </p>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Loáº¡i chi <span className="text-red-500">*</span></label>
                  <select required value={form.miniExpenseType}
                    onChange={e => setForm({ ...form, miniExpenseType: e.target.value as MiniExpenseType })} className="input-base">
                    {(Object.entries(MINI_EXPENSE_TYPE_LABELS) as [MiniExpenseType, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">NgÆ°á»i nháº­n (náº¿u cÃ³)</label>
                  <input value={form.receiverName} onChange={e => setForm({ ...form, receiverName: e.target.value })}
                    placeholder="TÃªn ngÆ°á»i/Ä‘á»™i nháº­n tiá»n" className="input-base" />
                </div>
                <div className="bg-violet-50 rounded-lg px-3 py-2 text-xs text-violet-700">
                  Khoáº£n chi nÃ y khÃ´ng phÃ¢n bá»• cho thÃ nh viÃªn vÃ  khÃ´ng áº£nh hÆ°á»Ÿng Ä‘áº¿n cÃ´ng ná»£ cÃ¡ nhÃ¢n.
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Users size={11} />Quy táº¯c phÃ¢n bá»• <span className="text-red-500 font-normal normal-case tracking-normal">*</span>
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
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Ghi chÃº <span className="text-slate-400 font-normal">(náº¿u cÃ³)</span></label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                maxLength={200} rows={3} className="input-base resize-none"
                placeholder="Nháº­p ghi chÃº (náº¿u cÃ³)" />
              <p className="text-right text-[10px] text-slate-400 mt-1">{form.notes.length}/200</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <Button type="button" variant="outline" onClick={() => { setForm(emptyForm); onClose() }} className="flex-1">Há»§y bá»</Button>
            <Button type="submit" className="flex-1"><CheckCircle size={14} />{isEdit ? 'LÆ°u thay Ä‘á»•i' : 'ThÃªm khoáº£n chi'}</Button>
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
    toast.success('ÄÃ£ Ã¡p dá»¥ng bá»™ lá»c')
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
          <h2 className="text-sm font-semibold text-slate-900">Bá»™ lá»c</h2>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tráº¡ng thÃ¡i</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input-base">
              <option value="all">Táº¥t cáº£</option>
              <option value="approved">ÄÃ£ duyá»‡t</option>
              <option value="pending">Chá» duyá»‡t</option>
              <option value="paid">ÄÃ£ thanh toÃ¡n</option>
              <option value="rejected">Tá»« chá»‘i</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Quy táº¯c phÃ¢n bá»•</label>
            <select value={rule} onChange={e => setRule(e.target.value)} className="input-base">
              <option value="all">Táº¥t cáº£</option>
              {(Object.entries(ruleLabels) as [AllocationRule, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Khoáº£ng thá»i gian</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-base text-xs" />
              <input type="date" value={to}   onChange={e => setTo(e.target.value)}   className="input-base text-xs" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100">
          <Button variant="outline" className="flex-1" onClick={handleClear}>XÃ³a bá»™ lá»c</Button>
          <Button className="flex-1" onClick={handleApply}>Ãp dá»¥ng</Button>
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
    { label: 'MÃ£ chi',     value: <span className="font-mono text-xs text-indigo-600">{exp.code}</span> },
    { label: 'Nguá»“n quá»¹', value: isMini
      ? <Badge variant="indigo"><Wallet size={11} className="inline mr-1" />Quá»¹ Mini</Badge>
      : <Badge variant="gray"><DollarSign size={11} className="inline mr-1" />Quá»¹ Chung</Badge> },
    { label: 'Ná»™i dung',   value: <span className="font-medium">{exp.description}</span>, span: true },
    { label: 'Sá»‘ tiá»n',    value: <span className="text-lg font-bold text-slate-900">{formatVND(exp.amount)}</span> },
    { label: 'NgÃ y chi',   value: exp.expenseDate },
    ...(isMini
      ? [
          { label: 'Loáº¡i chi',    value: miniType ? MINI_EXPENSE_TYPE_LABELS[miniType] : 'â€”' },
          { label: 'NgÆ°á»i nháº­n', value: receiverName || 'â€”' },
        ]
      : [
          { label: 'Quy táº¯c phÃ¢n bá»•', value: ruleLabels[exp.allocationRule] },
        ]
    ),
    { label: 'Tráº¡ng thÃ¡i', value: <Badge variant={cfg.variant} dot>{cfg.label}</Badge> },
    { label: 'NgÃ y táº¡o',   value: exp.createdAt.slice(0, 10) },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-lg bg-white flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <button onClick={onClose} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft size={15} />Chi tiáº¿t khoáº£n chi
          </button>
          <div className="flex gap-2">
            {exp.status === 'pending' && (
              <Button size="sm" onClick={onApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle size={13} />Duyá»‡t chi</Button>
            )}
            <Button size="sm" variant="outline" onClick={onEdit}><Pencil size={13} />Sá»­a</Button>
            <Button size="sm" onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white"><Trash2 size={13} />XÃ³a</Button>
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

/* â”€â”€ Main page â”€â”€ */
export function Expenses() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getClubData, setExpenses } = useClubDataStore()
  const clubData = getClubData(clubId)
  const activePeriod = clubData.fundPeriods.find(p => p.status === 'active')

  // Derive display view from store â€” no local copy
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
      toast.success(isMini ? 'ÄÃ£ thÃªm khoáº£n chi Quá»¹ Mini!' : 'ÄÃ£ thÃªm khoáº£n chi Quá»¹ Chung!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'ThÃªm khoáº£n chi tháº¥t báº¡i')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/expenses/${id}`)
      save(clubData.expenses.filter(e => e.id !== id))
      setDetailExp(null)
      setConfirmId(null)
      toast.success('ÄÃ£ xÃ³a khoáº£n chi')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'XÃ³a khoáº£n chi tháº¥t báº¡i')
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
      toast.success('ÄÃ£ cáº­p nháº­t khoáº£n chi!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cáº­p nháº­t khoáº£n chi tháº¥t báº¡i')
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/expenses/${id}/status`, { status: 'approved' })
      save(clubData.expenses.map(e => e.id === id ? { ...e, status: 'approved' as ExpenseStatus } : e))
      setDetailExp(null)
      toast.success('ÄÃ£ duyá»‡t khoáº£n chi!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Duyá»‡t khoáº£n chi tháº¥t báº¡i')
    }
  }

  const isMobile = useIsMobile()

  /* â”€â”€ Mobile layout â”€â”€ */
  if (isMobile) {
    const sorted = [...clubData.expenses].sort((a, b) => (b.expenseDate ?? b.id).localeCompare(a.expenseDate ?? a.id))
    const commonTotal = clubData.expenses.filter(e => (e.fundSource ?? 'COMMON') === 'COMMON').reduce((s, e) => s + e.amount, 0)
    const miniTotal = clubData.expenses.filter(e => e.fundSource === 'MINI').reduce((s, e) => s + e.amount, 0)
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-[700] text-slate-900">Chi PhÃ­</h2>
            <p className="text-[12px] text-slate-400">Quáº£n lÃ½ khoáº£n chi cá»§a CLB</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}>
            <Plus size={18} />
          </button>
        </div>
        <div className="px-4 pt-3 pb-1 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-[16px] border border-slate-100 px-4 py-3 shadow-sm">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Quá»¹ Chung</p>
            <p className="text-[18px] font-[700] text-indigo-600 tabular-nums">{formatVND(commonTotal)}</p>
          </div>
          <div className="bg-white rounded-[16px] border border-slate-100 px-4 py-3 shadow-sm">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Quá»¹ Mini</p>
            <p className="text-[18px] font-[700] text-cyan-600 tabular-nums">{formatVND(miniTotal)}</p>
          </div>
        </div>
        <div className="px-4 pt-3 pb-6 space-y-2">
          {sorted.length === 0 ? (
            <div className="text-center py-14 text-slate-400 text-sm">
              <Receipt size={36} className="mx-auto text-slate-200 mb-3" />
              ChÆ°a cÃ³ khoáº£n chi nÃ o
            </div>
          ) : sorted.map(e => (
            <div key={e.id} className="relative">
              <MobileTransactionCard
                name={e.description}
                description={e.expenseDate ?? ''}
                amount={e.amount}
                type="expense"
                fundSource={e.fundSource ?? 'COMMON'}
                status={e.status === 'approved' ? 'ÄÃ£ duyá»‡t' : e.status === 'pending' ? 'Chá» duyá»‡t' : undefined}
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
        <ConfirmDialog open={!!confirmId} title="XÃ³a khoáº£n chi?" message="HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c." onConfirm={() => { if (confirmId) handleDelete(confirmId) }} onCancel={() => setConfirmId(null)} />
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
            <h1 className="text-base font-bold text-slate-900">Chi PhÃ­</h1>
            <p className="text-xs text-slate-500 mt-0.5">Quáº£n lÃ½ vÃ  theo dÃµi cÃ¡c khoáº£n chi cá»§a CLB</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <Calendar size={13} className="text-slate-400" />
              <span>
                {activePeriod
                  ? `${formatDate(activePeriod.startDate)} â€“ ${formatDate(activePeriod.endDate)}`
                  : 'ChÆ°a cÃ³ ká»³ quá»¹'}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilter(true)}><Filter size={13} />Bá»™ lá»c</Button>
            <Button onClick={() => setShowAdd(true)}><Plus size={14} />ThÃªm khoáº£n chi</Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto space-y-5">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <KpiCard icon={<DollarSign size={18} />}  iconBg="bg-indigo-50"  iconColor="text-indigo-600"  label="Chi Quá»¹ Chung"  value={commonAmt} />
          <KpiCard icon={<Wallet size={18} />}      iconBg="bg-violet-50"  iconColor="text-violet-600"  label="Chi Quá»¹ Mini"   value={miniAmt} />
          <KpiCard icon={<CheckCircle size={18} />} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Chi Ä‘Ã£ duyá»‡t"   value={approvedAmt} />
          <KpiCard icon={<Clock size={18} />}       iconBg="bg-amber-50"   iconColor="text-amber-600"   label="Chá» duyá»‡t"      value={pendingAmt} />
          <KpiCard icon={<FileText size={18} />}    iconBg="bg-orange-50"  iconColor="text-orange-500"  label="Sá»‘ khoáº£n chi"   value={richExpenses.length} isCount unit="khoáº£n" />
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
                placeholder="TÃ¬m kiáº¿m khoáº£n chi..." className="input-base pl-8 w-56 h-8 text-xs" />
            </div>
          </div>

          {/* Table */}
          {paginated.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">KhÃ´ng cÃ³ khoáº£n chi nÃ o</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>MÃ£ chi</th>
                    <th>Ná»™i dung</th>
                    <th className="text-center">Nguá»“n quá»¹</th>
                    <th className="text-center">NgÃ y chi</th>
                    <th className="text-right">Sá»‘ Tiá»n (VND)</th>
                    <th>PhÃ¢n bá»•</th>
                    <th className="text-center">Tráº¡ng thÃ¡i</th>
                    <th className="text-center w-24">HÃ nh Ä‘á»™ng</th>
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
                            ? <Badge variant="indigo">Quá»¹ Mini</Badge>
                            : <Badge variant="gray">Quá»¹ Chung</Badge>}
                        </td>
                        <td className="text-center text-slate-500 text-xs">{exp.expenseDate}</td>
                        <td className="text-right font-semibold text-slate-900">{formatVND(exp.amount)}</td>
                        <td className="text-slate-600 text-xs">{isMini
                          ? (exp.miniExpenseType ? MINI_EXPENSE_TYPE_LABELS[exp.miniExpenseType] : 'Quá»¹ Mini')
                          : ruleLabels[exp.allocationRule]}</td>
                        <td className="text-center">
                          <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            {exp.status === 'pending' && (
                              <button onClick={() => handleApprove(exp.id)} title="Duyá»‡t chi"
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                                <CheckCircle size={13} />
                              </button>
                            )}
                            <button onClick={() => setDetailExp(exp)} title="Xem"
                              className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                              <Eye size={13} />
                            </button>
                            <button onClick={() => setConfirmId(exp.id)} title="XÃ³a"
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
                ? 'KhÃ´ng cÃ³ káº¿t quáº£'
                : `Hiá»ƒn thá»‹ ${Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)} Ä‘áº¿n ${Math.min(page * PAGE_SIZE, filtered.length)} cá»§a ${filtered.length} khoáº£n chi`}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="h-7 px-2.5 rounded-lg border border-slate-200 text-xs hover:bg-slate-50 disabled:opacity-40">â€¹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium ${page === p ? 'bg-indigo-600 text-white' : 'border border-slate-200 hover:bg-slate-50'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="h-7 px-2.5 rounded-lg border border-slate-200 text-xs hover:bg-slate-50 disabled:opacity-40">â€º</button>
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
        title="Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a?"
        message="Khoáº£n chi nÃ y sáº½ bá»‹ xÃ³a vÄ©nh viá»…n vÃ  khÃ´ng thá»ƒ khÃ´i phá»¥c láº¡i."
        confirmLabel="XÃ³a"
        onConfirm={() => confirmId && handleDelete(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}

