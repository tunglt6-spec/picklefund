import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore, DEMO_CLUB_ID } from '../../store/clubDataStore'
import { getActiveChungPeriod, cn } from '../../lib/utils'
import api from '../../lib/api'
import type { AppItem } from './hubApps'
import type { Role } from '../../types'

export { fold } from '../../lib/fold'

export const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function greeting(h = new Date().getHours()) {
  return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
}

/** true khi màn rộng >= 1024px (desktop/tablet ngang) — các trang chỉ dành cho mobile quay về trang chủ. */
export function useIsWide() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

export type LoadState = 'loading' | 'ok' | 'error'

/** Dữ liệu dùng chung cho các trang mobile: CLB, kỳ quỹ, tài chính tóm tắt, buổi sắp tới. */
export function useHubData() {
  const user = useAuthStore((s) => s.user)
  const clubId = user?.clubId ?? DEMO_CLUB_ID
  const clubData = useClubDataStore((s) => s.dataByClub[clubId])
  const role = user?.role as Role | undefined
  const hasClub = !!user?.clubId && role !== 'SUPER_ADMIN'
  const activePeriod = clubData ? getActiveChungPeriod(clubData.fundPeriods) : undefined

  // Tóm tắt kỳ quỹ lấy từ CÙNG endpoint màn Thủ quỹ dùng (không tính lại công thức ở đây).
  const [fin, setFin] = useState<{ assets: number; totalExpense: number; unpaidCount: number } | null>(null)
  const [finState, setFinState] = useState<LoadState>('loading')
  const hasData = !!clubData
  useEffect(() => {
    if (!hasClub) { setFin(null); setFinState('ok'); return }
    if (!activePeriod?.id) { setFin(null); setFinState(hasData ? 'ok' : 'loading'); return }
    let off = false
    setFinState('loading')
    api.get(`/fund-periods/${activePeriod.id}/summary`)
      .then((res) => {
        if (off) return
        const f = res.data?.data
        const common = Number(f?.balance ?? 0)
        const carry = Number(f?.carryForward?.balance ?? 0)
        setFin({ assets: Number(f?.clubAssets?.balance ?? (common + carry)), totalExpense: Number(f?.totalExpenses ?? 0), unpaidCount: Number(f?.unpaidCount ?? 0) })
        setFinState('ok')
      })
      .catch(() => { if (!off) { setFin(null); setFinState('error') } })
    return () => { off = true }
  }, [hasClub, activePeriod?.id, hasData])

  const upcoming = useMemo(() => {
    const tk = todayKey()
    return (clubData?.sessions ?? [])
      .filter((s) => s.status !== 'cancelled' && (s.sessionDate ?? '').slice(0, 10) >= tk)
      .sort((a, b) => (a.sessionDate.slice(0, 10) + (a.startTime ?? '')).localeCompare(b.sessionDate.slice(0, 10) + (b.startTime ?? '')))
  }, [clubData?.sessions])

  return { user, role, clubData, hasClub, activePeriod, fin, finState, upcoming, nextSession: upcoming[0] }
}

/** Ô tìm kiếm CHỨC NĂNG toàn app (khác với ô tìm dữ liệu trong từng màn). */
export function HubSearch({ value, onChange, placeholder = 'Tìm chức năng…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label
      className="flex h-12 items-center gap-3 rounded-full border px-4 [background:var(--pf-surface)] [border-color:var(--pf-border)] focus-within:ring-2 focus-within:ring-[color:var(--pf-primary)]"
      style={{ boxShadow: 'var(--pf-shadow-field)' }}
    >
      <Search size={20} className="shrink-0 [color:var(--pf-color-muted)]" aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Tìm chức năng trong toàn ứng dụng"
        className="min-w-0 flex-1 bg-transparent text-base outline-none [color:var(--pf-text)] placeholder:[color:var(--pf-color-muted)]"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Xóa nội dung tìm kiếm" className="flex h-8 w-8 items-center justify-center rounded-full [color:var(--pf-color-muted)]">
          <X size={16} aria-hidden />
        </button>
      )}
    </label>
  )
}

