import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, ChevronRight, ArrowLeft, ArrowRight, X, Wallet, CalendarDays } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useBrandingStore } from '../../store/brandingStore'
import { useNotifStore } from '../../store/notifStore'
import { useClubDataStore, DEMO_CLUB_ID } from '../../store/clubDataStore'
import { getActiveChungPeriod, formatVND, cn } from '../../lib/utils'
import { moneyColor } from '../../lib/moneyTone'
import api from '../../lib/api'
import { PickleFundLogoMark } from '../ui/PickleFundLogoMark'
import { AvatarMenu } from '../layout/AvatarMenu'
import { notifRouteByRole } from '../layout/navConfig'
import type { AppItem } from './hubApps'
import type { Role } from '../../types'

/** Bỏ dấu + hạ chữ để tìm "diem danh" ra "Điểm danh". */
export const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()

export function greeting(h = new Date().getHours()) {
  return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
}

export const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** true khi màn rộng >= 1024px (desktop) — các trang hub chỉ dành cho mobile/Fold gập. */
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

/** Dữ liệu dùng chung cho các trang hub: CLB, kỳ quỹ, số dư, buổi sắp tới. */
export function useHubData() {
  const user = useAuthStore((s) => s.user)
  const clubId = user?.clubId ?? DEMO_CLUB_ID
  const clubData = useClubDataStore((s) => s.dataByClub[clubId])
  const role = user?.role as Role | undefined
  const hasClub = !!user?.clubId && role !== 'SUPER_ADMIN'
  const activePeriod = clubData ? getActiveChungPeriod(clubData.fundPeriods) : undefined

  const [balance, setBalance] = useState<number | null>(null)
  useEffect(() => {
    if (!hasClub || !activePeriod?.id) { setBalance(null); return }
    let off = false
    api.get(`/fund-periods/${activePeriod.id}/summary`)
      .then((res) => {
        if (off) return
        const f = res.data?.data
        setBalance(Number(f?.balance ?? 0) + Number(f?.carryForward?.balance ?? 0))
      })
      .catch(() => { if (!off) setBalance(null) })
    return () => { off = true }
  }, [hasClub, activePeriod?.id])

  const upcoming = useMemo(() => {
    const tk = todayKey()
    return (clubData?.sessions ?? [])
      .filter((s) => s.status !== 'cancelled' && (s.sessionDate ?? '').slice(0, 10) >= tk)
      .sort((a, b) => (a.sessionDate.slice(0, 10) + (a.startTime ?? '')).localeCompare(b.sessionDate.slice(0, 10) + (b.startTime ?? '')))
  }, [clubData?.sessions])

  return { user, role, clubData, hasClub, activePeriod, balance, upcoming, nextSession: upcoming[0] }
}

/** Header lớn: logo + thương hiệu + lời chào + tên CLB + chuông + avatar. */
export function HubHeader({ hasClub, clubName }: { hasClub: boolean; clubName?: string }) {
  const user = useAuthStore((s) => s.user)
  const branding = useBrandingStore((s) => s.branding)
  const unread = useNotifStore((s) => s.unreadCount)
  const navigate = useNavigate()
  if (!user) return null
  return (
    <header className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {branding.logoUrl
            ? <img src={branding.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
            : <PickleFundLogoMark size={32} />}
          <span className="truncate text-[22px] font-[800] tracking-tight [color:var(--pf-text)]">
            {branding.displayName ?? 'PickleFund'}
          </span>
        </div>
        <p className="mt-1.5 truncate text-[15px] font-semibold [color:var(--pf-text)]">{greeting()}, {user.username}</p>
        {hasClub && clubName && <p className="truncate text-xs [color:var(--pf-color-muted)]">{clubName}</p>}
      </div>
      <button
        onClick={() => navigate(notifRouteByRole[user.role])}
        aria-label="Thông báo"
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border [background:var(--pf-surface)] [border-color:var(--pf-border)] [color:var(--pf-primary)] active:scale-95"
        style={{ boxShadow: 'var(--pf-shadow-float)' }}
      >
        <Bell size={20} />
        {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[color:var(--pf-surface)]" />}
      </button>
      <AvatarMenu size={44} rounded="rounded-full" background="var(--pf-grad-brand)" extras />
    </header>
  )
}

/** Ô tìm kiếm pill 48px. */
export function HubSearch({ value, onChange, placeholder = 'Tìm chức năng…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label
      className="mt-4 flex h-12 items-center gap-3 rounded-full border px-4 [background:var(--pf-surface)] [border-color:var(--pf-border)] focus-within:ring-2 focus-within:ring-[color:var(--pf-primary)]"
      style={{ boxShadow: 'var(--pf-shadow-field)' }}
    >
      <Search size={20} className="shrink-0 [color:var(--pf-color-muted)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Tìm chức năng"
        className="min-w-0 flex-1 bg-transparent text-base outline-none [color:var(--pf-text)] placeholder:[color:var(--pf-color-muted)]"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Xóa tìm kiếm" className="flex h-8 w-8 items-center justify-center rounded-full [color:var(--pf-color-muted)]">
          <X size={16} />
        </button>
      )}
    </label>
  )
}

