import { useState, useEffect, useCallback } from 'react'
import { Star, Zap, Check, TrendingUp, AlertCircle, Receipt } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useBrandingStore } from '../../store/brandingStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { CheckoutModal, type CheckoutPlan } from './billing/CheckoutModal'
import { ReferralCard } from './billing/ReferralCard'
import { exportBillingReceiptPDF } from '../../lib/export'

// Khớp Prisma enum ServicePlan (Club.plan — nguồn duy nhất, PATCH /clubs/:id/plan
// dùng chung). Trước đây có PlanTier (FREE/STARTER/PRO/ENTERPRISE) là hệ song song
// đọc SystemSetting riêng, không liên quan Club.plan thật — đã gộp về ServicePlan.
type ServicePlan = 'STARTER' | 'PRO' | 'CLUB_PLUS'

type Plan = {
  tier: ServicePlan
  name: string
  priceMonthly: number | null
  priceYearly: number | null
  maxMembers: number
  maxClubs: number
  aiFeatures: boolean
  telegramBot: boolean
}

type OrderRow = {
  orderCode: string
  planTier: ServicePlan
  billingCycle: 'MONTHLY' | 'YEARLY'
  amount: string | number
  discountAmount?: string | number
  billingInfo?: { buyerName?: string; taxCode?: string; address?: string } | null
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED'
  gateway: string
  paidAt: string | null
  createdAt: string
}

type Subscription = {
  tier: ServicePlan
  plan: Plan
  expiresAt: string | null
  isActive: boolean
  daysRemaining: number | null
  inGrace: boolean
  graceUntil: string | null
  cancelled: boolean
  usage: { members: number; clubs: number }
}

type AiUsage = { month: string; tokens: number; estimatedCostVnd: number }

// Tên hiển thị gói (không lộ enum CLUB_PLUS ra người dùng).
const PLAN_LABEL: Record<ServicePlan, string> = { STARTER: 'Starter', PRO: 'Pro', CLUB_PLUS: 'Enterprise' }

const PLAN_COLORS: Record<ServicePlan, string> = {
  STARTER: '[background:var(--pf-surface-muted)] border-[color:var(--pf-border)]',
  PRO: '[background:var(--pf-primary-soft)] [border-color:var(--pf-primary-soft)]',
  CLUB_PLUS: 'bg-amber-50 border-amber-200',
}

const PLAN_BADGE: Record<ServicePlan, string> = {
  STARTER: '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]',
  PRO: '[background:var(--pf-primary-soft)] [color:var(--pf-primary)]',
  CLUB_PLUS: 'bg-amber-100 text-amber-700',
}

function fmtPrice(price: number | null) {
  if (price === null) return 'Liên hệ'
  if (price === 0) return 'Miễn phí'
  return `${price.toLocaleString('vi-VN')}đ/tháng`
}

function fmtMonth(month: string) {
  const [y, m] = month.split('-')
  return `Tháng ${m}/${y}`
}

