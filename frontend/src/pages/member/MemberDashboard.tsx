import { DollarSign, Calendar, TrendingUp, AlertCircle } from 'lucide-react'
import { KpiCard } from '../../components/ui/KpiCard'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore } from '../../store/clubDataStore'
import { formatVND } from '../../lib/utils'
import { exportReceiptPDF } from '../../lib/export'
import toast from 'react-hot-toast'

export function MemberDashboard() {
  const { user } = useAuthStore()
  const { getClubData } = useClubDataStore()
  const clubData = getClubData(user?.clubId ?? '')

  const myContribution = clubData.contributions.find(c => c.memberId === user?.id)
  const totalSessions = clubData.sessions.length
  const myAttendance = clubData.sessions.filter(s => s.attendees?.includes(user?.id ?? '')).length
  const attendanceRate = totalSessions > 0 ? Math.round((myAttendance / totalSessions) * 100) : 0

  const amountPaid = myContribution?.isConfirmed ? (myContribution.amount ?? 0) : 0
  const totalExpenses = clubData.expenses.reduce((a, e) => a + e.amount, 0)
  const memberCount = clubData.members.length || 1
  const myCost = totalSessions > 0 && memberCount > 0
    ? Math.round((myAttendance / totalSessions) * (totalExpenses / memberCount))
    : 0
  const balance = amountPaid - myCost

  const memberName = user?.fullName ?? user?.username ?? 'Thành viên'
  const hasData = clubData.fundPeriods.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-6 md:px-6 md:py-8 text-white">
        <p className="text-indigo-200 text-sm">Chào mừng trở lại 👋</p>
        <h2 className="text-xl md:text-2xl font-bold mt-1">{memberName}</h2>
        {hasData ? (
          <>
            <p className="text-indigo-200 text-xs md:text-sm mt-1">Kỳ quỹ hiện tại</p>
            <div className="mt-4 flex gap-6">
              <div>
                <p className="text-indigo-200 text-xs">Số dư hiện tại</p>
                <p className="text-xl md:text-2xl font-bold">{balance >= 0 ? '+' : ''}{formatVND(balance)}</p>
              </div>
              <div>
                <p className="text-indigo-200 text-xs">Tham gia</p>
                <p className="text-xl md:text-2xl font-bold">{myAttendance}/{totalSessions} buổi</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-indigo-200 text-xs md:text-sm mt-1">Chưa có kỳ quỹ nào</p>
        )}
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {!hasData ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <p className="text-gray-400 text-sm">CLB chưa tạo kỳ quỹ nào.<br />Hãy chờ admin khởi tạo kỳ quỹ đầu tiên.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard title="Đã Đóng Quỹ" value={amountPaid} isCurrency icon={<DollarSign size={18} />} color="green" />
              <KpiCard title="Buổi Tham Gia" value={`${myAttendance}/${totalSessions}`} icon={<Calendar size={18} />} color="blue" />
              <KpiCard title="Tỷ Lệ" value={`${attendanceRate}%`} icon={<TrendingUp size={18} />} color={attendanceRate >= 50 ? 'green' : 'yellow'} />
              <KpiCard title="Số Dư" value={balance} isCurrency icon={<AlertCircle size={18} />} color={balance >= 0 ? 'blue' : 'red'} />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-base md:text-lg">Phiếu Thu Cá Nhân</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    exportReceiptPDF({
                      receiptNo: 1,
                      memberName,
                      loginName: user?.username ?? '',
                      periodName: clubData.fundPeriods[0]?.name ?? '',
                      periodStartDate: clubData.fundPeriods[0]?.startDate ?? '',
                      periodEndDate: clubData.fundPeriods[0]?.endDate ?? '',
                      contributionAmount: amountPaid,
                      clubName: '',
                      clubLocation: '',
                      amountPaid,
                      paymentDate: myContribution?.paymentDate ?? '',
                      attendedSessions: myAttendance,
                      totalSessions,
                      totalCourtFee: 0,
                      memberCountForSplit: memberCount,
                      courtCost: 0,
                      totalOtherFee: totalExpenses,
                      livingCost: myCost,
                      totalCost: myCost,
                      balance,
                      isConfirmed: myContribution?.isConfirmed ?? false,
                    })
                    toast.success('Đã xuất Phiếu Thu PDF!')
                  }}>📥 PDF</Button>
                  <Button variant="outline" size="sm" onClick={() => toast.success('Đã chia sẻ qua Zalo!')}>📤 Zalo</Button>
                </div>
              </div>

              <div className="px-4 py-4 md:px-6 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-500 text-xs">Thành viên</p>
                    <p className="font-semibold text-gray-900">{memberName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Kỳ quỹ</p>
                    <p className="font-semibold text-gray-900">{clubData.fundPeriods[0]?.name ?? '—'}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-600">Số buổi toàn kỳ</span>
                    <span className="font-medium">{totalSessions} buổi</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-600">Đã tham gia</span>
                    <span className="font-medium text-green-600">{myAttendance} buổi</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-600">Tỷ lệ tham gia</span>
                    <span className="font-medium">{attendanceRate}%</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-600">Số tiền đã đóng</span>
                    <span className="font-medium text-green-600">{formatVND(amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-600">Chi phí ước tính</span>
                    <span className="font-medium text-orange-600">{formatVND(myCost)}</span>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-sm">Số Dư Còn Lại</span>
                    <span className={`text-xl md:text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {balance >= 0 ? '+' : ''}{formatVND(balance)}
                    </span>
                  </div>
                  {balance > 0 && (
                    <p className="text-xs text-green-600 mt-1">✓ Bạn đã đóng đủ quỹ kỳ này</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
