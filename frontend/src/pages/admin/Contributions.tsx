import { useState, useMemo, useEffect, useCallback } from 'react'
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
import { PeriodSelector } from '../../components/ui/PeriodSelector'
import { BulkActionBar, RowCheckbox } from '../../components/shared'
import { useBulkSelection } from '../../hooks/useBulkSelection'

const BLANK_COMMON = {
  fundSource: 'COMMON' as FundSource,
  memberId: '', amount: 1000000 as number | '',
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'bank_transfer', notes: '',
  // MINI
  miniIncomeType: 'PENALTY' as MiniIncomeType,
  payerName: '',
}

export function Contributions() {
  const { user } = useAuthStore()
  const isMember = user?.role === 'MEMBER_VIEW'
  const clubId = user?.clubId ?? ''
  const { getClubData, setContributions: saveContributions, setFundPeriods } = useClubDataStore()
  const data = getClubData(clubId)
  const contributions = data.contributions
  const members = data.members

  const chungPeriods = useMemo(() =>
    data.fundPeriods
      .filter(p => (p.type ?? 'chung') === 'chung')
      .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [data.fundPeriods]
  )
  const activePeriod = chungPeriods.find(p => p.status === 'active') ?? chungPeriods[0]
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() =>
    activePeriod?.id ?? ''
  )
  const selectedPeriod = chungPeriods.find(p => p.id === selectedPeriodId) ?? chungPeriods[0]

  const setContributions = useCallback((fn: (prev: FundContribution[]) => FundContribution[]) =>
    saveContributions(clubId, fn(getClubData(clubId).contributions)),
  [clubId, saveContributions, getClubData])

  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<FundContribution | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formPeriodId, setFormPeriodId] = useState<string>(activePeriod?.id ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [bulkAll, setBulkAll] = useState(false)
  const [form, setForm] = useState<typeof BLANK_COMMON>({ ...BLANK_COMMON, amount: activePeriod?.contributionAmount ?? 1000000 })

  // Refresh contributions + periods when page mounts (in case data changed from another tab/session)
  useEffect(() => {
    if (!clubId) return
    Promise.allSettled([
      api.get(`/contributions?clubId=${clubId}`),
      api.get(`/fund-periods?clubId=${clubId}`),
    ]).then(([contribsRes, periodsRes]) => {
      if (contribsRes.status === 'fulfilled') {
        const raw = contribsRes.value.data?.data ?? []
        saveContributions(clubId, raw.map((c: any) => ({
          id: c.id, clubId: c.clubId, fundSource: c.fundSource ?? 'COMMON',
          fundPeriodId: c.fundPeriodId ?? undefined,
          memberId: c.memberId ?? undefined,
          member: c.member ? { id: c.memberId, fullName: c.member.fullName } : undefined,
          amount: Number(c.amount), paymentDate: c.paymentDate?.slice(0, 10) ?? '',
          paymentMethod: c.paymentMethod ?? 'bank_transfer',
          isConfirmed: c.isConfirmed ?? false, notes: c.notes ?? undefined,
          miniIncomeType: c.miniIncomeType ?? undefined, payerName: c.payerName ?? undefined,
          createdAt: c.createdAt ?? '', createdBy: c.createdById ?? '',
        })))
      }
      if (periodsRes.status === 'fulfilled') {
        const raw = periodsRes.value.data?.data ?? []
        setFundPeriods(clubId, raw.map((p: any) => ({
          id: p.id, clubId: p.clubId, name: p.name,
          startDate: p.startDate?.slice(0, 10) ?? '', endDate: p.endDate?.slice(0, 10) ?? '',
          contributionAmount: Number(p.contributionAmount), totalSessions: p.totalSessions ?? 0,
          status: p.status, notes: p.notes ?? undefined, type: p.type ?? 'chung',
          finalizedAt: p.finalizedAt ?? undefined, createdBy: p.createdById ?? '',
        })))
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  // Sync selectedPeriodId and formPeriodId once activePeriod is known (handles async load)
  useEffect(() => {
    if (!activePeriod?.id) return
    setSelectedPeriodId(prev => prev || activePeriod.id)
    setFormPeriodId(prev => prev || activePeriod.id)
  }, [activePeriod?.id])

  const commonContribs = contributions.filter(c =>
    (c.fundSource ?? 'COMMON') === 'COMMON' &&
    (selectedPeriod ? c.fundPeriodId === selectedPeriod.id : true)
  )
  const miniContribs = contributions.filter(c => c.fundSource === 'MINI')

  // Phân trang bảng (client) — Quỹ Phụ có thể dài dần; Quỹ Chính theo kỳ (bounded). Chỉ hiện
  // điều khiển trang khi vượt PAGE_SIZE. Bulk "chọn tất cả" vẫn áp cho toàn bộ (mọi trang).
  const PAGE_SIZE = 12
  const [commonPage, setCommonPage] = useState(1)
  const [miniPage, setMiniPage] = useState(1)
  const commonPages = Math.max(1, Math.ceil(commonContribs.length / PAGE_SIZE))
  const miniPages = Math.max(1, Math.ceil(miniContribs.length / PAGE_SIZE))
  useEffect(() => { if (commonPage > commonPages) setCommonPage(commonPages) }, [commonPage, commonPages])
  useEffect(() => { if (miniPage > miniPages) setMiniPage(miniPages) }, [miniPage, miniPages])
  useEffect(() => { setCommonPage(1) }, [selectedPeriodId])
  const commonPageRows = commonContribs.slice((commonPage - 1) * PAGE_SIZE, commonPage * PAGE_SIZE)
  const miniPageRows = miniContribs.slice((miniPage - 1) * PAGE_SIZE, miniPage * PAGE_SIZE)

  // Chọn & xóa nhiều khoản thu cùng lúc — dùng chung 1 vùng chọn cho cả 2 bảng (Quỹ Chính +
  // Quỹ Phụ), mỗi bảng có ô "chọn tất cả" riêng cho các dòng của bảng đó.
  const bulk = useBulkSelection([...commonContribs, ...miniContribs], c => c.id)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const subsetAllSelected = (list: FundContribution[]) =>
    list.length > 0 && list.every(c => bulk.selectedIds.has(c.id))
  const toggleSubset = (list: FundContribution[]) => bulk.setSelectedIds(prev => {
    const n = new Set(prev)
    const all = list.length > 0 && list.every(c => n.has(c.id))
    if (all) list.forEach(c => n.delete(c.id)); else list.forEach(c => n.add(c.id))
    return n
  })
  const handleBulkDelete = async () => {
    const ids = [...bulk.selectedIds]
    if (ids.length === 0) return
    if (!window.confirm(`Xóa ${ids.length} khoản thu đã chọn? Hành động này không thể hoàn tác.`)) return
    setBulkDeleting(true)
    try {
      const results = await Promise.allSettled(ids.map(id => api.delete(`/contributions/${id}`)))
      const okIds = ids.filter((_, i) => results[i].status === 'fulfilled')
      if (okIds.length > 0) {
        const okSet = new Set(okIds)
        setContributions(prev => prev.filter(x => !okSet.has(x.id)))
      }
      bulk.clear()
      const failed = ids.length - okIds.length
      if (failed === 0) toast.success(`Đã xóa ${okIds.length} khoản thu`)
      else if (okIds.length === 0) toast.error(`Không xóa được khoản thu nào (${failed} lỗi)`)
      else toast.error(`Đã xóa ${okIds.length}, còn ${failed} khoản không xóa được`)
    } finally {
      setBulkDeleting(false)
    }
  }

  const confirmed = commonContribs.filter(c => c.isConfirmed)
  const unconfirmed = commonContribs.filter(c => !c.isConfirmed)
  const commonTotal = confirmed.reduce((s, c) => s + c.amount, 0)
  const miniTotal = miniContribs.filter(c => c.isConfirmed).reduce((s, c) => s + c.amount, 0)

  const openCreate = () => {
    const pid = activePeriod?.id ?? ''
    setFormPeriodId(pid)
    setForm({ ...BLANK_COMMON, amount: activePeriod?.contributionAmount ?? 1000000 })
    setEditTarget(null)
    setBulkAll(false)
    setShowCreate(true)
  }

  const openEdit = (c: FundContribution) => {
    setEditTarget(c)
    setFormPeriodId(c.fundPeriodId ?? activePeriod?.id ?? '')
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
      toast.success('Cập nhật trạng thái đóng quỹ')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cập nhật trạng thái thất bại')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    const isCommon = form.fundSource === 'COMMON'

    if (isCommon) {
      if (!formPeriodId) {
        toast.error('Cần có kỳ quỹ đang hoạt động để ghi nhận Quỹ Chính')
        setIsSaving(false)
        return
      }
      // BULK: ghi nhận cho tất cả thành viên active CHƯA đóng kỳ này
      if (!editTarget && bulkAll) {
        // Loại mọi TV đã CÓ bản ghi khoản thu kỳ này (đã đóng hoặc chờ xác nhận) → tránh tạo trùng
        const recordedIds = new Set(
          commonContribs.filter(c => c.fundPeriodId === formPeriodId).map(c => c.memberId),
        )
        const targets = members.filter(m => m.status === 'active' && !recordedIds.has(m.id))
        if (targets.length === 0) {
          toast.error('Tất cả thành viên đã đóng kỳ này')
          setIsSaving(false)
          return
        }
        const results = await Promise.allSettled(
          targets.map(m => api.post('/contributions', {
            fundSource: 'COMMON', memberId: m.id, fundPeriodId: formPeriodId,
            amount: Number(form.amount),
            paidAt: form.paymentDate, paymentMethod: form.paymentMethod, notes: form.notes,
          })),
        )
        const created = results.flatMap((r, i) =>
          r.status === 'fulfilled'
            ? [{ ...r.value.data?.data, amount: Number(r.value.data?.data?.amount), member: targets[i], fundSource: 'COMMON' as const }]
            : [],
        )
        if (created.length) setContributions(prev => [...prev, ...created])
        const failed = targets.length - created.length
        toast.success(`Đã ghi nhận ${created.length} thành viên đóng ${formatVND(Number(form.amount))}${failed ? ` (${failed} lỗi)` : ''}`)
        setIsSaving(false)
        setShowCreate(false)
        return
      }

      const member = members.find(m => m.id === form.memberId)
      if (!member) { setIsSaving(false); return }

      const payload = {
        fundSource: 'COMMON', memberId: member.id,
        fundPeriodId: formPeriodId,
        amount: Number(form.amount),
        paidAt: form.paymentDate, paymentMethod: form.paymentMethod, notes: form.notes,
      }
      try {
        if (editTarget) {
          // fundSource bất biến — DTO update KHÔNG nhận field này (forbidNonWhitelisted).
          const { fundSource: _omitFs, ...updatePayload } = payload
          const res = await api.put(`/contributions/${editTarget.id}`, updatePayload)
          const updated = res.data?.data
          setContributions(prev => prev.map(c => c.id === editTarget.id
            ? { ...c, ...updated, amount: Number(updated.amount), member } : c))
          toast.success(`Đã cập nhật khoản thu của ${member.fullName}`)
        } else {
          const res = await api.post('/contributions', payload)
          const created = res.data?.data
          setContributions(prev => [...prev, { ...created, amount: Number(created.amount), member, fundSource: 'COMMON' as const }])
          toast.success(`Đã ghi nhận ${member.fullName} đóng ${formatVND(Number(form.amount))} vào Quỹ Chính`)
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Lưu khoản thu thất bại')
        setIsSaving(false)
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
          // fundSource bất biến — DTO update KHÔNG nhận field này (forbidNonWhitelisted).
          const { fundSource: _omitFs, ...updatePayload } = payload
          await api.put(`/contributions/${editTarget.id}`, updatePayload)
          setContributions(prev => prev.map(c => c.id === editTarget.id ? { ...c, ...payload, id: c.id } : c))
          toast.success('Đã cập nhật khoản thu Quỹ Phụ')
        } else {
          const res = await api.post('/contributions', payload)
          const created = res.data?.data
          setContributions(prev => [...prev, { ...created, amount: Number(created.amount), fundSource: 'MINI' as const }])
          toast.success(`Đã ghi nhận ${formatVND(Number(form.amount))} vào Quỹ Phụ — ${MINI_INCOME_TYPE_LABELS[form.miniIncomeType]}`)
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Lưu khoản thu thất bại')
        setIsSaving(false)
        return
      }
    }
    setIsSaving(false)
    setShowCreate(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/contributions/${deleteId}`)
      setContributions(prev => prev.filter(x => x.id !== deleteId))
      setDeleteId(null)
      toast.success('Đã xóa khoản thu')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xóa khoản thu thất bại')
    }
  }

  const [mobileTab, setMobileTab] = useState<'COMMON' | 'MINI'>('COMMON')

  const isMobile = useIsMobile()

  /* ── Mobile layout ── */
  if (isMobile) {
    const sortedCommon = [...commonContribs].sort((a, b) => b.createdAt?.localeCompare(a.createdAt ?? '') ?? 0)
    const sortedMini = [...miniContribs].sort((a, b) => b.createdAt?.localeCompare(a.createdAt ?? '') ?? 0)
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-[700] text-slate-900">Thu Quỹ</h2>
            <p className="text-[12px] text-slate-400">{chungPeriods.find(p => p.id === selectedPeriodId)?.name ?? activePeriod?.name ?? 'Chưa có kỳ quỹ'}</p>
          </div>
          <div className="flex items-center gap-2">
            {contributions.length > 0 && (
              <>
                <button
                  onClick={() => exportContribExcel(activePeriod?.name ?? 'ThuQuy', contributions.map(c => ({ member: c.member?.fullName ?? c.payerName ?? '', date: formatDate(c.paymentDate), amount: c.amount, method: c.paymentMethod, confirmed: c.isConfirmed })))}
                  aria-label="Xuất Excel"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 active:bg-slate-200"
                >
                  <FileSpreadsheet size={16} />
                </button>
                <button
                  onClick={() => exportContribPDF(activePeriod?.name ?? 'Thu Quỹ', contributions.map(c => ({ member: c.member?.fullName ?? c.payerName ?? '', date: formatDate(c.paymentDate), amount: c.amount, method: c.paymentMethod, confirmed: c.isConfirmed })), commonTotal + miniTotal)}
                  aria-label="Xuất PDF"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 active:bg-slate-200"
                >
                  <FileText size={16} />
                </button>
              </>
            )}
            {!isMember && (
              <button
                onClick={openCreate}
                aria-label="Thêm khoản thu"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                style={{ background: 'var(--pf-primary)' }}
              >
                <Plus size={18} />
              </button>
            )}
          </div>
          </div>
          <PeriodSelector periods={chungPeriods} selectedId={selectedPeriodId} onChange={setSelectedPeriodId} label="Kỳ quỹ" />
        </div>

        {/* Summary row */}
        <div className="px-4 pt-3 pb-1 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-[16px] border border-slate-100 px-4 py-3 shadow-sm">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Quỹ Chính</p>
            <p className="text-[18px] font-[700] [color:var(--pf-primary)] tabular-nums">{formatVND(commonTotal)}</p>
          </div>
          <div className="bg-white rounded-[16px] border border-slate-100 px-4 py-3 shadow-sm">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Quỹ Phụ</p>
            <p className="text-[18px] font-[700] [color:var(--pf-color-info)] tabular-nums">{formatVND(miniTotal)}</p>
          </div>
        </div>

        {/* Mobile Fund Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-[12px] p-1 mx-4 mt-2">
          <button
            onClick={() => setMobileTab('COMMON')}
            className={`flex-1 py-2 rounded-[10px] text-[12px] font-[700] transition-all ${mobileTab === 'COMMON' ? 'bg-white [color:var(--pf-primary)] shadow-sm' : 'text-slate-500'}`}
          >
            Quỹ Chính
          </button>
          <button
            onClick={() => setMobileTab('MINI')}
            className={`flex-1 py-2 rounded-[10px] text-[12px] font-[700] transition-all ${mobileTab === 'MINI' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
          >
            Quỹ Phụ
          </button>
        </div>

        <div className="px-4 pt-3 pb-6 space-y-2">
          {mobileTab === 'COMMON' ? (
            sortedCommon.length === 0 ? (
              <div className="text-center py-14 text-slate-400 text-sm">
                <DollarSign size={36} className="mx-auto text-slate-200 mb-3" />
                Chưa có khoản thu nào
              </div>
            ) : sortedCommon.map(c => {
              const memberName = members.find(m => m.id === c.memberId)?.fullName ?? c.payerName ?? 'N/A'
              return (
                <MobileTransactionCard
                  key={c.id}
                  name={memberName}
                  description={c.notes ?? c.paymentMethod}
                  amount={c.amount}
                  type="income"
                  fundSource={c.fundSource ?? 'COMMON'}
                  status={c.isConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}
                  actions={isMember ? undefined : (
                    <>
                      <button onClick={() => toggleConfirm(c.id)} className={`p-1.5 ${c.isConfirmed ? 'text-emerald-500 active:text-slate-400' : 'text-slate-300 active:text-emerald-500'}`}>
                        {c.isConfirmed ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      </button>
                      <button onClick={() => openEdit(c)} className="text-slate-400 active:[color:var(--pf-primary)] p-1.5"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteId(c.id)} className="text-slate-300 active:text-red-500 p-1.5"><Trash2 size={14} /></button>
                    </>
                  )}
                />
              )
            })
          ) : (
            sortedMini.length === 0 ? (
              <div className="text-center py-14 text-slate-400 text-sm">
                <DollarSign size={36} className="mx-auto text-slate-200 mb-3" />
                Chưa có khoản thu Quỹ Phụ nào
              </div>
            ) : sortedMini.map(c => {
              const memberName = c.payerName ?? members.find(m => m.id === c.memberId)?.fullName ?? 'N/A'
              return (
                <MobileTransactionCard
                  key={c.id}
                  name={memberName}
                  description={MINI_INCOME_TYPE_LABELS[c.miniIncomeType ?? 'OTHER']}
                  amount={c.amount}
                  type="income"
                  fundSource="MINI"
                  status={c.isConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}
                  actions={isMember ? undefined : (
                    <>
                      <button onClick={() => toggleConfirm(c.id)} className={`p-1.5 ${c.isConfirmed ? 'text-emerald-500 active:text-slate-400' : 'text-slate-300 active:text-emerald-500'}`}>
                        {c.isConfirmed ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      </button>
                      <button onClick={() => openEdit(c)} className="text-slate-400 active:[color:var(--pf-primary)] p-1.5"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteId(c.id)} className="text-slate-300 active:text-red-500 p-1.5"><Trash2 size={14} /></button>
                    </>
                  )}
                />
              )
            })
          )}
        </div>

        {/* Create / Edit Modal — full form on mobile */}
        <Modal
          open={showCreate}
          onClose={() => { setShowCreate(false); setEditTarget(null) }}
          title={editTarget ? 'Sửa Khoản Thu' : 'Ghi Nhận Khoản Thu'}
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="outline" type="button" onClick={() => { setShowCreate(false); setEditTarget(null) }}>Hủy</Button>
              <Button type="submit" form="form-contrib-mobile" disabled={isSaving || (form.fundSource === 'COMMON' && !activePeriod)}>{isSaving ? 'Đang lưu...' : (editTarget ? 'Lưu' : 'Ghi nhận')}</Button>
            </div>
          }
        >
          <form id="form-contrib-mobile" onSubmit={handleSubmit} className="space-y-4 p-1">
            {!editTarget && (
              <div className="grid grid-cols-2 gap-2">
                {(['COMMON', 'MINI'] as FundSource[]).map(fs => (
                  <button key={fs} type="button"
                    onClick={() => setForm(f => ({ ...f, fundSource: fs, amount: fs === 'MINI' ? '' : (activePeriod?.contributionAmount ?? 1000000) }))}
                    className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2 ${
                      form.fundSource === fs
                        ? fs === 'COMMON' ? '[border-color:var(--pf-primary)] [background:var(--pf-primary-soft)] [color:var(--pf-primary)]' : '[border-color:var(--pf-primary)] [background:var(--pf-primary-soft)] [color:var(--pf-primary)]'
                        : 'border-slate-200 text-slate-500'
                    }`}>
                    {fs === 'COMMON' ? <DollarSign size={14} /> : <Wallet size={14} />}
                    {fs === 'COMMON' ? 'Quỹ Chính' : 'Quỹ Phụ'}
                  </button>
                ))}
              </div>
            )}
            {form.fundSource === 'COMMON' ? (
              <>
                {!activePeriod && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                    Chưa có kỳ quỹ đang hoạt động. Vui lòng tạo kỳ quỹ trước khi ghi nhận Quỹ Chính.
                  </div>
                )}
                {!editTarget && (
                  <label className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer [border-color:var(--pf-border)]">
                    <input type="checkbox" checked={bulkAll} onChange={e => setBulkAll(e.target.checked)} className="h-4 w-4 rounded accent-[var(--pf-primary)]" />
                    <span className="text-xs font-medium text-slate-700">Ghi cho <strong>tất cả TV chưa đóng</strong> kỳ này</span>
                  </label>
                )}
                <div className={bulkAll ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Thành viên <span className="text-red-500">*</span></label>
                  <select required={!bulkAll} disabled={bulkAll} value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} className="input-base">
                    <option value="">-- Chọn thành viên --</option>
                    {members.filter(m => m.status === 'active' || m.id === editTarget?.memberId).map(m => <option key={m.id} value={m.id}>{m.fullName}{m.status !== 'active' ? ' (tạm nghỉ)' : ''}</option>)}
                  </select>
                </div>
                {chungPeriods.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Kỳ quỹ <span className="text-red-500">*</span></label>
                    <select required value={formPeriodId} onChange={e => {
                      const p = chungPeriods.find(x => x.id === e.target.value)
                      setFormPeriodId(e.target.value)
                      if (p && !editTarget) setForm(f => ({ ...f, amount: p.contributionAmount }))
                    }} className="input-base">
                      <option value="">-- Chọn kỳ quỹ --</option>
                      {chungPeriods.map(p => (
                        <option key={p.id} value={p.id}>{p.name}{p.status === 'active' ? ' — Đang mở' : p.status === 'closed' ? ' — Đóng' : ' — Chuẩn bị'}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Loại thu Quỹ Phụ <span className="text-red-500">*</span></label>
                  <select required value={form.miniIncomeType} onChange={e => setForm({ ...form, miniIncomeType: e.target.value as MiniIncomeType })} className="input-base">
                    {(Object.entries(MINI_INCOME_TYPE_LABELS) as [MiniIncomeType, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Người nộp</label>
                  <input value={form.payerName} onChange={e => setForm({ ...form, payerName: e.target.value })}
                    placeholder="Tên người nộp (nếu không phải thành viên)" className="input-base" />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Số tiền (VNĐ) <span className="text-red-500">*</span></label>
                <input required type="number" min={0} value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value === '' ? '' : Number(e.target.value) })} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày thu</label>
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
        <ConfirmDialog open={!!deleteId} title="Xóa khoản thu?" message="Hành động này không thể hoàn tác." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Thu Quỹ"
        subtitle={selectedPeriod ? `${selectedPeriod.name} — Quỹ Chính: ${formatVND(commonTotal)} | Quỹ Phụ: ${formatVND(miniTotal)}` : 'Chưa có kỳ quỹ nào'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const pName = activePeriod?.name ?? 'Thu_Quy'
              exportContribExcel(pName, contributions.map(c => ({ member: c.member?.fullName ?? c.payerName ?? '', date: formatDate(c.paymentDate), amount: c.amount, method: c.paymentMethod, confirmed: c.isConfirmed })))
              toast.success('Đã xuất Excel danh sách thu quỹ!')
            }}><FileSpreadsheet size={14} />Excel</Button>
            <Button variant="outline" onClick={() => {
              const pName = activePeriod?.name ?? 'Thu Quỹ'
              exportContribPDF(pName, contributions.map(c => ({ member: c.member?.fullName ?? c.payerName ?? '', date: formatDate(c.paymentDate), amount: c.amount, method: c.paymentMethod, confirmed: c.isConfirmed })), commonTotal + miniTotal)
              toast.success('Đã xuất PDF danh sách thu quỹ!')
            }}><FileText size={14} />PDF</Button>
            {!isMember && (
              <Button onClick={openCreate}>
                <Plus size={15} />Ghi nhận thu
              </Button>
            )}
          </div>
        }
      />

      {chungPeriods.length > 1 && (
        <div className="px-6 pt-4 pb-0">
          <PeriodSelector periods={chungPeriods} selectedId={selectedPeriodId} onChange={setSelectedPeriodId} label="Lọc theo kỳ" />
        </div>
      )}

      <div className="p-6 max-w-[1200px] mx-auto space-y-5">
        {/* Summary cards — split by fund source */}
        <div className="grid grid-cols-2 gap-4">
          {/* Quỹ Chính */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg [background:var(--pf-primary-soft)] flex items-center justify-center">
                <DollarSign size={14} className="[color:var(--pf-primary)]" />
              </div>
              <p className="text-xs font-semibold [color:var(--pf-primary)] uppercase tracking-wide">Quỹ Chính</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatVND(commonTotal)}</p>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              <span className="text-emerald-600">✓ {confirmed.length} xác nhận ({formatVND(confirmed.reduce((s, c) => s + c.amount, 0))})</span>
              <span className="text-amber-600">⏳ {unconfirmed.length} chờ ({formatVND(unconfirmed.reduce((s, c) => s + c.amount, 0))})</span>
            </div>
          </div>
          {/* Quỹ Phụ */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg [background:var(--pf-primary-soft)] flex items-center justify-center">
                <Wallet size={14} className="[color:var(--pf-primary)]" />
              </div>
              <p className="text-xs font-semibold [color:var(--pf-primary)] uppercase tracking-wide">Quỹ Phụ</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatVND(miniTotal)}</p>
            <div className="flex gap-3 mt-2 flex-wrap">
              {Object.entries(MINI_INCOME_TYPE_LABELS).map(([k, label]) => {
                const amt = miniContribs.filter(c => c.miniIncomeType === k).reduce((s, c) => s + c.amount, 0)
                if (!amt) return null
                return <span key={k} className="text-xs text-slate-500">{label}: {formatVND(amt)}</span>
              })}
              {miniContribs.length === 0 && <span className="text-xs text-slate-400">Chưa có giao dịch</span>}
            </div>
          </div>
        </div>

        {/* Thanh xóa hàng loạt (chung cho cả 2 bảng) */}
        {!isMember && bulk.someSelected && (
          <div className="rounded-xl overflow-hidden border border-red-100 shadow-[var(--shadow-card)]">
            <BulkActionBar
              count={bulk.selectedIds.size}
              onClear={bulk.clear}
              onDelete={handleBulkDelete}
              deleting={bulkDeleting}
              noun="khoản thu"
            />
          </div>
        )}

        {/* COMMON contributions table */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded [background:var(--pf-primary-soft)] flex items-center justify-center"><DollarSign size={11} className="[color:var(--pf-primary)]" /></div>
            <h3 className="text-sm font-semibold text-slate-700">Quỹ Chính</h3>
          </div>
          {commonContribs.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 py-8 text-center">
              <p className="text-sm text-slate-400">Chưa có khoản thu Quỹ Chính nào.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    {!isMember && (
                      <th className="w-10 text-center">
                        <RowCheckbox label="Chọn tất cả khoản thu Quỹ Chính" checked={subsetAllSelected(commonContribs)} indeterminate={commonContribs.some(c => bulk.selectedIds.has(c.id)) && !subsetAllSelected(commonContribs)} onChange={() => toggleSubset(commonContribs)} />
                      </th>
                    )}
                    <th>Thành viên</th>
                    <th className="text-center">Ngày đóng</th>
                    <th className="text-right">Số tiền</th>
                    <th className="text-center">Hình thức</th>
                    <th className="text-center">Trạng thái</th>
                    {!isMember && <th className="text-center w-16">Xác nhận</th>}
                    {!isMember && <th className="text-center w-20">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {commonPageRows.map(c => (
                    <tr key={c.id} className={bulk.selectedIds.has(c.id) ? 'bg-red-50/50' : (!c.isConfirmed ? 'bg-amber-50/30' : '')}>
                      {!isMember && (
                        <td className="text-center">
                          <RowCheckbox label="Chọn khoản thu" checked={bulk.selectedIds.has(c.id)} onChange={() => bulk.toggleOne(c.id)} />
                        </td>
                      )}
                      <td className="font-medium text-slate-900">{c.member?.fullName ?? c.memberId}</td>
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
                      {!isMember && (
                        <td className="text-center">
                          <button onClick={() => toggleConfirm(c.id)}
                            className={`transition-colors ${c.isConfirmed ? 'text-emerald-500 hover:text-slate-300' : 'text-slate-200 hover:text-emerald-500'}`}>
                            {c.isConfirmed ? <CheckCircle size={18} /> : <XCircle size={18} />}
                          </button>
                        </td>
                      )}
                      {!isMember && (
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEdit(c)}
                              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:[background:var(--pf-primary-soft)] hover:[color:var(--pf-primary)] transition-colors"
                              title="Sửa"><Edit2 size={13} /></button>
                            <button onClick={() => setDeleteId(c.id)}
                              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Xóa"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {commonPages > 1 && (
            <div className="flex items-center justify-end gap-2 px-1 text-xs text-slate-500">
              <button disabled={commonPage <= 1} onClick={() => setCommonPage(p => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Trước</button>
              <span>Trang {commonPage}/{commonPages}</span>
              <button disabled={commonPage >= commonPages} onClick={() => setCommonPage(p => Math.min(commonPages, p + 1))}
                className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Sau</button>
            </div>
          )}
        </div>

        {/* MINI contributions table */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded [background:var(--pf-primary-soft)] flex items-center justify-center"><Wallet size={11} className="[color:var(--pf-primary)]" /></div>
            <h3 className="text-sm font-semibold text-slate-700">Quỹ Phụ</h3>
          </div>
          {miniContribs.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 py-8 text-center">
              <p className="text-sm text-slate-400">Chưa có khoản thu Quỹ Phụ nào.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    {!isMember && (
                      <th className="w-10 text-center">
                        <RowCheckbox label="Chọn tất cả khoản thu Quỹ Phụ" checked={subsetAllSelected(miniContribs)} indeterminate={miniContribs.some(c => bulk.selectedIds.has(c.id)) && !subsetAllSelected(miniContribs)} onChange={() => toggleSubset(miniContribs)} />
                      </th>
                    )}
                    <th>Người nộp</th>
                    <th>Loại thu</th>
                    <th className="text-center">Ngày</th>
                    <th className="text-right">Số tiền</th>
                    <th className="text-center">Hình thức</th>
                    <th className="text-center">Trạng thái</th>
                    {!isMember && <th className="text-center w-16">Xác nhận</th>}
                    {!isMember && <th className="text-center w-20">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {miniPageRows.map(c => (
                    <tr key={c.id} className={bulk.selectedIds.has(c.id) ? 'bg-red-50/50' : (!c.isConfirmed ? 'bg-amber-50/30' : '')}>
                      {!isMember && (
                        <td className="text-center">
                          <RowCheckbox label="Chọn khoản thu" checked={bulk.selectedIds.has(c.id)} onChange={() => bulk.toggleOne(c.id)} />
                        </td>
                      )}
                      <td className="font-medium text-slate-900">{c.payerName ?? c.member?.fullName ?? 'Không rõ'}</td>
                      <td>
                        <Badge variant="indigo">{MINI_INCOME_TYPE_LABELS[c.miniIncomeType ?? 'OTHER']}</Badge>
                      </td>
                      <td className="text-center text-slate-500 text-xs">{formatDate(c.paymentDate)}</td>
                      <td className="text-right font-semibold [color:var(--pf-primary)]">{formatVND(c.amount)}</td>
                      <td className="text-center">
                        <Badge variant="gray">{c.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</Badge>
                      </td>
                      <td className="text-center">
                        {c.isConfirmed
                          ? <Badge variant="green" dot>Xác nhận</Badge>
                          : <Badge variant="yellow" dot>Chờ</Badge>}
                      </td>
                      {!isMember && (
                        <td className="text-center">
                          <button onClick={() => toggleConfirm(c.id)}
                            className={`transition-colors ${c.isConfirmed ? 'text-emerald-500 hover:text-slate-300' : 'text-slate-200 hover:text-emerald-500'}`}>
                            {c.isConfirmed ? <CheckCircle size={18} /> : <XCircle size={18} />}
                          </button>
                        </td>
                      )}
                      {!isMember && (
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEdit(c)}
                              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:[background:var(--pf-primary-soft)] hover:[color:var(--pf-primary)] transition-colors"
                              title="Sửa"><Edit2 size={13} /></button>
                            <button onClick={() => setDeleteId(c.id)}
                              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Xóa"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {miniPages > 1 && (
            <div className="flex items-center justify-end gap-2 px-1 text-xs text-slate-500">
              <button disabled={miniPage <= 1} onClick={() => setMiniPage(p => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Trước</button>
              <span>Trang {miniPage}/{miniPages}</span>
              <button disabled={miniPage >= miniPages} onClick={() => setMiniPage(p => Math.min(miniPages, p + 1))}
                className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Sau</button>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={editTarget ? 'Sửa Khoản Thu' : 'Ghi Nhận Khoản Thu'}
        subtitle={editTarget ? 'Cập nhật thông tin đóng quỹ' : 'Chọn nguồn quỹ để ghi nhận'}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Hủy bỏ</Button>
            <Button type="submit" form="form-contrib" disabled={isSaving || (form.fundSource === 'COMMON' && !activePeriod)}>{isSaving ? 'Đang lưu...' : (editTarget ? 'Lưu thay đổi' : 'Ghi nhận')}</Button>
          </div>
        }
      >
        <form id="form-contrib" onSubmit={handleSubmit} className="space-y-4">
          {/* Fund source selector */}
          {!editTarget && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Nguồn quỹ <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {(['COMMON', 'MINI'] as FundSource[]).map(fs => (
                  <button
                    key={fs}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, fundSource: fs, amount: fs === 'MINI' ? '' : (activePeriod?.contributionAmount ?? 1000000) }))}
                    className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center gap-2 ${
                      form.fundSource === fs
                        ? fs === 'COMMON'
                          ? '[border-color:var(--pf-primary)] [background:var(--pf-primary-soft)] [color:var(--pf-primary)]'
                          : '[border-color:var(--pf-primary)] [background:var(--pf-primary-soft)] [color:var(--pf-primary)]'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {fs === 'COMMON' ? <DollarSign size={14} /> : <Wallet size={14} />}
                    {fs === 'COMMON' ? 'Quỹ Chính' : 'Quỹ Phụ'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.fundSource === 'COMMON' ? (
            <>
              {!activePeriod && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                  Chưa có kỳ quỹ đang hoạt động. Vui lòng tạo kỳ quỹ trước khi ghi nhận Quỹ Chính.
                </div>
              )}
              {!editTarget && (
                <label className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer [border-color:var(--pf-border)]">
                  <input type="checkbox" checked={bulkAll} onChange={e => setBulkAll(e.target.checked)} className="h-4 w-4 rounded accent-[var(--pf-primary)]" />
                  <span className="text-xs font-medium text-slate-700">Ghi cho <strong>tất cả thành viên chưa đóng</strong> kỳ này</span>
                </label>
              )}
              <div className={bulkAll ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Thành viên <span className="text-red-500">*</span></label>
                <select required={!bulkAll} disabled={bulkAll} value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} className="input-base">
                  <option value="">-- Chọn thành viên --</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                </select>
              </div>
              {chungPeriods.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Kỳ quỹ <span className="text-red-500">*</span></label>
                  <select required value={formPeriodId} onChange={e => {
                    const p = chungPeriods.find(x => x.id === e.target.value)
                    setFormPeriodId(e.target.value)
                    if (p && !editTarget) setForm(f => ({ ...f, amount: p.contributionAmount }))
                  }} className="input-base">
                    <option value="">-- Chọn kỳ quỹ --</option>
                    {chungPeriods.map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.status === 'active' ? ' — Đang mở' : p.status === 'closed' ? ' — Đóng' : ' — Chuẩn bị'}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Loại thu Quỹ Phụ <span className="text-red-500">*</span></label>
                <select required value={form.miniIncomeType} onChange={e => setForm({ ...form, miniIncomeType: e.target.value as MiniIncomeType })} className="input-base">
                  {(Object.entries(MINI_INCOME_TYPE_LABELS) as [MiniIncomeType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Người nộp</label>
                <input value={form.payerName} onChange={e => setForm({ ...form, payerName: e.target.value })}
                  placeholder="Tên người nộp (nếu không phải thành viên)" className="input-base" />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Số tiền (VNĐ) <span className="text-red-500">*</span></label>
              <input required type="number" min={0} value={form.amount}
                onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày thu</label>
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
