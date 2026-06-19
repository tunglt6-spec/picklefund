import { useState } from 'react'
import { Plus, CheckCircle, XCircle, DollarSign, Edit2, Trash2, FileText, FileSpreadsheet, Wallet } from 'lucide-react'
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
import { exportContribExcel, exportContribPDF } from '../../lib/export'
import toast from 'react-hot-toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import { MobileTransactionCard } from '../../components/mobile/MobileTransactionCard'

const BLANK_COMMON = {
  fundSource: 'COMMON' as FundSource,
  memberId: '', amount: 1000000,
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'bank_transfer', notes: '',
  // MINI
  miniIncomeType: 'PENALTY' as MiniIncomeType,
  payerName: '',
}

export function Contributions() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
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
  const [form, setForm] = useState({ ...BLANK_COMMON, amount: activePeriod?.contributionAmount ?? 1000000 })

  const commonContribs = contributions.filter(c => (c.fundSource ?? 'COMMON') === 'COMMON')
  const miniContribs = contributions.filter(c => c.fundSource === 'MINI')

  const commonTotal = commonContribs.reduce((s, c) => s + c.amount, 0)
  const miniTotal = miniContribs.reduce((s, c) => s + c.amount, 0)
  const confirmed = commonContribs.filter(c => c.isConfirmed)
  const unconfirmed = commonContribs.filter(c => !c.isConfirmed)

  const openCreate = () => {
    setForm({ ...BLANK_COMMON, amount: activePeriod?.contributionAmount ?? 1000000 })
    setEditTarget(null)
    setShowCreate(true)
  }

  const openEdit = (c: FundContribution) => {
    setEditTarget(c)
    setForm({
      fundSource: c.fundSource ?? 'COMMON',
      memberId: c.memberId ?? '',
      amount: c.amount,
      paymentDate: c.paymentDate,
      paymentMethod: c.paymentMethod,
      notes: c.notes ?? '',
      miniIncomeType: c.miniIncomeType ?? 'PENALTY',
      payerName: c.payerName ?? '',
    })
    setShowCreate(true)
  }

  const toggleConfirm = async (id: string) => {
    try {
      await api.patch(`/contributions/${id}/confirm`)
      setContributions(prev => prev.map(c => c.id === id ? { ...c, isConfirmed: !c.isConfirmed } : c))
      toast.success('Cáº­p nháº­t tráº¡ng thÃ¡i Ä‘Ã³ng quá»¹')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cáº­p nháº­t tráº¡ng thÃ¡i tháº¥t báº¡i')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const isCommon = form.fundSource === 'COMMON'

    if (isCommon) {
      const member = members.find(m => m.id === form.memberId)
      if (!member) return

      const payload = {
        fundSource: 'COMMON', memberId: member.id,
        fundPeriodId: activePeriod?.id,
        amount: Number(form.amount),
        paidAt: form.paymentDate, paymentMethod: form.paymentMethod, notes: form.notes,
      }
      try {
        if (editTarget) {
          const res = await api.put(`/contributions/${editTarget.id}`, payload)
          const updated = res.data?.data
          setContributions(prev => prev.map(c => c.id === editTarget.id
            ? { ...c, ...updated, amount: Number(updated.amount), member } : c))
          toast.success(`ÄÃ£ cáº­p nháº­t khoáº£n thu cá»§a ${member.fullName}`)
        } else {
          const res = await api.post('/contributions', payload)
          const created = res.data?.data
          setContributions(prev => [...prev, { ...created, amount: Number(created.amount), member, fundSource: 'COMMON' as const }])
          toast.success(`ÄÃ£ ghi nháº­n ${member.fullName} Ä‘Ã³ng ${formatVND(Number(form.amount))} vÃ o Quá»¹ Chung`)
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'LÆ°u khoáº£n thu tháº¥t báº¡i')
        return
      }
    } else {
      // MINI
      const payload = {
        fundSource: 'MINI' as const, miniIncomeType: form.miniIncomeType,
        payerName: form.payerName || undefined, isConfirmed: true,
        amount: Number(form.amount), paidAt: form.paymentDate,
        paymentMethod: form.paymentMethod, notes: form.notes,
      }
      try {
        if (editTarget) {
          await api.put(`/contributions/${editTarget.id}`, payload)
          setContributions(prev => prev.map(c => c.id === editTarget.id ? { ...c, ...payload, id: c.id } : c))
          toast.success('ÄÃ£ cáº­p nháº­t khoáº£n thu Quá»¹ Mini')
        } else {
          const res = await api.post('/contributions', payload)
          const created = res.data?.data
          setContributions(prev => [...prev, { ...created, amount: Number(created.amount), fundSource: 'MINI' as const }])
          toast.success(`ÄÃ£ ghi nháº­n ${formatVND(Number(form.amount))} vÃ o Quá»¹ Mini â€” ${MINI_INCOME_TYPE_LABELS[form.miniIncomeType]}`)
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'LÆ°u khoáº£n thu tháº¥t báº¡i')
        return
      }
    }
    setShowCreate(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/contributions/${deleteId}`)
      setContributions(prev => prev.filter(x => x.id !== deleteId))
      setDeleteId(null)
      toast.success('ÄÃ£ xÃ³a khoáº£n thu')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'XÃ³a khoáº£n thu tháº¥t báº¡i')
    }
  }

  const isMobile = useIsMobile()

  /* â”€â”€ Mobile layout â”€â”€ */
  if (isMobile) {
    const sorted = [...contributions].sort((a, b) => b.createdAt?.localeCompare(a.createdAt ?? '') ?? 0)
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-[700] text-slate-900">Thu Quá»¹</h2>
            <p className="text-[12px] text-slate-400">{activePeriod?.name ?? 'ChÆ°a cÃ³ ká»³ quá»¹'}</p>
          </div>
          <button
            onClick={openCreate}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Summary row */}
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
              <DollarSign size={36} className="mx-auto text-slate-200 mb-3" />
              ChÆ°a cÃ³ khoáº£n thu nÃ o
            </div>
          ) : sorted.map(c => {
            const memberName = members.find(m => m.id === c.memberId)?.fullName ?? c.payerName ?? 'N/A'
            return (
              <div key={c.id} className="relative">
                <MobileTransactionCard
                  name={memberName}
                  description={c.notes ?? c.paymentMethod}
                  amount={c.amount}
                  type="income"
                  fundSource={c.fundSource ?? 'COMMON'}
                  status={c.isConfirmed ? 'ÄÃ£ xÃ¡c nháº­n' : 'Chá» xÃ¡c nháº­n'}
                />
                <div className="absolute right-3 top-3 flex gap-1">
                  <button onClick={() => openEdit(c)} className="text-slate-400 active:text-indigo-600 p-1"><Edit2 size={13} /></button>
                  <button onClick={() => setDeleteId(c.id)} className="text-slate-300 active:text-red-500 p-1"><Trash2 size={13} /></button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Create / Edit Modal â€” full form on mobile */}
        <Modal
          open={showCreate}
          onClose={() => { setShowCreate(false); setEditTarget(null) }}
          title={editTarget ? 'Sá»­a Khoáº£n Thu' : 'Ghi Nháº­n Khoáº£n Thu'}
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="outline" type="button" onClick={() => { setShowCreate(false); setEditTarget(null) }}>Há»§y</Button>
              <Button type="submit" form="form-contrib-mobile">{editTarget ? 'LÆ°u' : 'Ghi nháº­n'}</Button>
            </div>
          }
        >
          <form id="form-contrib-mobile" onSubmit={handleSubmit} className="space-y-4 p-1">
            {!editTarget && (
              <div className="grid grid-cols-2 gap-2">
                {(['COMMON', 'MINI'] as FundSource[]).map(fs => (
                  <button key={fs} type="button"
                    onClick={() => setForm(f => ({ ...f, fundSource: fs }))}
                    className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2 ${
                      form.fundSource === fs
                        ? fs === 'COMMON' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-200 text-slate-500'
                    }`}>
                    {fs === 'COMMON' ? <DollarSign size={14} /> : <Wallet size={14} />}
                    {fs === 'COMMON' ? 'Quá»¹ Chung' : 'Quá»¹ Mini'}
                  </button>
                ))}
              </div>
            )}
            {form.fundSource === 'COMMON' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">ThÃ nh viÃªn <span className="text-red-500">*</span></label>
                  <select required value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} className="input-base">
                    <option value="">-- Chá»n thÃ nh viÃªn --</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                  </select>
                </div>
                {activePeriod && (
                  <div className="bg-indigo-50 rounded-lg px-3 py-2 text-xs text-indigo-700">
                    Ká»³ quá»¹: <span className="font-semibold">{activePeriod.name}</span> â€” Má»©c Ä‘Ã³ng: {formatVND(activePeriod.contributionAmount)}
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Loáº¡i thu Quá»¹ Mini <span className="text-red-500">*</span></label>
                  <select required value={form.miniIncomeType} onChange={e => setForm({ ...form, miniIncomeType: e.target.value as MiniIncomeType })} className="input-base">
                    {(Object.entries(MINI_INCOME_TYPE_LABELS) as [MiniIncomeType, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">NgÆ°á»i ná»™p</label>
                  <input value={form.payerName} onChange={e => setForm({ ...form, payerName: e.target.value })}
                    placeholder="TÃªn ngÆ°á»i ná»™p (náº¿u khÃ´ng pháº£i thÃ nh viÃªn)" className="input-base" />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Sá»‘ tiá»n (VNÄ) <span className="text-red-500">*</span></label>
                <input required type="number" min={0} value={form.amount}
                  onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">NgÃ y thu</label>
                <input type="date" value={form.paymentDate}
                  onChange={e => setForm({ ...form, paymentDate: e.target.value })} className="input-base" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">HÃ¬nh thá»©c thanh toÃ¡n</label>
              <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="input-base">
                <option value="bank_transfer">Chuyá»ƒn khoáº£n</option>
                <option value="cash">Tiá»n máº·t</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Ghi chÃº</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="ThÃ´ng tin thÃªm..." className="input-base" />
            </div>
          </form>
        </Modal>
        <ConfirmDialog open={!!deleteId} title="XÃ³a khoáº£n thu?" message="HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Thu Quá»¹"
        subtitle={activePeriod ? `${activePeriod.name} â€” Quá»¹ Chung: ${formatVND(commonTotal)} | Quá»¹ Mini: ${formatVND(miniTotal)}` : 'ChÆ°a cÃ³ ká»³ quá»¹ nÃ o Ä‘ang má»Ÿ'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const pName = activePeriod?.name ?? 'Thu_Quy'
              exportContribExcel(pName, contributions.map(c => ({ member: c.member?.fullName ?? c.payerName ?? '', date: formatDate(c.paymentDate), amount: c.amount, method: c.paymentMethod, confirmed: c.isConfirmed })))
              toast.success('ÄÃ£ xuáº¥t Excel danh sÃ¡ch thu quá»¹!')
            }}><FileSpreadsheet size={14} />Excel</Button>
            <Button variant="outline" onClick={() => {
              const pName = activePeriod?.name ?? 'Thu Quá»¹'
              exportContribPDF(pName, contributions.map(c => ({ member: c.member?.fullName ?? c.payerName ?? '', date: formatDate(c.paymentDate), amount: c.amount, method: c.paymentMethod, confirmed: c.isConfirmed })), commonTotal + miniTotal)
              toast.success('ÄÃ£ xuáº¥t PDF danh sÃ¡ch thu quá»¹!')
            }}><FileText size={14} />PDF</Button>
            <Button onClick={openCreate}>
              <Plus size={15} />Ghi nháº­n thu
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-[1200px] mx-auto space-y-5">
        {/* Summary cards â€” split by fund source */}
        <div className="grid grid-cols-2 gap-4">
          {/* Quá»¹ Chung */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <DollarSign size={14} className="text-indigo-600" />
              </div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Quá»¹ Chung</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatVND(commonTotal)}</p>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              <span className="text-emerald-600">âœ“ {confirmed.length} xÃ¡c nháº­n ({formatVND(confirmed.reduce((s, c) => s + c.amount, 0))})</span>
              <span className="text-amber-600">â³ {unconfirmed.length} chá»</span>
            </div>
          </div>
          {/* Quá»¹ Mini */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <Wallet size={14} className="text-violet-600" />
              </div>
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Quá»¹ Mini</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatVND(miniTotal)}</p>
            <div className="flex gap-3 mt-2 flex-wrap">
              {Object.entries(MINI_INCOME_TYPE_LABELS).map(([k, label]) => {
                const amt = miniContribs.filter(c => c.miniIncomeType === k).reduce((s, c) => s + c.amount, 0)
                if (!amt) return null
                return <span key={k} className="text-xs text-slate-500">{label}: {formatVND(amt)}</span>
              })}
              {miniContribs.length === 0 && <span className="text-xs text-slate-400">ChÆ°a cÃ³ giao dá»‹ch</span>}
            </div>
          </div>
        </div>

        {/* COMMON contributions table */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-indigo-100 flex items-center justify-center"><DollarSign size={11} className="text-indigo-600" /></div>
            <h3 className="text-sm font-semibold text-slate-700">Quá»¹ Chung</h3>
          </div>
          {commonContribs.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 py-8 text-center">
              <p className="text-sm text-slate-400">ChÆ°a cÃ³ khoáº£n thu Quá»¹ Chung nÃ o.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>ThÃ nh viÃªn</th>
                    <th className="text-center">NgÃ y Ä‘Ã³ng</th>
                    <th className="text-right">Sá»‘ tiá»n</th>
                    <th className="text-center">HÃ¬nh thá»©c</th>
                    <th className="text-center">Tráº¡ng thÃ¡i</th>
                    <th className="text-center w-16">XÃ¡c nháº­n</th>
                    <th className="text-center w-20">Thao tÃ¡c</th>
                  </tr>
                </thead>
                <tbody>
                  {commonContribs.map(c => (
                    <tr key={c.id} className={!c.isConfirmed ? 'bg-amber-50/30' : ''}>
                      <td className="font-medium text-slate-900">{c.member?.fullName ?? c.memberId}</td>
                      <td className="text-center text-slate-500 text-xs">{formatDate(c.paymentDate)}</td>
                      <td className="text-right font-semibold text-slate-900">{formatVND(c.amount)}</td>
                      <td className="text-center">
                        <Badge variant="gray">{c.paymentMethod === 'bank_transfer' ? 'Chuyá»ƒn khoáº£n' : 'Tiá»n máº·t'}</Badge>
                      </td>
                      <td className="text-center">
                        {c.isConfirmed
                          ? <Badge variant="green" dot>XÃ¡c nháº­n</Badge>
                          : <Badge variant="yellow" dot>Chá»</Badge>}
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
                            title="Sá»­a"><Edit2 size={13} /></button>
                          <button onClick={() => setDeleteId(c.id)}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="XÃ³a"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MINI contributions table */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-violet-100 flex items-center justify-center"><Wallet size={11} className="text-violet-600" /></div>
            <h3 className="text-sm font-semibold text-slate-700">Quá»¹ Mini</h3>
          </div>
          {miniContribs.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 py-8 text-center">
              <p className="text-sm text-slate-400">ChÆ°a cÃ³ khoáº£n thu Quá»¹ Mini nÃ o.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>NgÆ°á»i ná»™p</th>
                    <th>Loáº¡i thu</th>
                    <th className="text-center">NgÃ y</th>
                    <th className="text-right">Sá»‘ tiá»n</th>
                    <th className="text-center">HÃ¬nh thá»©c</th>
                    <th className="text-center w-20">Thao tÃ¡c</th>
                  </tr>
                </thead>
                <tbody>
                  {miniContribs.map(c => (
                    <tr key={c.id}>
                      <td className="font-medium text-slate-900">{c.payerName ?? c.member?.fullName ?? 'KhÃ´ng rÃµ'}</td>
                      <td>
                        <Badge variant="indigo">{MINI_INCOME_TYPE_LABELS[c.miniIncomeType ?? 'OTHER']}</Badge>
                      </td>
                      <td className="text-center text-slate-500 text-xs">{formatDate(c.paymentDate)}</td>
                      <td className="text-right font-semibold text-violet-700">{formatVND(c.amount)}</td>
                      <td className="text-center">
                        <Badge variant="gray">{c.paymentMethod === 'bank_transfer' ? 'Chuyá»ƒn khoáº£n' : 'Tiá»n máº·t'}</Badge>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(c)}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                            title="Sá»­a"><Edit2 size={13} /></button>
                          <button onClick={() => setDeleteId(c.id)}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="XÃ³a"><Trash2 size={13} /></button>
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

      {/* Create / Edit Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={editTarget ? 'Sá»­a Khoáº£n Thu' : 'Ghi Nháº­n Khoáº£n Thu'}
        subtitle={editTarget ? 'Cáº­p nháº­t thÃ´ng tin Ä‘Ã³ng quá»¹' : 'Chá»n nguá»“n quá»¹ Ä‘á»ƒ ghi nháº­n'}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Há»§y bá»</Button>
            <Button type="submit" form="form-contrib">{editTarget ? 'LÆ°u thay Ä‘á»•i' : 'Ghi nháº­n'}</Button>
          </div>
        }
      >
        <form id="form-contrib" onSubmit={handleSubmit} className="space-y-4">
          {/* Fund source selector */}
          {!editTarget && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Nguá»“n quá»¹ <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {(['COMMON', 'MINI'] as FundSource[]).map(fs => (
                  <button
                    key={fs}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, fundSource: fs }))}
                    className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center gap-2 ${
                      form.fundSource === fs
                        ? fs === 'COMMON'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {fs === 'COMMON' ? <DollarSign size={14} /> : <Wallet size={14} />}
                    {fs === 'COMMON' ? 'Quá»¹ Chung' : 'Quá»¹ Mini'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.fundSource === 'COMMON' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">ThÃ nh viÃªn <span className="text-red-500">*</span></label>
                <select required value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} className="input-base">
                  <option value="">-- Chá»n thÃ nh viÃªn --</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                </select>
              </div>
              {activePeriod && (
                <div className="bg-indigo-50 rounded-lg px-3 py-2 text-xs text-indigo-700">
                  Ká»³ quá»¹: <span className="font-semibold">{activePeriod.name}</span> â€” Má»©c Ä‘Ã³ng: {formatVND(activePeriod.contributionAmount)}
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Loáº¡i thu Quá»¹ Mini <span className="text-red-500">*</span></label>
                <select required value={form.miniIncomeType} onChange={e => setForm({ ...form, miniIncomeType: e.target.value as MiniIncomeType })} className="input-base">
                  {(Object.entries(MINI_INCOME_TYPE_LABELS) as [MiniIncomeType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">NgÆ°á»i ná»™p</label>
                <input value={form.payerName} onChange={e => setForm({ ...form, payerName: e.target.value })}
                  placeholder="TÃªn ngÆ°á»i ná»™p (náº¿u khÃ´ng pháº£i thÃ nh viÃªn)" className="input-base" />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Sá»‘ tiá»n (VNÄ) <span className="text-red-500">*</span></label>
              <input required type="number" min={0} value={form.amount}
                onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">NgÃ y thu</label>
              <input type="date" value={form.paymentDate}
                onChange={e => setForm({ ...form, paymentDate: e.target.value })} className="input-base" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">HÃ¬nh thá»©c thanh toÃ¡n</label>
            <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="input-base">
              <option value="bank_transfer">Chuyá»ƒn khoáº£n</option>
              <option value="cash">Tiá»n máº·t</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Ghi chÃº</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="ThÃ´ng tin thÃªm..." className="input-base" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="XÃ³a khoáº£n thu?"
        message="Khoáº£n thu nÃ y sáº½ bá»‹ xÃ³a vÄ©nh viá»…n vÃ  khÃ´ng thá»ƒ khÃ´i phá»¥c láº¡i."
        confirmLabel="XÃ³a"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