/** Tiêu đề mục + (tuỳ chọn) liên kết/nút bên phải. */
export function HubSectionTitle({ children, right, first }: { children: ReactNode; right?: ReactNode; first?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between', first ? 'mt-2' : 'mt-6')}>
      <h2 className="text-[17px] font-[800] [color:var(--pf-text)]">{children}</h2>
      {right}
    </div>
  )
}

/** Khối nội dung chuẩn: bề mặt trắng, viền xám mảnh, bóng trung tính. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn('rounded-[var(--pf-radius-card)] border [background:var(--pf-surface)] [border-color:var(--pf-border)]', className)}
      style={{ boxShadow: 'var(--pf-shadow-card)' }}
    >
      {children}
    </section>
  )
}

/** Khung chờ tải (giữ bố cục ổn định, không hiện dấu — gây hiểu nhầm là "không có dữ liệu"). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md [background:var(--pf-surface-muted)]', className)} />
}

/** Hàng danh sách bấm được (tiêu đề + mô tả + mũi tên). */
export function ListRow({ title, sub, onClick, trailing }: { title: string; sub?: string; onClick: () => void; trailing?: ReactNode }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left active:[background:var(--pf-color-muted-soft)]"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold [color:var(--pf-text)]">{title}</span>
          {sub && <span className="block truncate text-xs [color:var(--pf-color-muted)]">{sub}</span>}
        </span>
        {trailing}
        <ChevronRight size={18} className="shrink-0 [color:var(--pf-color-muted)]" aria-hidden />
      </button>
    </li>
  )
}

/** Lưới ô icon 4 cột. `editing` hiện nút ‹/› để sắp xếp (trang Ứng dụng). */
export function TileGrid({
  items, unread = 0, editing = false, onMove, onSelect, empty,
}: {
  items: AppItem[]; unread?: number; editing?: boolean; onMove?: (key: string, dir: -1 | 1) => void
  /** Có → bấm ô gọi hàm này thay vì chuyển trang (dùng cho menu trong-trang như AIDO/Cài đặt). */
  onSelect?: (item: AppItem) => void
  empty?: string
}) {
  const navigate = useNavigate()
  if (items.length === 0) return <p className="py-10 text-center text-sm [color:var(--pf-color-muted)]">{empty ?? 'Không có chức năng phù hợp.'}</p>
  return (
    <ul className="mt-3 grid grid-cols-4 gap-x-2 gap-y-4 min-[640px]:grid-cols-6">
      {items.map((a, i) => {
        const Icon = a.icon
        const count = a.badge ? unread : (a.badgeCount ?? 0)
        return (
          <li key={a.key} className="relative min-w-0">
            <button
              onClick={() => { if (editing) return; if (onSelect) onSelect(a); else navigate(a.to) }}
              className="flex w-full flex-col items-center gap-1.5 active:opacity-80"
              aria-label={count > 0 ? `${a.label} (${count} mới)` : a.label}
            >
              <span
                className="relative flex aspect-square w-full max-w-[64px] items-center justify-center rounded-[var(--pf-radius-tile)]"
                style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary-text)' }}
              >
                <Icon size={26} strokeWidth={1.9} aria-hidden />
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DC2626] px-1 text-xs font-bold text-white">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </span>
              <span className="w-full break-words text-center text-xs font-semibold leading-tight [color:var(--pf-text)]">{a.label}</span>
            </button>
            {editing && onMove && (
              <div className="absolute inset-x-0 top-0 flex justify-between px-0.5">
                <button
                  onClick={() => onMove(a.key, -1)}
                  disabled={i === 0}
                  aria-label={`Chuyển ${a.label} lên trước`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow disabled:opacity-30 [background:var(--pf-primary)]"
                >
                  ‹
                </button>
                <button
                  onClick={() => onMove(a.key, 1)}
                  disabled={i === items.length - 1}
                  aria-label={`Chuyển ${a.label} ra sau`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow disabled:opacity-30 [background:var(--pf-primary)]"
                >
                  ›
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
