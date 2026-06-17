import { useState, useEffect } from 'react'
import { Building2, Users, Calendar, Activity, Lock, LogIn } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../../lib/api'
import { KpiCard } from '../../components/ui/KpiCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'

const EMPTY_STATS = {
  totalClubs: 0, activeClubs: 0, suspendedClubs: 0,
  totalMembers: 0, totalFundPeriods: 0, loginsLast24h: 0,
}

type ClubRow = { id: string; name: string; code: string; status: string; _count?: { members: number; fundPeriods: number } }

export function SuperDashboard() {
  const [stats, setStats] = useState(EMPTY_STATS)
  const [clubs, setClubs] = useState<ClubRow[]>([])

  useEffect(() => {
    Promise.allSettled([
      api.get('/clubs/stats'),
      api.get('/clubs'),
    ]).then(([statsRes, clubsRes]) => {
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.data ?? EMPTY_STATS)
      }
      if (clubsRes.status === 'fulfilled') {
        const raw = clubsRes.value.data?.data?.clubs ?? clubsRes.value.data?.data ?? []
        setClubs(raw.slice(0, 10).map((c: any) => ({
          id: c.id, name: c.name, code: c.code, status: c.status ?? 'active',
          _count: c._count ?? { members: 0, fundPeriods: 0 },
        })))
      }
    })
  }, [])

  const barChartData = [
    { label: 'Tổng CLB', value: stats.totalClubs },
    { label: 'Hoạt động', value: stats.activeClubs },
    { label: 'Bị khóa', value: stats.suspendedClubs },
    { label: 'Thành viên', value: stats.totalMembers },
    { label: 'Kỳ quỹ', value: stats.totalFundPeriods },
    { label: 'Đăng nhập', value: stats.loginsLast24h },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Super Admin Dashboard" subtitle="Tổng quan toàn hệ thống PickleFund" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard title="Tổng CLB" value={stats.totalClubs} icon={<Building2 size={18} />} color="blue" />
          <KpiCard title="CLB Hoạt động" value={stats.activeClubs} icon={<Activity size={18} />} color="green" />
          <KpiCard title="CLB Bị khóa" value={stats.suspendedClubs} icon={<Lock size={18} />} color="orange" alert={stats.suspendedClubs > 0} />
          <KpiCard title="Tổng Thành Viên" value={stats.totalMembers} icon={<Users size={18} />} color="purple" />
          <KpiCard title="Số Kỳ Quỹ" value={stats.totalFundPeriods} icon={<Calendar size={18} />} color="cyan" />
          <KpiCard title="Đăng nhập (24h)" value={stats.loginsLast24h} icon={<LogIn size={18} />} color="yellow" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Tổng Quan Hệ Thống</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Số lượng" />
              </BarChart>
            </ResponsiveContainer>
          </div>

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
                  {clubs.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-xs">Đang tải...</td></tr>
                  ) : clubs.map(club => (
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
      </div>
    </div>
  )
}