/** Thẻ tóm tắt: icon + tiêu đề, số lớn, mô tả, nút pill. */
export function SummaryCard({
  icon, title, value, valueColor, sub, cta, onOpen, outline,
}: {
  icon: ReactNode; title: string; value: string; valueColor?: string; sub: string; cta: string; onOpen: () => void; outline?: boolean
}) {
  return (
    <section
      className="flex min-w-0 flex-col rounded-3xl border p-3.5 [background:var(--pf-surface)] [border-color:var(--pf-border)]"
      style={{ boxShadow: 'var(--pf-shadow-card)' }}
    >
      <button onClick={onOpen} className="flex min-h-[44px] items-center gap-2 text-left" aria-label={title}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold [color:var(--pf-text)]">{title}</span>
        <ChevronRight size={16} className="shrink-0 [color:var(--pf-color-muted)]" />
      </button>
      <p className="mt-1 truncate text-[22px] font-[800] leading-tight tracking-tight [color:var(--pf-text)]" style={valueColor ? { color: valueColor } : undefined}>{value}</p>
      <p className="truncate text-xs [color:var(--pf-color-muted)]">{sub}</p>
      <button
        onClick={onOpen}
        className={cn(
          'mt-3 flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-3 text-sm font-bold active:scale-[0.98]',
          outline ? 'border [color:var(--pf-primary)] [border-color:var(--pf-primary)] [background:var(--pf-surface)]' : 'text-white',
        )}
        style={outline ? undefined : { background: 'var(--pf-grad-brand)', boxShadow: 'var(--pf-shadow-pill)' }}
      >
        <span className="truncate">{cta}</span>
        <ChevronRight size={16} className="shrink-0" />
      </button>
    </section>
  )
}

/** Cặp thẻ chuẩn: Quỹ CLB + Lịch hôm nay/Sắp tới (thủ quỹ không có module Lịch → chỉ thẻ Quỹ). */
export function FundAndCalendarCards() {
  const navigate = useNavigate()
  const { role, hasClub, activePeriod, balance, nextSession } = useHubData()
  if (!hasClub || !role) return null
  const isToday = nextSession?.sessionDate.slice(0, 10) === todayKey()
  const fundRoute = role === 'MEMBER_VIEW' ? '/member/tai-chinh?tab=periods' : role === 'CLUB_TREASURER' ? '/treasurer/dashboard' : '/tai-chinh?tab=periods'
  const calRoute = role === 'MEMBER_VIEW' ? '/member/hoat-dong?tab=schedule' : '/hoat-dong?tab=schedule'
  const showCalendar = role !== 'CLUB_TREASURER'
  return (
    <div className={cn('mt-4 grid gap-3', showCalendar ? 'grid-cols-2' : 'grid-cols-1')}>
      <SummaryCard
        icon={<Wallet size={18} />}
        title="Quỹ CLB"
        onOpen={() => navigate(fundRoute)}
        value={balance === null ? '—' : formatVND(balance)}
        valueColor={balance === null ? undefined : moneyColor(balance, 'balance')}
        sub={activePeriod ? 'Số dư hiện tại' : 'Chưa có kỳ quỹ mở'}
        cta="Xem chi tiết"
      />
      {showCalendar && (
        <SummaryCard
          icon={<CalendarDays size={18} />}
          title={isToday ? 'Lịch hôm nay' : 'Sắp tới'}
          onOpen={() => navigate(calRoute)}
          value={nextSession ? (nextSession.startTime ?? '--:--') : '—'}
          sub={nextSession
            ? [!isToday ? `${nextSession.sessionDate.slice(8, 10)}/${nextSession.sessionDate.slice(5, 7)}` : null, nextSession.courtName].filter(Boolean).join(' · ') || 'Buổi sinh hoạt'
            : 'Chưa có lịch'}
          cta="Xem lịch"
          outline
        />
      )}
    </div>
  )
}

