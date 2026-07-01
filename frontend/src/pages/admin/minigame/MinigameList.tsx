/**
 * UI-06 — Tournament Center Enterprise Workspace (PickleFund v2.1)
 * Màn trung tâm giải đấu (danh sách minigame/tournament). Kế thừa UI-02 (Golden Reference).
 * Tuân thủ UIP-06 (Tournament Center Pattern) + UDP-01 + Amendment #01 (Loading/Empty/Error)
 * + Amendment #02 + VDS-01 (Visual Quality Gate) + DESIGN-01 + GOV-01.
 *
 * Chỉ trình bày (UI): shared components + token --pf-*. KHÔNG đổi tournament/minigame logic,
 * random/smart draw, scoring, ranking, Mini Fund, API, DB. UI CHỈ render dữ liệu store hiện có
 * + gọi flow hiện có (tạo/xem/sửa/hủy). Chi tiết giải đấu (lịch/BXH/người chơi/kết quả) ở
 * các sub-page hiện có, điều hướng qua "Xem". Thiếu dữ liệu → "Chưa có dữ liệu"; không bịa state.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Eye, Edit2, Trash2, Trophy, Users, Activity, CheckCircle2,
  PlayCircle, AlertCircle, RefreshCw,
} from 'lucide-react'
import api from '../../../lib/api'
import { useMinigameStore } from '../../../store/minigameStore'
import { useAuthStore } from '../../../store/authStore'
import type { MinigameStatus, MiniGame } from '../../../types/minigame'
import { useIsMobile } from '../../../hooks/useIsMobile'
import toast from 'react-hot-toast'
import {
  PageShell, PageHeader, MetricCard, FilterBar, DataTable, type Column,
  StatusBadge, type StatusTone, ActionButton, EmptyState, LoadingState, MobileCardList,
  ResponsiveTabs,
} from '../../../components/shared'

function isLocalToken(token?: string | null) {
  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
}

const STATUS_LABEL: Record<MinigameStatus, string> = {
  DRAFT: 'Nháp', GROUPED: 'Đã chia bảng', PAIRED: 'Đã ghép cặp', SCHEDULED: 'Có lịch',
  IN_PROGRESS: 'Đang diễn ra', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy',
}
const STATUS_TONE: Record<MinigameStatus, StatusTone> = {
  DRAFT: 'neutral', GROUPED: 'info', PAIRED: 'ai', SCHEDULED: 'info',
  IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'danger',
}

type FormatType = 'RANDOM_DOUBLES' | 'FIXED_DOUBLES_ROUND_ROBIN' | 'GROUP_STAGE'
const FORMAT_SHORT: Record<string, string> = {
  RANDOM_DOUBLES: '🏓 Đánh đôi', FIXED_DOUBLES_ROUND_ROBIN: '🤝 Đôi cố định', GROUP_STAGE: '👥 Vòng bảng',
}
const FORMAT_TONE: Record<string, StatusTone> = {
  RANDOM_DOUBLES: 'ai', FIXED_DOUBLES_ROUND_ROBIN: 'warning', GROUP_STAGE: 'info',
}

type ModeTab = 'all' | FormatType
const MODE_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'RANDOM_DOUBLES', label: 'Đánh đôi ngẫu nhiên' },
  { key: 'FIXED_DOUBLES_ROUND_ROBIN', label: 'Đôi cố định' },
  { key: 'GROUP_STAGE', label: 'Vòng bảng' },
]

type StatusFilter = 'all' | MinigameStatus
const STATUS_FILTERS: [StatusFilter, string][] = [
  ['all', 'Tất cả'], ['IN_PROGRESS', 'Đang diễn ra'], ['SCHEDULED', 'Có lịch'],
  ['COMPLETED', 'Hoàn thành'], ['DRAFT', 'Nháp'],
]

interface TourRow {
  mg: MiniGame
  players: number
  groupCount: number
  matchCount: number
  completed: number
  pct: number
}

export function MinigameList() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getMinigames, deleteMinigame, setMinigamesFromApi, participants, groups, matches } = useMinigameStore()
  const minigames = getMinigames(clubId)
  const isMobile = useIsMobile()

  const [search, setSearch] = useState('')
  const [modeTab, setModeTab] = useState<ModeTab>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle')

  /* ── Fetch danh sách giải đấu (ĐÚNG endpoint hiện có: GET /minigames) — Loading/Error ── */
  const fetchMinigames = useCallback(async () => {
    if (!clubId || isLocalToken(accessToken)) { setLoadState('idle'); return }
    setLoadState('loading')
    try {
      const res = await api.get('/minigames')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any[] = res.data?.data ?? []
      const list: MiniGame[] = raw.map(m => ({
        id: m.id, clubId: m.clubId, name: m.name, description: m.description ?? undefined,
        startDate: m.scheduledAt ? m.scheduledAt.slice(0, 10) : (m.startDate ?? ''),
        endDate: m.endDate ?? undefined, status: m.status ?? 'DRAFT',
        groupSize: m.settings?.groupSize ?? 4, allowDraw: m.settings?.allowDraw ?? false,
        winPoints: m.settings?.winPoints ?? 3, drawPoints: m.settings?.drawPoints ?? 1,
        lossPoints: m.settings?.lossPoints ?? 0, notes: m.notes ?? undefined,
        createdBy: m.createdById ?? '', createdAt: m.createdAt ?? '',
        formatType: m.format ?? 'GROUP_STAGE', drawMode: m.settings?.drawMode ?? 'RANDOM',
      }))
      setMinigamesFromApi(clubId, list)
      setLoadState('idle')
    } catch {
      setLoadState('error')
    }
  }, [clubId, accessToken, setMinigamesFromApi])

  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (isLocalToken(accessToken)) return
    if (getMinigames(clubId).length === 0) void fetchMinigames()
  }, [accessToken, clubId, fetchMinigames, getMinigames])

  /* ── Actions (GIỮ NGUYÊN logic/API) ── */
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hủy giải đấu "${name}"?`)) return
    try {
      await api.post(`/minigames/${id}/cancel`)
      deleteMinigame(id)
      toast.success('Đã hủy giải đấu')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Hủy giải đấu thất bại')
    }
  }

  /* ── Derived rows (đếm từ store — giữ nguyên cách tính cũ, không đổi logic) ── */
  const toRow = (mg: MiniGame): TourRow => {
    const players = participants.filter(p => p.minigameId === mg.id && p.status === 'ACTIVE').length
    const groupCount = groups.filter(g => g.minigameId === mg.id).length
    const mts = matches.filter(m => m.minigameId === mg.id)
    const completed = mts.filter(m => m.status === 'COMPLETED').length
    return { mg, players, groupCount, matchCount: mts.length, completed, pct: mts.length > 0 ? Math.round((completed / mts.length) * 100) : 0 }
  }

  const q = search.trim().toLowerCase()
  const filtered = minigames
    .filter(mg => modeTab === 'all' || mg.formatType === modeTab)
    .filter(mg => statusFilter === 'all' || mg.status === statusFilter)
    .filter(mg => !q || mg.name.toLowerCase().includes(q) || (mg.description ?? '').toLowerCase().includes(q))
  const rows = filtered.map(toRow)

  /* ── KPI overview (đếm entity store — không phải công thức scoring/finance) ── */
  const totalTournaments = minigames.length
  const inProgress = minigames.filter(m => m.status === 'IN_PROGRESS').length
  const completedTournaments = minigames.filter(m => m.status === 'COMPLETED').length
  const totalPlayers = participants.filter(p => p.status === 'ACTIVE' && minigames.some(m => m.id === p.minigameId)).length
  const totalMatches = matches.filter(mt => minigames.some(m => m.id === mt.minigameId)).length
  const completedMatches = matches.filter(mt => mt.status === 'COMPLETED' && minigames.some(m => m.id === mt.minigameId)).length

  const hasActiveFilter = modeTab !== 'all' || statusFilter !== 'all' || !!q
  const resetFilters = () => { setModeTab('all'); setStatusFilter('all'); setSearch('') }

  const statusChips = (
    <div className="flex items-center gap-1 overflow-x-auto rounded-full border p-1 [background:var(--pf-surface)] border-[color:var(--pf-border)]">
      {STATUS_FILTERS.map(([v, l]) => (
        <button key={v} onClick={() => setStatusFilter(v)} aria-pressed={statusFilter === v}
          className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-colors"
          style={statusFilter === v ? { background: 'var(--pf-green)', color: 'var(--pf-text-on-primary)' } : { color: 'var(--pf-color-muted)' }}>
          {l}
        </button>
      ))}
    </div>
  )

  const headerActions = (
    <ActionButton icon={<Plus size={16} />} onClick={() => navigate('/minigames/new')}>Tạo minigame</ActionButton>
  )

  /* ── Progress bar (completion) ── */
  const Progress = ({ pct }: { pct: number }) => (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full [background:var(--pf-color-muted-soft)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--pf-green)' }} />
      </div>
      <span className="text-xs tabular-nums [color:var(--pf-color-muted)]">{pct}%</span>
    </div>
  )

  const RowActions = ({ r }: { r: TourRow }) => (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <IconBtn label="Xem chi tiết" onClick={() => navigate(`/minigames/${r.mg.id}`)}><Eye size={15} /></IconBtn>
      <IconBtn label="Chỉnh sửa" onClick={() => navigate(`/minigames/${r.mg.id}/edit`)}><Edit2 size={15} /></IconBtn>
      <IconBtn label="Hủy giải đấu" danger onClick={() => handleDelete(r.mg.id, r.mg.name)}><Trash2 size={15} /></IconBtn>
    </div>
  )

  const columns: Column<TourRow>[] = [
    {
      key: 'name', header: 'Giải đấu',
      render: (r) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium [color:var(--pf-text)]">{r.mg.name}</span>
            <StatusBadge tone={FORMAT_TONE[r.mg.formatType] ?? 'neutral'}>{FORMAT_SHORT[r.mg.formatType] ?? r.mg.formatType}</StatusBadge>
          </div>
          {r.mg.description && <p className="mt-0.5 truncate text-xs [color:var(--pf-color-muted)]">{r.mg.description}</p>}
        </div>
      ),
    },
    { key: 'time', header: 'Thời gian', render: (r) => <span className="whitespace-nowrap text-xs [color:var(--pf-color-muted)]">{r.mg.startDate || '—'}{r.mg.endDate ? ` → ${r.mg.endDate}` : ''}</span> },
    { key: 'players', header: 'Người', align: 'right', render: (r) => <span className="tabular-nums [color:var(--pf-text)]">{r.players}</span> },
    { key: 'groups', header: 'Bảng', align: 'right', render: (r) => <span className="tabular-nums [color:var(--pf-text)]">{r.groupCount}</span> },
    { key: 'matches', header: 'Trận', align: 'right', render: (r) => <span className="tabular-nums [color:var(--pf-text)]">{r.matchCount}</span> },
    { key: 'progress', header: 'Hoàn thành', render: (r) => r.matchCount > 0 ? <Progress pct={r.pct} /> : <span className="[color:var(--pf-color-muted)]">—</span> },
    { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge tone={STATUS_TONE[r.mg.status] ?? 'neutral'} dot>{STATUS_LABEL[r.mg.status] ?? r.mg.status}</StatusBadge> },
    { key: 'actions', header: 'Hành động', align: 'right', render: (r) => <RowActions r={r} /> },
  ]

  return (
    <PageShell>
      <PageHeader
        title="Giải đấu"
        subtitle="Quản lý minigame, bốc cặp, lịch đấu, kết quả và bảng xếp hạng của CLB."
        actions={headerActions}
      />

      {loadState === 'loading' ? (
        <>
          <LoadingState variant="cards" rows={6} />
          <div className="mt-4"><LoadingState variant="list" rows={5} /></div>
        </>
      ) : loadState === 'error' ? (
        <div className="rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
          <EmptyState icon={<AlertCircle size={26} />} title="Không tải được danh sách giải đấu"
            description="Đã xảy ra lỗi khi tải dữ liệu giải đấu. Vui lòng thử lại."
            action={<ActionButton icon={<RefreshCw size={15} />} onClick={() => void fetchMinigames()}>Thử lại</ActionButton>} />
        </div>
      ) : (
        <>
          {/* ── KPI overview ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Số giải đấu" value={totalTournaments.toLocaleString('vi-VN')} sub="Toàn CLB" accent="violet" icon={<Trophy size={18} />} />
            <MetricCard label="Đang diễn ra" value={inProgress.toLocaleString('vi-VN')} sub="Giải đang mở" accent="amber" icon={<PlayCircle size={18} />} />
            <MetricCard label="Hoàn thành" value={completedTournaments.toLocaleString('vi-VN')} sub="Giải đã xong" accent="green" icon={<CheckCircle2 size={18} />} />
            <MetricCard label="Tổng người chơi" value={totalPlayers.toLocaleString('vi-VN')} sub="Đang tham gia" accent="blue" icon={<Users size={18} />} />
            <MetricCard label="Tổng trận" value={totalMatches.toLocaleString('vi-VN')} sub="Tất cả giải" accent="teal" icon={<Activity size={18} />} />
            <MetricCard label="Trận hoàn thành" value={completedMatches.toLocaleString('vi-VN')} sub="Đã có kết quả" accent="green" icon={<CheckCircle2 size={18} />} />
          </div>

          {/* ── Mode Tabs ── */}
          <div className="mt-4">
            <ResponsiveTabs tabs={MODE_TABS} active={modeTab} onChange={(k) => setModeTab(k as ModeTab)} />
          </div>

          {/* ── Filter / Search ── */}
          <div className="mt-3">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Tìm giải đấu theo tên…"
              filters={statusChips}
              onOpenFilters={() => setShowFilterSheet(true)}
            />
          </div>

          {/* ── Tournament list: DataTable (desktop) / MobileCardList (mobile) ── */}
          <div className="mt-4 rounded-[20px] border [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
            <div className="flex items-center justify-between border-b px-5 py-3 border-[color:var(--pf-border-soft)]">
              <h3 className="text-sm font-semibold [color:var(--pf-text)]">Danh sách giải đấu</h3>
              <span className="text-xs [color:var(--pf-color-muted)]">{rows.length} / {minigames.length} giải</span>
            </div>
            {rows.length === 0 ? (
              hasActiveFilter ? (
                <EmptyState icon={<Trophy size={26} />} title="Không tìm thấy giải đấu"
                  description="Không có giải đấu khớp bộ lọc/từ khóa hiện tại."
                  action={<ActionButton variant="secondary" icon={<RefreshCw size={15} />} onClick={resetFilters}>Xóa bộ lọc</ActionButton>} />
              ) : (
                <EmptyState icon={<Trophy size={26} />} title="Chưa có giải đấu nào"
                  description="Tạo giải đấu / minigame đầu tiên cho câu lạc bộ."
                  action={<ActionButton icon={<Plus size={15} />} onClick={() => navigate('/minigames/new')}>Tạo minigame</ActionButton>} />
              )
            ) : isMobile ? (
              <div className="p-3">
                <MobileCardList items={rows} itemKey={(r) => r.mg.id} onItemClick={(r) => navigate(`/minigames/${r.mg.id}`)}
                  renderCard={(r) => (
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold [color:var(--pf-text)]">{r.mg.name}</p>
                          <p className="mt-0.5 text-xs [color:var(--pf-color-muted)]">{r.mg.startDate || '—'}{r.mg.endDate ? ` → ${r.mg.endDate}` : ''}</p>
                        </div>
                        <StatusBadge tone={STATUS_TONE[r.mg.status] ?? 'neutral'} dot>{STATUS_LABEL[r.mg.status] ?? r.mg.status}</StatusBadge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusBadge tone={FORMAT_TONE[r.mg.formatType] ?? 'neutral'}>{FORMAT_SHORT[r.mg.formatType] ?? r.mg.formatType}</StatusBadge>
                        <span className="text-xs [color:var(--pf-color-muted)]">{r.players} người · {r.groupCount} bảng · {r.matchCount} trận</span>
                      </div>
                      {r.matchCount > 0 && <div className="mt-2"><Progress pct={r.pct} /></div>}
                      <div className="mt-3 flex items-center justify-end gap-1 border-t pt-2 border-[color:var(--pf-border-soft)]">
                        <RowActions r={r} />
                      </div>
                    </div>
                  )}
                />
              </div>
            ) : (
              <DataTable columns={columns} rows={rows} rowKey={(r) => r.mg.id} onRowClick={(r) => navigate(`/minigames/${r.mg.id}`)} />
            )}
          </div>

          {/* ── Mobile sticky quick action: Tạo minigame ── */}
          {isMobile && (
            <div className="pointer-events-none fixed bottom-20 right-4 z-30">
              <ActionButton className="pointer-events-auto h-12 w-12 shadow-lg" iconOnly ariaLabel="Tạo minigame" icon={<Plus size={20} />} onClick={() => navigate('/minigames/new')} />
            </div>
          )}
        </>
      )}

      {/* ── Mobile filter bottom sheet ── */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0" style={{ background: 'rgb(15 23 42 / 0.30)' }} onClick={() => setShowFilterSheet(false)} />
          <div role="dialog" aria-modal="true" aria-label="Bộ lọc giải đấu" className="relative flex max-h-[88vh] w-full flex-col rounded-t-[24px] [background:var(--pf-surface)]">
            <div className="flex items-center justify-between border-b px-5 py-4 border-[color:var(--pf-border)]">
              <h2 className="text-base font-semibold [color:var(--pf-text)]">Bộ lọc giải đấu</h2>
              <button onClick={() => setShowFilterSheet(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center rounded-xl text-lg [color:var(--pf-color-muted)]"><span aria-hidden>✕</span></button>
            </div>
            <div className="space-y-5 overflow-y-auto px-5 py-5">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Thể thức</p>
                <div className="flex flex-wrap gap-2">
                  {MODE_TABS.map(t => (
                    <button key={t.key} onClick={() => setModeTab(t.key as ModeTab)} aria-pressed={modeTab === t.key}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                      style={modeTab === t.key ? { background: 'var(--pf-green)', color: 'var(--pf-text-on-primary)', borderColor: 'var(--pf-green)' } : { color: 'var(--pf-color-muted)', borderColor: 'var(--pf-border)' }}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest [color:var(--pf-color-muted)]">Trạng thái</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map(([v, l]) => (
                    <button key={v} onClick={() => setStatusFilter(v)} aria-pressed={statusFilter === v}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                      style={statusFilter === v ? { background: 'var(--pf-green)', color: 'var(--pf-text-on-primary)', borderColor: 'var(--pf-green)' } : { color: 'var(--pf-color-muted)', borderColor: 'var(--pf-border)' }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t px-5 py-4 border-[color:var(--pf-border)]">
              <ActionButton variant="secondary" fullWidth onClick={() => { resetFilters(); setShowFilterSheet(false) }}>Xóa lọc</ActionButton>
              <ActionButton fullWidth onClick={() => setShowFilterSheet(false)}>Áp dụng</ActionButton>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}

/* ── Icon button (a11y: aria-label; touch target ≥ 40px) ── */
function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:[background:var(--pf-color-muted-soft)]"
      style={{ color: danger ? 'var(--pf-color-danger)' : 'var(--pf-color-muted)' }}>
      {children}
    </button>
  )
}
