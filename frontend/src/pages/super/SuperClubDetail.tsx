import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Mail, Phone, MapPin, Users } from 'lucide-react'
import api from '../../lib/api'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useIsMobile } from '../../hooks/useIsMobile'

interface ClubDetail {
  id: string; name: string; code: string; address?: string
  contactEmail?: string; contactPhone?: string; status: string
  createdAt: string; _count?: { members: number; fundPeriods: number }
}

interface ClubMember {
  id: string; username: string; email: string; role: string; isActive: boolean
}

const ROLE_LABEL: Record<string, string> = {
  CLUB_ADMIN: 'Admin CLB', CLUB_TREASURER: 'Thủ quỹ', CLUB_MEMBER: 'Thành viên', SUPER_ADMIN: 'Super Admin',
}

export function SuperClubDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [club, setClub] = useState<ClubDetail | null>(null)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.allSettled([
      api.get(`/clubs/${id}`),
      api.get(`/users?clubId=${id}`),
    ]).then(([clubRes, usersRes]) => {
      if (clubRes.status === 'fulfilled') {
        const d = clubRes.value.data?.data
        setClub(d)
      }
      if (usersRes.status === 'fulfilled') {
        const raw = usersRes.value.data?.data ?? []
        setMembers(raw.map((u: any) => ({ id: u.id, username: u.username ?? u.email, email: u.email, role: u.role, isActive: u.isActive ?? true })))
      }
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Đang tải...</div>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="text-gray-500 text-sm">Không tìm thấy CLB</div>
        <Button variant="secondary" onClick={() => navigate('/super/clubs')}><ArrowLeft size={16} /> Quay lại</Button>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/super/clubs')} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 text-base truncate">{club.name}</div>
            <div className="text-xs text-slate-400">{club.code}</div>
          </div>
          <Badge variant={club.status === 'active' ? 'green' : 'orange'}>
            {club.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
          </Badge>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="bg-white rounded-[16px] border border-slate-100 p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-700">Thông tin CLB</div>
            {club.address && (
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin size={14} className="mt-0.5 text-slate-400 shrink-0" />
                {club.address}
              </div>
            )}
            {club.contactEmail && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail size={14} className="text-slate-400 shrink-0" />
                {club.contactEmail}
              </div>
            )}
            {club.contactPhone && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={14} className="text-slate-400 shrink-0" />
                {club.contactPhone}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users size={14} className="text-slate-400 shrink-0" />
              {club._count?.members ?? members.length} thành viên · {club._count?.fundPeriods ?? 0} kỳ quỹ
            </div>
          </div>

          <div className="bg-white rounded-[16px] border border-slate-100 p-4">
            <div className="text-sm font-semibold text-slate-700 mb-3">Danh sách thành viên</div>
            {members.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">Chưa có thành viên</div>
            ) : (
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900 truncate">{m.username}</div>
                      <div className="text-xs text-slate-400 truncate">{m.email}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                        {ROLE_LABEL[m.role] ?? m.role}
                      </span>
                      {!m.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">Tắt</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={club.name}
        subtitle={`Mã: ${club.code} · ${club._count?.members ?? members.length} thành viên`}
        actions={
          <Button variant="secondary" onClick={() => navigate('/super/clubs')}>
            <ArrowLeft size={16} /> Quay lại
          </Button>
        }
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 text-gray-700 font-semibold">
            <Building2 size={16} />
            Thông tin CLB
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Trạng thái</span>
              <Badge variant={club.status === 'active' ? 'green' : 'orange'}>
                {club.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
              </Badge>
            </div>
            {club.address && (
              <div className="flex items-start gap-2 text-gray-600">
                <MapPin size={14} className="mt-0.5 text-gray-400 shrink-0" />
                {club.address}
              </div>
            )}
            {club.contactEmail && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={14} className="text-gray-400 shrink-0" />
                {club.contactEmail}
              </div>
            )}
            {club.contactPhone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} className="text-gray-400 shrink-0" />
                {club.contactPhone}
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Users size={14} className="text-gray-400 shrink-0" />
              {club._count?.members ?? members.length} thành viên · {club._count?.fundPeriods ?? 0} kỳ quỹ
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-700 text-sm">
            Danh sách thành viên ({members.length})
          </div>
          {members.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Chưa có thành viên nào</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Tên đăng nhập</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Vai trò</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.username}</td>
                    <td className="px-4 py-3 text-gray-500">{m.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                        {ROLE_LABEL[m.role] ?? m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={m.isActive ? 'green' : 'orange'}>
                        {m.isActive ? 'Hoạt động' : 'Tắt'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
