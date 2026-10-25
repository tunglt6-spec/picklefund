import { Navigate, useNavigate } from 'react-router-dom'
import { ChevronRight } from '../components/icons/mobileLucide'
import { useNotifStore } from '../store/notifStore'
import { homeByRole, notifRouteByRole } from '../components/layout/navConfig'
import { homeApps } from '../components/mobile/hubApps'
import {
  HubSectionTitle, TileGrid, Panel, Skeleton, ListRow, greeting, todayKey, useHubData, useIsWide,
} from '../components/mobile/HubParts'
import { SuperSummary } from '../components/mobile/SuperSummary'
import { formatVND, cn } from '../lib/utils'
import { moneyColor } from '../lib/moneyTone'
import { DataFreshness } from '../components/shared/DataFreshness'

const WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
const weekdayOf = (d: string) => WEEKDAYS[new Date(`${d.slice(0, 10)}T00:00:00`).getDay()]

/** Nhãn trạng thái buổi hoạt động: có chữ (không chỉ màu). */
function SessionBadge({ date, status }: { date: string; status: string }) {
  const isToday = date.slice(0, 10) === todayKey()
  const done = status === 'completed'
  const label = done ? 'Đã kết thúc' : isToday ? 'Hôm nay' : 'Sắp tới'
  const tone = done
    ? '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]'
    : isToday ? '[background:var(--pf-primary-soft)] [color:var(--pf-primary-text)]' : '[background:var(--pf-surface-muted)] [color:var(--pf-text)]'
  return <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', tone)}>{label}</span>
}

/**
 * Tổng quan (mobile) — trả lời 4 câu hỏi: hôm nay có lịch gì · có việc gì cần xử lý · tài chính CLB ra sao · thao tác thường dùng ở đâu.
 * Dữ liệu thật (store/API sẵn có), không tạo chỉ số. Tìm chức năng toàn app nằm ở trang "Ứng dụng".
 */
