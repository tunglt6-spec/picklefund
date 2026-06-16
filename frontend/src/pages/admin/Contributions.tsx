import { useState } from 'react'
import { Plus, CheckCircle, XCircle, DollarSign, TrendingUp, Edit2, Trash2, FileText, FileSpreadsheet } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { FundContribution } from '../../types'
import { formatDate, formatVND } from '../../lib/utils'
import { exportContribExcel, exportContribPDF } from '../../lib/export'
import toast from 'react-hot-toast'

const BLANK_FORM = {
  memberId: '', amount: 1000000,
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'bank_transfer', notes: ''
}

export function Contributions() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
  const { getClubData, setContributions: saveContributions } = useClubDataStore()
  const data = getClubData(clubId)
  const contributions = data.contributions
  const members = data.members
  const activePeriod = data.fundPeriods.find(p => p.status === 'active')

  const setContributions = (fn: (prev: FundContribution[]) => FundContribution[]) =>
    saveContributions(clubId, fn(getClubData(clubId).contributions))

  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<FundContribution | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...BLANK_FORM, amount: activePeriod?.contributionAmount ?? 1000000 })

  const total = contributions.reduce((s, c) => s + c.amount, 0)
  const confirmed = contributions.filter(c => c.isConfirmed)
  const unconfirmed = contributions.filter(c => !c.isConfirmed)

  const openCreate = () => {
    setForm({ ...BLANK_FORM, amount: activePeriod?.contributionAmount ?? 1000000 })
    setEditTarget(null)
    setShowCreate(true)
  }

  const openEdit = (c: FundContribution) => {
    setEditTarget(c)
    setForm({
      memberId: c.member?.id ?? '',
      amount: c.amount,
      paymentDate: c.paymentDate,
      paymentMethod: c.paymentMethod,
      notes: c.notes ?? '',
    })
    setShowCreate(true)
  }

  const toggleConfirm = (id: string) => {
    setContributions(prev => prev.map(c => c.id === id ? { ...c, isConfirmed: !c.isConfirmed } : c))
    toast.success('Cập nhật trạng thái đóng quỹ')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const member = members.find(m => m.id === form.memberId)
    if (!member) return

    if (editTarget) {
      setContributions(prev => prev.map(c => c.id === editTarget.id
        ? { ...c, member, memberId: member.id, amount: Number(form.amount), paymentDate: form.paymentDate, paymentMethod: form.paymentMethod, notes: form.notes }
        : c
      ))
      toast.success(`Đã cập nhật khoản thu của ${member.fullName}`)
    } else {
      const newC: FundContribution = {
        id: `contrib-${Date.now()}`, clubId, fundPeriodId: activePeriod?.id ?? '',
        isConfirmed: false, member, createdAt: new Date().toISOString(),
        memberId: member.id, amount: Number(form.amount),
        paymentDate: form.paymentDate, paymentMethod: form.paymentMethod, notes: form.notes,
      }
      setContributions(prev => [...prev, newC])
      toast.success(`Đã ghi nhận ${member.fullName} đóng ${formatVND(Number(form.amount))}`)
    }
    setShowCreate(false)
  }

  const handleDelete = () => {
    if (!deleteId) return
    const c = contributions.find(x => x.id === deleteId)
    setContributions(prev => prev.filter(x => x.id !== deleteId))
    setDeleteId(null)
    toast.success(`Đã xóa khoản thu của ${c?.member?.fullName ?? ''}`)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Thu Quỹ"
        subtitle={activePeriod ? `${activePeriod.name} — Đã thu: ${formatVND(total)}` : 'Chưa có kỳ quỹ nào đang mở'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const pName = activePeriod?.name ?? 'Thu_Quy'
              exportContribExcel(pName, contributions.map(c => ({ member: c.member?.fullName ?? '', date: formatDate(c.paymentDate), amount: c.amount, method: c.paymentMethod, confirmed: c.isConfirmed })))
              toast.success('Đã xuất Excel danh sách thu quỹ!')
            }}><FileSpreadsheet size={14} />Excel</Button>
            <Button variant="outline" onClick={() => {
              const pName = activePeriod?.name ?? 'Thu Quỹ'
              exportContribPDF(pName, contributions.map(c => ({ member: c.member?.fullName ?? '', date: formatDate(c.paymentDate), amount: c.amount, method: c.paymentMethod, confirmed: c.isConfirmed })), total)
              toast.success('Đã xuất PDF danh sách thu quỹ!')
            }}><FileText size={14} />PDF</Button>
            <Button onClick={openCreate} disabled={!activePeriod || members.length === 0}>
              <Plus size={15} />Ghi nhận thu
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-[1200px] mx-auto space-y-5">
        {!activePeriod || members.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <DollarSign size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">
              {!activePeriod ? 'Chưa có kỳ quỹ đang mở' : 'Chưa có thành viên nào trong CLB'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {!activePeriod ? 'Vui lòng tạo kỳ quỹ trước khi ghi nhận thu' : 'Thêm thành viên trước khi ghi nhận thu quỹ'}
            </p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CheckCircle size={14} className="text-emerald-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Đã xác nhận</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{confirmed.length} <span className="text-base font-medium">người</span></p>
                <p className="text-xs text-slate-500 mt-0.5">{formatVND(confirmed.reduce((s, c) => s + c.amount, 0))}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <XCircle size={14} className="text-amber-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chưa xác nhận</p>
                </div>
                <p className="text-2xl font-bold text-amber-600">{unconfirmed.length} <span className="text-base font-medium">người</span></p>
                <p className="text-xs text-slate-500 mt-0.5">{formatVND(unconfirmed.reduce((s, c) => s + c.amount, 0))}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <TrendingUp size={14} className="text-indigo-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tổng thu</p>
                </div>
                <p className="text-2xl font-bold text-indigo-600">{formatVND(total)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{contributions.length} khoản</p>
              </div>
            </div>

            {/* Table */}
            {contributions.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 py-10 text-center">
                <p className="text-sm text-slate-400">Chưa có khoản thu nào. Nhấn "Ghi nhận thu" để bắt đầu.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Thành viên</th>
                      <th className="text-center">Ngày đóng</th>
                      <th className="text-right">Số tiền</th>
                      <th className="text-center">Hình thức</th>
                      <th className="text-center">Trạng thái</th>
                      <th className="text-center w-16">Xác nhận</th>
                      <th className="text-center w-20">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contributions.map(c => (
                      <tr key={c.id} className={!c.isConfirmed ? 'bg-amber-50/30' : ''}>
                        <td className="font-medium text-slate-900">{c.member?.fullName}</td>
                        <td className="text-center text-slate-500 text-xs">{formatDate(c.paymentDate)}</td>
                        <td className="text-right font-semibold text-slate-900">{formatVND(c.amount)}</td>
                        <td className="text-center">
                          <Badge variant="gray">{c.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</Badge>
                        </td>
                        <td className="text-center">
                          {c.isConfirmed
                            ? <Badge variant="green" dot>Xác nhận</Badge>
                            : <Badge variant="yellow" dot>Chờ</Badge>}
                        </td>
                        <td className="text-center">
                          <button onClick={() => toggleConfirm(c.id)}
                            className={`transition-colors ${c.isConfirmed ? 'text-emerald-500 hover:text-slate-300' : 'text-slate-200 hover:text-emerald-500'}`}>
                            {c.isConfirmed ? <CheckCircle size={18} /> : <XCircle size={18} />}
                          </button>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEdit(c)}
                              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                              title="Sửa">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => setDeleteId(c.id)}
                              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Xóa">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={editTarget ? 'Sửa Khoản Thu' : 'Ghi Nhận Khoản Thu'}
        subtitle={editTarget ? 'Cập nhật thông tin đóng quỹ' : 'Ghi nhận đóng quỹ cho thành viên'}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Hủy bỏ</Button>
            <Button type="submit" form="form-contrib">{editTarget ? 'Lưu thay đổi' : 'Ghi nhận'}</Button>
          </div>
        }
      >
        <form id="form-contrib" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Thành viên <span className="text-red-500">*</span></label>
            <select required value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} className="input-base">
              <option value="">-- Chọn thành viên --</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Số tiền (VNĐ) <span className="text-red-500">*</span></label>
              <input required type="number" min={0} value={form.amount}
                onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày đóng</label>
              <input type="date" value={form.paymentDate}
                onChange={e => setForm({ ...form, paymentDate: e.target.value })} className="input-base" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Hình thức thanh toán</label>
            <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="input-base">
              <option value="bank_transfer">Chuyển khoản</option>
              <option value="cash">Tiền mặt</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Ghi chú</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Thông tin thêm..." className="input-base" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Xóa khoản thu?"
        message="Khoản thu này sẽ bị xóa vĩnh viễn và không thể khôi phục lại."
        confirmLabel="Xóa"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
