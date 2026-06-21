import type { ClubData } from '../store/clubDataStore'
import { formatDate } from './utils'

export type NotifType = 'payment' | 'session' | 'member' | 'system' | 'warning'

export interface Notif {
  id: string
  type: NotifType
  title: string
  body: string
  time: string
}

export function buildNotifications(data: ClubData): Notif[] {
  const activePeriod = data.fundPeriods.find(p => p.status === 'active')
  const unpaid = data.contributions.filter(c => !c.isConfirmed)
  const upcoming = data.sessions.filter(s => s.status === 'scheduled')
  const today = new Date()
  const daysUntilEnd = activePeriod
    ? Math.ceil((new Date(activePeriod.endDate).getTime() - today.getTime()) / 86400000)
    : null

  return [
    ...unpaid.slice(0, 3).map(c => ({
      id: `pay-${c.id}`,
      type: 'payment' as NotifType,
      title: 'Khoản thu chờ xác nhận',
      body: `${c.member?.fullName ?? 'Thành viên'} đã đóng quỹ nhưng chưa được xác nhận.`,
      time: c.createdAt,
    })),
    ...upcoming.slice(0, 2).map(s => ({
      id: `sess-${s.id}`,
      type: 'session' as NotifType,
      title: 'Buổi tập sắp diễn ra',
      body: `Buổi tập ngày ${formatDate(s.sessionDate)} tại ${s.courtName ?? 'sân'} – nhớ điểm danh.`,
      time: s.sessionDate,
    })),
    ...(activePeriod && daysUntilEnd !== null && daysUntilEnd <= 14 ? [{
      id: `warn-period-${activePeriod.id}`,
      type: 'warning' as NotifType,
      title: `Kỳ quỹ "${activePeriod.name}" sắp kết thúc`,
      body: daysUntilEnd <= 0
        ? `Kỳ quỹ đã kết thúc ngày ${formatDate(activePeriod.endDate)}. Vui lòng chốt sổ.`
        : `Còn ${daysUntilEnd} ngày đến ${formatDate(activePeriod.endDate)}. Vui lòng chốt sổ trước ngày này.`,
      time: activePeriod.endDate,
    }] : []),
    ...(data.members.filter(m => m.status === 'active').length === 0 ? [{
      id: 'warn-no-members',
      type: 'warning' as NotifType,
      title: 'Chưa có thành viên',
      body: 'CLB chưa có thành viên nào đang hoạt động. Hãy thêm thành viên để bắt đầu.',
      time: today.toISOString(),
    }] : []),
    ...(data.fundPeriods.length === 0 ? [{
      id: 'warn-no-period',
      type: 'warning' as NotifType,
      title: 'Chưa có kỳ quỹ',
      body: 'CLB chưa tạo kỳ quỹ nào. Hãy tạo kỳ quỹ để bắt đầu quản lý thu chi.',
      time: today.toISOString(),
    }] : []),
  ]
}
