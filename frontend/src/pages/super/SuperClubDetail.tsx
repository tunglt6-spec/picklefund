import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, Users,
  Star, Zap, CheckCircle2, CreditCard,
} from 'lucide-react'
import api from '../../lib/api'
import { PageShell, PageHeader, StatusBadge } from '../../components/shared'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
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

// Khớp Prisma enum ServicePlan (Club.plan — nguồn duy nhất, dùng chung với
// SuperClubs.tsx). Trước đây có PlanTier (FREE/STARTER/PRO/ENTERPRISE) là hệ
// song song đọc SystemSetting riêng, không liên quan Club.plan thật.
type ServicePlan = 'STARTER' | 'PRO' | 'CLUB_PLUS'

interface Plan {
  tier: ServicePlan; name: string; priceMonthly: number | null
  maxMembers: number; aiFeatures: boolean; telegramBot: boolean
}

interface Subscription {
  tier: ServicePlan; plan: Plan
  expiresAt: string | null; isActive: boolean; daysRemaining: number | null
  usage: { members: number }
}

interface AiUsage { month: string; tokens: number; estimatedCostVnd: number }

const ROLE_LABEL: Record<string, string> = {
  CLUB_ADMIN: 'Admin CLB', CLUB_TREASURER: 'Thủ quỹ', MEMBER_VIEW: 'Thành viên', SUPER_ADMIN: 'Super Admin',
}

const TIER_BADGE: Record<ServicePlan, string> = {
  STARTER: '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]',
  PRO: '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]',
  CLUB_PLUS: 'bg-amber-100 text-amber-700',
}

const TIER_BORDER: Record<ServicePlan, string> = {
  STARTER: 'border-[color:var(--pf-border)]',
  PRO: '[border-color:var(--pf-primary-soft)]',
  CLUB_PLUS: 'border-amber-200',
}

