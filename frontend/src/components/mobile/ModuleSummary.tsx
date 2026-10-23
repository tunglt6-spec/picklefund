import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Users, UserX, Wallet, ArrowUpCircle, CalendarDays, Trophy, Swords, Bell, Settings, ClipboardCheck } from 'lucide-react'
import { useNotifStore } from '../../store/notifStore'
import { useMinigameStore } from '../../store/minigameStore'
import { formatVND, cn } from '../../lib/utils'
import { moneyColor } from '../../lib/moneyTone'
import { normalizeMinigameStatus } from '../../types/minigame'
import { SummaryCard, todayKey, useHubData } from './HubParts'

export type ModuleSummaryKind = 'members' | 'finance' | 'activity' | 'compete' | 'system' | 'personal' | 'cashbook'

const fmtDay = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

/** Hàng thẻ tóm tắt ở đầu MENU của từng module (mobile) — số liệu thật từ store/API đã có, KHÔNG gọi thêm endpoint mới. */
export function ModuleSummary({ kind }: { kind: ModuleSummaryKind }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const go = (tab: string) => navigate(`${pathname}?tab=${tab}`)
  const { role, clubData, activePeriod, balance, totalExpense, nextSession } = useHubData()
  const unread = useNotifStore((s) => s.unreadCount)
  const minigames = useMinigameStore((s) => s.minigames)

  const stats = useMemo(() => {
    const members = clubData?.members ?? []
    const active = members.filter((m) => m.status === 'active').length
    const inactive = members.filter((m) => m.status === 'inactive').length
    const monthKey = todayKey().slice(0, 7)
    const monthSessions = (clubData?.sessions ?? []).filter((s) => (s.sessionDate ?? '').startsWith(monthKey) && s.status !== 'cancelled').length
    const live = minigames.filter((m) => normalizeMinigameStatus(m.status) === 'IN_PROGRESS').length
    return { active, inactive, monthSessions, live, total: minigames.length, attended: clubData?.myAttendedSessionIds?.length ?? 0 }
  }, [clubData, minigames])

  if (!role) return null
  const isToday = nextSession?.sessionDate.slice(0, 10) === todayKey()
  const fundCard = (cta: string, tab: string) => (
    <SummaryCard
      icon={<Wallet size={18} />}
      title="Quỹ CLB"
      onOpen={() => go(tab)}
      value={balance === null ? '—' : formatVND(balance)}
      valueColor={balance === null ? undefined : moneyColor(balance, 'balance')}
      sub={activePeriod ? 'Số dư hiện tại' : 'Chưa có kỳ quỹ mở'}
      cta={cta}
    />
  )

  let cards: React.ReactNode = null
  switch (kind) {
    case 'members':
      cards = (
        <>
          <SummaryCard icon={<Users size={18} />} title="Thành viên" onOpen={() => go('list')} value={String(stats.active)} sub="đang hoạt động" cta="Danh sách" />
          <SummaryCard icon={<UserX size={18} />} title="Tạm ngưng" onOpen={() => go('accounts')} value={String(stats.inactive)} sub="tạm nghỉ sinh hoạt" cta="Tài khoản" outline />
        </>
      )
      break
    case 'finance':
      cards = (
        <>
          {fundCard('Kỳ quỹ', 'periods')}
          <SummaryCard
            icon={<ArrowUpCircle size={18} />}
            title="Chi kỳ này"
            onOpen={() => go('expense')}
            value={totalExpense === null ? '—' : formatVND(totalExpense)}
            valueColor={totalExpense === null ? undefined : moneyColor(totalExpense, 'expense')}
            sub={activePeriod ? 'Quỹ Chính' : 'Chưa có kỳ quỹ mở'}
            cta="Xem chi"
            outline
          />
        </>
      )
      break
    case 'cashbook':
      cards = fundCard('Sổ quỹ', 'ledger')
      break
    case 'activity':
      cards = (
        <>
          <SummaryCard
            icon={<CalendarDays size={18} />}
            title={isToday ? 'Lịch hôm nay' : 'Sắp tới'}
            onOpen={() => go('schedule')}
            value={nextSession ? (nextSession.startTime ?? '--:--') : '—'}
            sub={nextSession
              ? [!isToday ? fmtDay(nextSession.sessionDate) : null, nextSession.courtName].filter(Boolean).join(' · ') || 'Buổi sinh hoạt'
              : 'Chưa có lịch'}
            cta="Xem lịch"
          />
          <SummaryCard icon={<CalendarDays size={18} />} title="Tháng này" onOpen={() => go('registration')} value={String(stats.monthSessions)} sub="buổi sinh hoạt" cta="Đăng ký" outline />
        </>
      )
      break
    case 'compete':
      cards = (
        <>
          <SummaryCard icon={<Trophy size={18} />} title="Đang đấu" onOpen={() => go('tournaments')} value={String(stats.live)} sub="giải đấu" cta="Giải đấu" />
          <SummaryCard icon={<Swords size={18} />} title="Tất cả giải" onOpen={() => go('standings')} value={String(stats.total)} sub="đã tạo" cta="Xếp hạng" outline />
        </>
      )
      break
    case 'system':
      cards = (
        <>
          <SummaryCard icon={<Bell size={18} />} title="Thông báo" onOpen={() => go('notifications')} value={String(unread)} sub="chưa đọc" cta="Xem" />
          <SummaryCard icon={<Settings size={18} />} title="CLB" onOpen={() => go('settings')} value={clubData?.settings?.code || '—'} sub={clubData?.settings?.name || 'Thông tin CLB'} cta="Cài đặt" outline />
        </>
      )
      break
    case 'personal':
      cards = (
        <>
          <SummaryCard icon={<ClipboardCheck size={18} />} title="Đã tham gia" onOpen={() => go('attend')} value={String(stats.attended)} sub="buổi sinh hoạt" cta="Điểm danh" />
          {fundCard('Phiếu thu', 'receipt')}
        </>
      )
      break
  }
  if (!cards) return null
  const single = kind === 'cashbook'
  return <div className={cn('mt-4 grid gap-3', single ? 'grid-cols-1' : 'grid-cols-2')}>{cards}</div>
}
