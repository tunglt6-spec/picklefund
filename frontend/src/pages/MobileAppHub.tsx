import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Bell, Search, ChevronRight, ArrowUpDown, Check, ArrowLeft, ArrowRight, X,
  Users, Wallet, ClipboardCheck, BarChart3, Trophy, CalendarDays, FileCheck2, Medal,
  MessageSquare, Cpu, Settings, Sparkles, Receipt, LayoutDashboard, Building2, CreditCard,
  ScrollText, ListOrdered, BadgeCheck, Award, FileText, HandCoins, BellRing,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useBrandingStore } from '../store/brandingStore'
import { useNotifStore } from '../store/notifStore'
import { useClubDataStore, DEMO_CLUB_ID } from '../store/clubDataStore'
import { getActiveChungPeriod, formatVND, cn } from '../lib/utils'
import { moneyColor } from '../lib/moneyTone'
import api from '../lib/api'
import { PickleFundLogoMark } from '../components/ui/PickleFundLogoMark'
import { AvatarMenu } from '../components/layout/AvatarMenu'
import { homeByRole, notifRouteByRole } from '../components/layout/navConfig'
import type { Role } from '../types'

/** Một ứng dụng/chức năng trên lưới "Ứng dụng của tôi". */
interface AppItem { key: string; label: string; to: string; icon: typeof Users; badge?: boolean }

// Mỗi vai trò thấy đúng các chức năng mình được phép (route/tab trùng Sidebar + module hiện có — KHÔNG đổi nghiệp vụ).
const APPS: Record<Role, AppItem[]> = {
  CLUB_ADMIN: [
    { key: 'members', label: 'Thành viên', to: '/thanh-vien', icon: Users },
    { key: 'fund', label: 'Quỹ CLB', to: '/tai-chinh', icon: Wallet },
    { key: 'attendance', label: 'Điểm danh', to: '/hoat-dong?tab=attendance', icon: ClipboardCheck },
    { key: 'weekly', label: 'Hoạt động', to: '/hoat-dong?tab=weekly', icon: BarChart3 },
    { key: 'tournaments', label: 'Giải đấu', to: '/thi-dau?tab=tournaments', icon: Trophy },
    { key: 'schedule', label: 'Lịch đấu', to: '/thi-dau?tab=schedule', icon: CalendarDays },
    { key: 'results', label: 'Kết quả', to: '/thi-dau?tab=results', icon: FileCheck2 },
    { key: 'standings', label: 'Xếp hạng', to: '/thi-dau?tab=standings', icon: Medal },
    { key: 'community', label: 'Cộng đồng', to: '/community', icon: MessageSquare },
    { key: 'notifications', label: 'Thông báo', to: '/he-thong?tab=notifications', icon: Bell, badge: true },
    { key: 'aido', label: 'AIDO', to: '/aido', icon: Cpu },
    { key: 'settings', label: 'Cài đặt', to: '/he-thong?tab=settings', icon: Settings },
    { key: 'debts', label: 'Công nợ', to: '/tai-chinh?tab=debts', icon: HandCoins },
    { key: 'reports', label: 'Báo cáo', to: '/tai-chinh?tab=reports', icon: FileText },
    { key: 'scoring', label: 'Chấm điểm', to: '/thanh-vien?tab=scoring', icon: Award },
    { key: 'lisa', label: 'Lisa AI', to: '/lisa', icon: Sparkles },
  ],
  MEMBER_VIEW: [
    { key: 'dashboard', label: 'Tổng quan', to: '/member/dashboard', icon: LayoutDashboard },
    { key: 'personal', label: 'Phiếu thu', to: '/member/ca-nhan', icon: Receipt },
    { key: 'fund', label: 'Quỹ CLB', to: '/member/tai-chinh', icon: Wallet },
    { key: 'attend', label: 'Điểm danh', to: '/member/ca-nhan?tab=attend', icon: ClipboardCheck },
    { key: 'activity', label: 'Hoạt động', to: '/member/hoat-dong', icon: BarChart3 },
    { key: 'tournaments', label: 'Giải đấu', to: '/member/thi-dau?tab=tournaments', icon: Trophy },
    { key: 'schedule', label: 'Lịch đấu', to: '/member/thi-dau?tab=schedule', icon: CalendarDays },
    { key: 'results', label: 'Kết quả', to: '/member/thi-dau?tab=results', icon: FileCheck2 },
    { key: 'standings', label: 'Xếp hạng', to: '/member/thi-dau?tab=standings', icon: Medal },
    { key: 'community', label: 'Cộng đồng', to: '/community', icon: MessageSquare },
    { key: 'notifications', label: 'Thông báo', to: '/member/notifications', icon: Bell, badge: true },
    { key: 'office', label: 'Văn phòng AI', to: '/member/aido', icon: Cpu },
    { key: 'debts', label: 'Công nợ', to: '/member/ca-nhan?tab=debts', icon: HandCoins },
    { key: 'reports', label: 'Báo cáo', to: '/member/tai-chinh?tab=reports', icon: FileText },
    { key: 'lisa', label: 'Lisa AI', to: '/member/lisa', icon: Sparkles },
  ],
  CLUB_TREASURER: [
    { key: 'dashboard', label: 'Tổng quan', to: '/treasurer/dashboard', icon: LayoutDashboard },
    { key: 'ledger', label: 'Sổ quỹ', to: '/treasurer/so-quy', icon: ListOrdered },
    { key: 'scoring', label: 'Chấm điểm', to: '/scoring', icon: Award },
    { key: 'approve', label: 'Xác nhận nộp quỹ', to: '/payments', icon: BadgeCheck },
    { key: 'reminders', label: 'Nhắc nhở', to: '/treasurer/reminders', icon: BellRing },
    { key: 'community', label: 'Cộng đồng', to: '/community', icon: MessageSquare },
    { key: 'notifications', label: 'Thông báo', to: '/notifications', icon: Bell, badge: true },
    { key: 'lisa', label: 'Lisa AI', to: '/lisa', icon: Sparkles },
  ],
  SUPER_ADMIN: [
    { key: 'dashboard', label: 'Tổng quan', to: '/super/dashboard', icon: LayoutDashboard },
    { key: 'clubs', label: 'Quản lý CLB', to: '/super/clubs', icon: Building2 },
    { key: 'users', label: 'Người dùng', to: '/super/users', icon: Users },
    { key: 'payments', label: 'Thanh toán gói', to: '/super/payments', icon: CreditCard },
    { key: 'audit', label: 'Audit Logs', to: '/super/audit-logs', icon: ScrollText },
    { key: 'settings', label: 'Cài đặt', to: '/super/settings', icon: Settings },
  ],
}

