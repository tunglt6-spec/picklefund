import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, Users,
  Star, Zap, CheckCircle2, CreditCard,
} from 'lucide-react'
import api from '../../lib/api'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useIsMobile } from '../../hooks/useIsMobile'
import toast from 'react-hot-toast'

interface ClubDetail {
  id: string; name: string; code: string; address?: string
  contactEmail?: string; contactPhone?: string; status: string
  createdAt: string; _count?: { members: number; fundPeriods: number }
}

interface ClubMember {
  id: string; username: string; email: string; role: string; isActive: boolean
}

type PlanTier = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'

interface Plan {
  tier: PlanTier; name: string; priceMonthly: number
  maxMembers: number; aiFeatures: boolean; telegramBot: boolean
}

interface Subscription {
  tier: PlanTier; plan: Plan
  expiresAt: string | null; isActive: boolean; daysRemaining: number | null
  usage: { members: number }
}

interface AiUsage { month: string; tokens: number; estimatedCostVnd: number }

const ROLE_LABEL: Record<string, string> = {
  CLUB_ADMIN: 'Admin CLB', CLUB_TREASURER: 'Thủ quỹ', CLUB_MEMBER: 'Thành viên', SUPER_ADMIN: 'Super Admin',
}

const TIER_BADGE: Record<PlanTier, string> = {
  FREE: 'bg-slate-100 text-slate-600',
  STARTER: 'bg-indigo-100 text-indigo-700',
  PRO: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700',
}

const TIER_BORDER: Record<PlanTier, string> = {
  FREE: 'border-slate-200',
  STARTER: 'border-indigo-200',
  PRO: 'border-purple-200',
  ENTERPRISE: 'border-amber-200',
}

function fmtMonth(m: string) {
  const [y, mo] = m.split('-')
  return `T${mo}/${y}`
}

type Tab = 'members' | 'billing'

