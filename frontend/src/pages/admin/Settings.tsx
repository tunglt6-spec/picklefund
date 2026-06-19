import { useState } from 'react'
import { Building2, User, Bell, Save, Eye, EyeOff, CheckCircle } from 'lucide-react'
import api from '../../lib/api'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { useClubDataStore } from '../../store/clubDataStore'
import type { ClubSettings } from '../../store/clubDataStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import toast from 'react-hot-toast'

type Tab = 'club' | 'account' | 'notifications'

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'club',          label: 'Thông tin CLB', icon: <Building2 size={16} /> },
  { id: 'account',       label: 'Tài khoản',     icon: <User size={16} /> },
  { id: 'notifications', label: 'Thông báo',     icon: <Bell size={16} /> },
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

// ─── Tab: Thông báo ──────────────────────────────────────────
type NotifKey = 'unpaidReminder' | 'fundLow' | 'newSession' | 'periodClosed' | 'memberJoined'

const notifSettings: { key: NotifKey; label: string; desc: string }[] = [
  { key: 'unpaidReminder', label: 'Nhắc nhở đóng quỹ',  desc: 'Gửi nhắc nhở khi thành viên chưa đóng quỹ sau 3 ngày kỳ bắt đầu' },
  { key: 'fundLow',        label: 'Cảnh báo quỹ thấp',  desc: 'Thông báo khi số dư quỹ dưới 20% tổng thu' },
  { key: 'newSession',     label: 'Buổi tập mới',        desc: 'Thông báo khi có buổi tập mới được thêm vào kỳ' },
  { key: 'periodClosed',   label: 'Chốt kỳ quỹ',        desc: 'Thông báo khi quản trị viên chốt kỳ quỹ' },
  { key: 'memberJoined',   label: 'Thành viên mới',      desc: 'Thông báo khi có thành viên mới tham gia CLB' },
]

function NotificationsTab({ clubId }: { clubId: string }) {
  const { getClubData, setClubSettings } = useClubDataStore()
  const saved = getClubData(clubId).settings
  const savedNotifs = (saved as any)?.notifSettings as Record<NotifKey, boolean> | undefined
  const [notifs, setNotifs] = useState<Record<NotifKey, boolean>>(savedNotifs ?? {
    unpaidReminder: true,
    fundLow: true,
    newSession: false,
    periodClosed: true,
    memberJoined: false,
  })
  const savedDays = (saved as any)?.reminderDays as string | undefined
  const [reminderDays, setReminderDays] = useState(savedDays ?? '3')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/clubs/${clubId}`, { notifSettings: notifs, reminderDays })
      const current = getClubData(clubId).settings ?? emptySettings
      setClubSettings(clubId, { ...current, notifSettings: notifs, reminderDays } as any)
      toast.success('Đã lưu cài đặt thông báo')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu cài đặt thông báo thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Tùy chỉnh thông báo</h3>
        <div className="space-y-4">
          {notifSettings.map(n => (
            <div key={n.key} className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{n.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
              </div>
              <button
                onClick={() => setNotifs(s => ({ ...s, [n.key]: !s[n.key] }))}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
                  notifs[n.key] ? 'bg-indigo-600' : 'bg-gray-200'
                )}
              >
                <span className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 mt-0.5',
                  notifs[n.key] ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Cài đặt nhắc nhở</h3>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Số ngày sau kỳ bắt đầu để gửi nhắc
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} max={30}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={reminderDays}
              onChange={e => setReminderDays(e.target.value)}
            />
            <span className="text-sm text-gray-500">ngày</span>
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

// ─── Main ────────────────────────────────────────────────────
export function Settings() {
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const [activeTab, setActiveTab] = useState<Tab>('club')
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3">
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
      </div>
    </div>
  )
}