export function MobileHome() {
  const navigate = useNavigate()
  const wide = useIsWide()
  const { user, role, clubData, hasClub, activePeriod, fin, finState, finUpdatedAt, upcoming } = useHubData()
  const unread = useNotifStore((s) => s.unreadCount)
  if (!user || !role) return null
  if (wide) return <Navigate to={homeByRole[role]} replace />

  const isMember = role === 'MEMBER_VIEW'
  const hasSchedule = role === 'CLUB_ADMIN' || isMember
  const base = isMember ? '/member/hoat-dong' : '/hoat-dong'
  const fundRoute = isMember ? '/member/tai-chinh?tab=periods' : role === 'CLUB_TREASURER' ? '/treasurer/dashboard' : '/tai-chinh?tab=periods'
  const tk = todayKey()
  const todays = upcoming.filter((s) => s.sessionDate.slice(0, 10) === tk)
  const shown = (todays.length > 0 ? todays : upcoming.slice(0, 1)).slice(0, 3)
  const dateLine = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

  // Việc cần xử lý — chỉ liệt kê mục có việc thật theo quyền.
  const todo: { key: string; title: string; sub: string; to: string }[] = []
  if (hasClub && (role === 'CLUB_ADMIN' || role === 'CLUB_TREASURER') && (fin?.unpaidCount ?? 0) > 0) {
    todo.push({ key: 'unpaid', title: `${fin!.unpaidCount} thành viên chưa đóng quỹ`, sub: 'Xem công nợ và gửi nhắc đóng quỹ', to: role === 'CLUB_ADMIN' ? '/tai-chinh?tab=debts' : '/treasurer/reminders' })
  }
  if (unread > 0) todo.push({ key: 'unread', title: `${unread} thông báo chưa đọc`, sub: 'Mở để xem và đánh dấu đã đọc', to: notifRouteByRole[role] })
  const todoLoading = hasClub && finState === 'loading' && (role === 'CLUB_ADMIN' || role === 'CLUB_TREASURER')

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-3">
      <header className="pf-hero-wash -mx-1 rounded-2xl px-4 py-3 max-lg:block">
        <h1 className="text-[22px] font-[800] leading-tight [color:var(--pf-text)]" style={{ letterSpacing: '-0.02em' }}>
          {greeting()}, {user.username}
        </h1>
        <p className="mt-0.5 text-sm capitalize [color:var(--pf-color-muted)]">{dateLine}</p>
      </header>

      {role === 'SUPER_ADMIN' && <SuperSummary />}

      {/* Hôm nay / buổi sắp tới */}
      {hasClub && hasSchedule && (
        <>
          <HubSectionTitle>{todays.length > 0 ? 'Hôm nay' : 'Buổi sắp tới'}</HubSectionTitle>
          <Panel className="mt-2 overflow-hidden border-l-4 [border-left-color:var(--mod-activity)]">
            {!clubData ? (
              <div className="space-y-2 p-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>
            ) : shown.length === 0 ? (
              <p className="px-4 py-5 text-sm [color:var(--pf-color-muted)]">Chưa có buổi sinh hoạt nào được lên lịch.</p>
            ) : (
              <ul className="divide-y [border-color:var(--pf-border)]">
                {shown.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => navigate(`${base}?tab=schedule`)} className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left active:[background:var(--pf-color-muted-soft)]">
                      <span className="w-14 shrink-0 text-center">
                        <span className="block text-[22px] font-[800] leading-none [color:var(--pf-text)]">{s.sessionDate.slice(8, 10)}</span>
                        <span className="mt-1 block text-xs [color:var(--pf-color-muted)]">Th {s.sessionDate.slice(5, 7)}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold [color:var(--pf-text)]">
                          {[s.startTime, s.endTime].filter(Boolean).join(' – ') || 'Buổi sinh hoạt'}
                        </span>
                        <span className="block truncate text-xs [color:var(--pf-color-muted)]">
                          {weekdayOf(s.sessionDate)} · {s.courtName || 'Chưa rõ sân'}
                        </span>
                      </span>
                      <SessionBadge date={s.sessionDate} status={s.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => navigate(`${base}?tab=schedule`)} className="flex min-h-[48px] w-full items-center justify-between border-t px-4 text-sm font-semibold [color:var(--pf-primary-text)] [border-color:var(--pf-border)] active:[background:var(--pf-color-muted-soft)]">
              Xem lịch đầy đủ <ChevronRight size={16} aria-hidden />
            </button>
          </Panel>
        </>
      )}

      {/* Việc cần xử lý */}
      {role !== 'SUPER_ADMIN' && (
        <>
          <HubSectionTitle>Việc cần xử lý</HubSectionTitle>
          <Panel className="mt-2 overflow-hidden">
            {todoLoading ? (
              <div className="space-y-2 p-4"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /></div>
            ) : todo.length === 0 ? (
              <p className="px-4 py-5 text-sm [color:var(--pf-color-muted)]">Không có việc cần xử lý lúc này.</p>
            ) : (
              <ul className="divide-y [border-color:var(--pf-border)]">
                {todo.map((t) => <ListRow key={t.key} title={t.title} sub={t.sub} onClick={() => navigate(t.to)} />)}
              </ul>
            )}
          </Panel>
        </>
      )}

      {/* Tài chính — nêu rõ phạm vi (toàn CLB · kỳ quỹ đang mở) */}
      {hasClub && (
        <>
          <HubSectionTitle>Tài chính</HubSectionTitle>
          <Panel className="mt-2 overflow-hidden">
            <p className="px-4 pt-3 text-xs [color:var(--pf-color-muted)]">
              {activePeriod ? `Kỳ quỹ đang mở: ${activePeriod.name}` : clubData ? 'Chưa có kỳ quỹ đang mở' : 'Đang tải kỳ quỹ…'}
            </p>
            <div className="px-4 pt-2"><DataFreshness updatedAt={finUpdatedAt} loading={finState === 'loading'} error={finState === 'error'} mode="poll" /></div>
            <div className="grid grid-cols-2 divide-x pb-3 pt-2 [border-color:var(--pf-border)]">
              <div className="min-w-0 px-4">
                <p className="text-xs font-semibold [color:var(--pf-color-muted)]">Tổng tài sản CLB</p>
                {finState === 'loading' ? <Skeleton className="mt-1.5 h-6 w-24" /> : !fin ? (
                  <p className="mt-1 text-sm [color:var(--pf-color-muted)]">{finState === 'error' ? 'Không tải được' : 'Chưa có dữ liệu'}</p>
                ) : (
                  <p className="mt-0.5 truncate text-[20px] font-[800] leading-tight" style={{ color: moneyColor(fin.assets, 'balance') }}>{formatVND(fin.assets)}</p>
                )}
                <p className="mt-0.5 text-xs [color:var(--pf-color-muted)]">Quỹ chính + số dư chuyển kỳ</p>
              </div>
              <div className="min-w-0 px-4">
                <p className="text-xs font-semibold [color:var(--pf-color-muted)]">Chi trong kỳ</p>
                {finState === 'loading' ? <Skeleton className="mt-1.5 h-6 w-24" /> : !fin ? (
                  <p className="mt-1 text-sm [color:var(--pf-color-muted)]">{finState === 'error' ? 'Không tải được' : 'Chưa có dữ liệu'}</p>
                ) : (
                  <p className="mt-0.5 truncate text-[20px] font-[800] leading-tight" style={{ color: moneyColor(fin.totalExpense, 'expense') }}>{formatVND(fin.totalExpense)}</p>
                )}
                <p className="mt-0.5 text-xs [color:var(--pf-color-muted)]">Quỹ chính, đã duyệt/đã chi</p>
              </div>
            </div>
            <button onClick={() => navigate(fundRoute)} className="flex min-h-[48px] w-full items-center justify-between border-t px-4 text-sm font-semibold [color:var(--pf-primary-text)] [border-color:var(--pf-border)] active:[background:var(--pf-color-muted-soft)]">
              Xem chi tiết tài chính <ChevronRight size={16} aria-hidden />
            </button>
          </Panel>
        </>
      )}

      {/* Lối tắt quan trọng — phần còn lại ở "Ứng dụng" */}
      <HubSectionTitle right={
        <button onClick={() => navigate('/ung-dung')} className="flex min-h-[44px] items-center gap-0.5 px-1 text-sm font-semibold [color:var(--pf-primary-text)]">
          Tất cả ứng dụng <ChevronRight size={16} aria-hidden />
        </button>
      }>Lối tắt</HubSectionTitle>
      <TileGrid items={homeApps(role)} unread={unread} />
    </div>
  )
}
