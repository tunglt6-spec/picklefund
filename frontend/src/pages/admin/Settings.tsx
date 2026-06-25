import { useState, useEffect, useCallback } from 'react'
import { Building2, User, Bell, Save, Eye, EyeOff, CheckCircle, CreditCard, Send, Zap } from 'lucide-react'
import api from '../../lib/api'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore, type ClubSettings } from '../../store/clubDataStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import toast from 'react-hot-toast'

type Tab = 'club' | 'account' | 'notifications' | 'payment' | 'telegram' | 'billing'

const ALL_TABS: { id: Tab; label: string; icon: React.ReactNode; superAdminOnly?: boolean }[] = [
  { id: 'club',          label: 'Thông tin CLB', icon: <Building2 size={16} /> },
  { id: 'account',       label: 'Tài khoản',     icon: <User size={16} /> },
  { id: 'notifications', label: 'Thông báo',     icon: <Bell size={16} /> },
  { id: 'payment',       label: 'Thanh toán',    icon: <CreditCard size={16} /> },
  { id: 'telegram',      label: 'Telegram',      icon: <Send size={16} /> },
  { id: 'billing',       label: 'Billing',       icon: <Zap size={16} />, superAdminOnly: true },
]

const emptySettings: ClubSettings = {
  name: '', code: '', address: '', contactPhone: '', contactEmail: '',
  description: '', maxMembers: '', defaultContribution: '', defaultSessions: '',
}

