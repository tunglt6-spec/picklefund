import { useMemo, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CalendarDays, Trophy, Newspaper, Swords, ChevronRight } from 'lucide-react'
import { useNotifStore } from '../store/notifStore'
import { useMinigameStore } from '../store/minigameStore'
import { homeByRole } from '../components/layout/navConfig'
import {
  homeApps, calendarApps, competeApps, communityApps, type AppItem,
} from '../components/mobile/hubApps'
import {
  HubHeader, HubSearch, HubSectionTitle, TileGrid, SummaryCard, StatTile, FundAndCalendarCards,
  fold, todayKey, useHubData, useIsWide,
} from '../components/mobile/HubParts'
import { normalizeMinigameStatus } from '../types/minigame'

/** Khung chung của các màn hub mobile: header lớn + tìm kiếm + (thẻ tóm tắt) + lưới tile + (nội dung thêm). */
function SectionHub({
  tilesTitle, tiles, cards, extra, searchPlaceholder, showCards = true,
}: {
  tilesTitle: string
  tiles: AppItem[]
  /** Thẻ tóm tắt riêng của mục; mặc định dùng cặp Quỹ CLB + Lịch. */
  cards?: ReactNode
  extra?: ReactNode
  searchPlaceholder?: string
  showCards?: boolean
}) {
  const { user, role, clubData, hasClub } = useHubData()
  const unread = useNotifStore((s) => s.unreadCount)
  const wide = useIsWide()
  const [query, setQuery] = useState('')
  const q = fold(query.trim())
  const shown = useMemo(() => (q ? tiles.filter((a) => fold(a.label).includes(q)) : tiles), [tiles, q])

  if (!user || !role) return null
  if (wide) return <Navigate to={homeByRole[role]} replace />

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-[max(12px,env(safe-area-inset-top))]">
      <HubHeader hasClub={hasClub} clubName={clubData?.settings?.name} />
      <HubSearch value={query} onChange={setQuery} placeholder={searchPlaceholder} />
      {!q && showCards && (cards ?? <FundAndCalendarCards />)}
      <HubSectionTitle>{q ? `Kết quả (${shown.length})` : tilesTitle}</HubSectionTitle>
      <TileGrid items={shown} unread={unread} empty={`Không tìm thấy chức năng “${query}”.`} />
      {!q && extra}
    </div>
  )
}

/** Hàng danh sách nhỏ (tiêu đề + mô tả + mũi tên) dùng cho khối "sắp tới". */
function ListRow({ title, sub, onClick }: { title: string; sub?: string; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex min-h-[56px] w-full items-center gap-3 rounded-[var(--pf-radius-row)] border px-4 py-2.5 text-left [background:var(--pf-surface)] [border-color:var(--pf-border)] active:scale-[0.99]"
        style={{ boxShadow: 'var(--pf-shadow-card)' }}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold [color:var(--pf-text)]">{title}</span>
          {sub && <span className="block truncate text-xs [color:var(--pf-color-muted)]">{sub}</span>}
        </span>
        <ChevronRight size={18} className="shrink-0 [color:var(--pf-color-muted)]" />
      </button>
    </li>
  )
}

const fmtDay = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

/* ───────────────────────── Tổng quan (trang chủ sau đăng nhập) ───────────────────────── */
export function MobileHome() {
  const { role, clubData, hasClub, activePeriod } = useHubData()
  const navigate = useNavigate()
  if (!role) return null
  const tk = todayKey()
  const monthKey = tk.slice(0, 7)
  const members = clubData?.members?.length ?? 0
  const monthSessions = (clubData?.sessions ?? []).filter((s) => (s.sessionDate ?? '').startsWith(monthKey) && s.status !== 'cancelled').length
  const attended = clubData?.myAttendedSessionIds?.length ?? 0
  const base = role === 'MEMBER_VIEW' ? '/member/hoat-dong' : '/hoat-dong'

  const stats = hasClub ? (
    <>
      <HubSectionTitle>Tổng quan hôm nay</HubSectionTitle>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {role === 'MEMBER_VIEW' ? (
          <>
            <StatTile label="Buổi đã tham gia" value={String(attended)} sub="trong kỳ hiện tại" onClick={() => navigate('/member/ca-nhan?tab=attend')} />
            <StatTile label="Buổi trong tháng" value={String(monthSessions)} sub="đã lên lịch" onClick={() => navigate(`${base}?tab=schedule`)} />
          </>
        ) : (
          <>
            <StatTile label="Thành viên" value={String(members)} sub="đang hoạt động" onClick={role === 'CLUB_ADMIN' ? () => navigate('/thanh-vien') : undefined} />
            <StatTile label="Buổi trong tháng" value={String(monthSessions)} sub="đã lên lịch" onClick={role === 'CLUB_ADMIN' ? () => navigate(`${base}?tab=schedule`) : undefined} />
          </>
        )}
      </div>
      {activePeriod && <p className="mt-3 truncate text-center text-xs [color:var(--pf-color-muted)]">Kỳ quỹ đang mở: {activePeriod.name}</p>}
    </>
  ) : null

  return <SectionHub tilesTitle="Truy cập nhanh" tiles={homeApps(role)} extra={stats} />
}

