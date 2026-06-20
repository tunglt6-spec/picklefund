import { useState } from 'react'
import { Plus, CheckCircle, XCircle, Edit2, Trash2, DollarSign, Wallet } from 'lucide-react'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/api'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { FundContribution, FundSource, MiniIncomeType } from '../../types'
import { MINI_INCOME_TYPE_LABELS } from '../../types'
import { formatDate, formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

const BLANK = {
  fundSource: 'COMMON' as FundSource,
  memberId: '',
  fundPeriodId: '',
  miniIncomeType: 'OTHER' as MiniIncomeType,
  payerName: '',
  amount: 1000000,
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'bank_transfer',
  notes: '',
}

export function TreasurerIncome() {
  const isMobile = useIsMobile()
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
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({ ...BLANK, fundPeriodId: defaultPeriodId })

  const commonContribs = contributions.filter(c => (c.fundSource ?? 'COMMON') === 'COMMON')
  const miniContribs   = contributions.filter(c => c.fundSource === 'MINI')
  const totalConfirmed = commonContribs.filter(c => c.isConfirmed).reduce((a, c) => a + c.amount, 0)
  const unconfirmedCount = contributions.filter(c => !c.isConfirmed).length
  const miniTotal = miniContribs.reduce((a, c) => a + c.amount, 0)

  const isMini = form.fundSource === 'MINI'

  const openCreate = () => {
    setEditTarget(null)
    setForm({ ...BLANK, fundPeriodId: defaultPeriodId })
    setShowModal(true)
  }

  const openEdit = (c: FundContribution) => {
    setEditTarget(c)
    setForm({
      fundSource: c.fundSource ?? 'COMMON',
      memberId: c.memberId ?? '',
      fundPeriodId: c.fundPeriodId ?? '',
      miniIncomeType: c.miniIncomeType ?? 'OTHER',
      payerName: c.payerName ?? '',
      amount: c.amount,
      paymentDate: c.paymentDate,
      paymentMethod: c.paymentMethod,
      notes: c.notes ?? '',
    })
    setShowModal(true)
  }

  const toggleConfirm = async (id: string) => {
    try {
      await api.patch(`/contributions/${id}/confirm`)
      save(contributions.map(c => c.id === id ? { ...c, isConfirmed: !c.isConfirmed } : c))
      toast.success('Đã cập nhật trạng thái')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật trạng thái thất bại')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    setIsSaving(true)

    if (isMini) {
      const payload = {
        fundSource: 'MINI',
        miniIncomeType: form.miniIncomeType,
        payerName: form.payerName || undefined,
        amount: Number(form.amount),
        paidAt: form.paymentDate,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      }
      try {
        if (editTarget) {
          const res = await api.put(`/contributions/${editTarget.id}`, payload)
          const d = res.data?.data
          save(contributions.map(c => c.id === editTarget.id
            ? { ...c, ...d, fundSource: 'MINI' as const, amount: Number(d?.amount ?? form.amount), miniIncomeType: form.miniIncomeType, payerName: form.payerName } : c))
          toast.success('Đã cập nhật khoản thu Quỹ Mini')
        } else {
          const res = await api.post('/contributions', payload)
          const d = res.data?.data
          save([...contributions, { ...d, fundSource: 'MINI' as const, amount: Number(d?.amount ?? form.amount), miniIncomeType: form.miniIncomeType, payerName: form.payerName, isConfirmed: false, createdAt: new Date().toISOString(), clubId }])
          toast.success(`Ghi nhận thu Quỹ Mini: ${formatVND(Number(form.amount))}`)
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Lưu khoản thu thất bại')
        setIsSaving(false)
        return
      }
    } else {
      const member = members.find(m => m.id === form.memberId)
      if (!member) { setIsSaving(false); return }
      const payload = { fundSource: 'COMMON', memberId: member.id, fundPeriodId: form.fundPeriodId, amount: Number(form.amount), paidAt: form.paymentDate, paymentMethod: form.paymentMethod, notes: form.notes }
      try {
        if (editTarget) {
          const res = await api.put(`/contributions/${editTarget.id}`, payload)
          const d = res.data?.data
          save(contributions.map(c => c.id === editTarget.id ? { ...c, ...d, amount: Number(d?.amount ?? form.amount), member } : c))
          toast.success(`Đã cập nhật khoản thu của ${member.fullName}`)
        } else {
          const res = await api.post('/contributions', payload)
          const d = res.data?.data
          save([...contributions, { ...d, amount: Number(d?.amount ?? form.amount), member, fundSource: 'COMMON' as const, createdAt: new Date().toISOString() }])
          toast.success(`Ghi nhận ${member.fullName} đóng ${formatVND(Number(form.amount))}`)
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Lưu khoản thu thất bại')
        setIsSaving(false)
        return
      }
    }
    setIsSaving(false)
    setShowModal(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const c = contributions.find(x => x.id === deleteId)
    try {
      await api.delete(`/contributions/${deleteId}`)
      save(contributions.filter(x => x.id !== deleteId))
      setDeleteId(null)
      toast.success(`Đã xóa khoản thu${c?.member?.fullName ? ` của ${c.member.fullName}` : ''}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xóa khoản thu thất bại')
    }
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="text-[17px] font-[800] text-slate-900">Khoản Thu</div>
          <button onClick={openCreate}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[12px] font-[700] bg-indigo-600 text-white active:opacity-80">
            <Plus size={13} />Ghi nhận
          </button>
        </div>
        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Đã xác nhận', value: formatVND(totalConfirmed), color: 'text-emerald-600' },
              { label: 'Chờ xác nhận', value: `${unconfirmedCount}`, color: 'text-amber-600' },
              { label: 'Quỹ Mini', value: formatVND(miniTotal), color: 'text-violet-600' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-[14px] border border-slate-100 p-3 text-center shadow-sm">
                <div className={`text-[12px] font-[800] ${k.color} truncate`}>{k.value}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{k.label}</div>
              </div>
            ))}
          </div>

          {contributions.length === 0 ? (
            <div className="bg-white rounded-[16px] border border-dashed border-slate-200 py-14 text-center">
              <DollarSign size={28} className="mx-auto text-slate-200 mb-2" />
              <p className="text-[13px] text-slate-400">Chưa có khoản thu nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contributions.map(c => {
                const period = data.fundPeriods.find(p => p.id === c.fundPeriodId)
                const isMiniRow = (c.fundSource ?? 'COMMON') === 'MINI'
                return (
                  <div key={c.id} className={`bg-white rounded-[16px] border p-4 shadow-sm ${!c.isConfirmed ? 'border-amber-100' : 'border-slate-100'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-[700] text-slate-900 truncate">
                          {isMiniRow ? (c.payerName || 'Quỹ Mini') : (c.member?.fullName ?? c.memberId)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {isMiniRow
                            ? (c.miniIncomeType ? MINI_INCOME_TYPE_LABELS[c.miniIncomeType] : 'Quỹ Mini')
                            : (period?.name ?? '—')} · {formatDate(c.paymentDate)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[15px] font-[800] text-slate-900">{formatVND(c.amount)}</div>
                        {isMiniRow
                          ? <Badge variant="indigo">Mini</Badge>
                          : (c.isConfirmed
                            ? <Badge variant="green" dot>Xác nhận</Badge>
                            : <Badge variant="yellow" dot>Chờ</Badge>)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="gray">{c.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</Badge>
                      <div className="flex items-center gap-1">
                        {!isMiniRow && (
                          <button onClick={() => toggleConfirm(c.id)}
                            className={`h-8 w-8 flex items-center justify-center rounded-[10px] ${c.isConfirmed ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'} active:opacity-70`}>
                            {c.isConfirmed ? <CheckCircle size={15} /> : <XCircle size={15} />}
                          </button>
                        )}
                        <button onClick={() => openEdit(c)} className="h-8 w-8 flex items-center justify-center rounded-[10px] bg-slate-50 text-slate-400 active:bg-indigo-50 active:text-indigo-600">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setDeleteId(c.id)} className="h-8 w-8 flex items-center justify-center rounded-[10px] bg-slate-50 text-slate-400 active:bg-red-50 active:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Modal open={showModal} onClose={() => setShowModal(false)}
          title={editTarget ? 'Sửa Khoản Thu' : 'Ghi Nhận Khoản Thu'}
          subtitle={editTarget ? 'Cập nhật thông tin' : 'Quỹ Chung hoặc Quỹ Mini'}
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Hủy</Button>
              <Button type="submit" form="form-income-m" disabled={isSaving}>{isSaving ? 'Đang lưu...' : (editTarget ? 'Lưu' : 'Ghi nhận')}</Button>
            </div>
          }
        >
          <form id="form-income-m" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nguồn quỹ</p>
              <div className="grid grid-cols-2 gap-2">
                {(['COMMON', 'MINI'] as FundSource[]).map(fs => (
                  <button key={fs} type="button" onClick={() => setForm(f => ({ ...f, fundSource: fs }))}
                    className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium flex items-center gap-2 ${
                      form.fundSource === fs
                        ? fs === 'COMMON' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-200 text-slate-500'
                    }`}>
                    {fs === 'COMMON' ? <DollarSign size={14} /> : <Wallet size={14} />}
                    {fs === 'COMMON' ? 'Quỹ Chung' : 'Quỹ Mini'}
                  </button>
                ))}
              </div>
            </div>
            {isMini ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Loại thu <span className="text-red-500">*</span></label>
                  <select required value={form.miniIncomeType} onChange={e => setForm({ ...form, miniIncomeType: e.target.value as MiniIncomeType })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-white">
                    {(Object.entries(MINI_INCOME_TYPE_LABELS) as [MiniIncomeType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Người nộp</label>
                  <input value={form.payerName} onChange={e => setForm({ ...form, payerName: e.target.value })}
                    placeholder="Tên người nộp tiền"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-white" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Thành viên <span className="text-red-500">*</span></label>
                  <select required value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-white">
                    <option value="">-- Chọn thành viên --</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Kỳ quỹ <span className="text-red-500">*</span></label>
                  <select required value={form.fundPeriodId} onChange={e => setForm({ ...form, fundPeriodId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-white">
                    <option value="">-- Chọn kỳ quỹ --</option>
                    {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Số tiền <span className="text-red-500">*</span></label>
                <input required type="number" min={0} value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày đóng</label>
                <input type="date" value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Hình thức</label>
              <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-white">
                <option value="bank_transfer">Chuyển khoản</option>
                <option value="cash">Tiền mặt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Ghi chú</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Thông tin thêm..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-white" />
            </div>
          </form>
        </Modal>
        <ConfirmDialog open={!!deleteId} title="Xóa khoản thu?" message="Khoản thu này sẽ bị xóa vĩnh viễn."
          confirmLabel="Xóa" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Nhập Khoản Thu"
        subtitle="Ghi nhận thu quỹ cho Quỹ Chung và Quỹ Mini"
        actions={
          <Button onClick={openCreate}>
            <Plus size={14} />Ghi nhận thu
          </Button>
        }
      />

      <div className="p-6 max-w-[1000px] mx-auto space-y-5">
        {members.length === 0 && activePeriods.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <DollarSign size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">Chưa có thành viên hoặc kỳ quỹ</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CheckCircle size={14} className="text-emerald-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Đã xác nhận (QC)</p>
                </div>
                <p className="text-xl font-bold text-emerald-600">{formatVND(totalConfirmed)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{commonContribs.filter(c => c.isConfirmed).length} khoản</p>
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
                  <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Wallet size={14} className="text-violet-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Thu Quỹ Mini</p>
                </div>
                <p className="text-xl font-bold text-violet-600">{formatVND(miniTotal)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{miniContribs.length} khoản</p>
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
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Nguồn quỹ</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Thành viên / Người nộp</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Kỳ quỹ / Loại</th>
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
                      const isMiniRow = (c.fundSource ?? 'COMMON') === 'MINI'
                      return (
                        <tr key={c.id} className={!c.isConfirmed ? 'bg-amber-50/40' : ''}>
                          <td className="px-4 py-3">
                            {isMiniRow
                              ? <Badge variant="indigo">Quỹ Mini</Badge>
                              : <Badge variant="gray">Quỹ Chung</Badge>}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {isMiniRow
                              ? (c.payerName || <span className="text-slate-400 text-xs italic">—</span>)
                              : (c.member?.fullName ?? c.memberId)}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {isMiniRow
                              ? (c.miniIncomeType ? MINI_INCOME_TYPE_LABELS[c.miniIncomeType] : '—')
                              : (period?.name ?? '—')}
                          </td>
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
        subtitle={editTarget ? 'Cập nhật thông tin thu quỹ' : 'Ghi nhận khoản thu cho Quỹ Chung hoặc Quỹ Mini'}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button type="submit" form="form-income" disabled={isSaving}>{isSaving ? 'Đang lưu...' : (editTarget ? 'Lưu' : 'Ghi nhận')}</Button>
          </div>
        }
      >
        <form id="form-income" onSubmit={handleSubmit} className="space-y-4">
          {/* Fund source selector */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nguồn quỹ</p>
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

          {isMini ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Loại thu <span className="text-red-500">*</span></label>
                <select required value={form.miniIncomeType}
                  onChange={e => setForm({ ...form, miniIncomeType: e.target.value as MiniIncomeType })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white">
                  {(Object.entries(MINI_INCOME_TYPE_LABELS) as [MiniIncomeType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Người nộp (nếu có)</label>
                <input value={form.payerName} onChange={e => setForm({ ...form, payerName: e.target.value })}
                  placeholder="Tên người nộp tiền"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
              </div>
              <div className="bg-violet-50 rounded-lg px-3 py-2 text-xs text-violet-700">
                Khoản thu này không tính vào đóng quỹ thành viên và không ảnh hưởng công nợ.
              </div>
            </>
          ) : (
            <>
              {members.length === 0 ? (
                <div className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700">Chưa có thành viên. Thêm thành viên trước.</div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Thành viên <span className="text-red-500">*</span></label>
                  <select required value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white">
                    <option value="">-- Chọn thành viên --</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                  </select>
                </div>
              )}
              {activePeriods.length === 0 ? (
                <div className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700">Chưa có kỳ quỹ đang mở.</div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Kỳ quỹ <span className="text-red-500">*</span></label>
                  <select required value={form.fundPeriodId} onChange={e => setForm({ ...form, fundPeriodId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white">
                    <option value="">-- Chọn kỳ quỹ --</option>
                    {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

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
