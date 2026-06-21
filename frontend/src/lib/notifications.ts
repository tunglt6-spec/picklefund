import type { ClubData } from '../store/clubDataStore'
import { formatDate } from './utils'

export type NotifType = 'payment' | 'session' | 'member' | 'expense' | 'period' | 'warning'

export interface Notif {
  id: string
  type: NotifType
  title: string
  body: string
  time: string
}

/** Action items — counts toward unread badge */
export function buildNotifications(data: ClubData): Notif[] {
  const activePeriod = data.fundPeriods.find(p => p.status === 'active')
  const unpaid = data.contributions.filter(c => !c.isConfirmed)
  const upcoming = data.sessions.filter(s => s.status === 'scheduled')
  const today = new Date()
  const daysUntilEnd = activePeriod
    ? Math.ceil((new Date(activePeriod.endDate).getTime() - today.getTime()) / 86400000)
    : null

  const items: Notif[] = []

  unpaid.slice(0, 3).forEach(c => items.push({
    id: `pay-${c.id}`,
    type: 'payment',
    title: 'Khoản thu chờ xác nhận',
    body: `${c.member?.fullName ?? 'Thành viên'} đã đóng quỹ nhưng chưa được xác nhận.`,
    time: c.createdAt,
  }))

  upcoming.slice(0, 2).forEach(s => items.push({
    id: `sess-upcoming-${s.id}`,
    type: 'session',
    title: 'Buổi tập sắp diễn ra',
    body: `Buổi tập ngày ${formatDate(s.sessionDate)} tại ${s.courtName ?? 'sân'} – nhớ điểm danh.`,
    time: s.sessionDate,
  }))

  if (activePeriod && daysUntilEnd !== null && daysUntilEnd <= 14) {
    items.push({
      id: `warn-period-${activePeriod.id}`,
      type: 'warning',
      title: `Kỳ quỹ "${activePeriod.name}" sắp kết thúc`,
      body: daysUntilEnd <= 0
        ? `Kỳ quỹ đã kết thúc ngày ${formatDate(activePeriod.endDate)}. Vui lòng chốt sổ.`
        : `Còn ${daysUntilEnd} ngày đến ${formatDate(activePeriod.endDate)}. Vui lòng chốt sổ trước ngày này.`,
      time: activePeriod.endDate,
    })
  }

  if (data.members.filter(m => m.status === 'active').length === 0) {
    items.push({
      id: 'warn-no-members',
      type: 'warning',
      title: 'Chưa có thành viên',
      body: 'CLB chưa có thành viên nào đang hoạt động. Hãy thêm thành viên để bắt đầu.',
      time: today.toISOString(),
    })
  }

  if (data.fundPeriods.length === 0) {
    items.push({
      id: 'warn-no-period',
      type: 'warning',
      title: 'Chưa có kỳ quỹ',
      body: 'CLB chưa tạo kỳ quỹ nào. Hãy tạo kỳ quỹ để bắt đầu quản lý thu chi.',
      time: today.toISOString(),
    })
  }

  return items
}

/** History events — for timeline display, does NOT count toward badge */
export function buildHistory(data: ClubData): Notif[] {
  const items: Notif[] = []

  // Confirmed contributions
  data.contributions
    .filter(c => c.isConfirmed)
    .forEach(c => items.push({
      id: `hist-pay-${c.id}`,
      type: 'payment',
      title: 'Khoản thu đã xác nhận',
      body: `${c.member?.fullName ?? 'Thành viên'} đóng quỹ ${c.amount.toLocaleString('vi-VN')}đ đã được xác nhận.`,
      time: c.paymentDate || c.createdAt,
    }))

  // Completed sessions
  data.sessions
    .filter(s => s.status === 'completed')
    .forEach(s => items.push({
      id: `hist-sess-${s.id}`,
      type: 'session',
      title: 'Buổi tập đã hoàn thành',
      body: `Buổi tập ngày ${formatDate(s.sessionDate)} tại ${s.courtName ?? 'sân'} – ${s._count?.attendanceRecords ?? 0} người tham dự.`,
      time: s.sessionDate,
    }))

  // Fund periods
  data.fundPeriods.forEach(p => {
    items.push({
      id: `hist-period-start-${p.id}`,
      type: 'period',
      title: `Kỳ quỹ "${p.name}" bắt đầu`,
      body: `Từ ${formatDate(p.startDate)} đến ${formatDate(p.endDate)} · Mức đóng: ${Number(p.contributionAmount).toLocaleString('vi-VN')}đ/người.`,
      time: p.startDate,
    })
    if (p.status === 'closed' || p.status === 'finalized') {
      items.push({
        id: `hist-period-end-${p.id}`,
        type: 'period',
        title: `Kỳ quỹ "${p.name}" đã đóng`,
        body: `Kỳ quỹ kết thúc ngày ${formatDate(p.endDate)}.`,
        time: p.endDate,
      })
    }
  })

  // Members joined
  data.members
    .filter(m => m.status === 'active')
    .forEach(m => items.push({
      id: `hist-member-${m.id}`,
      type: 'member',
      title: 'Thành viên mới tham gia',
      body: `${m.fullName} đã gia nhập câu lạc bộ.`,
      time: m.joinDate,
    }))

  // Expenses
  data.expenses.forEach(e => items.push({
    id: `hist-exp-${e.id}`,
    type: 'expense',
    title: 'Chi phí được ghi nhận',
    body: `${e.description} – ${Number(e.amount).toLocaleString('vi-VN')}đ.`,
    time: e.expenseDate,
  }))

  // Sort newest first
  return items.sort((a, b) => b.time.localeCompare(a.time))
}