export function SuperClubDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [club, setClub] = useState<ClubDetail | null>(null)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('members')

  // Billing state
  const [sub, setSub] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [aiUsage, setAiUsage] = useState<AiUsage[]>([])
  const [billingLoading, setBillingLoading] = useState(false)
  const [upgradeTier, setUpgradeTier] = useState<PlanTier>('STARTER')
  const [upgradeMonths, setUpgradeMonths] = useState(3)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.allSettled([
      api.get(`/clubs/${id}`),
      api.get(`/users?clubId=${id}`),
    ]).then(([clubRes, usersRes]) => {
      if (clubRes.status === 'fulfilled') setClub(clubRes.value.data?.data)
      if (usersRes.status === 'fulfilled') {
        const raw = usersRes.value.data?.data ?? []
        setMembers(raw.map((u: any) => ({
          id: u.id, username: u.username ?? u.email,
          email: u.email, role: u.role, isActive: u.isActive ?? true,
        })))
      }
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (tab !== 'billing' || !id) return
    setBillingLoading(true)
    Promise.allSettled([
      api.get(`/billing/subscription?clubId=${id}`),
      api.get('/billing/plans'),
      api.get(`/billing/ai-usage?clubId=${id}`),
    ]).then(([subRes, planRes, usageRes]) => {
      if (subRes.status === 'fulfilled') setSub(subRes.value.data?.data)
      if (planRes.status === 'fulfilled') {
        const p = planRes.value.data?.data ?? []
        setPlans(p)
        if (p.length > 0) setUpgradeTier(p.find((x: Plan) => x.tier !== 'FREE')?.tier ?? 'STARTER')
      }
      if (usageRes.status === 'fulfilled') setAiUsage(usageRes.value.data?.data ?? [])
    }).finally(() => setBillingLoading(false))
  }, [tab, id])

  const handleUpgrade = async () => {
    if (!id) return
    setUpgrading(true)
    try {
      await api.post('/billing/upgrade', { clubId: id, tier: upgradeTier, months: upgradeMonths })
      toast.success(`Đã nâng cấp lên ${upgradeTier} ${upgradeMonths} tháng`)
      // Refresh billing
      const res = await api.get(`/billing/subscription?clubId=${id}`)
      setSub(res.data?.data)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Nâng cấp thất bại')
    } finally {
      setUpgrading(false)
    }
  }

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

  const tabBar = (
    <div className="flex gap-1 border-b border-slate-100 mb-4">
      {([
        { key: 'members', label: 'Thành viên', icon: <Users size={14} /> },
        { key: 'billing', label: 'Gói dịch vụ', icon: <CreditCard size={14} /> },
      ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === t.key
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {t.icon}{t.label}
        </button>
      ))}
    </div>
  )

  const membersList = (
    <>
      {members.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">Chưa có thành viên</div>
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
    </>
  )

  const billingPanel = (
    <div className="space-y-4">
      {billingLoading ? (
        <div className="text-center py-8 text-slate-400 text-sm">Đang tải...</div>
      ) : (
        <>
          {/* Current subscription */}
          {sub && (
            <div className={`rounded-xl border p-4 space-y-3 ${TIER_BORDER[sub.tier]}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star size={15} className="text-amber-500" />
                  <span className="font-semibold text-sm text-slate-800">Gói hiện tại</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TIER_BADGE[sub.tier]}`}>
                  {sub.plan?.name ?? sub.tier}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-400">Thành viên</div>
                  <div className="font-medium">{sub.usage.members} / {sub.plan?.maxMembers === 9999 ? '∞' : sub.plan?.maxMembers}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Hết hạn</div>
                  <div className="font-medium">
                    {sub.expiresAt
                      ? `${new Date(sub.expiresAt).toLocaleDateString('vi-VN')} (còn ${sub.daysRemaining} ngày)`
                      : sub.tier === 'FREE' ? 'Không giới hạn' : 'Không có'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">AI Features</div>
                  <div className="flex items-center gap-1">
                    {sub.plan?.aiFeatures
                      ? <CheckCircle2 size={14} className="text-green-500" />
                      : <span className="text-xs text-slate-400">—</span>}
                    <span className="text-xs">{sub.plan?.aiFeatures ? 'Bật' : 'Tắt'}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Telegram Bot</div>
                  <div className="flex items-center gap-1">
                    {sub.plan?.telegramBot
                      ? <CheckCircle2 size={14} className="text-green-500" />
                      : <span className="text-xs text-slate-400">—</span>}
                    <span className="text-xs">{sub.plan?.telegramBot ? 'Bật' : 'Tắt'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upgrade form */}
          <div className="rounded-xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-indigo-500" />
              <span className="font-semibold text-sm text-slate-800">Nâng cấp gói</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Gói</label>
                <select
                  value={upgradeTier}
                  onChange={e => setUpgradeTier(e.target.value as PlanTier)}
                  className="input-base text-sm"
                >
                  {plans.filter(p => p.tier !== 'FREE').map(p => (
                    <option key={p.tier} value={p.tier}>
                      {p.name} — {p.priceMonthly.toLocaleString('vi-VN')}đ/tháng
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Số tháng</label>
                <select
                  value={upgradeMonths}
                  onChange={e => setUpgradeMonths(Number(e.target.value))}
                  className="input-base text-sm"
                >
                  {[1, 3, 6, 12, 24].map(m => (
                    <option key={m} value={m}>{m} tháng</option>
                  ))}
                </select>
              </div>
            </div>
            {plans.find(p => p.tier === upgradeTier) && (
              <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs text-indigo-700">
                Tổng: <strong>
                  {((plans.find(p => p.tier === upgradeTier)?.priceMonthly ?? 0) * upgradeMonths).toLocaleString('vi-VN')}đ
                </strong> · Hết hạn sau {upgradeMonths} tháng
              </div>
            )}
            <Button onClick={handleUpgrade} disabled={upgrading} className="w-full">
              <Zap size={14} />{upgrading ? 'Đang xử lý...' : 'Xác nhận nâng cấp'}
            </Button>
          </div>

          {/* AI Usage chart (last 6 months) */}
          {aiUsage.length > 0 && (
            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-violet-500" />
                <span className="font-semibold text-sm text-slate-800">AI Token sử dụng</span>
              </div>
              <div className="space-y-2">
                {aiUsage.slice(-6).map(u => {
                  const maxTokens = Math.max(...aiUsage.map(x => x.tokens), 1)
                  const pct = Math.round((u.tokens / maxTokens) * 100)
                  return (
                    <div key={u.month} className="flex items-center gap-2 text-xs">
                      <div className="w-14 text-slate-400 shrink-0">{fmtMonth(u.month)}</div>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-28 text-right text-slate-500 shrink-0">
                        {u.tokens.toLocaleString('vi-VN')} tokens
                      </div>
                      <div className="w-20 text-right text-violet-600 font-medium shrink-0">
                        {u.estimatedCostVnd.toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )

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
                <MapPin size={14} className="mt-0.5 text-slate-400 shrink-0" />{club.address}
              </div>
            )}
            {club.contactEmail && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail size={14} className="text-slate-400 shrink-0" />{club.contactEmail}
              </div>
            )}
            {club.contactPhone && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={14} className="text-slate-400 shrink-0" />{club.contactPhone}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users size={14} className="text-slate-400 shrink-0" />
              {club._count?.members ?? members.length} thành viên · {club._count?.fundPeriods ?? 0} kỳ quỹ
            </div>
          </div>

          <div className="bg-white rounded-[16px] border border-slate-100 p-4">
            {tabBar}
            {tab === 'members' ? membersList : billingPanel}
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
        {/* Club info sidebar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 text-gray-700 font-semibold">
            <Building2 size={16} />Thông tin CLB
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
                <MapPin size={14} className="mt-0.5 text-gray-400 shrink-0" />{club.address}
              </div>
            )}
            {club.contactEmail && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={14} className="text-gray-400 shrink-0" />{club.contactEmail}
              </div>
            )}
            {club.contactPhone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} className="text-gray-400 shrink-0" />{club.contactPhone}
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Users size={14} className="text-gray-400 shrink-0" />
              {club._count?.members ?? members.length} thành viên · {club._count?.fundPeriods ?? 0} kỳ quỹ
            </div>
          </div>
        </div>

        {/* Main panel with tabs */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-4">
            {tabBar}
          </div>

          {tab === 'members' ? (
            members.length === 0 ? (
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
            )
          ) : (
            <div className="p-5">{billingPanel}</div>
          )}
        </div>
      </div>
    </div>
  )
}
