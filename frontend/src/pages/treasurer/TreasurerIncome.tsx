import { useState } from 'react'
import { Plus, CheckCircle, XCircle, Edit2, Trash2, DollarSign, TrendingUp } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { FundContribution } from '../../types'
import { formatDate, formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

const BLANK = {
  memberId: '',
  fundPeriodId: '',
  amount: 1000000,
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'bank_transfer',
  notes: '',
}

export function TreasurerIncome() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getClubData, setContributions } = useClubDataStore()
  const data = getClubData(clubId)
  const members = data.members
  const activePeriods = data.fundPeriods.filter(p => p.status === 'active')
  const contributions = data.contributions

  const save = (next: FundContribution[]) => setContributions(clubId, next)

  const defaultPeriodId = activePeriods[0]?.id ?? ''
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<FundContribution | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...BLANK, fundPeriodId: defaultPeriodId })

  const totalConfirmed = contributions.filter(c => c.isConfirmed).reduce((a, c) => a + c.amount, 0)
  const unconfirmedCount = contributions.filter(c => !c.isConfirmed).length

  const openCreate = () => {
    setEditTarget(null)
    setForm({ ...BLANK, fundPeriodId: defaultPeriodId })
    setShowModal(true)
  }

  const openEdit = (c: FundContribution) => {
    setEditTarget(c)
    setForm({
      memberId: c.memberId ?? '',
      fundPeriodId: c.fundPeriodId ?? '',
      amount: c.amount,
      paymentDate: c.paymentDate,
      paymentMethod: c.paymentMethod,
      notes: c.notes ?? '',
    })
    setShowModal(true)
  }

  const toggleConfirm = (id: string) => {
    save(contributions.map(c => c.id === id ? { ...c, isConfirmed: !c.isConfirmed } : c))
    toast.success('Đã cập nhật trạng thái')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const member = members.find(m => m.id === form.memberId)
    if (!member) return

    if (editTarget) {
      save(contributions.map(c =>
        c.id === editTarget.id
          ? { ...c, member, memberId: member.id, fundPeriodId: form.fundPeriodId, amount: Number(form.amount), paymentDate: form.paymentDate, paymentMethod: form.paymentMethod, notes: form.notes }
          : c
      ))
      toast.success(`Đã cập nhật khoản thu của ${member.fullName}`)
    } else {
      const newC: FundContribution = {
        id: `contrib-${Date.now()}`,
        clubId,
        fundSource: 'COMMON',
        fundPeriodId: form.fundPeriodId,
        isConfirmed: false,
        member,
        createdAt: new Date().toISOString(),
        memberId: member.id,
        amount: Number(form.amount),
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      }
      save([...contributions, newC])
      toast.success(`Ghi nhận ${member.fullName} đóng ${formatVND(Number(form.amount))}`)
    }
    setShowModal(false)
  }

  const handleDelete = () => {
    if (!deleteId) return
    const c = contributions.find(x => x.id === deleteId)
    save(contributions.filter(x => x.id !== deleteId))
    setDeleteId(null)
    toast.success(`Đã xóa khoản thu của ${c?.member?.fullName ?? ''}`)
  }

  const isEmpty = members.length === 0 || activePeriods.length === 0

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Nhập Khoản Thu"
        subtitle="Ghi nhận đóng quỹ của thành viên"
        actions={
          <Button onClick={openCreate} disabled={isEmpty}>
            <Plus size={14} />Ghi nhận thu
          </Button>
        }
      />

      <div className="p-6 max-w-[1000px] mx-auto space-y-5">
        {isEmpty ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <DollarSign size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">
              {members.length === 0 ? 'Chưa có thành viên' : 'Chưa có kỳ quỹ nào đang mở'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CheckCircle size={14} className="text-emerald-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Đã xác nhận</p>
                </div>
                <p className="text-xl font-bold text-emerald-600">{formatVND(totalConfirmed)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{contributions.filter(c => c.isConfirmed).length} khoản</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <XCircle size={14} className="text-amber-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chờ xác nhận</p>
                </div>
                <p className="text-xl font-bold text-amber-600">{unconfirmedCount} khoản</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatVND(contributions.filter(c => !c.isConfirmed).reduce((a, c) => a + c.amount, 0))}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <TrendingUp size={14} className="text-indigo-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tổng giao dịch</p>
                </div>
                <p className="text-xl font-bold text-indigo-600">{contributions.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatVND(contributions.reduce((a, c) => a + c.amount, 0))}</p>
              </div>
            </div>

            {contributions.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 py-10 text-center">
                <p className="text-sm text-slate-400">Chưa có khoản thu nào. Bấm "Ghi nhận thu" để bắt đầu.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Thành viên</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Kỳ quỹ</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Ngày đóng</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Số tiền</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Hình thức</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Trạng thái</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 w-16">XN</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contributions.map(c => {
                      const period = data.fundPeriods.find(p => p.id === c.fundPeriodId)
                      return (
                        <tr key={c.id} className={!c.isConfirmed ? 'bg-amber-50/40' : ''}>
                          <td className="px-4 py-3 font-medium text-slate-900">{c.member?.fullName ?? c.memberId}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{period?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-center text-slate-500 text-xs">{formatDate(c.paymentDate)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatVND(c.amount)}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="gray">{c.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {c.isConfirmed
                              ? <Badge variant="green" dot>Xác nhận</Badge>
                              : <Badge variant="yellow" dot>Chờ</Badge>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleConfirm(c.id)}
                              className={`transition-colors ${c.isConfirmed ? 'text-emerald-500 hover:text-slate-300' : 'text-slate-200 hover:text-emerald-500'}`}
                            >
                              {c.isConfirmed ? <CheckCircle size={18} /> : <XCircle size={18} />}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEdit(c)} className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                <Edit2 size={13} />
                              </button>
                              <button onClick={() => setDeleteId(c.id)} className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
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
        title={editTarget ? 'Sửa Khoản Thu' : 'Ghi Nhận Khoản Thu'}
        subtitle={editTarget ? 'Cập nhật thông tin đóng quỹ' : 'Ghi nhận đóng quỹ của thành viên'}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button type="submit" form="form-income">{editTarget ? 'Lưu' : 'Ghi nhận'}</Button>
          </div>
        }
      >
        <form id="form-income" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Thành viên <span className="text-red-500">*</span></label>
            <select required value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white">
              <option value="">-- Chọn thành viên --</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
            </select>
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
              <input required type="number" min={0} value={form.amount}
                onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày đóng</label>
              <input type="date" value={form.paymentDate}
                onChange={e => setForm({ ...form, paymentDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Hình thức</label>
            <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white">
              <option value="bank_transfer">Chuyển khoản</option>
              <option value="cash">Tiền mặt</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Ghi chú</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Thông tin thêm..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Xóa khoản thu?"
        message="Khoản thu này sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
