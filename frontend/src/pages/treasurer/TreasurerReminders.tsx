import { useState } from 'react'
import { Bell, Send, CheckCircle, Clock, Phone, MessageSquare } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { useClubDataStore } from '../../store/clubDataStore'
import { useAuthStore } from '../../store/authStore'
import { formatVND } from '../../lib/utils'
import toast from 'react-hot-toast'

export function TreasurerReminders() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? 'club-1'
  const { getClubData } = useClubDataStore()
  const data = getClubData(clubId)

  const activePeriod = data.fundPeriods.find(p => p.status === 'active')
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const commonContribs = data.contributions.filter(c => (c.fundSource ?? 'COMMON') === 'COMMON')

  // Members who haven't paid (no confirmed COMMON contribution in active period)
  const unpaidMembers = data.members
    .filter(m => m.status === 'active')
    .filter(m => {
      const contrib = commonContribs.find(
        c => c.memberId === m.id && (!activePeriod || c.fundPeriodId === activePeriod.id) && c.isConfirmed
      )
      return !contrib
    })

  // Members with unconfirmed COMMON contributions (paid but not confirmed yet)
  const pendingMembers = data.members
    .filter(m => m.status === 'active')
    .filter(m => {
      const contrib = commonContribs.find(
        c => c.memberId === m.id && (!activePeriod || c.fundPeriodId === activePeriod.id)
      )
      return contrib && !contrib.isConfirmed
    })

  const sendReminder = (memberId: string, name: string, channel: 'zalo' | 'sms') => {
    setSentIds(prev => new Set([...prev, memberId]))
    toast.success(`Đã gửi nhắc nhở qua ${channel === 'zalo' ? 'Zalo' : 'SMS'} tới ${name}`)
  }

  const sendAll = () => {
    const ids = unpaidMembers.map(m => m.id)
    setSentIds(prev => new Set([...prev, ...ids]))
    toast.success(`Đã gửi nhắc nhở tới ${ids.length} thành viên chưa đóng quỹ`)
  }

  const amount = activePeriod?.contributionAmount ?? 1000000

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Nhắc Nhở Đóng Quỹ"
        subtitle={activePeriod ? `${activePeriod.name} · ${formatVND(amount)}/người` : 'Chưa có kỳ quỹ mở'}
        actions={
          unpaidMembers.length > 0
            ? <button onClick={sendAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
                <Send size={14} />Nhắc tất cả ({unpaidMembers.length})
              </button>
            : undefined
        }
      />

      <div className="p-6 max-w-[900px] mx-auto space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center">
                <Bell size={14} className="text-red-500" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chưa đóng</p>
            </div>
            <p className="text-2xl font-bold text-red-500">{unpaidMembers.length} người</p>
            <p className="text-xs text-slate-500 mt-0.5">{formatVND(unpaidMembers.length * amount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock size={14} className="text-amber-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chờ xác nhận</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{pendingMembers.length} người</p>
            <p className="text-xs text-slate-500 mt-0.5">Đã nộp tiền, chưa duyệt</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle size={14} className="text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Đã hoàn thành</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {data.members.filter(m => m.status === 'active').length - unpaidMembers.length - pendingMembers.length} người
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Đã xác nhận đóng quỹ</p>
          </div>
        </div>

        {/* Unpaid members */}
        {unpaidMembers.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Bell size={14} className="text-red-500" />
              <h3 className="text-sm font-semibold text-slate-800">Thành viên chưa đóng quỹ</h3>
              <Badge variant="red" className="ml-auto">{unpaidMembers.length}</Badge>
            </div>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th>Liên hệ</th>
                  <th className="text-right">Số tiền cần đóng</th>
                  <th className="text-center w-28">Trạng thái</th>
                  <th className="text-center w-32">Nhắc nhở</th>
                </tr>
              </thead>
              <tbody>
                {unpaidMembers.map(m => {
                  const sent = sentIds.has(m.id)
                  return (
                    <tr key={m.id}>
                      <td className="font-medium text-slate-900">{m.fullName}</td>
                      <td className="text-slate-500 text-xs">{m.phone ?? m.email ?? '—'}</td>
                      <td className="text-right font-semibold text-red-500">{formatVND(amount)}</td>
                      <td className="text-center">
                        {sent
                          ? <Badge variant="green" dot>Đã nhắc</Badge>
                          : <Badge variant="red" dot>Chưa đóng</Badge>}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => sendReminder(m.id, m.fullName, 'zalo')}
                            disabled={sent}
                            className="h-7 px-2 flex items-center gap-1 rounded-md text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <MessageSquare size={11} />Zalo
                          </button>
                          <button
                            onClick={() => sendReminder(m.id, m.fullName, 'sms')}
                            disabled={sent}
                            className="h-7 px-2 flex items-center gap-1 rounded-md text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Phone size={11} />SMS
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pending confirmation */}
        {pendingMembers.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-800">Chờ xác nhận thanh toán</h3>
              <Badge variant="yellow" className="ml-auto">{pendingMembers.length}</Badge>
            </div>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th className="text-right">Số tiền</th>
                  <th className="text-center">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {pendingMembers.map(m => {
                  const contrib = commonContribs.find(c => c.memberId === m.id && (!activePeriod || c.fundPeriodId === activePeriod.id))
                  return (
                    <tr key={m.id}>
                      <td className="font-medium text-slate-900">{m.fullName}</td>
                      <td className="text-right font-semibold text-amber-600">{formatVND(contrib?.amount ?? amount)}</td>
                      <td className="text-center text-slate-400 text-xs">{contrib?.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {unpaidMembers.length === 0 && pendingMembers.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <CheckCircle size={36} className="mx-auto text-emerald-300 mb-3" />
            <p className="text-sm font-semibold text-slate-600">Tất cả thành viên đã đóng quỹ!</p>
            <p className="text-xs text-slate-400 mt-1">Không cần gửi nhắc nhở trong kỳ này.</p>
          </div>
        )}
      </div>
    </div>
  )
}
