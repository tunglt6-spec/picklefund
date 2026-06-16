import { DollarSign, Calendar, TrendingUp, AlertCircle } from 'lucide-react'
import { KpiCard } from '../../components/ui/KpiCard'
import { Button } from '../../components/ui/Button'
import { mockFundSummary } from '../../lib/mockData'

import { formatVND } from '../../lib/utils'
import { exportReceiptPDF } from '../../lib/export'
import toast from 'react-hot-toast'

const myData = mockFundSummary.members[0]

export function MemberDashboard() {
  const totalSessions = 13
  const attendanceRate = Math.round((myData.attendedSessions / totalSessions) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-6 md:px-6 md:py-8 text-white">
        <p className="text-indigo-200 text-sm">Chào mừng trở lại 👋</p>
        <h2 className="text-xl md:text-2xl font-bold mt-1">Nguyễn Văn A</h2>
        <p className="text-indigo-200 text-xs md:text-sm mt-1">Kỳ quỹ Q2/2026 · 01/04 → 30/06/2026</p>
        <div className="mt-4 flex gap-6">
          <div>
            <p className="text-indigo-200 text-xs">Số dư hiện tại</p>
            <p className="text-xl md:text-2xl font-bold">+{formatVND(myData.balance)}</p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs">Tham gia</p>
            <p className="text-xl md:text-2xl font-bold">{myData.attendedSessions}/{totalSessions} buổi</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* KPIs 2 col mobile, 4 col desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="Đã Đóng Quỹ" value={1000000} isCurrency icon={<DollarSign size={18} />} color="green" />
          <KpiCard title="Buổi Tham Gia" value={`${myData.attendedSessions}/${totalSessions}`} icon={<Calendar size={18} />} color="blue" />
          <KpiCard title="Tỷ Lệ" value={`${attendanceRate}%`} icon={<TrendingUp size={18} />} color={attendanceRate >= 50 ? 'green' : 'yellow'} />
          <KpiCard title="Số Dư" value={myData.balance} isCurrency icon={<AlertCircle size={18} />} color={myData.balance >= 0 ? 'blue' : 'red'} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <KpiCard title="Chi Phí Sân" value={myData.courtCost} isCurrency icon={<DollarSign size={16} />} color="purple" />
          <KpiCard title="Sinh Hoạt" value={myData.livingCost} isCurrency icon={<DollarSign size={16} />} color="cyan" />
          <KpiCard title="Tổng Chi" value={myData.totalCost} isCurrency icon={<DollarSign size={16} />} color="orange" />
        </div>

        {/* Personal Receipt Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-base md:text-lg">Phiếu Thu Cá Nhân</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                exportReceiptPDF({
                  receiptNo: 1,
                  memberName: myData.memberName,
                  loginName: 'nva',
                  periodName: 'Q2/2026',
                  periodStartDate: '06/04/2026',
                  periodEndDate: '30/06/2026',
                  contributionAmount: 1_000_000,
                  clubName: 'CLB Pickleball Hà Nội',
                  clubLocation: 'Hà Nội',
                  amountPaid: 1_000_000,
                  paymentDate: '06/04/2026',
                  attendedSessions: myData.attendedSessions,
                  totalSessions,
                  totalCourtFee: mockFundSummary.courtExpenses,
                  memberCountForSplit: mockFundSummary.members.length,
                  courtCost: myData.courtCost,
                  totalOtherFee: mockFundSummary.livingExpenses,
                  livingCost: myData.livingCost,
                  totalCost: myData.totalCost,
                  balance: myData.balance,
                  isConfirmed: myData.contributionPaid,
                })
                toast.success('Đã xuất Phiếu Thu PDF!')
              }}>📥 PDF</Button>
              <Button variant="outline" size="sm" onClick={() => toast.success('Đã chia sẻ qua Zalo!')}>📤 Zalo</Button>
            </div>
          </div>

          <div className="border-b-4 border-indigo-600">
            <div className="bg-indigo-600 px-4 py-3 md:px-6 md:py-4 text-white">
              <h4 className="font-bold text-base md:text-lg">CLB Pickleball Hà Nội</h4>
              <p className="text-indigo-200 text-xs">PHIẾU THU QUỸ CÁ NHÂN · Kỳ Q2/2026</p>
            </div>
          </div>

          <div className="px-4 py-4 md:px-6 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500 text-xs">Thành viên</p>
                <p className="font-semibold text-gray-900">Nguyễn Văn A</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Kỳ quỹ</p>
                <p className="font-semibold text-gray-900">Q2/2026</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-2">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-gray-600">Số buổi toàn kỳ</span>
                <span className="font-medium">13 buổi</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-gray-600">Đã tham gia</span>
                <span className="font-medium text-green-600">{myData.attendedSessions} buổi</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-gray-600">Tỷ lệ tham gia</span>
                <span className="font-medium">{attendanceRate}%</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-2">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-gray-600">Số tiền đã đóng</span>
                <span className="font-medium text-green-600">{formatVND(1000000)}</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-gray-600">Chi phí sân</span>
                <span className="font-medium text-indigo-600">{formatVND(myData.courtCost)}</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-gray-600">Chi phí sinh hoạt</span>
                <span className="font-medium text-cyan-600">{formatVND(myData.livingCost)}</span>
              </div>
              <div className="flex justify-between font-semibold text-sm border-t border-gray-100 pt-2">
                <span>Tổng chi phí</span>
                <span className="text-orange-600">{formatVND(myData.totalCost)}</span>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900 text-sm">Số Dư Còn Lại</span>
                <span className={`text-xl md:text-2xl font-bold ${myData.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {myData.balance >= 0 ? '+' : ''}{formatVND(myData.balance)}
                </span>
              </div>
              {myData.balance > 0 && (
                <p className="text-xs text-green-600 mt-1">✓ Bạn đã đóng đủ quỹ kỳ này</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
