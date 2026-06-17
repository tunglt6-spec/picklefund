import { useState, useMemo } from 'react'
import {
  Plus, Building2, Trophy, Search, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, Download, Lock, TrendingUp, AlertTriangle,
  FolderOpen, ChevronDown, QrCode
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import type { FundPeriod, FundPeriodStatus, FundPeriodType } from '../../types'
import { formatDate, formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

const statusLabel: Record<FundPeriodStatus, string> = {
  draft: 'Nháp', active: 'Đang mở', closed: 'Đã đóng', finalized: 'Đã chốt'
}
const statusVariant: Record<FundPeriodStatus, 'gray' | 'green' | 'yellow' | 'indigo'> = {
  draft: 'gray', active: 'green', closed: 'yellow', finalized: 'indigo'
}

const DONUT_COLORS = ['#6366f1', '#f59e0b']

const emptyForm = {
  name: '', startDate: '', endDate: '',
  contributionAmount: 1000000, totalSessions: 13, notes: ''
}

type Tab = 'list' | 'history' | 'highlights'

export function FundPeriods() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
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

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'' | FundPeriodType>('')
  const [filterStatus, setFilterStatus] = useState<'' | FundPeriodStatus>('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const memberCount = members.length || 1

  // KPI computations
  const stats = useMemo(() => {
    const calc = (type: FundPeriodType) => {
      const fps = periods.filter(p => (p.type ?? 'chung') === type)
      const totalTarget = fps.reduce((a, p) => a + p.contributionAmount * memberCount, 0)
      const totalCollected = contributions
        .filter(c => fps.some(p => p.id === c.fundPeriodId) && c.isConfirmed)
        .reduce((a, c) => a + c.amount, 0)
      const remaining = Math.max(0, totalTarget - totalCollected)
      const unpaidCount = fps.reduce((a, p) => {
        const paid = new Set(contributions.filter(c => c.fundPeriodId === p.id && c.isConfirmed).map(c => c.memberId))
        return a + (memberCount - paid.size)
      }, 0)
      const txCount = contributions.filter(c => fps.some(p => p.id === c.fundPeriodId)).length
      const pct = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0
      const remainPct = 100 - pct
      return { balance: totalCollected, pct, remainPct, remaining, unpaidCount, txCount, totalTarget }
    }
    return { chung: calc('chung'), game: calc('game') }
  }, [periods, contributions, memberCount])

  // Active fund (latest active per type)
  const activePeriods = useMemo(() => ({
    chung: periods.find(p => (p.type ?? 'chung') === 'chung' && p.status === 'active'),
    game: periods.find(p => p.type === 'game' && p.status === 'active'),
  }), [periods])

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
    { name: 'Quỹ chung', value: stats.chung.balance },
    { name: 'Quỹ Game', value: stats.game.balance },
  ]

  const handleCreate = (type: FundPeriodType, form: typeof emptyForm, onClose: () => void) => (e: React.FormEvent) => {
    e.preventDefault()
    const newPeriod: FundPeriod = {
      id: `fp-${Date.now()}`, clubId, createdBy: user?.id ?? 'user-1',
      status: 'active', type,
      ...form,
      contributionAmount: Number(form.contributionAmount),
      totalSessions: Number(form.totalSessions),
    }
    setPeriods(prev => [newPeriod, ...prev])
    onClose()
    toast.success(`Tạo kỳ quỹ "${form.name}" thành công!`)
  }

  const handleDelete = (p: FundPeriod) => {
    if (!confirm(`Xóa kỳ quỹ "${p.name}"?`)) return
    setPeriods(prev => prev.filter(x => x.id !== p.id))
    toast.success('Đã xóa kỳ quỹ')
  }

  const handleFinalize = (p: FundPeriod) => {
    setPeriods(prev => prev.map(x => x.id === p.id
      ? { ...x, status: 'finalized', finalizedAt: new Date().toISOString() } : x))
    toast.success(`Đã chốt kỳ "${p.name}"`)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Kỳ Quỹ"
        subtitle="Quản lý quỹ chung và quỹ game CLB"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setFormChung({ ...emptyForm }); setShowCreateChung(true) }}>
              <Building2 size={14} />+ Tạo quỹ chung
            </Button>
            <Button onClick={() => { setFormGame({ ...emptyForm }); setShowCreateGame(true) }}>
              <Trophy size={14} />+ Tạo quỹ game
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
            title="TỔNG QUỸ GAME"
            icon={<Trophy size={16} className="text-amber-600" />}
            iconBg="bg-amber-50"
            accentColor="text-amber-600"
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
            onEdit={() => { setFormChung({ ...emptyForm }); setShowCreateChung(true) }}
          />
          <FundDetailCard
            title="Quỹ Game"
            icon={<Trophy size={16} className="text-amber-500" />}
            period={activePeriods.game}
            color="amber"
            memberCount={memberCount}
            contributions={contributions}
            onEdit={() => { setFormGame({ ...emptyForm }); setShowCreateGame(true) }}
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
                    <option value="game">Quỹ Game</option>
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
                                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Trophy size={10} />Game</span>
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
                                <button title="Xem" className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors">
                                  <Eye size={14} />
                                </button>
                                <button title="Sửa" className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-amber-600 transition-colors">
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
            <div className="px-5 py-8 text-center text-slate-400 text-sm">
              <TrendingUp size={32} className="mx-auto mb-3 text-slate-200" />
              Lịch sử giao dịch đang được phát triển
            </div>
          )}

          {tab === 'highlights' && (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">
              <AlertTriangle size={32} className="mx-auto mb-3 text-slate-200" />
              Giao dịch nổi bật đang được phát triển
            </div>
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
                    <Tooltip formatter={(v: number | string) => formatVND(Number(v))} />
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

      {/* Create Quỹ chung modal */}
      <FundModal
        open={showCreateChung}
        onClose={() => setShowCreateChung(false)}
        title="Tạo Quỹ Chung"
        subtitle="Kỳ thu quỹ chung cho CLB"
        formId="form-chung"
        form={formChung}
        setForm={setFormChung}
        onSubmit={handleCreate('chung', formChung, () => { setShowCreateChung(false); setFormChung({ ...emptyForm }) })}
      />

      {/* Create Quỹ Game modal */}
      <FundModal
        open={showCreateGame}
        onClose={() => setShowCreateGame(false)}
        title="Tạo Quỹ Game"
        subtitle="Kỳ thu quỹ game / giải đấu"
        formId="form-game"
        form={formGame}
        setForm={setFormGame}
        onSubmit={handleCreate('game', formGame, () => { setShowCreateGame(false); setFormGame({ ...emptyForm }) })}
      />
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface KpiStats {
  balance: number; pct: number; remainPct: number; remaining: number
  unpaidCount: number; txCount: number; totalTarget: number
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
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{label}: <strong className="text-slate-700">{labelValue ?? stats.unpaidCount}</strong></span>
        <span>Giao dịch: <strong className="text-slate-700">{stats.txCount}</strong></span>
      </div>
    </div>
  )
}

function FundDetailCard({ title, icon, period, color, memberCount, contributions, onEdit }: {
  title: string; icon: React.ReactNode; period: FundPeriod | undefined
  color: 'indigo' | 'amber'; memberCount: number
  contributions: import('../../types').FundContribution[]; onEdit: () => void
}) {
  const target = period ? period.contributionAmount * memberCount : 0
  const collected = period
    ? contributions.filter(c => c.fundPeriodId === period.id && c.isConfirmed).reduce((a, c) => a + c.amount, 0)
    : 0
  const pct = target > 0 ? Math.round((collected / target) * 100) : 0
  const barColor = color === 'indigo' ? 'bg-indigo-500' : 'bg-amber-500'
  const borderColor = color === 'indigo' ? 'border-indigo-100' : 'border-amber-100'

  return (
    <div className={`bg-white rounded-xl border ${borderColor} shadow-[var(--shadow-card)] p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-bold text-slate-800 text-sm">{title}</span>
        </div>
        {period && <Badge variant={color === 'indigo' ? 'indigo' : 'yellow'} dot>{statusLabel[period.status]}</Badge>}
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
            <span>Mục tiêu: <strong className="text-slate-800">{formatVND(target)}</strong></span>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1">
              <Eye size={13} />Chi tiết
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
              <Pencil size={13} />Sửa quỹ
            </Button>
          </div>
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

function FundModal({ open, onClose, title, subtitle, formId, form, setForm, onSubmit }: {
  open: boolean; onClose: () => void; title: string; subtitle: string
  formId: string; form: typeof emptyForm
  setForm: (f: typeof emptyForm) => void; onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="outline" type="button" onClick={onClose}>Hủy bỏ</Button>
          <Button type="submit" form={formId}>Tạo kỳ quỹ</Button>
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