// ─── Tab: Thông tin CLB ──────────────────────────────────────
function ClubInfoTab({ clubId }: { clubId: string }) {
  const { getClubData, setClubSettings } = useClubDataStore()
  const saved = getClubData(clubId).settings ?? emptySettings
  const [form, setForm] = useState<ClubSettings>({ ...emptySettings, ...saved })
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<ClubSettings>) => setForm(f => ({ ...f, ...patch }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/clubs/${clubId}`, { name: form.name, address: form.address, contactPhone: form.contactPhone, contactEmail: form.contactEmail, description: form.description, maxMembers: form.maxMembers, defaultContribution: form.defaultContribution, defaultSessions: form.defaultSessions })
      setClubSettings(clubId, form)
      toast.success('Đã lưu thông tin CLB')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu thông tin CLB thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Thông tin cơ bản</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên CLB <span className="text-red-500">*</span></label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={form.name}
              onChange={e => set({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã CLB</label>
            <input
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              value={form.code}
              readOnly
            />
            <p className="text-xs text-gray-400 mt-1">Không thể thay đổi sau khi tạo</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Địa chỉ</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={form.address}
              onChange={e => set({ address: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={form.contactPhone}
              onChange={e => set({ contactPhone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email liên hệ</label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={form.contactEmail}
              onChange={e => set({ contactEmail: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mô tả CLB</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
              value={form.description}
              onChange={e => set({ description: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Fund settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Cài đặt quỹ mặc định</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Số thành viên tối đa</label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={form.maxMembers}
              onChange={e => set({ maxMembers: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mức đóng quỹ mặc định (₫)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={form.defaultContribution}
              onChange={e => set({ defaultContribution: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">Áp dụng khi tạo kỳ quỹ mới</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Số buổi dự kiến/kỳ</label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={form.defaultSessions}
              onChange={e => set({ defaultSessions: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary" size="md">
          {saving ? (
            <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Đang lưu...</span>
          ) : (
            <span className="flex items-center gap-2"><Save size={16} />Lưu thay đổi</span>
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Tab: Tài khoản ──────────────────────────────────────────
function AccountTab() {
  const { user } = useAuthStore()
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pw, setPw] = useState({ old: '', new: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  const handleChangePw = async () => {
    if (!pw.old || !pw.new || !pw.confirm) return toast.error('Vui lòng điền đầy đủ thông tin')
    if (pw.new.length < 6) return toast.error('Mật khẩu mới phải tối thiểu 6 ký tự')
    if (pw.new !== pw.confirm) return toast.error('Mật khẩu xác nhận không khớp')
    setSaving(true)
    try {
      await api.patch('/auth/change-password', { oldPassword: pw.old, newPassword: pw.new })
      setPw({ old: '', new: '', confirm: '' })
      toast.success('Đã đổi mật khẩu thành công')
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Đổi mật khẩu thất bại'
      toast.error(msg)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Thông tin tài khoản</h3>
        <div className="flex items-center gap-4 mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white">
            {user?.username?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{user?.username}</p>
            <span className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">Club Admin</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên đăng nhập</label>
            <input
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              value={user?.username ?? ''}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              value={user?.email ?? ''}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Đổi mật khẩu</h3>
        <div className="space-y-4 max-w-md">
          {[
            { label: 'Mật khẩu hiện tại',    key: 'old' as const, show: showOld,     toggle: () => setShowOld(v => !v) },
            { label: 'Mật khẩu mới',         key: 'new' as const, show: showNew,     toggle: () => setShowNew(v => !v) },
            { label: 'Xác nhận mật khẩu mới', key: 'confirm' as const, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
              <div className="relative">
                <input
                  type={field.show ? 'text' : 'password'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={pw[field.key]}
                  onChange={e => setPw(p => ({ ...p, [field.key]: e.target.value }))}
                  placeholder="••••••••"
                />
                <button type="button" onClick={field.toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {field.show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          {pw.new && pw.confirm && (
            <div className={cn(
              'flex items-center gap-2 text-xs rounded-lg px-3 py-2',
              pw.new === pw.confirm ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            )}>
              <CheckCircle size={14} />
              {pw.new === pw.confirm ? 'Mật khẩu khớp' : 'Mật khẩu không khớp'}
            </div>
          )}
          <Button onClick={handleChangePw} variant="primary" size="md">
            {saving
              ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Đang lưu...</span>
              : <span className="flex items-center gap-2"><Save size={16} />Đổi mật khẩu</span>
            }
          </Button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 p-5 md:p-6">
        <h3 className="font-semibold text-red-700 mb-1">Vùng nguy hiểm</h3>
        <p className="text-sm text-gray-500 mb-4">Các thao tác dưới đây không thể hoàn tác.</p>
        <Button variant="danger" size="sm" onClick={() => toast.error('Liên hệ Super Admin để xoá tài khoản')}>
          Yêu cầu xoá tài khoản
        </Button>
      </div>
    </div>
  )
}

// ─── Tab: Thông báo (Hermes Preferences) ─────────────────────
type HermesPref = {
  preferredChannel: 'IN_APP' | 'EMAIL' | 'TELEGRAM'
  telegramChatId: string | null
  quietHoursStart: number
  quietHoursEnd: number
  maxDailyEmail: number
  maxDailyTelegram: number
  enabled: boolean
}

const defaultPref: HermesPref = {
  preferredChannel: 'IN_APP',
  telegramChatId: null,
  quietHoursStart: 23,
  quietHoursEnd: 7,
  maxDailyEmail: 1,
  maxDailyTelegram: 5,
  enabled: true,
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        value ? 'bg-indigo-600' : 'bg-gray-200')}>
      <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5',
        value ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  )
}

function NotificationsTab(_: { clubId: string }) {
  const [pref, setPref] = useState<HermesPref>(defaultPref)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/hermes/preferences')
      .then(res => {
        const d = res.data?.data ?? res.data
        setPref({ ...defaultPref, ...d })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (patch: Partial<HermesPref>) => setPref(p => ({ ...p, ...patch }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch('/hermes/preferences', {
        preferredChannel: pref.preferredChannel,
        telegramChatId: pref.telegramChatId || null,
        quietHoursStart: pref.quietHoursStart,
        quietHoursEnd: pref.quietHoursEnd,
        maxDailyEmail: pref.maxDailyEmail,
        maxDailyTelegram: pref.maxDailyTelegram,
        enabled: pref.enabled,
      })
      toast.success('Đã lưu cài đặt thông báo')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Đang tải...</div>

  return (
    <div className="space-y-6">
      {/* Bật/tắt thông báo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Nhận thông báo</h3>
            <p className="text-xs text-gray-500 mt-0.5">Bật/tắt toàn bộ thông báo từ hệ thống</p>
          </div>
          <Toggle value={pref.enabled} onChange={v => set({ enabled: v })} />
        </div>
      </div>

      {/* Kênh ưu tiên */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Kênh nhận thông báo ưu tiên</h3>
        <div className="space-y-2">
          {(['IN_APP', 'EMAIL', 'TELEGRAM'] as const).map(ch => (
            <label key={ch} className={cn(
              'flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors',
              pref.preferredChannel === ch ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
            )}>
              <input type="radio" name="channel" value={ch} checked={pref.preferredChannel === ch}
                onChange={() => set({ preferredChannel: ch })} className="accent-indigo-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {ch === 'IN_APP' ? '📱 Trong ứng dụng' : ch === 'EMAIL' ? '📧 Email' : '✈️ Telegram'}
                </p>
                <p className="text-xs text-gray-500">
                  {ch === 'IN_APP' ? 'Thông báo hiển thị trực tiếp trong app' :
                   ch === 'EMAIL' ? `Tối đa ${pref.maxDailyEmail} email/ngày` :
                   `Tối đa ${pref.maxDailyTelegram} tin/ngày`}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Telegram Chat ID */}
      {pref.preferredChannel === 'TELEGRAM' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Liên kết Telegram</h3>
          <p className="text-xs text-gray-500 mb-3">
            Nhắn tin cho <span className="font-mono text-indigo-600">@PickleFundBot</span> lệnh <span className="font-mono">/start</span> để lấy Chat ID
          </p>
          <input
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="Ví dụ: 123456789"
            value={pref.telegramChatId ?? ''}
            onChange={e => set({ telegramChatId: e.target.value })}
          />
        </div>
      )}

      {/* Giờ yên tĩnh */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Giờ yên tĩnh</h3>
        <p className="text-xs text-gray-500 mb-4">Trong khoảng giờ này chỉ nhận thông báo In-App</p>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Từ</label>
            <input type="number" min={0} max={23}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              value={pref.quietHoursStart}
              onChange={e => set({ quietHoursStart: +e.target.value })} />
            <span className="text-xs text-gray-400 ml-1">h</span>
          </div>
          <span className="text-gray-400 mt-4">—</span>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Đến</label>
            <input type="number" min={0} max={23}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              value={pref.quietHoursEnd}
              onChange={e => set({ quietHoursEnd: +e.target.value })} />
            <span className="text-xs text-gray-400 ml-1">h</span>
          </div>
        </div>
      </div>

      {/* Giới hạn/ngày */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Giới hạn thông báo mỗi ngày</h3>
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email tối đa</label>
            <input type="number" min={0} max={10}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              value={pref.maxDailyEmail}
              onChange={e => set({ maxDailyEmail: +e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Telegram tối đa</label>
            <input type="number" min={0} max={20}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              value={pref.maxDailyTelegram}
              onChange={e => set({ maxDailyTelegram: +e.target.value })} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary" size="md">
          {saving
            ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Đang lưu...</span>
            : <span className="flex items-center gap-2"><Save size={16} />Lưu cài đặt</span>
          }
        </Button>
      </div>
    </div>
  )
}

// ─── Tab: Thanh toán (Bank Info for VietQR) ──────────────────
type BankInfo = { bank_code: string; bank_account_number: string; bank_account_name: string }

const POPULAR_BANKS = [
  { code: 'MB', name: 'MB Bank' },
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'CTG', name: 'VietinBank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'MSB', name: 'MSB' },
  { code: 'OCB', name: 'OCB' },
]

// ─── Tab: Telegram ───────────────────────────────────────────
function TelegramTab() {
  const { user } = useAuthStore()
  const [chatId, setChatId] = useState('')
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [linked, setLinked] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/telegram/link').then(res => {
      const id = res.data?.data?.chatId ?? null
      setCurrentChatId(id)
      if (id) setChatId(id)
    }).catch(() => {})
  }, [])

  const handleLink = async () => {
    if (!chatId.trim()) { toast.error('Vui lòng nhập Chat ID'); return }
    setSaving(true)
    try {
      await api.post('/telegram/link', { chatId: chatId.trim() })
      setCurrentChatId(chatId.trim())
      setLinked(true)
      toast.success('Đã kết nối Telegram Bot với CLB!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Kết nối thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Kết nối Telegram Bot</h3>
        <p className="text-sm text-gray-500 mb-4">
          Liên kết bot <strong>MÍT ĐẶC BOT</strong> với CLB <strong>{user?.clubId ? `(CLB hiện tại)` : ''}</strong> để nhận thông báo và tra cứu quỹ qua Telegram.
        </p>

        {currentChatId ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
            <CheckCircle size={15} className="text-emerald-600 shrink-0" />
            <span className="text-sm text-emerald-700">
              Đang kết nối với Chat ID: <code className="font-mono font-semibold">{currentChatId}</code>
            </span>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
            <span className="text-sm text-amber-700">⚠️ CLB này chưa được kết nối với Telegram Bot.</span>
          </div>
        )}

        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-5 space-y-1.5">
          <p className="text-sm font-medium text-indigo-800">Hướng dẫn lấy Chat ID:</p>
          <ol className="text-sm text-indigo-700 space-y-1 list-decimal list-inside">
            <li>Mở Telegram, nhắn tin cho bot hoặc thêm bot vào nhóm CLB</li>
            <li>Gõ lệnh <code className="bg-indigo-100 px-1 rounded">/myid</code></li>
            <li>Bot trả về Chat ID — copy và dán vào ô bên dưới</li>
          </ol>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Chat ID</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="Ví dụ: -1001234567890 hoặc 123456789"
            value={chatId}
            onChange={e => { setChatId(e.target.value); setLinked(false) }}
          />
          {linked && (
            <p className="text-sm text-emerald-600 flex items-center gap-1.5">
              <CheckCircle size={14} /> Đã kết nối thành công!
            </p>
          )}
          <Button onClick={handleLink} disabled={saving || !chatId.trim()} className="w-full sm:w-auto">
            <Save size={14} className="mr-1.5" />
            {saving ? 'Đang lưu...' : currentChatId ? 'Cập nhật kết nối' : 'Kết nối Bot'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Các lệnh Bot hỗ trợ</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {[
            { cmd: '/status',    desc: 'Tổng quan CLB' },
            { cmd: '/balance',   desc: 'Số dư quỹ hiện tại' },
            { cmd: '/debt',      desc: 'Danh sách chưa đóng quỹ' },
            { cmd: '/brief',     desc: 'Báo cáo nhanh hôm nay' },
            { cmd: '/report',    desc: 'Báo cáo tuần' },
            { cmd: '/health',    desc: 'Điểm sức khỏe CLB' },
            { cmd: '/members',   desc: 'Thống kê thành viên' },
            { cmd: '/reminders', desc: 'Nhắc nhở hôm nay' },
            { cmd: '/myid',      desc: 'Lấy Chat ID của bạn' },
          ].map(({ cmd, desc }) => (
            <div key={cmd} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <code className="text-indigo-600 font-mono font-medium">{cmd}</code>
              <span className="text-gray-500">— {desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PaymentTab() {
  const [info, setInfo] = useState<BankInfo>({ bank_code: 'MB', bank_account_number: '', bank_account_name: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchInfo = useCallback(async () => {
    try {
      const res = await api.get('/system-settings')
      // API returns Record<string,string> (plain object), not array
      const d: Record<string, string> = res.data?.data ?? {}
      setInfo({
        bank_code: d['bank_code'] || 'MB',
        bank_account_number: d['bank_account_number'] ?? '',
        bank_account_name: d['bank_account_name'] ?? '',
      })
    } catch (err: any) {
      console.error('[PaymentTab] fetchInfo error:', err?.message)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchInfo() }, [fetchInfo])

  const set = (patch: Partial<BankInfo>) => setInfo(i => ({ ...i, ...patch }))

  const qrUrl = info.bank_account_number && info.bank_account_name
    ? `https://img.vietqr.io/image/${info.bank_code}-${info.bank_account_number}-compact2.jpg?accountName=${encodeURIComponent(info.bank_account_name)}&addInfo=Dong+quy+CLB`
    : null

  const handleSave = async () => {
    if (!info.bank_account_number || !info.bank_account_name) {
      toast.error('Vui lòng nhập đầy đủ thông tin ngân hàng')
      return
    }
    setSaving(true)
    try {
      await api.put('/system-settings', {
        bank_code: info.bank_code,
        bank_account_number: info.bank_account_number,
        bank_account_name: info.bank_account_name,
      })
      toast.success('Đã lưu thông tin thanh toán')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu thất bại')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Đang tải...</div>

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Tài khoản ngân hàng nhận tiền quỹ</h3>
        <p className="text-xs text-gray-500 mb-4">Dùng để tạo mã QR VietQR khi thu quỹ thành viên</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngân hàng</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={info.bank_code}
              onChange={e => set({ bank_code: e.target.value })}>
              {POPULAR_BANKS.map(b => <option key={b.code} value={b.code}>{b.name} ({b.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Số tài khoản <span className="text-red-500">*</span></label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
              placeholder="Ví dụ: 0123456789"
              value={info.bank_account_number}
              onChange={e => set({ bank_account_number: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên chủ tài khoản <span className="text-red-500">*</span></label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none uppercase"
              placeholder="VD: NGUYEN VAN A"
              value={info.bank_account_name}
              onChange={e => set({ bank_account_name: e.target.value.toUpperCase() })} />
            <p className="text-xs text-gray-400 mt-1">Nhập chữ hoa, không dấu — đúng như tên trên tài khoản ngân hàng</p>
          </div>
        </div>
      </div>

      {qrUrl && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Xem trước mã QR</h3>
          <div className="flex items-start gap-6">
            <img src={qrUrl} alt="VietQR preview" className="w-36 h-36 rounded-xl border border-gray-200 object-contain" />
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Ngân hàng:</span> {POPULAR_BANKS.find(b => b.code === info.bank_code)?.name}</p>
              <p><span className="font-medium">Số TK:</span> <span className="font-mono">{info.bank_account_number}</span></p>
              <p><span className="font-medium">Tên TK:</span> {info.bank_account_name}</p>
              <p className="text-xs text-gray-400 mt-2">QR này sẽ được dùng khi tạo phiếu thu quỹ cho thành viên</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary" size="md">
          {saving
            ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Đang lưu...</span>
            : <span className="flex items-center gap-2"><Save size={16} />Lưu thông tin</span>}
        </Button>
      </div>
    </div>
  )
}

// ─── Tab: Billing (SUPER_ADMIN only) ─────────────────────────
type PlanTier = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'
interface SubscriptionStatus {
  clubId: string
  tier: PlanTier
  plan: { name: string; maxMembers: number; priceMonthly: number; aiFeatures: boolean; telegramBot: boolean }
  expiresAt: string | null
  isActive: boolean
  daysRemaining: number | null
  usage: { members: number }
}

function BillingTab() {
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([])
  const [selected, setSelected] = useState<string>('')
  const [sub, setSub] = useState<SubscriptionStatus | null>(null)
  const [upgradeForm, setUpgradeForm] = useState({ tier: 'STARTER' as PlanTier, months: 1 })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/clubs').then(r => {
      const list = r.data?.data ?? []
      setClubs(list)
      if (list.length > 0) setSelected(list[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    api.get(`/billing/subscription?clubId=${selected}`)
      .then(r => setSub(r.data?.data ?? null))
      .catch(() => setSub(null))
      .finally(() => setLoading(false))
  }, [selected])

  const handleUpgrade = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await api.post('/billing/upgrade', { clubId: selected, tier: upgradeForm.tier, months: upgradeForm.months })
      toast.success('Nâng cấp thành công')
      const r = await api.get(`/billing/subscription?clubId=${selected}`)
      setSub(r.data?.data ?? null)
    } catch {
      toast.error('Nâng cấp thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Chọn CLB</h3>
        <select
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading && <div className="text-center text-sm text-slate-400">Đang tải...</div>}

      {!loading && sub && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Subscription hiện tại</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Gói:</span> <span className="font-medium">{sub.plan.name}</span></div>
            <div><span className="text-slate-500">Trạng thái:</span> <span className={sub.isActive ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>{sub.isActive ? 'Hoạt động' : 'Hết hạn'}</span></div>
            <div><span className="text-slate-500">Thành viên:</span> {sub.usage.members} / {sub.plan.maxMembers}</div>
            <div><span className="text-slate-500">Còn lại:</span> {sub.daysRemaining != null ? `${sub.daysRemaining} ngày` : 'Không giới hạn'}</div>
            <div><span className="text-slate-500">AI:</span> {sub.plan.aiFeatures ? '✓' : '✗'}</div>
            <div><span className="text-slate-500">Telegram:</span> {sub.plan.telegramBot ? '✓' : '✗'}</div>
            {sub.expiresAt && <div className="col-span-2"><span className="text-slate-500">Hết hạn:</span> {new Date(sub.expiresAt).toLocaleDateString('vi-VN')}</div>}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Nâng cấp gói</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Gói</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={upgradeForm.tier}
              onChange={e => setUpgradeForm(p => ({ ...p, tier: e.target.value as PlanTier }))}
            >
              {(['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as PlanTier[]).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Số tháng</label>
            <input
              type="number"
              min={1}
              max={24}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={upgradeForm.months}
              onChange={e => setUpgradeForm(p => ({ ...p, months: parseInt(e.target.value) || 1 }))}
            />
          </div>
        </div>
        <Button onClick={handleUpgrade} disabled={saving || !selected} className="w-full">
          {saving ? 'Đang lưu...' : 'Xác nhận nâng cấp'}
        </Button>
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────
export function Settings() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const tabs = ALL_TABS.filter(t => !t.superAdminOnly || isSuperAdmin)
  const [activeTab, setActiveTab] = useState<Tab>('club')
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3">
          <p className="text-[15px] font-bold text-slate-800">Cài đặt</p>
          <p className="text-[11px] text-slate-400">Quản lý thông tin CLB và tài khoản</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white border-b border-slate-100 px-3 py-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2 py-2 text-[12px] font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-white shadow-sm'
                  : 'text-slate-500 bg-slate-50'
              )}
              style={activeTab === tab.id ? { background: 'linear-gradient(135deg,#4F46E5,#06B6D4)' } : {}}>
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="px-4 py-4 space-y-4">
          {activeTab === 'club'          && <ClubInfoTab clubId={clubId} />}
          {activeTab === 'account'       && <AccountTab />}
          {activeTab === 'notifications' && <NotificationsTab clubId={clubId} />}
          {activeTab === 'payment'       && <PaymentTab />}
          {activeTab === 'telegram'      && <TelegramTab />}
          {activeTab === 'billing'       && <BillingTab />}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Cài đặt" subtitle="Quản lý thông tin CLB và tài khoản" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl">
        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}>
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'club'          && <ClubInfoTab clubId={clubId} />}
        {activeTab === 'account'       && <AccountTab />}
        {activeTab === 'notifications' && <NotificationsTab clubId={clubId} />}
        {activeTab === 'payment'       && <PaymentTab />}
      </div>
    </div>
  )
}
