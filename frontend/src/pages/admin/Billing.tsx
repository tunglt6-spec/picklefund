import { useState, useEffect, useCallback } from 'react'
import { Star, Zap, Check, TrendingUp, AlertCircle } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import api from '../../lib/api'

type PlanTier = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'

type Plan = {
  tier: PlanTier
  name: string
  priceMonthly: number
  maxMembers: number
  maxClubs: number
  aiFeatures: boolean
  telegramBot: boolean
}

type Subscription = {
  tier: PlanTier
  plan: Plan
  expiresAt: string | null
  isActive: boolean
  daysRemaining: number | null
  usage: { members: number; clubs: number }
}

type AiUsage = { month: string; tokens: number; estimatedCostVnd: number }

const PLAN_COLORS: Record<PlanTier, string> = {
  FREE: 'bg-slate-50 border-slate-200',
  STARTER: 'bg-indigo-50 border-indigo-200',
  PRO: 'bg-purple-50 border-purple-200',
  ENTERPRISE: 'bg-amber-50 border-amber-200',
}

const PLAN_BADGE: Record<PlanTier, string> = {
  FREE: 'bg-slate-100 text-slate-600',
  STARTER: 'bg-indigo-100 text-indigo-700',
  PRO: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700',
}

function fmtPrice(price: number) {
  if (price === 0) return 'Miễn phí'
  return `${price.toLocaleString('vi-VN')}đ/tháng`
}

function fmtMonth(month: string) {
  const [y, m] = month.split('-')
  return `Tháng ${m}/${y}`
}

export function Billing() {
  const { user } = useAuthStore()
  const isMobile = useIsMobile()
  const [sub, setSub] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [usage, setUsage] = useState<AiUsage[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!user) return
    try {
      const [subRes, planRes, usageRes] = await Promise.all([
        api.get('/billing/subscription'),
        api.get('/billing/plans'),
        api.get('/billing/ai-usage'),
      ])
      setSub(subRes.data?.data ?? subRes.data)
      setPlans(planRes.data?.data ?? planRes.data)
      setUsage(usageRes.data?.data ?? usageRes.data)
    } catch { /* noop */ }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { fetchAll() }, [fetchAll])

  const currentTier = sub?.tier ?? 'FREE'

  const content = (
    <div className="space-y-6 max-w-[860px]">
      {loading && <p className="text-center text-sm text-slate-400 py-12">Đang tải...</p>}

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
                  {sub.isActive && currentTier !== 'FREE' && (
                    <span className="text-xs text-emerald-600 font-medium">● Đang hoạt động</span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900">Gói hiện tại: {sub.plan.name ?? currentTier}</h2>
                {sub.daysRemaining !== null && (
                  <p className="text-sm text-slate-600 mt-1">
                    {sub.daysRemaining > 0
                      ? `Còn ${sub.daysRemaining} ngày (hết hạn ${new Date(sub.expiresAt!).toLocaleDateString('vi-VN')})`
                      : '⚠️ Đã hết hạn'}
                  </p>
                )}
              </div>
              <Star size={28} className={currentTier === 'FREE' ? 'text-slate-300' : 'text-amber-400'} />
            </div>

            {/* Usage */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-xs text-slate-500">Thành viên</p>
                <p className="text-lg font-bold text-slate-900">{sub.usage.members} <span className="text-sm font-normal text-slate-500">/ {sub.plan.maxMembers}</span></p>
                <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (sub.usage.members / sub.plan.maxMembers) * 100)}%` }} />
                </div>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-xs text-slate-500">Tính năng AI</p>
                <p className="text-sm font-semibold mt-1 text-slate-900">
                  {sub.plan.aiFeatures ? '✅ Đã kích hoạt' : '❌ Chưa có'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Telegram Bot: {sub.plan.telegramBot ? '✅' : '❌'}
                </p>
              </div>
            </div>
          </div>

          {/* Plan comparison */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Bảng so sánh gói dịch vụ</h3>
              <p className="text-xs text-slate-500 mt-0.5">Liên hệ Admin để nâng cấp gói</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Tính năng</th>
                    {plans.map(p => (
                      <th key={p.tier} className="text-center px-4 py-3 font-medium text-slate-600 min-w-[100px]">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_BADGE[p.tier]}`}>
                          {p.tier === currentTier ? `✓ ${p.tier}` : p.tier}
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
                    <tr key={row.label} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-700">{row.label}</td>
                      {plans.map(p => (
                        <td key={p.tier} className={`px-4 py-3 text-center ${p.tier === currentTier ? 'bg-indigo-50/50' : ''}`}>
                          {row.fn(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Usage */}
          {usage.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-indigo-500" />
                <h3 className="font-semibold text-slate-900">Lịch sử sử dụng AI</h3>
              </div>
              <div className="space-y-2">
                {usage.slice(0, 6).map(u => (
                  <div key={u.month} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-600">{fmtMonth(u.month)}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-slate-900">{u.tokens.toLocaleString('vi-VN')} tokens</span>
                      <span className="text-xs text-slate-400 ml-2">~{u.estimatedCostVnd.toLocaleString('vi-VN')}đ</span>
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
          {currentTier === 'FREE' && (
            <div className="bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-xl p-5 md:p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={18} className="text-yellow-300" />
                <h3 className="font-semibold">Nâng cấp để dùng AI đầy đủ</h3>
              </div>
              <p className="text-sm text-indigo-100 mb-4">
                Gói Starter (99.000đ/tháng) mở khoá Maika AI, Lisa AI, báo cáo tự động và phát hiện bất thường.
              </p>
              <button
                onClick={() => window.open('mailto:admin@picklefund.app?subject=Nâng cấp gói PickleFund', '_blank')}
                className="bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-lg">
                Liên hệ nâng cấp
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3">
          <p className="text-[17px] font-[800] text-slate-900">Gói dịch vụ</p>
          <p className="text-[12px] text-slate-400">Quản lý subscription & AI usage</p>
        </div>
        <div className="px-4 py-4 pb-24">{content}</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader title="Gói dịch vụ" subtitle="Quản lý subscription và theo dõi chi phí AI" />
      <div className="p-6 mx-auto">{content}</div>
    </div>
  )
}