export function Billing() {
  const { user } = useAuthStore()
  const clubName = useBrandingStore((s) => s.branding.displayName) || 'CLB'
  const isMobile = useIsMobile()
  const [sub, setSub] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [usage, setUsage] = useState<AiUsage[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [checkout, setCheckout] = useState<CheckoutPlan | null>(null)

  const fetchAll = useCallback(async () => {
    if (!user) return
    try {
      const [subRes, planRes, usageRes, orderRes] = await Promise.all([
        api.get('/billing/subscription'),
        api.get('/billing/plans'),
        api.get('/billing/ai-usage'),
        api.get('/billing/orders').catch(() => null),
      ])
      setSub(subRes.data?.data ?? subRes.data)
      setPlans(planRes.data?.data ?? planRes.data)
      setUsage(usageRes.data?.data ?? usageRes.data)
      if (orderRes) setOrders(orderRes.data?.data ?? orderRes.data ?? [])
    } catch { /* noop */ }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { fetchAll() }, [fetchAll])

  const currentTier = sub?.tier ?? 'STARTER'
  const canManage = currentTier !== 'STARTER' && !!sub?.expiresAt // có hạn → gia hạn/hủy được

  const doCancel = async () => {
    if (!window.confirm('Hủy gia hạn? Bạn vẫn dùng gói đến hết hạn hiện tại, sau đó về Starter.')) return
    try {
      await api.post('/billing/subscription/cancel')
      toast.success('Đã hủy gia hạn — vẫn dùng đến hết hạn.')
      void fetchAll()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Hủy thất bại.')
    }
  }

  const doReceipt = async (o: OrderRow) => {
    try {
      await exportBillingReceiptPDF({
        clubName,
        invoiceNumber: `INV-${o.orderCode}`,
        orderCode: o.orderCode,
        planLabel: PLAN_LABEL[o.planTier],
        cycleLabel: o.billingCycle === 'YEARLY' ? 'Theo năm' : 'Theo tháng',
        amount: Number(o.amount),
        discount: o.discountAmount ? Number(o.discountAmount) : 0,
        paidAt: o.paidAt ?? o.createdAt,
        gateway: o.gateway,
        billingInfo: o.billingInfo ?? null,
      })
    } catch {
      toast.error('Không tạo được biên nhận.')
    }
  }

  const content = (
    <div className="space-y-6 max-w-[860px]">
      {loading && <p className="text-center text-sm [color:var(--pf-color-muted)] py-12">Đang tải...</p>}

      {!loading && sub && (
        <>
          {/* Current plan card */}
          <div className={`rounded-xl border p-5 md:p-6 ${PLAN_COLORS[currentTier]}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_BADGE[currentTier]}`}>
                    {sub.plan.name ?? currentTier}
                  </span>
                  {sub.isActive && currentTier !== 'STARTER' && (
                    <span className="text-xs text-emerald-600 font-medium">● Đang hoạt động</span>
                  )}
                </div>
                <h2 className="text-xl font-bold [color:var(--pf-text)]">Gói hiện tại: {sub.plan.name ?? currentTier}</h2>
                {sub.expiresAt ? (
                  <p className="text-sm mt-1" style={{ color: sub.inGrace ? 'var(--pf-accent-amber, #D97706)' : 'var(--pf-color-muted)' }}>
                    {sub.inGrace
                      ? `⚠️ Đã hết hạn — đang ân hạn đến ${new Date(sub.graceUntil!).toLocaleDateString('vi-VN')}`
                      : (sub.daysRemaining ?? 0) > 0
                        ? `Còn ${sub.daysRemaining} ngày (hết hạn ${new Date(sub.expiresAt).toLocaleDateString('vi-VN')})`
                        : '⚠️ Đã hết hạn'}
                    {sub.cancelled && <span className="ml-1">· Đã hủy gia hạn</span>}
                  </p>
                ) : currentTier !== 'STARTER' ? (
                  <p className="text-sm [color:var(--pf-color-muted)] mt-1">Không giới hạn thời hạn</p>
                ) : null}
                {canManage && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => { const p = plans.find(pl => pl.tier === currentTier); if (p) setCheckout(p) }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold [background:var(--pf-primary)] text-white hover:[background:var(--pf-primary-hover)] transition-colors">
                      Gia hạn
                    </button>
                    {!sub.cancelled && (
                      <button onClick={doCancel}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[color:var(--pf-border)] [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] transition-colors">
                        Hủy gia hạn
                      </button>
                    )}
                  </div>
                )}
              </div>
              <Star size={28} className={currentTier === 'STARTER' ? '[color:var(--pf-color-muted)]' : 'text-amber-400'} />
            </div>

            {/* Usage */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="[background:var(--pf-surface)] rounded-lg p-3">
                <p className="text-xs [color:var(--pf-color-muted)]">Thành viên</p>
                <p className="text-lg font-bold [color:var(--pf-text)]">{sub.usage.members} <span className="text-sm font-normal [color:var(--pf-color-muted)]">/ {sub.plan.maxMembers >= 9999 ? '∞' : sub.plan.maxMembers}</span></p>
                <div className="mt-1.5 h-1.5 [background:var(--pf-color-muted-soft)] rounded-full overflow-hidden">
                  <div className="h-full [background:var(--pf-primary)] rounded-full transition-all"
                    style={{ width: sub.plan.maxMembers >= 9999 ? '4px' : `${Math.min(100, (sub.usage.members / sub.plan.maxMembers) * 100)}%` }} />
                </div>
              </div>
              <div className="[background:var(--pf-surface)] rounded-lg p-3">
                <p className="text-xs [color:var(--pf-color-muted)]">Tính năng AI</p>
                <p className="text-sm font-semibold mt-1 [color:var(--pf-text)]">
                  {sub.plan.aiFeatures ? '✅ Đã kích hoạt' : '❌ Chưa có'}
                </p>
                <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">
                  Telegram Bot: {sub.plan.telegramBot ? '✅' : '❌'}
                </p>
              </div>
            </div>
          </div>

          {/* Plan comparison */}
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[color:var(--pf-border)]">
              <h3 className="font-semibold [color:var(--pf-text)]">Bảng so sánh gói dịch vụ</h3>
              <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">Chọn gói và tự nâng cấp — kích hoạt ngay sau khi thanh toán</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="[background:var(--pf-surface-muted)] border-b border-[color:var(--pf-border)]">
                    <th className="text-left px-4 py-3 font-medium [color:var(--pf-color-muted)]">Tính năng</th>
                    {plans.map(p => (
                      <th key={p.tier} className="text-center px-4 py-3 font-medium [color:var(--pf-color-muted)] min-w-[100px]">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_BADGE[p.tier]}`}>
                          {p.tier === currentTier ? `✓ ${p.name ?? PLAN_LABEL[p.tier]}` : (p.name ?? PLAN_LABEL[p.tier])}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Giá', fn: (p: Plan) => <span className="font-semibold">{fmtPrice(p.priceMonthly)}</span> },
                    { label: 'Thành viên tối đa', fn: (p: Plan) => p.maxMembers >= 9999 ? 'Không giới hạn' : p.maxMembers },
                    { label: 'Số CLB', fn: (p: Plan) => p.maxClubs >= 999 ? 'Không giới hạn' : p.maxClubs },
                    { label: 'Tính năng AI', fn: (p: Plan) => p.aiFeatures ? <Check size={16} className="text-emerald-500 mx-auto" /> : '—' },
                    { label: 'Telegram Bot', fn: (p: Plan) => p.telegramBot ? <Check size={16} className="text-emerald-500 mx-auto" /> : '—' },
                  ].map(row => (
                    <tr key={row.label} className="border-b border-[color:var(--pf-border)] hover:[background:var(--pf-color-muted-soft)]">
                      <td className="px-4 py-3 [color:var(--pf-text)]">{row.label}</td>
                      {plans.map(p => (
                        <td key={p.tier} className={`px-4 py-3 text-center ${p.tier === currentTier ? '[background:var(--pf-primary-soft)]' : ''}`}>
                          {row.fn(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Hàng nút hành động */}
                  <tr>
                    <td className="px-4 py-3" />
                    {plans.map(p => (
                      <td key={p.tier} className={`px-4 py-3 text-center ${p.tier === currentTier ? '[background:var(--pf-primary-soft)]' : ''}`}>
                        {p.tier === currentTier ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={13} />Gói hiện tại</span>
                        ) : p.tier === 'STARTER' ? (
                          <span className="text-xs [color:var(--pf-color-muted)]">Miễn phí</span>
                        ) : p.tier === 'CLUB_PLUS' ? (
                          <button onClick={() => window.open('mailto:sales@picklefund.app?subject=Tư vấn gói Enterprise PickleFund', '_blank')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[color:var(--pf-border)] [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)] transition-colors">
                            Đăng ký tư vấn
                          </button>
                        ) : (
                          <button onClick={() => setCheckout(p)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold [background:var(--pf-primary)] text-white hover:[background:var(--pf-primary-hover)] transition-colors">
                            Nâng cấp ngay
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Giới thiệu bạn bè */}
          <ReferralCard />

          {/* AI Usage */}
          {usage.length > 0 && (
            <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] p-5 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="[color:var(--pf-primary)]" />
                <h3 className="font-semibold [color:var(--pf-text)]">Lịch sử sử dụng AI</h3>
              </div>
              <div className="space-y-2">
                {usage.slice(0, 6).map(u => (
                  <div key={u.month} className="flex items-center justify-between py-2 border-b border-[color:var(--pf-border)] last:border-0">
                    <span className="text-sm [color:var(--pf-color-muted)]">{fmtMonth(u.month)}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium [color:var(--pf-text)]">{u.tokens.toLocaleString('vi-VN')} tokens</span>
                      <span className="text-xs [color:var(--pf-color-muted)] ml-2">~{u.estimatedCostVnd.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-start gap-2 bg-emerald-50 rounded-lg p-3">
                <AlertCircle size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-700">
                  Mục tiêu: chi phí AI dưới 500.000đ/tháng. Hiện đang dùng Gemini 1.5 Flash — giá ~1.800đ/1M tokens.
                </p>
              </div>
            </div>
          )}

          {/* Contact to upgrade */}
          {currentTier === 'STARTER' && (
            <div className="bg-gradient-to-r from-[var(--pf-primary)] to-[var(--pf-primary-hover)] rounded-xl p-5 md:p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={18} className="text-yellow-300" />
                <h3 className="font-semibold">Nâng cấp để dùng AI đầy đủ</h3>
              </div>
              <p className="text-sm text-white/80 mb-4">
                Gói Pro (99.000đ/tháng · 990.000đ/năm) mở khoá không giới hạn thành viên, Maika AI, Lisa AI, minigame/giải đấu và báo cáo PDF/Excel.
              </p>
              <button
                onClick={() => { const pro = plans.find(p => p.tier === 'PRO'); if (pro) setCheckout(pro) }}
                className="bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-lg">
                Nâng cấp lên Pro
              </button>
            </div>
          )}

          {/* Lịch sử thanh toán */}
          {orders.length > 0 && (
            <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] p-5 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Receipt size={18} className="[color:var(--pf-primary)]" />
                <h3 className="font-semibold [color:var(--pf-text)]">Lịch sử thanh toán</h3>
              </div>
              <div className="space-y-1">
                {orders.slice(0, 8).map(o => {
                  const paid = o.status === 'PAID'
                  const stLabel = paid ? 'Đã thanh toán' : o.status === 'PENDING' ? 'Chờ thanh toán' : o.status === 'FAILED' ? 'Thất bại' : o.status
                  return (
                    <div key={o.orderCode} className="flex items-center justify-between gap-3 py-2 border-b border-[color:var(--pf-border)] last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium [color:var(--pf-text)] truncate">{PLAN_LABEL[o.planTier]} · {o.billingCycle === 'YEARLY' ? 'Năm' : 'Tháng'}</p>
                        <p className="text-[11px] [color:var(--pf-color-muted)] truncate">{o.orderCode} · {new Date(o.paidAt ?? o.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold [color:var(--pf-text)] tabular-nums">{Number(o.amount).toLocaleString('vi-VN')}đ</p>
                          <span className={`text-[11px] font-medium ${paid ? 'text-emerald-600' : o.status === 'FAILED' ? 'text-rose-500' : 'text-amber-500'}`}>{stLabel}</span>
                        </div>
                        {paid && (
                          <button onClick={() => doReceipt(o)} title="Tải biên nhận"
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-[color:var(--pf-border)] [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] transition-colors">
                            Biên nhận
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {checkout && (
        <CheckoutModal
          plan={checkout}
          onClose={() => setCheckout(null)}
          onActivated={() => { void fetchAll() }}
        />
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div className="min-h-full [background:var(--pf-bg)]">
        <div className="sticky top-0 z-20 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3">
          <p className="text-[17px] font-[800] [color:var(--pf-text)]">Gói dịch vụ</p>
          <p className="text-[12px] [color:var(--pf-color-muted)]">Quản lý subscription & AI usage</p>
        </div>
        <div className="px-4 py-4 pb-24">{content}</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-surface-muted)]">
      <PageHeader title="Gói dịch vụ" subtitle="Quản lý subscription và theo dõi chi phí AI" />
      <div className="p-6 mx-auto">{content}</div>
    </div>
  )
}
