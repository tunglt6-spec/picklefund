/**
 * CompeteHub — module "Thi đấu" (/thi-dau). Sports Tournament Engine — M1 IA.
 *
 * 5 tab cấp cao (ModuleTabs, sync ?tab=): Tổng quan · Giải đấu · Lịch đấu · Kết quả · Xếp hạng.
 * - Tổng quan: chọn bộ môn + MinigameOverviewPanel (dữ liệu thật).
 * - Giải đấu: form tạo giải (admin, giữ nguyên luồng cũ) + nút vào danh sách đầy đủ.
 * - Lịch đấu / Kết quả / Xếp hạng: danh sách giải THẬT, deep-link sang trang chi tiết hiện có
 *   (/minigames/:id/schedule · /minigames/:id · /minigames/:id/standings). KHÔNG bịa dữ liệu.
 * MEMBER_VIEW không tạo giải → tab Giải đấu chỉ xem tổng quan + danh sách.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListChecks, CalendarDays, ClipboardList, Trophy, RefreshCw } from 'lucide-react'
import { ModuleTabs, StatusBadge } from '../../../components/shared'
import { Button } from '../../../components/ui/Button'
import { MinigameForm } from '../minigame/MinigameForm'
import { MinigameOverviewPanel } from '../minigame/MinigameOverviewPanel'
import { useAuthStore } from '../../../store/authStore'
import api from '../../../lib/api'
import { sportEmoji, normalizeMinigameStatus, type MiniGame, type MinigameStatus } from '../../../types/minigame'
import { cn } from '../../../lib/utils'

const SPORTS: { v: string; label: string }[] = [
  { v: 'PICKLEBALL', label: 'Pickleball' },
  { v: 'TENNIS', label: 'Tennis' },
  { v: 'BADMINTON', label: 'Cầu lông' },
  { v: 'TABLE_TENNIS', label: 'Bóng bàn' },
  { v: 'FOOTBALL', label: 'Bóng đá' },
  { v: 'BASKETBALL', label: 'Bóng rổ' },
  { v: 'GOLF', label: 'Golf' },
]

const STATUS_LABEL: Partial<Record<MinigameStatus, string>> = {
  DRAFT: 'Nháp', GROUPED: 'Đã chia bảng', PAIRED: 'Đã ghép cặp', SCHEDULED: 'Có lịch',
  IN_PROGRESS: 'Đang diễn ra', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy',
}

// ── Tab Tổng quan ────────────────────────────────────────────────────────────
function OverviewTab() {
  const [sport, setSport] = useState('PICKLEBALL')
  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5">
      <div className="pf-glass rounded-[18px] p-4">
        <h2 className="text-base font-bold [color:var(--pf-text)]">Tổng quan theo bộ môn</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {SPORTS.map(s => (
            <button key={s.v} onClick={() => setSport(s.v)}
              className={cn('inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.97]',
                sport === s.v
                  ? 'border-transparent text-white [box-shadow:0_8px_18px_-8px_rgba(109,93,251,0.6)]'
                  : '[border-color:var(--pf-border)] [background:var(--pf-surface)] [color:var(--pf-color-muted)] hover:-translate-y-px hover:[color:var(--pf-primary)] hover:[border-color:var(--pf-primary-soft)] hover:[background:var(--pf-primary-soft)]')}
              style={sport === s.v ? { background: 'linear-gradient(135deg,#6D5DFB,#5B4BE8)' } : undefined}>
              {sportEmoji(s.v) || '🏓'} {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="w-full"><MinigameOverviewPanel sport={sport} /></div>
    </div>
  )
}

// ── Tab Giải đấu (tạo + danh sách) ────────────────────────────────────────────
function TournamentsTab() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isMember = user?.role === 'MEMBER_VIEW'
  const [sport, setSport] = useState('PICKLEBALL')

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <button onClick={() => navigate('/minigames')} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold [color:var(--pf-primary)] [background:var(--pf-primary-soft)] hover:[background:var(--pf-primary)] hover:text-white transition-colors">
          <ListChecks size={14} /> Danh sách giải đầy đủ
        </button>
      </div>
      {isMember ? (
        <div className="w-full"><MinigameOverviewPanel sport={sport} /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-5 items-start">
          <div className="pf-glass-strong rounded-[18px] overflow-hidden">
            <MinigameForm embedded onSportChange={setSport} />
          </div>
          <MinigameOverviewPanel sport={sport} />
        </div>
      )}
    </div>
  )
}

// ── Tab điều hướng THẬT (Lịch/Kết quả/Xếp hạng) ───────────────────────────────
type NavKind = 'schedule' | 'results' | 'standings'
const NAV_META: Record<NavKind, { title: string; sub: string; icon: typeof CalendarDays; to: (id: string) => string; empty: string }> = {
  schedule: { title: 'Lịch đấu', sub: 'Chọn giải để xem lịch thi đấu chi tiết', icon: CalendarDays, to: (id) => `/minigames/${id}/schedule`, empty: 'Chưa có giải nào để xem lịch.' },
  results: { title: 'Kết quả', sub: 'Chọn giải để nhập / xem kết quả trận', icon: ClipboardList, to: (id) => `/minigames/${id}`, empty: 'Chưa có giải nào để xem kết quả.' },
  standings: { title: 'Xếp hạng', sub: 'Chọn giải để xem bảng xếp hạng', icon: Trophy, to: (id) => `/minigames/${id}/standings`, empty: 'Chưa có giải nào để xem xếp hạng.' },
}

function TournamentNavList({ kind }: { kind: NavKind }) {
  const navigate = useNavigate()
  const meta = NAV_META[kind]
  const [items, setItems] = useState<MiniGame[] | null>(null)
  const [error, setError] = useState(false)

  const load = () => {
    setError(false); setItems(null)
    api.get('/minigames')
      .then(r => setItems((r.data?.data ?? r.data ?? []) as MiniGame[]))
      .catch(() => setError(true))
  }
  useEffect(load, [kind])

  const Icon = meta.icon
  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-base font-bold [color:var(--pf-text)]">{meta.title}</h2>
          <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">{meta.sub}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw size={13} /> Tải lại
        </Button>
      </div>

      {error ? (
        <div className="pf-glass rounded-2xl p-8 text-center">
          <p className="text-sm [color:var(--pf-color-danger)]">Không tải được danh sách giải.</p>
          <button onClick={load} className="mt-3 text-xs font-semibold [color:var(--pf-primary)]">Thử lại</button>
        </div>
      ) : items === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-2xl border [background:var(--pf-surface-muted)] border-[color:var(--pf-border)] animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="pf-glass rounded-2xl p-10 text-center">
          <Icon size={28} className="mx-auto [color:var(--pf-color-muted)]" />
          <p className="mt-2 text-sm [color:var(--pf-color-muted)]">{meta.empty}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(mg => {
            const st = normalizeMinigameStatus(mg.status)
            return (
              <button key={mg.id} onClick={() => navigate(meta.to(mg.id))}
                className="pf-glass text-left rounded-2xl p-4 hover:-translate-y-0.5 hover:[border-color:var(--pf-primary-soft)] transition-all">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl leading-none">{sportEmoji(mg.sport) || '🏓'}</span>
                  <StatusBadge tone="neutral">{STATUS_LABEL[st] ?? st}</StatusBadge>
                </div>
                <div className="mt-2 text-sm font-bold [color:var(--pf-text)] line-clamp-2">{mg.name}</div>
                <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold [color:var(--pf-primary)]">
                  <Icon size={13} /> {meta.title}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function CompeteHub() {
  return (
    <ModuleTabs
      title="Thi đấu"
      tabs={[
        { key: 'overview', label: 'Tổng quan', element: <OverviewTab /> },
        { key: 'tournaments', label: 'Giải đấu', element: <TournamentsTab /> },
        { key: 'schedule', label: 'Lịch đấu', element: <TournamentNavList kind="schedule" /> },
        { key: 'results', label: 'Kết quả', element: <TournamentNavList kind="results" /> },
        { key: 'standings', label: 'Xếp hạng', element: <TournamentNavList kind="standings" /> },
      ]}
    />
  )
}