/* ───────────────────────── Lịch ───────────────────────── */
export function MobileCalendarHub() {
  const navigate = useNavigate()
  const { role, upcoming, nextSession, clubData } = useHubData()
  if (!role) return null
  if (role === 'CLUB_TREASURER' || role === 'SUPER_ADMIN') return <Navigate to={homeByRole[role]} replace />
  const base = role === 'MEMBER_VIEW' ? '/member/hoat-dong' : '/hoat-dong'
  const tk = todayKey()
  const isToday = nextSession?.sessionDate.slice(0, 10) === tk
  const monthKey = tk.slice(0, 7)
  const monthCount = (clubData?.sessions ?? []).filter((s) => (s.sessionDate ?? '').startsWith(monthKey) && s.status !== 'cancelled').length

  const cards = (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <SummaryCard
        icon={<CalendarDays size={18} />}
        title={isToday ? 'Lịch hôm nay' : 'Sắp tới'}
        onOpen={() => navigate(`${base}?tab=schedule`)}
        value={nextSession ? (nextSession.startTime ?? '--:--') : '—'}
        sub={nextSession
          ? [!isToday ? fmtDay(nextSession.sessionDate) : null, nextSession.courtName].filter(Boolean).join(' · ') || 'Buổi sinh hoạt'
          : 'Chưa có lịch'}
        cta="Xem lịch"
      />
      <SummaryCard
        icon={<CalendarDays size={18} />}
        title="Tháng này"
        onOpen={() => navigate(`${base}?tab=registration`)}
        value={String(monthCount)}
        sub="buổi sinh hoạt"
        cta="Đăng ký"
        outline
      />
    </div>
  )

  const list = upcoming.slice(0, 3)
  const extra = list.length > 0 ? (
    <>
      <HubSectionTitle>Buổi sắp tới</HubSectionTitle>
      <ul className="mt-2 space-y-2.5">
        {list.map((s) => (
          <ListRow
            key={s.id}
            title={`${fmtDay(s.sessionDate)} · ${s.startTime ?? '--:--'}`}
            sub={s.courtName ?? 'Buổi sinh hoạt'}
            onClick={() => navigate(`${base}?tab=schedule`)}
          />
        ))}
      </ul>
    </>
  ) : null

  return <SectionHub tilesTitle="Lịch & hoạt động" tiles={calendarApps(role)} cards={cards} extra={extra} />
}

/* ───────────────────────── Thi đấu ───────────────────────── */
export function MobileCompeteHub() {
  const navigate = useNavigate()
  const { role } = useHubData()
  const minigames = useMinigameStore((s) => s.minigames)
  const stats = useMemo(() => {
    const live = minigames.filter((m) => normalizeMinigameStatus(m.status) === 'IN_PROGRESS')
    return { total: minigames.length, live }
  }, [minigames])
  if (!role) return null
  if (role === 'CLUB_TREASURER' || role === 'SUPER_ADMIN') return <Navigate to={homeByRole[role]} replace />
  const base = role === 'MEMBER_VIEW' ? '/member/thi-dau' : '/thi-dau'

  const cards = (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <SummaryCard
        icon={<Trophy size={18} />}
        title="Đang đấu"
        onOpen={() => navigate(`${base}?tab=tournaments`)}
        value={String(stats.live.length)}
        sub="giải đấu"
        cta="Xem giải đấu"
      />
      <SummaryCard
        icon={<Swords size={18} />}
        title="Tất cả giải"
        onOpen={() => navigate(`${base}?tab=standings`)}
        value={String(stats.total)}
        sub="đã tạo"
        cta="Xếp hạng"
        outline
      />
    </div>
  )

  const extra = stats.live.length > 0 ? (
    <>
      <HubSectionTitle>Giải đang diễn ra</HubSectionTitle>
      <ul className="mt-2 space-y-2.5">
        {stats.live.slice(0, 3).map((m) => (
          <ListRow key={m.id} title={m.name} sub="Đang diễn ra" onClick={() => navigate(`/minigames/${m.id}`)} />
        ))}
      </ul>
    </>
  ) : null

  return <SectionHub tilesTitle="Thi đấu" tiles={competeApps(role)} cards={cards} extra={extra} />
}

/* ───────────────────────── Cộng đồng ───────────────────────── */
export function MobileCommunityHub() {
  const navigate = useNavigate()
  const { role } = useHubData()
  if (!role) return null
  if (role === 'SUPER_ADMIN') return <Navigate to={homeByRole[role]} replace />

  const cards = (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <SummaryCard
        icon={<Newspaper size={18} />}
        title="Bảng tin"
        onOpen={() => navigate('/community')}
        value="Mới"
        sub="Tin của CLB"
        cta="Mở bảng tin"
      />
      <SummaryCard
        icon={<Swords size={18} />}
        title="Tìm kèo"
        onOpen={() => navigate('/community?tab=matchmaking')}
        value="Giao lưu"
        sub="Tìm đối thủ"
        cta="Tìm kèo"
        outline
      />
    </div>
  )

  return <SectionHub tilesTitle="Cộng đồng CLB" tiles={communityApps(role)} cards={cards} />
}
