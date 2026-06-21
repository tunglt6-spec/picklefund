import { useState, useMemo } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/api'
import {
  Plus, Building2, Wallet, Search, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, Download, Lock, TrendingUp,
  FolderOpen, ChevronDown, QrCode,
  Trophy, Star, Filter
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { FundPeriod, FundPeriodStatus, FundPeriodType, FundContribution, Member } from '../../types'
import { formatDate, formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

const statusLabel: Record<FundPeriodStatus, string> = {
  draft: 'Nháp', active: 'Đang mở', closed: 'Đã đóng', finalized: 'Đã chốt'
}
const statusVariant: Record<FundPeriodStatus, 'gray' | 'green' | 'yellow' | 'indigo'> = {
  draft: 'gray', active: 'green', closed: 'yellow', finalized: 'indigo'
}

const DONUT_COLORS = ['#6366f1', '#7c3aed']

const emptyForm = {
  name: '', startDate: '', endDate: '',
  contributionAmount: 1000000, totalSessions: 13, notes: ''
}

type FormData = typeof emptyForm

function periodToForm(p: FundPeriod): FormData {
  return {
    name: p.name,
    startDate: p.startDate,
    endDate: p.endDate,
    contributionAmount: p.contributionAmount,
    totalSessions: p.totalSessions,
    notes: p.notes ?? '',
  }
}

type Tab = 'list' | 'history' | 'highlights'

export function FundPeriods() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getClubData, setFundPeriods: savePeriods } = useClubDataStore()
  const clubData = getClubData(clubId)
  const { fundPeriods: periods, contributions, members } = clubData

  const setPeriods = (fn: (prev: FundPeriod[]) => FundPeriod[]) =>
    savePeriods(clubId, fn(getClubData(clubId).fundPeriods))

  const [tab, setTab] = useState<Tab>('list')
  const [showCreateChung, setShowCreateChung] = useState(false)
  const [showCreateGame, setShowCreateGame] = useState(false)
  const [formChung, setFormChung] = useState({ ...emptyForm })
  const [formGame, setFormGame] = useState({ ...emptyForm })
  const [editingChung, setEditingChung] = useState<FundPeriod | null>(null)
  const [editingGame, setEditingGame] = useState<FundPeriod | null>(null)
  const [viewPeriod, setViewPeriod] = useState<FundPeriod | null>(null)

  const openEdit = (p: FundPeriod) => {
    const form = periodToForm(p)
    if ((p.type ?? 'chung') === 'chung') {
      setEditingChung(p); setFormChung(form); setShowCreateChung(true)
    } else {
      setEditingGame(p); setFormGame(form); setShowCreateGame(true)
    }
  }

  const [isSaving, setIsSaving]       = useState(false)
  const [finalizingId, setFinalizingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'' | FundPeriodType>('')
  const [filterStatus, setFilterStatus] = useState<'' | FundPeriodStatus>('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const memberCount = members.length || 1

  // KPI computations
  const stats = useMemo(() => {
    // COMMON: contributions linked to 'chung' type periods
    const calcChung = () => {
      const fps = periods.filter(p => (p.type ?? 'chung') === 'chung')
      const totalTarget = fps.reduce((a, p) => a + p.contributionAmount * memberCount, 0)
      const periodIds = new Set(fps.map(p => p.id))
      const relevant = contributions.filter(c => (c.fundSource ?? 'COMMON') === 'COMMON' || periodIds.has(c.fundPeriodId ?? ''))
      const totalCollected = relevant.filter(c => c.isConfirmed).reduce((a, c) => a + c.amount, 0)
      const totalPending = relevant.filter(c => !c.isConfirmed).reduce((a, c) => a + c.amount, 0)
      const remaining = Math.max(0, totalTarget - totalCollected)
      const primaryActive = fps.filter(p => p.status === 'active').sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
      const unpaidCount = primaryActive
        ? memberCount - new Set(contributions.filter(c => c.fundPeriodId === primaryActive.id && c.isConfirmed).map(c => c.memberId)).size
        : 0
      const txCount = relevant.length
      const pct = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0
      return { balance: totalCollected, pct, remainPct: 100 - pct, remaining, unpaidCount, txCount, totalTarget, totalPending }
    }

    // MINI: all contributions with fundSource === 'MINI' (no period linkage required)
    // Not member-based: target = sum of period.contributionAmount (no × memberCount)
    const calcMini = () => {
      const fps = periods.filter(p => p.type === 'game')
      const totalTarget = fps.reduce((a, p) => a + p.contributionAmount, 0)
      const miniContribs = contributions.filter(c => c.fundSource === 'MINI')
      const totalCollected = miniContribs.filter(c => c.isConfirmed).reduce((a, c) => a + c.amount, 0)
      const totalPending = miniContribs.filter(c => !c.isConfirmed).reduce((a, c) => a + c.amount, 0)
      const remaining = Math.max(0, totalTarget - totalCollected)
      const pct = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : (miniContribs.length > 0 ? 100 : 0)
      return { balance: totalCollected, pct, remainPct: 100 - pct, remaining, unpaidCount: 0, txCount: miniContribs.length, totalTarget, totalPending }
    }

    return { chung: calcChung(), game: calcMini() }
  }, [periods, contributions, memberCount])

  // Active fund (latest active per type)
  const activePeriods = useMemo(() => ({
    chung: periods.find(p => (p.type ?? 'chung') === 'chung' && p.status === 'active'),
    game: periods.find(p => p.type === 'game' && p.status === 'active'),
  }), [periods])

  // Latest game period regardless of status (for showing buttons even when no active period)
  const latestGamePeriod = useMemo(() =>
    [...periods].filter(p => p.type === 'game').sort((a, b) => b.startDate.localeCompare(a.startDate))[0],
    [periods]
  )

  // Filtered + paginated table
  const filtered = useMemo(() => {
    return periods.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const matchType = filterType === '' || (p.type ?? 'chung') === filterType
      const matchStatus = filterStatus === '' || p.status === filterStatus
      return matchSearch && matchType && matchStatus
    })
  }, [periods, search, filterType, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Recent transactions
  const recentTx = useMemo(() => {
    return [...contributions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [contributions])

  const donutData = [
    { name: 'Quỹ Chung', value: stats.chung.balance },
    { name: 'Quỹ Mini', value: stats.game.balance },
  ]

  const handleSave = (
    type: FundPeriodType,
    form: FormData,
    editing: FundPeriod | null,
    onClose: () => void,
  ) => async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      toast.error('Ngày kết thúc phải sau ngày bắt đầu')
      return
    }
    setIsSaving(true)
    try {
      const payload = { ...form, type, contributionAmount: Number(form.contributionAmount), totalSessions: Number(form.totalSessions) }
      if (editing) {
        const res = await api.put(`/fund-periods/${editing.id}`, payload)
        const d = res.data?.data
        const updated: FundPeriod = { ...editing, ...payload, ...(d ?? {}), contributionAmount: Number((d ?? payload).contributionAmount) }
        setPeriods(prev => prev.map(x => x.id === editing.id ? updated : x))
        onClose()
        toast.success(`Đã cập nhật kỳ quỹ "${form.name}"`)
      } else {
        const res = await api.post('/fund-periods', payload)
        const d = res.data?.data
        const newPeriod: FundPeriod = { ...d, contributionAmount: Number(d.contributionAmount), createdBy: d.createdById ?? user?.id ?? '' }
        setPeriods(prev => [newPeriod, ...prev])
        onClose()
        toast.success(`Tạo kỳ quỹ "${form.name}" thành công!`)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? (editing ? 'Cập nhật kỳ quỹ thất bại' : 'Tạo kỳ quỹ thất bại'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (p: FundPeriod) => {
    if (!confirm(`Xóa kỳ quỹ "${p.name}"?`)) return
    try {
      await api.delete(`/fund-periods/${p.id}`)
      setPeriods(prev => prev.filter(x => x.id !== p.id))
      toast.success('Đã xóa kỳ quỹ')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Xóa kỳ quỹ thất bại')
    }
  }

  const isMobile = useIsMobile()

  const handleFinalize = async (p: FundPeriod) => {
    if (finalizingId) return
    setFinalizingId(p.id)
    try {
      await api.patch(`/fund-periods/${p.id}/status`, { status: 'finalized' })
      setPeriods(prev => prev.map(x => x.id === p.id
        ? { ...x, status: 'finalized', finalizedAt: new Date().toISOString() } : x))
      try {
        await api.post(`/personal-receipts/generate/${p.id}`)
        toast.success(`Đã chốt kỳ "${p.name}" và tạo phiếu thu cá nhân`)
      } catch {
        toast.error(`Kỳ đã chốt nhưng tạo phiếu thu thất bại — vui lòng thử lại`)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Chốt kỳ quỹ thất bại')
    } finally {
      setFinalizingId(null)
    }
  }

  if (isMobile) {
    const chungPeriods = filtered.filter(p => (p.type ?? 'chung') === 'chung')
    const gamePeriods = filtered.filter(p => p.type === 'game')
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-2">
          <span className="text-[17px] font-[800] text-slate-900">Kỳ Quỹ</span>
          <div className="flex gap-2">
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[13px] font-[600] text-indigo-600 border border-indigo-200 active:bg-indigo-50"
              onClick={() => { setFormChung({ ...emptyForm }); setShowCreateChung(true) }}
            >
              <Plus size={14} />Quỹ chung
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[13px] font-[600] text-white active:opacity-80"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' }}
              onClick={() => { setFormGame({ ...emptyForm }); setShowCreateGame(true) }}
            >
              <Plus size={14} />Quỹ mini
            </button>
          </div>
        </div>

        <div className="px-4 pt-4 pb-6 space-y-4">
          {/* KPI summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
              <div className="text-[11px] font-[600] text-slate-400 uppercase tracking-wide mb-1">Quỹ Chung</div>
              <div className="text-[20px] font-[800] text-indigo-600">{formatVND(stats.chung.balance)}</div>
              <div className="text-[12px] text-slate-500 mt-0.5">{stats.chung.pct}% đã thu</div>
            </div>
            <div className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
              <div className="text-[11px] font-[600] text-slate-400 uppercase tracking-wide mb-1">Quỹ Mini</div>
              <div className="text-[20px] font-[800] text-violet-600">{formatVND(stats.game.balance)}</div>
              <div className="text-[12px] text-slate-500 mt-0.5">{stats.game.pct}% đã thu</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kỳ quỹ..."
              className="w-full pl-9 pr-4 py-2.5 rounded-[12px] bg-white border border-slate-200 text-[14px] text-slate-800 outline-none focus:border-indigo-400"
            />
          </div>

          {/* Quỹ Chung periods */}
          {chungPeriods.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={14} className="text-indigo-500" />
                <span className="text-[13px] font-[700] text-slate-700">Quỹ Chung ({chungPeriods.length})</span>
              </div>
              <div className="space-y-2">
                {chungPeriods.map(p => (
                  <div key={p.id} className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-[15px] font-[700] text-slate-900">{p.name}</div>
                        <div className="text-[12px] text-slate-400">{formatDate(p.startDate)} – {formatDate(p.endDate)}</div>
                      </div>
                      <Badge variant={statusVariant[p.status]}>{statusLabel[p.status]}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-[13px] mb-3">
                      <span className="text-slate-500">Mức đóng: <span className="font-[600] text-slate-800">{formatVND(p.contributionAmount)}</span></span>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] text-indigo-600 border border-indigo-200 active:bg-indigo-50 flex items-center justify-center gap-1"
                        onClick={() => openEdit(p)}><Pencil size={13} />Sửa</button>
                      {p.status === 'active' && (
                        <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] text-violet-600 border border-violet-200 active:bg-violet-50 flex items-center justify-center gap-1"
                          onClick={() => handleFinalize(p)}><Lock size={13} />Chốt</button>
                      )}
                      <button className="px-3 py-1.5 rounded-[10px] text-[13px] font-[600] text-red-500 border border-red-200 active:bg-red-50"
                        onClick={() => handleDelete(p)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quỹ Mini periods */}
          {gamePeriods.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={14} className="text-violet-500" />
                <span className="text-[13px] font-[700] text-slate-700">Quỹ Mini ({gamePeriods.length})</span>
              </div>
              <div className="space-y-2">
                {gamePeriods.map(p => (
                  <div key={p.id} className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-[15px] font-[700] text-slate-900">{p.name}</div>
                        <div className="text-[12px] text-slate-400">{formatDate(p.startDate)} – {formatDate(p.endDate)}</div>
                      </div>
                      <Badge variant={statusVariant[p.status]}>{statusLabel[p.status]}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-[13px] mb-3">
                      <span className="text-slate-500">Mức đóng: <span className="font-[600] text-slate-800">{formatVND(p.contributionAmount)}</span></span>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] text-indigo-600 border border-indigo-200 active:bg-indigo-50 flex items-center justify-center gap-1"
                        onClick={() => openEdit(p)}><Pencil size={13} />Sửa</button>
                      {p.status === 'active' && (
                        <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] text-violet-600 border border-violet-200 active:bg-violet-50 flex items-center justify-center gap-1"
                          onClick={() => handleFinalize(p)}><Lock size={13} />Chốt</button>
                      )}
                      <button className="px-3 py-1.5 rounded-[10px] text-[13px] font-[600] text-red-500 border border-red-200 active:bg-red-50"
                        onClick={() => handleDelete(p)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-[14px]">Chưa có kỳ quỹ nào</div>
          )}
        </div>

        {/* Modals reused from desktop */}
        <FundModal
          open={showCreateChung}
          onClose={() => { setShowCreateChung(false); setEditingChung(null) }}
          title={editingChung ? 'Sửa Kỳ Quỹ Chung' : 'Tạo Kỳ Quỹ Chung'}
          subtitle="Quỹ Chung CLB"
          formId="form-chung-m"
          form={formChung}
          setForm={setFormChung}
          onSubmit={handleSave('chung', formChung, editingChung, () => { setShowCreateChung(false); setEditingChung(null) })}
          editing={!!editingChung}
          isSaving={isSaving}
        />
        <FundModal
          open={showCreateGame}
          onClose={() => { setShowCreateGame(false); setEditingGame(null) }}
          title={editingGame ? 'Sửa Kỳ Quỹ Mini' : 'Tạo Kỳ Quỹ Mini'}
          subtitle="Quỹ Mini CLB"
          formId="form-game-m"
          form={formGame}
          setForm={setFormGame}
          onSubmit={handleSave('game', formGame, editingGame, () => { setShowCreateGame(false); setEditingGame(null) })}
          editing={!!editingGame}
          isSaving={isSaving}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Kỳ Quỹ"
        subtitle="Quản lý Quỹ Chung và Quỹ Mini CLB"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setFormChung({ ...emptyForm }); setShowCreateChung(true) }}>
              <Building2 size={14} />+ Tạo quỹ chung
            </Button>
            <Button onClick={() => { setFormGame({ ...emptyForm }); setShowCreateGame(true) }}>
              <Wallet size={14} />+ Tạo quỹ mini
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-5 max-w-[1200px] mx-auto">

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KpiSummaryCard
            title="TỔNG QUỸ CHUNG"
            icon={<Building2 size={16} className="text-indigo-600" />}
            iconBg="bg-indigo-50"
            accentColor="text-indigo-600"
            stats={stats.chung}
            label="Chưa đóng"
          />
          <KpiSummaryCard
            title="TỔNG QUỸ MINI"
            icon={<Wallet size={16} className="text-violet-600" />}
            iconBg="bg-violet-50"
            accentColor="text-violet-600"
            stats={stats.game}
            label="Giao dịch"
            labelValue={stats.game.txCount}
          />
        </div>

        {/* Fund detail cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FundDetailCard
            title="Quỹ chung CLB"
            icon={<Building2 size={16} className="text-indigo-500" />}
            period={activePeriods.chung}
            color="indigo"
            memberCount={memberCount}
            contributions={contributions}
            onEdit={() => activePeriods.chung ? openEdit(activePeriods.chung) : (setEditingChung(null), setFormChung({ ...emptyForm }), setShowCreateChung(true))}
            onView={() => activePeriods.chung && setViewPeriod(activePeriods.chung)}
          />
          <FundDetailCard
            title="Quỹ Mini"
            icon={<Wallet size={16} className="text-violet-500" />}
            period={activePeriods.game ?? latestGamePeriod}
            color="violet"
            memberCount={memberCount}
            contributions={contributions}
            miniMode
            onEdit={() => (activePeriods.game ?? latestGamePeriod) ? openEdit((activePeriods.game ?? latestGamePeriod)!) : (setEditingGame(null), setFormGame({ ...emptyForm }), setShowCreateGame(true))}
            onView={() => { const p = activePeriods.game ?? latestGamePeriod; if (p) setViewPeriod(p) }}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
          <div className="flex border-b border-slate-100 px-2 pt-1">
            {([['list', 'Danh sách kỳ quỹ'], ['history', 'Lịch sử giao dịch'], ['highlights', 'Giao dịch nổi bật']] as [Tab, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'list' && (
            <>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-50">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                    placeholder="Tìm kiếm kỳ quỹ..."
                    className="input-base pl-8 py-2 text-sm" />
                </div>
                <div className="relative">
                  <select value={filterType} onChange={e => { setFilterType(e.target.value as '' | FundPeriodType); setPage(1) }}
                    className="input-base py-2 pr-8 text-sm appearance-none">
                    <option value="">Loại quỹ</option>
                    <option value="chung">Quỹ chung</option>
                    <option value="game">Quỹ Mini</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as '' | FundPeriodStatus); setPage(1) }}
                    className="input-base py-2 pr-8 text-sm appearance-none">
                    <option value="">Trạng thái</option>
                    <option value="draft">Nháp</option>
                    <option value="active">Đang mở</option>
                    <option value="closed">Đã đóng</option>
                    <option value="finalized">Đã chốt</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <Button variant="outline" size="sm" onClick={() => toast('Chức năng nhập Excel đang phát triển')}>
                  <Download size={13} />Nhập Excel
                </Button>
              </div>

              {/* Table */}
              {paginated.length === 0 ? (
                <div className="py-16 text-center">
                  <FolderOpen size={32} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400">Không có kỳ quỹ nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-500 bg-slate-50">
                        <th className="text-left px-5 py-3 font-semibold">Tên kỳ quỹ</th>
                        <th className="text-left px-4 py-3 font-semibold">Loại quỹ</th>
                        <th className="text-left px-4 py-3 font-semibold">Thời gian</th>
                        <th className="text-right px-4 py-3 font-semibold">Mức đóng/người</th>
                        <th className="text-right px-4 py-3 font-semibold">Đã thu</th>
                        <th className="text-right px-4 py-3 font-semibold">Còn thiếu</th>
                        <th className="px-4 py-3 font-semibold">Tiến độ</th>
                        <th className="text-left px-4 py-3 font-semibold">Trạng thái</th>
                        <th className="text-center px-4 py-3 font-semibold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(p => {
                        const target = p.contributionAmount * memberCount
                        const collected = contributions
                          .filter(c => c.fundPeriodId === p.id && c.isConfirmed)
                          .reduce((a, c) => a + c.amount, 0)
                        const remaining = Math.max(0, target - collected)
                        const pct = target > 0 ? Math.round((collected / target) * 100) : 0
                        const startMs = new Date(p.startDate).getTime()
                        const endMs = new Date(p.endDate).getTime()
                        const days = Math.round((endMs - startMs) / 86400000)
                        const pType = p.type ?? 'chung'
                        return (
                          <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3.5 font-medium text-slate-900">{p.name}</td>
                            <td className="px-4 py-3.5">
                              {pType === 'game'
                                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700"><Wallet size={10} />Mini</span>
                                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700"><Building2 size={10} />Chung</span>
                              }
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 text-xs">{days} ngày</td>
                            <td className="px-4 py-3.5 text-right font-medium text-slate-800">{formatVND(p.contributionAmount)}</td>
                            <td className="px-4 py-3.5 text-right text-green-600 font-medium">{formatVND(collected)}</td>
                            <td className="px-4 py-3.5 text-right text-red-500 font-medium">{formatVND(remaining)}</td>
                            <td className="px-4 py-3.5 w-28">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-slate-500 whitespace-nowrap">{pct}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <Badge variant={statusVariant[p.status]} dot>{statusLabel[p.status]}</Badge>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center justify-center gap-1">
                                <button title="Xem" onClick={() => setViewPeriod(p)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors">
                                  <Eye size={14} />
                                </button>
                                <button title="Sửa" onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-amber-600 transition-colors">
                                  <Pencil size={14} />
                                </button>
                                {p.status === 'active' && (
                                  <button title="Chốt" onClick={() => handleFinalize(p)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-green-600 transition-colors">
                                    <Lock size={14} />
                                  </button>
                                )}
                                <button title="Xóa" onClick={() => handleDelete(p)} className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors">
                                  <Trash2 size={14} />
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
              {filtered.length > 0 && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 text-sm text-slate-500">
                  <span>Hiển thị {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)} đến {Math.min(page * PAGE_SIZE, filtered.length)} của {filtered.length}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => setPage(n)}
                        className={`w-8 h-8 rounded text-xs font-medium transition-colors ${n === page ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}`}>
                        {n}
                      </button>
                    ))}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <span className="text-xs">10/trang</span>
                </div>
              )}
            </>
          )}

          {tab === 'history' && (
            <HistoryTab contributions={contributions} periods={periods} members={members} />
          )}

          {tab === 'highlights' && (
            <HighlightsTab contributions={contributions} periods={periods} members={members} />
          )}
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recent transactions */}
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Lịch sử giao dịch gần đây</h3>
            {recentTx.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Chưa có giao dịch nào</p>
            ) : (
              <div className="space-y-2">
                {recentTx.map(tx => {
                  const period = periods.find(p => p.id === tx.fundPeriodId)
                  const member = members.find(m => m.id === tx.memberId)
                  return (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{member?.fullName ?? tx.memberId}</p>
                        <p className="text-xs text-slate-400">{period?.name ?? '—'} · {formatDate(tx.paymentDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">+{formatVND(tx.amount)}</p>
                        {tx.isConfirmed
                          ? <span className="text-xs text-green-500">Đã xác nhận</span>
                          : <span className="text-xs text-amber-500">Chờ xác nhận</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Donut chart */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Biểu đồ thu theo loại quỹ</h3>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={35} outerRadius={55}
                      dataKey="value" paddingAngle={3}>
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatVND(v as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-1">
                {donutData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </div>

            {/* QR placeholder */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5 text-center">
              <QrCode size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-600">QR thanh toán</p>
              <p className="text-xs text-slate-400 mt-1">Sắp ra mắt</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quỹ chung modal (create or edit) */}
      <FundModal
        open={showCreateChung}
        onClose={() => { setShowCreateChung(false); setEditingChung(null); setFormChung({ ...emptyForm }) }}
        title={editingChung ? 'Chỉnh sửa Quỹ Chung' : 'Tạo Quỹ Chung'}
        subtitle={editingChung ? `Đang sửa: ${editingChung.name}` : 'Kỳ thu quỹ chung cho CLB'}
        formId="form-chung"
        form={formChung}
        setForm={setFormChung}
        editing={!!editingChung}
        isSaving={isSaving}
        onSubmit={handleSave('chung', formChung, editingChung, () => { setShowCreateChung(false); setEditingChung(null); setFormChung({ ...emptyForm }) })}
      />

      {/* Quỹ Mini modal (create or edit) */}
      <FundModal
        open={showCreateGame}
        onClose={() => { setShowCreateGame(false); setEditingGame(null); setFormGame({ ...emptyForm }) }}
        title={editingGame ? 'Chỉnh sửa Quỹ Mini' : 'Tạo Quỹ Mini'}
        subtitle={editingGame ? `Đang sửa: ${editingGame.name}` : 'Kỳ thu Quỹ Mini / giải đấu'}
        formId="form-game"
        form={formGame}
        setForm={setFormGame}
        editing={!!editingGame}
        isSaving={isSaving}
        onSubmit={handleSave('game', formGame, editingGame, () => { setShowCreateGame(false); setEditingGame(null); setFormGame({ ...emptyForm }) })}
      />

      {/* View period detail modal */}
      {viewPeriod && (
        <Modal open title={viewPeriod.name} onClose={() => setViewPeriod(null)} size="sm">
          <div className="p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Loại quỹ</span>
              <span className="font-medium">{(viewPeriod.type ?? 'chung') === 'chung' ? 'Quỹ Chung' : 'Quỹ Mini'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Trạng thái</span>
              <Badge variant={statusVariant[viewPeriod.status]} dot>{statusLabel[viewPeriod.status]}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ngày bắt đầu</span>
              <span className="font-medium">{formatDate(viewPeriod.startDate)}</span>
            </div>
            {viewPeriod.endDate && (
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày kết thúc</span>
                <span className="font-medium">{formatDate(viewPeriod.endDate)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Số tiền/người</span>
              <span className="font-medium text-indigo-600">{formatVND(viewPeriod.contributionAmount)}</span>
            </div>
            {viewPeriod.notes && (
              <div>
                <span className="text-slate-500">Ghi chú</span>
                <p className="mt-1 text-slate-700 bg-slate-50 rounded-lg p-2">{viewPeriod.notes}</p>
              </div>
            )}
            <div className="pt-2 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewPeriod(null)}>Đóng</Button>
              <Button size="sm" className="flex-1" onClick={() => { openEdit(viewPeriod); setViewPeriod(null) }}>
                <Pencil size={13} />Sửa
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── HistoryTab ────────────────────────────────────────────────────────────────

function HistoryTab({ contributions, periods, members }: {
  contributions: FundContribution[]
  periods: FundPeriod[]
  members: Member[]
}) {
  const [filterPeriod, setFilterPeriod] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | 'confirmed' | 'pending'>('')
  const [histPage, setHistPage] = useState(1)
  const PAGE = 12

  const sorted = useMemo(() => {
    return [...contributions]
      .filter(c => {
        if (filterPeriod && c.fundPeriodId !== filterPeriod) return false
        if (filterStatus === 'confirmed' && !c.isConfirmed) return false
        if (filterStatus === 'pending' && c.isConfirmed) return false
        return true
      })
      .sort((a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime())
  }, [contributions, filterPeriod, filterStatus])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE))
  const paged = sorted.slice((histPage - 1) * PAGE, histPage * PAGE)

  const totalIncome = sorted.filter(c => c.isConfirmed).reduce((s, c) => s + c.amount, 0)
  const totalPending = sorted.filter(c => !c.isConfirmed).reduce((s, c) => s + c.amount, 0)

  return (
    <div className="p-5 space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
          <p className="text-xs text-emerald-600 font-medium">Tổng đã xác nhận</p>
          <p className="text-base font-bold text-emerald-700 mt-0.5">{formatVND(totalIncome)}</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
          <p className="text-xs text-amber-600 font-medium">Chờ xác nhận</p>
          <p className="text-base font-bold text-amber-700 mt-0.5">{formatVND(totalPending)}</p>
        </div>
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
          <p className="text-xs text-indigo-600 font-medium">Số giao dịch</p>
          <p className="text-base font-bold text-indigo-700 mt-0.5">{sorted.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-slate-400 shrink-0" />
        <select
          value={filterPeriod}
          onChange={e => { setFilterPeriod(e.target.value); setHistPage(1) }}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-400"
        >
          <option value="">Tất cả kỳ quỹ</option>
          {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value as any); setHistPage(1) }}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-400"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="confirmed">Đã xác nhận</option>
          <option value="pending">Chờ xác nhận</option>
        </select>
      </div>

      {/* Table */}
      {paged.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-sm">
          <TrendingUp size={28} className="mx-auto mb-2 text-slate-200" />Chưa có giao dịch nào
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Ngày</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Thành viên</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Kỳ quỹ</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Loại quỹ</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Số tiền</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.map(c => {
                const member = members.find(m => m.id === c.memberId)
                const period = periods.find(p => p.id === c.fundPeriodId)
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDate(c.paymentDate || c.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 shrink-0">
                          {(member?.fullName ?? c.payerName ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-slate-700">{member?.fullName ?? c.payerName ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{period?.name ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${c.fundSource === 'MINI' ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {c.fundSource === 'MINI' ? 'Quỹ Mini' : 'Quỹ Chung'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-xs font-bold text-emerald-600">+{formatVND(c.amount)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {c.isConfirmed
                        ? <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Đã xác nhận</span>
                        : <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Chờ xác nhận</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-400">{sorted.length} giao dịch</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setHistPage(p => Math.max(1, p - 1))} disabled={histPage === 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-slate-600 px-2">{histPage}/{totalPages}</span>
            <button onClick={() => setHistPage(p => Math.min(totalPages, p + 1))} disabled={histPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── HighlightsTab ──────────────────────────────────────────────────────────────

function HighlightsTab({ contributions, periods, members }: {
  contributions: FundContribution[]
  periods: FundPeriod[]
  members: Member[]
}) {
  // Top 5 contributors by total confirmed amount
  const topContributors = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>()
    for (const c of contributions) {
      if (!c.isConfirmed || !c.memberId) continue
      const member = members.find(m => m.id === c.memberId)
      const name = member?.fullName ?? c.payerName ?? c.memberId
      const prev = map.get(c.memberId) ?? { name, total: 0, count: 0 }
      map.set(c.memberId, { name, total: prev.total + c.amount, count: prev.count + 1 })
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5)
  }, [contributions, members])

  // Per-period collection stats for bar chart
  const periodStats = useMemo(() => {
    return periods
      .filter(p => contributions.some(c => c.fundPeriodId === p.id))
      .map(p => {
        const confirmed = contributions.filter(c => c.fundPeriodId === p.id && c.isConfirmed).reduce((s, c) => s + c.amount, 0)
        const pending = contributions.filter(c => c.fundPeriodId === p.id && !c.isConfirmed).reduce((s, c) => s + c.amount, 0)
        return { name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name, confirmed, pending }
      })
      .slice(-6)
  }, [contributions, periods])

  // Largest single transactions
  const topTx = useMemo(() => {
    return [...contributions]
      .filter(c => c.isConfirmed)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [contributions])

  const medals = ['🥇', '🥈', '🥉', '4.', '5.']

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top contributors */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Trophy size={15} className="text-amber-500" />Top đóng quỹ
          </h3>
          {topContributors.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2.5">
              {topContributors.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-sm w-6 text-center shrink-0">{medals[i]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700 truncate">{c.name}</span>
                      <span className="text-xs font-bold text-emerald-600 shrink-0 ml-2">{formatVND(c.total)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400"
                        style={{ width: `${Math.round((c.total / (topContributors[0]?.total || 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{c.count} lần</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Largest single transactions */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Star size={15} className="text-indigo-500" />Giao dịch lớn nhất
          </h3>
          {topTx.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2">
              {topTx.map((c, i) => {
                const member = members.find(m => m.id === c.memberId)
                const period = periods.find(p => p.id === c.fundPeriodId)
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/60 transition-colors">
                    <span className="text-sm w-5 text-center shrink-0 font-bold text-slate-400">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{member?.fullName ?? c.payerName ?? '—'}</p>
                      <p className="text-[10px] text-slate-400">{period?.name ?? '—'} · {formatDate(c.paymentDate)}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 shrink-0">{formatVND(c.amount)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Per-period bar chart */}
      {periodStats.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-indigo-500" />Thu quỹ theo kỳ
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periodStats} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatVND(Number(v))} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="confirmed" name="Đã xác nhận" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Chờ xác nhận" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 justify-center mt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />Đã xác nhận</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />Chờ xác nhận</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface KpiStats {
  balance: number; pct: number; remainPct: number; remaining: number
  unpaidCount: number; txCount: number; totalTarget: number; totalPending: number
}

function KpiSummaryCard({ title, icon, iconBg, accentColor, stats, label, labelValue }: {
  title: string; icon: React.ReactNode; iconBg: string; accentColor: string
  stats: KpiStats; label: string; labelValue?: number
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{title}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Số dư</p>
          <p className={`text-base font-bold ${accentColor}`}>{formatVND(stats.balance)}</p>
          {stats.totalPending > 0 && (
            <p className="text-[10px] text-amber-500 mt-0.5">+{formatVND(stats.totalPending)} chờ</p>
          )}
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Đã thu</p>
          <p className="text-base font-bold text-green-600">{stats.pct}%</p>
          <p className="text-[10px] text-green-500">{formatVND(stats.balance)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Còn thiếu</p>
          <p className="text-base font-bold text-red-500">{stats.remainPct}%</p>
          <p className="text-[10px] text-red-400">{formatVND(stats.remaining)}</p>
        </div>
      </div>
      {stats.totalPending > 0 && (
        <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-between text-xs">
          <span className="text-amber-700 font-medium">⏳ Chờ xác nhận</span>
          <span className="font-bold text-amber-700">{formatVND(stats.totalPending)}</span>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{label}: <strong className="text-slate-700">{labelValue ?? stats.unpaidCount}</strong></span>
        <span>Giao dịch: <strong className="text-slate-700">{stats.txCount}</strong></span>
      </div>
    </div>
  )
}

function FundDetailCard({ title, icon, period, color, memberCount, contributions, onEdit, onView, miniMode }: {
  title: string; icon: React.ReactNode; period: FundPeriod | undefined
  color: 'indigo' | 'violet'; memberCount: number
  contributions: import('../../types').FundContribution[]; onEdit: () => void; onView?: () => void
  miniMode?: boolean
}) {
  const target = period ? (miniMode ? period.contributionAmount : period.contributionAmount * memberCount) : 0
  const miniCollected = miniMode
    ? contributions.filter(c => c.fundSource === 'MINI' && c.isConfirmed).reduce((a, c) => a + c.amount, 0)
    : 0
  const collected = miniMode
    ? miniCollected
    : period
      ? contributions.filter(c => c.fundPeriodId === period.id && c.isConfirmed).reduce((a, c) => a + c.amount, 0)
      : 0
  const pct = target > 0 ? Math.round((collected / target) * 100) : (miniMode && collected > 0 ? 100 : 0)
  const barColor = color === 'indigo' ? 'bg-indigo-500' : 'bg-violet-500'
  const borderColor = color === 'indigo' ? 'border-indigo-100' : 'border-violet-100'

  return (
    <div className={`bg-white rounded-xl border ${borderColor} shadow-[var(--shadow-card)] p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-bold text-slate-800 text-sm">{title}</span>
        </div>
        {period && <Badge variant={color === 'indigo' ? 'indigo' : 'purple'} dot>{statusLabel[period.status]}</Badge>}
      </div>
      {period ? (
        <>
          <p className="text-xs text-slate-500 mb-1">{period.name}</p>
          <p className="text-xs text-slate-400 mb-3">{formatDate(period.startDate)} – {formatDate(period.endDate)}</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-medium text-slate-600">{pct}%</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>Đã thu: <strong className="text-slate-800">{formatVND(collected)}</strong></span>
            {miniMode
              ? <span>Giao dịch: <strong className="text-slate-800">{contributions.filter(c => c.fundSource === 'MINI').length}</strong></span>
              : <span>Mục tiêu: <strong className="text-slate-800">{formatVND(target)}</strong></span>
            }
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
              <Eye size={13} />Chi tiết
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
              <Pencil size={13} />Sửa quỹ
            </Button>
          </div>
        </>
      ) : miniMode && collected > 0 ? (
        <>
          <p className="text-xs text-slate-400 mb-3">Chưa có kỳ quỹ đang mở</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: '100%' }} />
            </div>
            <span className="text-xs font-medium text-slate-600">—</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2 mb-4">
            <span>Đã thu: <strong className="text-slate-800">{formatVND(collected)}</strong></span>
          </div>
          <Button size="sm" onClick={onEdit}><Plus size={13} />Tạo kỳ quỹ</Button>
        </>
      ) : (
        <div className="py-4 text-center">
          <p className="text-xs text-slate-400 mb-3">Chưa có kỳ quỹ đang mở</p>
          <Button size="sm" onClick={onEdit}><Plus size={13} />Tạo kỳ quỹ</Button>
        </div>
      )}
    </div>
  )
}

function FundModal({ open, onClose, title, subtitle, formId, form, setForm, onSubmit, editing, isSaving }: {
  open: boolean; onClose: () => void; title: string; subtitle: string
  formId: string; form: FormData
  setForm: (f: FormData) => void; onSubmit: (e: React.FormEvent) => void
  editing?: boolean; isSaving?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSaving}>Hủy bỏ</Button>
          <Button type="submit" form={formId} disabled={isSaving}>{isSaving ? 'Đang lưu...' : (editing ? 'Cập nhật kỳ quỹ' : 'Tạo kỳ quỹ')}</Button>
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4">
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
  )
}
