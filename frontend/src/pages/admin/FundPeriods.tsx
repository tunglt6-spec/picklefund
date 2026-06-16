import { useState } from 'react'
import { Plus, Calendar, CheckCircle, FolderOpen, Clock } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { FundPeriod, FundPeriodStatus } from '../../types'
import { formatDate, formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

const statusLabel: Record<FundPeriodStatus, string> = {
  draft: 'Nháp', active: 'Đang mở', closed: 'Đã đóng', finalized: 'Đã chốt'
}
const statusVariant: Record<FundPeriodStatus, 'gray' | 'green' | 'yellow' | 'indigo'> = {
  draft: 'gray', active: 'green', closed: 'yellow', finalized: 'indigo'
}

export function FundPeriods() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
  const { getClubData, setFundPeriods: savePeriods } = useClubDataStore()
  const periods = getClubData(clubId).fundPeriods
  const setPeriods = (fn: (prev: FundPeriod[]) => FundPeriod[]) =>
    savePeriods(clubId, fn(getClubData(clubId).fundPeriods))

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '', startDate: '', endDate: '', contributionAmount: 1000000, totalSessions: 13, notes: ''
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const newPeriod: FundPeriod = {
      id: `fp-${Date.now()}`, clubId, createdBy: user?.id ?? 'user-1', status: 'active',
      ...form, contributionAmount: Number(form.contributionAmount), totalSessions: Number(form.totalSessions)
    }
    setPeriods(prev => [newPeriod, ...prev])
    setShowCreate(false)
    setForm({ name: '', startDate: '', endDate: '', contributionAmount: 1000000, totalSessions: 13, notes: '' })
    toast.success(`Tạo kỳ quỹ ${form.name} thành công!`)
  }

  const memberCount = getClubData(clubId).members.length

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Kỳ Quỹ"
        subtitle="Quản lý các kỳ thu/chi quỹ CLB"
        actions={<Button onClick={() => setShowCreate(true)}><Plus size={15} />Tạo kỳ quỹ</Button>}
      />

      <div className="p-6 max-w-[900px] mx-auto space-y-3">
        {periods.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <FolderOpen size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">Chưa có kỳ quỹ nào</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Tạo kỳ quỹ đầu tiên để bắt đầu quản lý thu chi</p>
            <Button onClick={() => setShowCreate(true)} size="sm"><Plus size={14} />Tạo kỳ quỹ đầu tiên</Button>
          </div>
        ) : periods.map(period => (
          <div key={period.id} className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5 hover:shadow-[var(--shadow-card-hover)] transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                  <Calendar size={20} className="text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900">{period.name}</h3>
                    <Badge variant={statusVariant[period.status]} dot>{statusLabel[period.status]}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                    <Clock size={11} />
                    <span>{formatDate(period.startDate)} – {formatDate(period.endDate)}</span>
                    <span className="text-slate-300">•</span>
                    <span>{period.totalSessions} buổi</span>
                  </div>
                  {period.notes && (
                    <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5">{period.notes}</p>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Mức đóng/người</p>
                <p className="text-lg font-bold text-indigo-600 mt-0.5">{formatVND(period.contributionAmount)}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <div className="flex gap-5 text-xs text-slate-500">
                <span>Thu dự kiến: <strong className="text-slate-800">{formatVND(memberCount * period.contributionAmount)}</strong></span>
                {period.finalizedAt && <span>Chốt lúc: {formatDate(period.finalizedAt)}</span>}
              </div>
              <div className="flex gap-2">
                {period.status === 'active' && (
                  <Button variant="outline" size="sm" onClick={() => {
                    setPeriods(prev => prev.map(p => p.id === period.id
                      ? { ...p, status: 'finalized', finalizedAt: new Date().toISOString() } : p))
                    toast.success(`Đã chốt kỳ ${period.name}`)
                  }}>
                    <CheckCircle size={13} />Chốt kỳ quỹ
                  </Button>
                )}
                <Button variant="ghost" size="sm">Xem chi tiết</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo Kỳ Quỹ Mới"
        subtitle="Nhập thông tin để tạo kỳ thu/chi quỹ mới"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Hủy bỏ</Button>
            <Button type="submit" form="form-period">Tạo kỳ quỹ</Button>
          </div>
        }
      >
        <form id="form-period" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tên kỳ <span className="text-red-500">*</span></label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Quý 3/2026" className="input-base" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày bắt đầu <span className="text-red-500">*</span></label>
              <input required type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngày kết thúc <span className="text-red-500">*</span></label>
              <input required type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Mức đóng/người (VNĐ) <span className="text-red-500">*</span></label>
              <input required type="number" value={form.contributionAmount}
                onChange={e => setForm({ ...form, contributionAmount: Number(e.target.value) })} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Số buổi dự kiến</label>
              <input type="number" value={form.totalSessions}
                onChange={e => setForm({ ...form, totalSessions: Number(e.target.value) })} className="input-base" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Ghi chú</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2} className="input-base resize-none" placeholder="Thông tin thêm về kỳ quỹ..." />
          </div>
        </form>
      </Modal>
    </div>
  )
}
