import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Receipt } from 'lucide-react'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/api'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { AllocationRule, LivingExpense } from '../../types'
import { formatDate, formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

const RULES: { value: AllocationRule; label: string; desc: string }[] = [
  { value: 'ATTENDANCE', label: 'Theo lượt tham gia', desc: 'Phân bổ theo số buổi tham gia thực tế' },
  { value: 'EQUAL', label: 'Chia đều', desc: 'Chia đều cho tất cả thành viên' },
  { value: 'PRESENT_ONLY', label: 'Người có mặt', desc: 'Chỉ tính người có mặt buổi đó' },
  { value: 'FUND_ONLY', label: 'Quỹ chung', desc: 'Chi quỹ chung, không phân bổ cá nhân' },
]

const BLANK = {
  description: '',
  amount: '',
  allocationRule: 'ATTENDANCE' as AllocationRule,
  expenseDate: new Date().toISOString().slice(0, 10),
  fundPeriodId: '',
}

export function TreasurerExpense() {
  const isMobile = useIsMobile()
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getClubData, setExpenses } = useClubDataStore()
  const data = getClubData(clubId)
  const activePeriods = data.fundPeriods.filter(p => p.status === 'active')
  const expenses = data.expenses

  const save = (next: LivingExpense[]) => setExpenses(clubId, next)

  const defaultPeriodId = activePeriods[0]?.id ?? ''
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<LivingExpense | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...BLANK, fundPeriodId: defaultPeriodId })
  const [isSaving, setIsSaving] = useState(false)

  // Refresh on mount so data is always current
  useEffect(() => {
    if (!clubId) return
    api.get(`/expenses?clubId=${clubId}`).then(res => {
      const raw = res.data?.data ?? []
      setExpenses(clubId, raw.map((e: any) => ({
        id: e.id, clubId: e.clubId, fundPeriodId: e.fundPeriodId ?? undefined,
        description: e.description ?? '', amount: Number(e.amount),
        allocationRule: e.allocationRule ?? 'EQUAL',
        expenseDate: e.expenseDate?.slice(0, 10) ?? '',
        receiptUrl: e.receiptUrl ?? undefined, notes: e.notes ?? undefined,
        createdAt: e.createdAt ?? '', createdBy: e.createdById ?? '',
      })))
    }).catch(() => {/* keep existing store data */})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0)

  const openCreate = () => {
    setEditTarget(null)
    setForm({ ...BLANK, fundPeriodId: defaultPeriodId })
    setShowModal(true)
  }

  const openEdit = (e: LivingExpense) => {
    setEditTarget(e)
    setForm({
      description: e.description,
      amount: String(e.amount),
      allocationRule: e.allocationRule,
      expenseDate: e.expenseDate,
      fundPeriodId: e.fundPeriodId ?? '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    const payload = { fundSource: 'COMMON' as const, fundPeriodId: form.fundPeriodId || undefined, description: form.description, amount: Number(form.amount), allocationRule: form.allocationRule, allocationEnabled: true, expenseDate: form.expenseDate }
    try {
      if (editTarget) {
        const res = await api.put(`/expenses/${editTarget.id}`, payload)
        const d = res.data?.data
        save(expenses.map(x => x.id === editTarget.id ? { ...x, ...d, amount: Number(d?.amount ?? form.amount) } : x))
        toast.success(`Đã cập nhật: ${form.description}`)
      } else {
        const res = await api.post('/expenses', payload)
        const d = res.data?.data
        save([...expenses, { ...d, amount: Number(d?.amount ?? form.amount), fundSource: 'COMMON' as const, allocationEnabled: true, createdAt: new Date().toISOString(), createdBy: user?.id ?? '' }])
        toast.success(`Đã nhập khoản chi: ${form.description} — ${formatVND(Number(form.amount))}`)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu khoản chi thất bại')
      setIsSaving(false)
      return
    }
    setIsSaving(false)
    setShowModal(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const e = expenses.find(x => x.id === deleteId)
    try {
      await api.delete(`/expenses/${deleteId}`)
      save(expenses.filter(x => x.id !== deleteId))
      setDeleteId(null)
      toast.success(`Đã xóa: ${e?.description ?? ''}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xóa khoản chi thất bại')
    }
  }

  const ruleLabel = (r: AllocationRule) => RULES.find(x => x.value === r)?.label ?? r

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="text-[17px] font-[800] text-slate-900">Khoản Chi</div>
          <button onClick={openCreate} disabled={activePeriods.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[12px] font-[700] bg-indigo-600 text-white disabled:opacity-40 active:opacity-80">
            <Plus size={13} />Thêm
          </button>
        </div>
        <div className="px-4 pt-4 pb-6 space-y-4">
          {activePeriods.length === 0 ? (
            <div className="bg-white rounded-[16px] border border-dashed border-slate-200 py-14 text-center">
              <Receipt size={28} className="mx-auto text-slate-200 mb-2" />
              <p className="text-[13px] text-slate-400">Chưa có kỳ quỹ nào đang mở</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-[14px] border border-slate-100 p-3 shadow-sm">
                  <div className="text-[15px] font-[800] text-red-600">{formatVND(totalExpenses)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Tổng đã chi · {expenses.length} khoản</div>
                </div>
                <div className="bg-white rounded-[14px] border border-slate-100 p-3 shadow-sm">
                  <div className="text-[15px] font-[800] text-amber-500">{expenses.filter(e => !e.receiptUrl).length}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Thiếu hóa đơn</div>
                </div>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-12 text-[13px] text-slate-400">Chưa có khoản chi nào</div>
              ) : (
                <div className="space-y-2">
                  {expenses.map(e => {
                    const period = data.fundPeriods.find(p => p.id === e.fundPeriodId)
                    return (
                      <div key={e.id} className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-[700] text-slate-900 truncate">{e.description}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{period?.name ?? '—'} · {formatDate(e.expenseDate)}</div>
                          </div>
                          <div className="text-[15px] font-[800] text-red-600 shrink-0">{formatVND(e.amount)}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="gray">{ruleLabel(e.allocationRule)}</Badge>
                            {e.receiptUrl
                              ? <Badge variant="green" dot>HĐ</Badge>
                              : <Badge variant="yellow" dot>Chưa có HĐ</Badge>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(e)} className="h-8 w-8 flex items-center justify-center rounded-[10px] text-slate-400 bg-slate-50 active:bg-indigo-50 active:text-indigo-600">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => setDeleteId(e.id)} className="h-8 w-8 flex items-center justify-center rounded-[10px] text-slate-400 bg-slate-50 active:bg-red-50 active:text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <Modal open={showModal} onClose={() => setShowModal(false)}
          title={editTarget ? 'Sửa Khoản Chi' : 'Thêm Khoản Chi'}
          subtitle={editTarget ? 'Cập nhật thông tin khoản chi' : 'Ghi nhận chi phí của CLB'}
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="outline" type="button" onClick={() => setShowModal(false)} disabled={isSaving}>Hủy</Button>
              <Button type="submit" form="form-expense-m" disabled={isSaving}>{isSaving ? 'Đang lưu...' : (editTarget ? 'Lưu' : 'Thêm')}</Button>
            </div>
          }
        >
          <form id="form-expense-m" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Mô tả <span className="text-red-500">*</span></label>
              <input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="VD: Tiền sân, Nước uống..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Kỳ quỹ <span className="text-red-500">*</span></label>
              <select required value={form.fundPeriodId} onChange={e => setForm({ ...form, fundPeriodId: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-white">
                <option value="">-- Chọn kỳ quỹ --</option>
                {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Số tiền <span className="text-red-500">*</span></label>
                <input required type="number" min={0} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày chi</label>
                <input type="date" value={form.expenseDate} onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Quy tắc phân bổ</label>
              <div className="space-y-2">
                {RULES.map(r => (
                  <label key={r.value} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer ${form.allocationRule === r.value ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
                    <input type="radio" name="rule-m" value={r.value} checked={form.allocationRule === r.value}
                      onChange={() => setForm({ ...form, allocationRule: r.value })} className="mt-0.5 accent-indigo-600" />
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{r.label}</p>
                      <p className="text-xs text-slate-500">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </form>
        </Modal>
        <ConfirmDialog open={!!deleteId} title="Xóa khoản chi?" message="Khoản chi này sẽ bị xóa vĩnh viễn."
          confirmLabel="Xóa" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Nhập Khoản Chi"
        subtitle="Ghi nhận chi phí của CLB"
        actions={
          <Button onClick={openCreate} disabled={activePeriods.length === 0}>
            <Plus size={14} />Thêm khoản chi
          </Button>
        }
      />

      <div className="p-6 max-w-[1000px] mx-auto space-y-5">
        {activePeriods.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <Receipt size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">Chưa có kỳ quỹ nào đang mở</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tổng đã chi</p>
                <p className="text-2xl font-bold text-red-600">{formatVND(totalExpenses)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{expenses.length} khoản</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Thiếu hóa đơn</p>
                <p className="text-2xl font-bold text-amber-500">{expenses.filter(e => !e.receiptUrl).length}</p>
                <p className="text-xs text-slate-400 mt-0.5">khoản chưa có chứng từ</p>
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 py-10 text-center">
                <p className="text-sm text-slate-400">Chưa có khoản chi nào. Bấm "Thêm khoản chi" để bắt đầu.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Mô tả</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Kỳ quỹ</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Ngày chi</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Số tiền</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Phân bổ</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Hóa đơn</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map(e => {
                      const period = data.fundPeriods.find(p => p.id === e.fundPeriodId)
                      return (
                        <tr key={e.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{e.description}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{period?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-center text-slate-500 text-xs">{formatDate(e.expenseDate)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600">{formatVND(e.amount)}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="gray">{ruleLabel(e.allocationRule)}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {e.receiptUrl
                              ? <Badge variant="green" dot>Có</Badge>
                              : <Badge variant="yellow" dot>Chưa có</Badge>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEdit(e)} className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                <Edit2 size={13} />
                              </button>
                              <button onClick={() => setDeleteId(e.id)} className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
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
          </>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? 'Sửa Khoản Chi' : 'Thêm Khoản Chi'}
        subtitle={editTarget ? 'Cập nhật thông tin khoản chi' : 'Ghi nhận chi phí của CLB'}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)} disabled={isSaving}>Hủy</Button>
            <Button type="submit" form="form-expense" disabled={isSaving}>{isSaving ? 'Đang lưu...' : (editTarget ? 'Lưu' : 'Thêm')}</Button>
          </div>
        }
      >
        <form id="form-expense" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Mô tả khoản chi <span className="text-red-500">*</span></label>
            <input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="VD: Tiền sân buổi 5, Nước uống, Giải thưởng..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Kỳ quỹ <span className="text-red-500">*</span></label>
            <select required value={form.fundPeriodId} onChange={e => setForm({ ...form, fundPeriodId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white">
              <option value="">-- Chọn kỳ quỹ --</option>
              {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Số tiền (VNĐ) <span className="text-red-500">*</span></label>
              <input required type="number" min={0} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="VD: 450000"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày chi</label>
              <input type="date" value={form.expenseDate} onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Quy tắc phân bổ</label>
            <div className="space-y-2">
              {RULES.map(r => (
                <label key={r.value} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${form.allocationRule === r.value ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="rule" value={r.value} checked={form.allocationRule === r.value}
                    onChange={() => setForm({ ...form, allocationRule: r.value })} className="mt-0.5 accent-indigo-600" />
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{r.label}</p>
                    <p className="text-xs text-slate-500">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Xóa khoản chi?"
        message="Khoản chi này sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
