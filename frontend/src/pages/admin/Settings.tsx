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
  { id: 'club',          label: 'ThÃ´ng tin CLB', icon: <Building2 size={16} /> },
  { id: 'account',       label: 'TÃ i khoáº£n',     icon: <User size={16} /> },
  { id: 'notifications', label: 'ThÃ´ng bÃ¡o',     icon: <Bell size={16} /> },
]

const emptySettings: ClubSettings = {
  name: '', code: '', address: '', contactPhone: '', contactEmail: '',
  description: '', maxMembers: '', defaultContribution: '', defaultSessions: '',
}

// â”€â”€â”€ Tab: ThÃ´ng tin CLB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      toast.success('ÄÃ£ lÆ°u thÃ´ng tin CLB')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'LÆ°u thÃ´ng tin CLB tháº¥t báº¡i')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">ThÃ´ng tin cÆ¡ báº£n</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">TÃªn CLB <span className="text-red-500">*</span></label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={form.name}
              onChange={e => set({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">MÃ£ CLB</label>
            <input
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              value={form.code}
              readOnly
            />
            <p className="text-xs text-gray-400 mt-1">KhÃ´ng thá»ƒ thay Ä‘á»•i sau khi táº¡o</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Äá»‹a chá»‰</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={form.address}
              onChange={e => set({ address: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sá»‘ Ä‘iá»‡n thoáº¡i</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={form.contactPhone}
              onChange={e => set({ contactPhone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email liÃªn há»‡</label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={form.contactEmail}
              onChange={e => set({ contactEmail: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">MÃ´ táº£ CLB</label>
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
        <h3 className="font-semibold text-gray-900 mb-4">CÃ i Ä‘áº·t quá»¹ máº·c Ä‘á»‹nh</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sá»‘ thÃ nh viÃªn tá»‘i Ä‘a</label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={form.maxMembers}
              onChange={e => set({ maxMembers: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Má»©c Ä‘Ã³ng quá»¹ máº·c Ä‘á»‹nh (â‚«)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={form.defaultContribution}
              onChange={e => set({ defaultContribution: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">Ãp dá»¥ng khi táº¡o ká»³ quá»¹ má»›i</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sá»‘ buá»•i dá»± kiáº¿n/ká»³</label>
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
            <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Äang lÆ°u...</span>
          ) : (
            <span className="flex items-center gap-2"><Save size={16} />LÆ°u thay Ä‘á»•i</span>
          )}
        </Button>
      </div>
    </div>
  )
}

// â”€â”€â”€ Tab: TÃ i khoáº£n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AccountTab() {
  const { user } = useAuthStore()
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pw, setPw] = useState({ old: '', new: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  const handleChangePw = async () => {
    if (!pw.old || !pw.new || !pw.confirm) return toast.error('Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ thÃ´ng tin')
    if (pw.new.length < 6) return toast.error('Máº­t kháº©u má»›i pháº£i tá»‘i thiá»ƒu 6 kÃ½ tá»±')
    if (pw.new !== pw.confirm) return toast.error('Máº­t kháº©u xÃ¡c nháº­n khÃ´ng khá»›p')
    setSaving(true)
    try {
      await api.patch('/auth/change-password', { oldPassword: pw.old, newPassword: pw.new })
      setPw({ old: '', new: '', confirm: '' })
      toast.success('ÄÃ£ Ä‘á»•i máº­t kháº©u thÃ nh cÃ´ng')
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Äá»•i máº­t kháº©u tháº¥t báº¡i'
      toast.error(msg)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">ThÃ´ng tin tÃ i khoáº£n</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">TÃªn Ä‘Äƒng nháº­p</label>
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
        <h3 className="font-semibold text-gray-900 mb-4">Äá»•i máº­t kháº©u</h3>
        <div className="space-y-4 max-w-md">
          {[
            { label: 'Máº­t kháº©u hiá»‡n táº¡i',    key: 'old' as const, show: showOld,     toggle: () => setShowOld(v => !v) },
            { label: 'Máº­t kháº©u má»›i',         key: 'new' as const, show: showNew,     toggle: () => setShowNew(v => !v) },
            { label: 'XÃ¡c nháº­n máº­t kháº©u má»›i', key: 'confirm' as const, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
              <div className="relative">
                <input
                  type={field.show ? 'text' : 'password'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={pw[field.key]}
                  onChange={e => setPw(p => ({ ...p, [field.key]: e.target.value }))}
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
              {pw.new === pw.confirm ? 'Máº­t kháº©u khá»›p' : 'Máº­t kháº©u khÃ´ng khá»›p'}
            </div>
          )}
          <Button onClick={handleChangePw} variant="primary" size="md">
            {saving
              ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Äang lÆ°u...</span>
              : <span className="flex items-center gap-2"><Save size={16} />Äá»•i máº­t kháº©u</span>
            }
          </Button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 p-5 md:p-6">
        <h3 className="font-semibold text-red-700 mb-1">VÃ¹ng nguy hiá»ƒm</h3>
        <p className="text-sm text-gray-500 mb-4">CÃ¡c thao tÃ¡c dÆ°á»›i Ä‘Ã¢y khÃ´ng thá»ƒ hoÃ n tÃ¡c.</p>
        <Button variant="danger" size="sm" onClick={() => toast.error('LiÃªn há»‡ Super Admin Ä‘á»ƒ xoÃ¡ tÃ i khoáº£n')}>
          YÃªu cáº§u xoÃ¡ tÃ i khoáº£n
        </Button>
      </div>
    </div>
  )
}

// â”€â”€â”€ Tab: ThÃ´ng bÃ¡o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type NotifKey = 'unpaidReminder' | 'fundLow' | 'newSession' | 'periodClosed' | 'memberJoined'

const notifSettings: { key: NotifKey; label: string; desc: string }[] = [
  { key: 'unpaidReminder', label: 'Nháº¯c nhá»Ÿ Ä‘Ã³ng quá»¹',  desc: 'Gá»­i nháº¯c nhá»Ÿ khi thÃ nh viÃªn chÆ°a Ä‘Ã³ng quá»¹ sau 3 ngÃ y ká»³ báº¯t Ä‘áº§u' },
  { key: 'fundLow',        label: 'Cáº£nh bÃ¡o quá»¹ tháº¥p',  desc: 'ThÃ´ng bÃ¡o khi sá»‘ dÆ° quá»¹ dÆ°á»›i 20% tá»•ng thu' },
  { key: 'newSession',     label: 'Buá»•i táº­p má»›i',        desc: 'ThÃ´ng bÃ¡o khi cÃ³ buá»•i táº­p má»›i Ä‘Æ°á»£c thÃªm vÃ o ká»³' },
  { key: 'periodClosed',   label: 'Chá»‘t ká»³ quá»¹',        desc: 'ThÃ´ng bÃ¡o khi quáº£n trá»‹ viÃªn chá»‘t ká»³ quá»¹' },
  { key: 'memberJoined',   label: 'ThÃ nh viÃªn má»›i',      desc: 'ThÃ´ng bÃ¡o khi cÃ³ thÃ nh viÃªn má»›i tham gia CLB' },
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
      toast.success('ÄÃ£ lÆ°u cÃ i Ä‘áº·t thÃ´ng bÃ¡o')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'LÆ°u cÃ i Ä‘áº·t thÃ´ng bÃ¡o tháº¥t báº¡i')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">TÃ¹y chá»‰nh thÃ´ng bÃ¡o</h3>
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
        <h3 className="font-semibold text-gray-900 mb-4">CÃ i Ä‘áº·t nháº¯c nhá»Ÿ</h3>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Sá»‘ ngÃ y sau ká»³ báº¯t Ä‘áº§u Ä‘á»ƒ gá»­i nháº¯c
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} max={30}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={reminderDays}
              onChange={e => setReminderDays(e.target.value)}
            />
            <span className="text-sm text-gray-500">ngÃ y</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="primary" size="md">
          {saving
            ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Äang lÆ°u...</span>
            : <span className="flex items-center gap-2"><Save size={16} />LÆ°u cÃ i Ä‘áº·t</span>
          }
        </Button>
      </div>
    </div>
  )
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          <p className="text-[15px] font-bold text-slate-800">CÃ i Ä‘áº·t</p>
          <p className="text-[11px] text-slate-400">Quáº£n lÃ½ thÃ´ng tin CLB vÃ  tÃ i khoáº£n</p>
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
      <PageHeader title="CÃ i Ä‘áº·t" subtitle="Quáº£n lÃ½ thÃ´ng tin CLB vÃ  tÃ i khoáº£n" />

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