/** Bỏ dấu + hạ chữ để tìm "diem danh" ra "Điểm danh". */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()

function greeting(h = new Date().getHours()) {
  return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
}

const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function MobileAppHub() {
  const user = useAuthStore((s) => s.user)
  const branding = useBrandingStore((s) => s.branding)
  const unread = useNotifStore((s) => s.unreadCount)
  const navigate = useNavigate()
  const clubId = user?.clubId ?? DEMO_CLUB_ID
  const clubData = useClubDataStore((s) => s.dataByClub[clubId])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const role = user?.role as Role | undefined

  // Trang này chỉ dành cho mobile/Fold gập: màn ≥1024px quay về trang chủ theo vai trò.
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Thứ tự lưới do người dùng sắp xếp (lưu theo tài khoản trên thiết bị này).
  const orderKey = user ? `pf_hub_order_v1_${user.id ?? user.username}` : ''
  const [order, setOrder] = useState<string[]>([])
  useEffect(() => {
    if (!orderKey) return
    try { setOrder(JSON.parse(localStorage.getItem(orderKey) ?? '[]')) } catch { setOrder([]) }
  }, [orderKey])
  const saveOrder = (next: string[]) => {
    setOrder(next)
    try { localStorage.setItem(orderKey, JSON.stringify(next)) } catch { /* noop */ }
  }

  const apps = useMemo(() => {
    const base = role ? APPS[role] ?? [] : []
    const rank = new Map(order.map((k, i) => [k, i]))
    return [...base].sort((a, b) => (rank.get(a.key) ?? 1e6 + base.indexOf(a)) - (rank.get(b.key) ?? 1e6 + base.indexOf(b)))
  }, [role, order])

  const q = fold(query.trim())
  const shown = q ? apps.filter((a) => fold(a.label).includes(q)) : apps

  const move = (key: string, dir: -1 | 1) => {
    const keys = apps.map((a) => a.key)
    const i = keys.indexOf(key)
    const j = i + dir
    if (i < 0 || j < 0 || j >= keys.length) return
    ;[keys[i], keys[j]] = [keys[j], keys[i]]
    saveOrder(keys)
  }

  // ── Thẻ tóm tắt: Quỹ CLB (số dư tài sản CLB) + Lịch hôm nay / buổi sắp tới ──
  const activePeriod = clubData ? getActiveChungPeriod(clubData.fundPeriods) : undefined
  const [balance, setBalance] = useState<number | null>(null)
  const hasClub = !!user?.clubId && role !== 'SUPER_ADMIN'
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

  const nextSession = useMemo(() => {
    const tk = todayKey()
    const list = (clubData?.sessions ?? [])
      .filter((s) => s.status !== 'cancelled' && (s.sessionDate ?? '').slice(0, 10) >= tk)
      .sort((a, b) => (a.sessionDate.slice(0, 10) + (a.startTime ?? '')).localeCompare(b.sessionDate.slice(0, 10) + (b.startTime ?? '')))
    return list[0]
  }, [clubData?.sessions])

  if (!user || !role) return null
  if (wide) return <Navigate to={homeByRole[role]} replace />

  const isToday = nextSession?.sessionDate.slice(0, 10) === todayKey()
  const fundRoute = role === 'MEMBER_VIEW' ? '/member/tai-chinh' : role === 'CLUB_TREASURER' ? '/treasurer/dashboard' : '/tai-chinh'
  const showCalendar = role !== 'CLUB_TREASURER' // thủ quỹ không có quyền vào module Lịch/Hoạt động
  const calRoute = role === 'MEMBER_VIEW' ? '/member/hoat-dong' : '/hoat-dong'
  const bellRoute = notifRouteByRole[role]

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-[max(12px,env(safe-area-inset-top))]">
      {/* ── Header: logo + lời chào + chuông + avatar ── */}
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
          {hasClub && clubData?.settings?.name && <p className="truncate text-xs [color:var(--pf-color-muted)]">{clubData.settings.name}</p>}
        </div>
        <button
          onClick={() => navigate(bellRoute)}
          aria-label="Thông báo"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border [background:var(--pf-surface)] [border-color:var(--pf-border)] [color:var(--pf-primary)] active:scale-95"
          style={{ boxShadow: '0 6px 16px -10px rgba(109,93,251,0.6)' }}
        >
          <Bell size={20} />
          {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[color:var(--pf-surface)]" />}
        </button>
        <AvatarMenu size={44} rounded="rounded-full" background="var(--pf-grad-brand)" />
      </header>

      {/* ── Tìm chức năng ── */}
      <label
        className="mt-4 flex h-12 items-center gap-3 rounded-full border px-4 [background:var(--pf-surface)] [border-color:var(--pf-border)] focus-within:ring-2 focus-within:ring-[color:var(--pf-primary)]"
        style={{ boxShadow: '0 10px 24px -16px rgba(109,93,251,0.45)' }}
      >
        <Search size={20} className="shrink-0 [color:var(--pf-color-muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm chức năng…"
          aria-label="Tìm chức năng"
          className="min-w-0 flex-1 bg-transparent text-base outline-none [color:var(--pf-text)] placeholder:[color:var(--pf-color-muted)]"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm" className="flex h-8 w-8 items-center justify-center rounded-full [color:var(--pf-color-muted)]">
            <X size={16} />
          </button>
        )}
      </label>

      {/* ── 2 thẻ tóm tắt (ẩn khi đang tìm kiếm, và với Super Admin không gắn CLB) ── */}
      {hasClub && !q && (
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
      )}

      {/* ── Ứng dụng của tôi ── */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-[800] [color:var(--pf-text)]">{q ? `Kết quả (${shown.length})` : 'Ứng dụng của tôi'}</h2>
        {!q && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="flex min-h-[44px] items-center gap-1.5 px-1 text-sm font-semibold [color:var(--pf-primary)] active:opacity-70"
          >
            {editing ? <Check size={16} /> : <ArrowUpDown size={16} />}
            {editing ? 'Xong' : 'Sắp xếp'}
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm [color:var(--pf-color-muted)]">Không tìm thấy chức năng “{query}”.</p>
      ) : (
        <ul className="mt-2 grid grid-cols-4 gap-x-2 gap-y-4 min-[640px]:grid-cols-6">
          {shown.map((a, i) => {
            const Icon = a.icon
            return (
              <li key={a.key} className="relative min-w-0">
                <button
                  onClick={() => !editing && navigate(a.to)}
                  className="flex w-full flex-col items-center gap-1.5 active:scale-95"
                  aria-label={a.label}
                >
                  <span
                    className="relative flex aspect-square w-full max-w-[72px] items-center justify-center rounded-[22px] border"
                    style={{
                      background: 'linear-gradient(145deg, var(--pf-primary-soft), var(--pf-surface))',
                      borderColor: 'color-mix(in srgb, var(--pf-primary) 14%, transparent)',
                      boxShadow: '0 10px 22px -14px rgba(109,93,251,0.65), inset 0 1px 0 rgba(255,255,255,0.7)',
                      color: 'var(--pf-primary)',
                    }}
                  >
                    <Icon size={28} strokeWidth={1.9} />
                    {a.badge && unread > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </span>
                  <span className="w-full break-words text-center text-[12.5px] font-semibold leading-tight [color:var(--pf-text)]">{a.label}</span>
                </button>
                {editing && (
                  <div className="absolute inset-x-0 top-0 flex justify-between px-0.5">
                    <button
                      onClick={() => move(a.key, -1)}
                      disabled={i === 0}
                      aria-label={`Chuyển ${a.label} lên trước`}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow disabled:opacity-30 [background:var(--pf-primary)]"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <button
                      onClick={() => move(a.key, 1)}
                      disabled={i === shown.length - 1}
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
      )}
    </div>
  )
}

function SummaryCard({
  icon, title, value, valueColor, sub, cta, onOpen, outline,
}: {
  icon: React.ReactNode; title: string; value: string; valueColor?: string; sub: string; cta: string; onOpen: () => void; outline?: boolean
}) {
  return (
    <section
      className="flex min-w-0 flex-col rounded-3xl border p-3.5 [background:var(--pf-surface)] [border-color:var(--pf-border)]"
      style={{ boxShadow: '0 14px 30px -20px rgba(109,93,251,0.55)' }}
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
        style={outline ? undefined : { background: 'var(--pf-grad-brand)', boxShadow: '0 10px 20px -10px rgba(109,93,251,0.7)' }}
      >
        <span className="truncate">{cta}</span>
        <ChevronRight size={16} className="shrink-0" />
      </button>
    </section>
  )
}