function fmtPlanPrice(price: number | null) {
  if (price === null) return 'Liên hệ'
  if (price === 0) return 'Miễn phí'
  return `${price.toLocaleString('vi-VN')}đ/tháng`
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
  const [upgradeTier, setUpgradeTier] = useState<ServicePlan>('STARTER')
  const [upgradeMonths, setUpgradeMonths] = useState(3)
  const [upgrading, setUpgrading] = useState(false)
  const [confirmUpgrade, setConfirmUpgrade] = useState(false)

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
        if (p.length > 0) setUpgradeTier((subRes.status === 'fulfilled' ? subRes.value.data?.data?.tier : null) ?? 'STARTER')
      }
      if (usageRes.status === 'fulfilled') setAiUsage(usageRes.value.data?.data ?? [])
    }).finally(() => setBillingLoading(false))
  }, [tab, id])

  const handleUpgrade = async () => {
    if (!id) return
    setUpgrading(true)
    try {
      // Dùng chung PATCH /clubs/:id/plan (nguồn duy nhất Club.plan — cùng endpoint
      // SuperClubs.tsx đã dùng), thay vì POST /billing/upgrade (hệ SystemSetting
      // song song cũ, không liên quan Club.plan thật).
      const expiry = new Date()
      expiry.setMonth(expiry.getMonth() + upgradeMonths)
      await api.patch(`/clubs/${id}/plan`, { plan: upgradeTier, planExpiresAt: expiry.toISOString() })
      toast.success(`Đã đổi gói CLB thành ${upgradeTier} (${upgradeMonths} tháng)`)
      // Refresh billing
      const res = await api.get(`/billing/subscription?clubId=${id}`)
      setSub(res.data?.data)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Đổi gói thất bại')
    } finally {
      setUpgrading(false)
      setConfirmUpgrade(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen [background:var(--pf-surface-muted)] flex items-center justify-center">
        <div className="[color:var(--pf-color-muted)] text-sm">Đang tải...</div>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="min-h-screen [background:var(--pf-surface-muted)] flex flex-col items-center justify-center gap-4">
        <div className="[color:var(--pf-color-muted)] text-sm">Không tìm thấy CLB</div>
        <Button variant="secondary" onClick={() => navigate('/super/clubs')}><ArrowLeft size={16} /> Quay lại</Button>
      </div>
    )
  }

  const tabBar = (
    <div className="flex gap-1 border-b border-[color:var(--pf-border)] mb-4">
      {([
        { key: 'members', label: 'Thành viên', icon: <Users size={14} /> },
        { key: 'billing', label: 'Gói dịch vụ', icon: <CreditCard size={14} /> },
      ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === t.key
              ? '[border-color:var(--pf-primary)] [color:var(--pf-primary)]'
              : 'border-transparent [color:var(--pf-color-muted)] hover:[color:var(--pf-text)]'
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
        <div className="text-center py-8 [color:var(--pf-color-muted)] text-sm">Chưa có thành viên</div>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-3 py-2 border-b border-[color:var(--pf-border)] last:border-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium [color:var(--pf-text)] truncate">{m.username}</div>
                <div className="text-xs [color:var(--pf-color-muted)] truncate">{m.email}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs px-2 py-0.5 rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)] font-medium">
                  {ROLE_LABEL[m.role] ?? m.role}
                </span>
                {!m.isActive && <StatusBadge tone="neutral">Tắt</StatusBadge>}
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
        <div className="text-center py-8 [color:var(--pf-color-muted)] text-sm">Đang tải...</div>
      ) : (
        <>
          {/* Current subscription */}
          {sub && (
            <div className={`rounded-xl border p-4 space-y-3 ${TIER_BORDER[sub.tier]}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star size={15} className="text-amber-500" />
                  <span className="font-semibold text-sm [color:var(--pf-text)]">Gói hiện tại</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TIER_BADGE[sub.tier]}`}>
                  {sub.plan?.name ?? sub.tier}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs [color:var(--pf-color-muted)]">Thành viên</div>
                  <div className="font-medium">{sub.usage.members} / {sub.plan?.maxMembers === 9999 ? '∞' : sub.plan?.maxMembers}</div>
                </div>
                <div>
                  <div className="text-xs [color:var(--pf-color-muted)]">Hết hạn</div>
                  <div className="font-medium">
                    {sub.expiresAt
                      ? `${new Date(sub.expiresAt).toLocaleDateString('vi-VN')} (còn ${sub.daysRemaining} ngày)`
                      : sub.tier === 'STARTER' ? 'Không giới hạn' : 'Không có'}
                  </div>
                </div>
                <div>
                  <div className="text-xs [color:var(--pf-color-muted)]">AI Features</div>
                  <div className="flex items-center gap-1">
                    {sub.plan?.aiFeatures
                      ? <CheckCircle2 size={14} className="[color:var(--pf-color-success)]" />
                      : <span className="text-xs [color:var(--pf-color-muted)]">—</span>}
                    <span className="text-xs">{sub.plan?.aiFeatures ? 'Bật' : 'Tắt'}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs [color:var(--pf-color-muted)]">Telegram Bot</div>
                  <div className="flex items-center gap-1">
                    {sub.plan?.telegramBot
                      ? <CheckCircle2 size={14} className="[color:var(--pf-color-success)]" />
                      : <span className="text-xs [color:var(--pf-color-muted)]">—</span>}
                    <span className="text-xs">{sub.plan?.telegramBot ? 'Bật' : 'Tắt'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upgrade form */}
          <div className="rounded-xl border border-[color:var(--pf-border)] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap size={15} className="[color:var(--pf-primary)]" />
              <span className="font-semibold text-sm [color:var(--pf-text)]">Nâng cấp gói</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs [color:var(--pf-color-muted)] mb-1">Gói</label>
                <select
                  value={upgradeTier}
                  onChange={e => setUpgradeTier(e.target.value as ServicePlan)}
                  className="input-base text-sm"
                >
                  {plans.map(p => (
                    <option key={p.tier} value={p.tier}>
                      {p.name} — {fmtPlanPrice(p.priceMonthly)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs [color:var(--pf-color-muted)] mb-1">Số tháng</label>
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
              <div className="rounded-lg [background:var(--pf-primary-soft)] border [border-color:var(--pf-primary-soft)] px-3 py-2 text-xs [color:var(--pf-primary)]">
                {(() => {
                  const price = plans.find(p => p.tier === upgradeTier)?.priceMonthly ?? null
                  return price === null
                    ? <>Gói <strong>{upgradeTier}</strong> — liên hệ để báo giá</>
                    : <>Tổng: <strong>{(price * upgradeMonths).toLocaleString('vi-VN')}đ</strong> · Hết hạn sau {upgradeMonths} tháng</>
                })()}
              </div>
            )}
            <Button onClick={() => setConfirmUpgrade(true)} disabled={upgrading || upgradeTier === sub?.tier} className="w-full">
              <Zap size={14} />{upgrading ? 'Đang xử lý...' : 'Xác nhận đổi gói'}
            </Button>
          </div>

          {/* AI Usage chart (last 6 months) */}
          {aiUsage.length > 0 && (
            <div className="rounded-xl border border-[color:var(--pf-border)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="[color:var(--pf-primary)]" />
                <span className="font-semibold text-sm [color:var(--pf-text)]">AI Token sử dụng</span>
              </div>
              <div className="space-y-2">
                {aiUsage.slice(-6).map(u => {
                  const maxTokens = Math.max(...aiUsage.map(x => x.tokens), 1)
                  const pct = Math.round((u.tokens / maxTokens) * 100)
                  return (
                    <div key={u.month} className="text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 mb-1">
                        <span className="[color:var(--pf-color-muted)]">{fmtMonth(u.month)}</span>
                        <span className="[color:var(--pf-color-muted)]">
                          {u.tokens.toLocaleString('vi-VN')} tokens · <span className="[color:var(--pf-primary)] font-medium">{u.estimatedCostVnd.toLocaleString('vi-VN')}đ</span>
                        </span>
                      </div>
                      <div className="h-2 [background:var(--pf-color-muted-soft)] rounded-full overflow-hidden">
                        <div className="h-full [background:var(--pf-primary)] rounded-full" style={{ width: `${pct}%` }} />
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

  const upgradeConfirmDialog = (
    <ConfirmDialog
      open={confirmUpgrade}
      variant="warning"
      title="Xác nhận đổi gói dịch vụ"
      message={`Đổi gói CLB "${club?.name}" sang ${upgradeTier} trong ${upgradeMonths} tháng? Thao tác này ảnh hưởng giới hạn thành viên và tính năng CLB có thể dùng.`}
      confirmLabel="Xác nhận"
      cancelLabel="Hủy bỏ"
      onCancel={() => setConfirmUpgrade(false)}
      onConfirm={handleUpgrade}
    />
  )

  if (isMobile) {
    return (
      <div className="min-h-screen [background:var(--pf-bg)]">
        <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/super/clubs')} className="p-1.5 rounded-lg [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold [color:var(--pf-text)] text-base truncate">{club.name}</div>
            <div className="text-xs [color:var(--pf-color-muted)]">{club.code}</div>
          </div>
          <StatusBadge tone={club.status === 'active' ? 'success' : 'warning'} dot>
            {club.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
          </StatusBadge>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] p-4 space-y-3">
            <div className="text-sm font-semibold [color:var(--pf-text)]">Thông tin CLB</div>
            {club.address && (
              <div className="flex items-start gap-2 text-sm [color:var(--pf-color-muted)]">
                <MapPin size={14} className="mt-0.5 [color:var(--pf-color-muted)] shrink-0" />{club.address}
              </div>
            )}
            {club.contactEmail && (
              <div className="flex items-center gap-2 text-sm [color:var(--pf-color-muted)]">
                <Mail size={14} className="[color:var(--pf-color-muted)] shrink-0" />{club.contactEmail}
              </div>
            )}
            {club.contactPhone && (
              <div className="flex items-center gap-2 text-sm [color:var(--pf-color-muted)]">
                <Phone size={14} className="[color:var(--pf-color-muted)] shrink-0" />{club.contactPhone}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm [color:var(--pf-color-muted)]">
              <Users size={14} className="[color:var(--pf-color-muted)] shrink-0" />
              {club._count?.members ?? members.length} thành viên · {club._count?.fundPeriods ?? 0} kỳ quỹ
            </div>
          </div>

          <div className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] p-4">
            {tabBar}
            {tab === 'members' ? membersList : billingPanel}
          </div>
        </div>
        {upgradeConfirmDialog}
      </div>
    )
  }

  return (
    <PageShell maxWidth={1280}>
      <PageHeader
        title={club.name}
        subtitle={`Mã: ${club.code} · ${club._count?.members ?? members.length} thành viên`}
        actions={
          <Button variant="secondary" onClick={() => navigate('/super/clubs')}>
            <ArrowLeft size={16} /> Quay lại
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Club info sidebar */}
        <div className="rounded-2xl border p-5 space-y-4 [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
          <div className="flex items-center gap-2 [color:var(--pf-text)] font-semibold">
            <Building2 size={16} />Thông tin CLB
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="[color:var(--pf-color-muted)]">Trạng thái</span>
              <StatusBadge tone={club.status === 'active' ? 'success' : 'warning'} dot>
                {club.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
              </StatusBadge>
            </div>
            {club.address && (
              <div className="flex items-start gap-2 [color:var(--pf-color-muted)]">
                <MapPin size={14} className="mt-0.5 [color:var(--pf-color-muted)] shrink-0" />{club.address}
              </div>
            )}
            {club.contactEmail && (
              <div className="flex items-center gap-2 [color:var(--pf-color-muted)]">
                <Mail size={14} className="[color:var(--pf-color-muted)] shrink-0" />{club.contactEmail}
              </div>
            )}
            {club.contactPhone && (
              <div className="flex items-center gap-2 [color:var(--pf-color-muted)]">
                <Phone size={14} className="[color:var(--pf-color-muted)] shrink-0" />{club.contactPhone}
              </div>
            )}
            <div className="flex items-center gap-2 [color:var(--pf-color-muted)]">
              <Users size={14} className="[color:var(--pf-color-muted)] shrink-0" />
              {club._count?.members ?? members.length} thành viên · {club._count?.fundPeriods ?? 0} kỳ quỹ
            </div>
          </div>
        </div>

        {/* Main panel with tabs */}
        <div className="lg:col-span-2 rounded-2xl border overflow-hidden [background:var(--pf-surface)] [border-color:var(--pf-border)]" style={{ boxShadow: 'var(--pf-shadow)' }}>
          <div className="px-5 pt-4">
            {tabBar}
          </div>

          {tab === 'members' ? (
            members.length === 0 ? (
              <div className="text-center py-12 [color:var(--pf-color-muted)] text-sm">Chưa có thành viên nào</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="[background:var(--pf-surface-muted)] border-b border-[color:var(--pf-border)]">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold [color:var(--pf-text)]">Tên đăng nhập</th>
                    <th className="text-left px-4 py-3 font-semibold [color:var(--pf-text)]">Email</th>
                    <th className="text-center px-4 py-3 font-semibold [color:var(--pf-text)]">Vai trò</th>
                    <th className="text-center px-4 py-3 font-semibold [color:var(--pf-text)]">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--pf-border-soft)]">
                  {members.map(m => (
                    <tr key={m.id} className="hover:[background:var(--pf-surface-muted)]">
                      <td className="px-4 py-3 font-medium [color:var(--pf-text)]">{m.username}</td>
                      <td className="px-4 py-3 [color:var(--pf-color-muted)]">{m.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block text-xs px-2.5 py-1 rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)] font-medium">
                          {ROLE_LABEL[m.role] ?? m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge tone={m.isActive ? 'success' : 'neutral'} dot>
                          {m.isActive ? 'Hoạt động' : 'Tắt'}
                        </StatusBadge>
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
      {upgradeConfirmDialog}
    </PageShell>
  )
}