/** Tiêu đề mục + (tuỳ chọn) nút ở bên phải. */
export function HubSectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <h2 className="text-lg font-[800] [color:var(--pf-text)]">{children}</h2>
      {right}
    </div>
  )
}

/** Lưới ô icon 4 cột (6 cột từ 640px). `editing` hiện nút ←/→ để sắp xếp. */
export function TileGrid({
  items, unread = 0, editing = false, onMove, onSelect, empty,
}: {
  items: AppItem[]; unread?: number; editing?: boolean; onMove?: (key: string, dir: -1 | 1) => void
  /** Có → bấm ô gọi hàm này thay vì chuyển trang (dùng cho menu trong-trang như AIDO). */
  onSelect?: (item: AppItem) => void
  empty?: string
}) {
  const navigate = useNavigate()
  if (items.length === 0) return <p className="py-10 text-center text-sm [color:var(--pf-color-muted)]">{empty ?? 'Không có chức năng phù hợp.'}</p>
  return (
    <ul className="mt-2 grid grid-cols-4 gap-x-2 gap-y-4 min-[640px]:grid-cols-6">
      {items.map((a, i) => {
        const Icon = a.icon
        return (
          <li key={a.key} className="relative min-w-0">
            <button
              onClick={() => { if (editing) return; if (onSelect) onSelect(a); else navigate(a.to) }}
              className="flex w-full flex-col items-center gap-1.5 active:scale-95"
              aria-label={a.label}
            >
              <span
                className="relative flex aspect-square w-full max-w-[72px] items-center justify-center rounded-[22px] border"
                style={{
                  background: 'linear-gradient(145deg, var(--pf-primary-soft), var(--pf-surface))',
                  borderColor: 'color-mix(in srgb, var(--pf-primary) 14%, transparent)',
                  boxShadow: 'var(--pf-shadow-float)',
                  color: 'var(--pf-primary)',
                }}
              >
                <Icon size={28} strokeWidth={1.9} />
                {a.badge && unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
                {(a.badgeCount ?? 0) > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                    {(a.badgeCount ?? 0) > 9 ? '9+' : a.badgeCount}
                  </span>
                )}
              </span>
              <span className="w-full break-words text-center text-[12.5px] font-semibold leading-tight [color:var(--pf-text)]">{a.label}</span>
            </button>
            {editing && onMove && (
              <div className="absolute inset-x-0 top-0 flex justify-between px-0.5">
                <button
                  onClick={() => onMove(a.key, -1)}
                  disabled={i === 0}
                  aria-label={`Chuyển ${a.label} lên trước`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow disabled:opacity-30 [background:var(--pf-primary)]"
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  onClick={() => onMove(a.key, 1)}
                  disabled={i === items.length - 1}
                  aria-label={`Chuyển ${a.label} ra sau`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow disabled:opacity-30 [background:var(--pf-primary)]"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Thẻ số liệu nhỏ (giá trị lớn + nhãn) cho khối "Tổng quan hôm nay". */
export function StatTile({ label, value, sub, valueColor, onClick }: { label: string; value: string; sub?: string; valueColor?: string; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className="min-w-0 rounded-3xl border p-3.5 text-left [background:var(--pf-surface)] [border-color:var(--pf-border)]"
      style={{ boxShadow: 'var(--pf-shadow-card)' }}
    >
      <p className="truncate text-xs font-semibold uppercase tracking-wide [color:var(--pf-color-muted)]">{label}</p>
      <p className="mt-1 truncate text-[22px] font-[800] leading-tight tracking-tight [color:var(--pf-text)]" style={valueColor ? { color: valueColor } : undefined}>{value}</p>
      {sub && <p className="truncate text-xs [color:var(--pf-color-muted)]">{sub}</p>}
    </Comp>
  )
}
