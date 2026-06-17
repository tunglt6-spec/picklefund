import { Building2, Users, Calendar, Activity, Lock, LogIn } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { KpiCard } from '../../components/ui/KpiCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'

const EMPTY_STATS = {
  totalClubs: 0, activeClubs: 0, suspendedClubs: 0,
  totalMembers: 0, totalFundPeriods: 0, loginsLast24h: 0,
}

export function SuperDashboard() {
  const stats = EMPTY_STATS
  const clubs: { id: string; name: string; code: string; status: string; _count?: { members: number; fundPeriods: number } }[] = []
  const barChartData: { month: string; active: number }[] = []

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Super Admin Dashboard" subtitle="Tổng quan toàn hệ thống PickleFund" />

      <div className="p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard title="Tổng CLB" value={stats.totalClubs} icon={<Building2 size={18} />} color="blue" />
          <KpiCard title="CLB Hoạt động" value={stats.activeClubs} icon={<Activity size={18} />} color="green" />
          <KpiCard title="CLB Bị khóa" value={stats.suspendedClubs} icon={<Lock size={18} />} color="orange" alert={stats.suspendedClubs > 0} />
          <KpiCard title="Tổng Thành Viên" value={stats.totalMembers} icon={<Users size={18} />} color="purple" />
          <KpiCard title="Số Kỳ Quỹ" value={stats.totalFundPeriods} icon={<Calendar size={18} />} color="cyan" />
          <KpiCard title="Đăng nhập (24h)" value={stats.loginsLast24h} icon={<LogIn size={18} />} color="yellow" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart - CLB hoạt động theo tháng */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">CLB Hoạt Động Theo Tháng</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="active" fill="#6366f1" radius={[4, 4, 0, 0]} name="CLB hoạt động" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bảng CLB */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Danh Sách CLB</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Tên CLB</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">TV</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Kỳ</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clubs.map(club => (
                    <tr key={club.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-2">
                        <div className="font-medium text-gray-900">{club.name}</div>
                        <div className="text-xs text-gray-400">{club.code}</div>
                      </td>
                      <td className="text-center py-2.5 px-2 text-gray-700">{club._count?.members}</td>
                      <td className="text-center py-2.5 px-2 text-gray-700">{club._count?.fundPeriods}</td>
                      <td className="text-center py-2.5 px-2">
                        <Badge variant={club.status === 'active' ? 'green' : club.status === 'suspended' ? 'orange' : 'red'}>
                          {club.status === 'active' ? 'Hoạt động' : club.status === 'suspended' ? 'Bị khóa' : 'Đã xóa'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Log Hoạt Động Hệ Thống (Realtime)</h3>
          <div className="space-y-2">
            {[
              { time: '14:32', user: 'admin@pbhn.vn', action: 'Tạo kỳ quỹ Q2/2026', club: 'CLB HN', type: 'CREATE' },
              { time: '13:15', user: 'treasurer@pbhcm.vn', action: 'Nhập khoản chi Tiền sân 450k', club: 'CLB HCM', type: 'UPDATE' },
              { time: '11:40', user: 'superadmin', action: 'Khóa CLB Đà Nẵng', club: 'System', type: 'LOCK' },
              { time: '10:05', user: 'member@pbhn.vn', action: 'Tải Phiếu Thu Quỹ cá nhân', club: 'CLB HN', type: 'EXPORT' },
            ].map((log, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-2.5 text-sm">
                <span className="text-gray-400 text-xs w-10 shrink-0">{log.time}</span>
                <Badge variant={log.type === 'CREATE' ? 'green' : log.type === 'LOCK' ? 'red' : log.type === 'EXPORT' ? 'blue' : 'orange'}>
                  {log.type}
                </Badge>
                <span className="text-gray-700 flex-1">{log.action}</span>
                <span className="text-gray-400 text-xs">{log.club}</span>
                <span className="text-gray-500 text-xs">{log.user}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
