import { useState, useEffect } from 'react'
import { Save, Shield, Globe, Bell, Database } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'
import api from '../../lib/api'

type Settings = {
  siteName: string
  supportEmail: string
  maxClubs: string
  maxMembersPerClub: string
  sessionTimeoutMinutes: string
  maintenanceMode: boolean
  emailNotifications: boolean
  autoBackup: boolean
  registrationOpen: boolean
  requireEmailVerification: boolean
}

const DEFAULTS: Settings = {
  siteName: 'PickleFund',
  supportEmail: 'support@pickleballfund.vn',
  maxClubs: '500',
  maxMembersPerClub: '200',
  sessionTimeoutMinutes: '60',
  maintenanceMode: false,
  emailNotifications: true,
  autoBackup: true,
  registrationOpen: true,
  requireEmailVerification: false,
}

function fromApi(raw: Record<string, string>): Settings {
  return {
    siteName: raw.siteName ?? DEFAULTS.siteName,
    supportEmail: raw.supportEmail ?? DEFAULTS.supportEmail,
    maxClubs: raw.maxClubs ?? DEFAULTS.maxClubs,
    maxMembersPerClub: raw.maxMembersPerClub ?? DEFAULTS.maxMembersPerClub,
    sessionTimeoutMinutes: raw.sessionTimeoutMinutes ?? DEFAULTS.sessionTimeoutMinutes,
    maintenanceMode: raw.maintenanceMode === 'true',
    emailNotifications: raw.emailNotifications !== 'false',
    autoBackup: raw.autoBackup !== 'false',
    registrationOpen: raw.registrationOpen !== 'false',
    requireEmailVerification: raw.requireEmailVerification === 'true',
  }
}

function toApi(s: Settings): Record<string, string> {
  return {
    siteName: s.siteName,
    supportEmail: s.supportEmail,
    maxClubs: s.maxClubs,
    maxMembersPerClub: s.maxMembersPerClub,
    sessionTimeoutMinutes: s.sessionTimeoutMinutes,
    maintenanceMode: String(s.maintenanceMode),
    emailNotifications: String(s.emailNotifications),
    autoBackup: String(s.autoBackup),
    registrationOpen: String(s.registrationOpen),
    requireEmailVerification: String(s.requireEmailVerification),
  }
}

export function SuperSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULTS)

  useEffect(() => {
    api.get('/system-settings')
      .then(r => setSettings(fromApi(r.data.data)))
      .catch(() => toast.error('Không thể tải cài đặt'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.put('/system-settings', toApi(settings))
      setSettings(fromApi(res.data.data))
      toast.success('Đã lưu cài đặt hệ thống')
    } catch {
      toast.error('Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const S = ({ id: _id, label, type = 'text', value, onChange, placeholder = '' }: {
    id: string; label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string
  }) => (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="input-base" />
    </div>
  )

  const Toggle = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 ${value ? 'bg-indigo-600' : 'bg-slate-200'}`}>
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )

  const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">{icon}</div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="h-8 w-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title="Cài Đặt Hệ Thống"
        subtitle="Cấu hình toàn bộ nền tảng PickleFund"
        actions={
          <Button onClick={handleSave} disabled={saving}>
            <Save size={14} />{saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </Button>
        }
      />

      <div className="p-6 max-w-[800px] mx-auto space-y-5">
        <Section icon={<Globe size={14} className="text-indigo-500" />} title="Thông tin hệ thống">
          <div className="grid grid-cols-2 gap-4">
            <S id="siteName" label="Tên nền tảng" value={settings.siteName} onChange={v => setSettings(p => ({ ...p, siteName: v }))} />
            <S id="email" label="Email hỗ trợ" type="email" value={settings.supportEmail} onChange={v => setSettings(p => ({ ...p, supportEmail: v }))} />
            <S id="maxClubs" label="Số CLB tối đa" type="number" value={settings.maxClubs} onChange={v => setSettings(p => ({ ...p, maxClubs: v }))} />
            <S id="maxMembers" label="Thành viên/CLB tối đa" type="number" value={settings.maxMembersPerClub} onChange={v => setSettings(p => ({ ...p, maxMembersPerClub: v }))} />
          </div>
        </Section>

        <Section icon={<Shield size={14} className="text-indigo-500" />} title="Bảo mật & Phiên đăng nhập">
          <div className="space-y-4">
            <S id="timeout" label="Thời gian hết phiên (phút)" type="number" value={settings.sessionTimeoutMinutes} onChange={v => setSettings(p => ({ ...p, sessionTimeoutMinutes: v }))} />
            <Toggle label="Xác minh email bắt buộc" desc="Người dùng mới phải xác minh email trước khi đăng nhập"
              value={settings.requireEmailVerification}
              onChange={v => setSettings(p => ({ ...p, requireEmailVerification: v }))} />
          </div>
        </Section>

        <Section icon={<Bell size={14} className="text-indigo-500" />} title="Thông báo & Đăng ký">
          <div>
            <Toggle label="Thông báo email hệ thống" desc="Gửi email khi có sự kiện quan trọng (lỗi, đăng ký mới...)"
              value={settings.emailNotifications}
              onChange={v => setSettings(p => ({ ...p, emailNotifications: v }))} />
            <Toggle label="Mở đăng ký CLB mới" desc="Cho phép tổ chức đăng ký CLB mới qua trang công khai"
              value={settings.registrationOpen}
              onChange={v => setSettings(p => ({ ...p, registrationOpen: v }))} />
          </div>
        </Section>

        <Section icon={<Database size={14} className="text-indigo-500" />} title="Hệ thống & Backup">
          <div>
            <Toggle label="Tự động backup dữ liệu" desc="Backup toàn bộ dữ liệu lúc 2:00 AM mỗi ngày"
              value={settings.autoBackup}
              onChange={v => setSettings(p => ({ ...p, autoBackup: v }))} />
            <Toggle label="Chế độ bảo trì" desc="Tạm khóa truy cập người dùng để thực hiện bảo trì hệ thống"
              value={settings.maintenanceMode}
              onChange={v => setSettings(p => ({ ...p, maintenanceMode: v }))} />
          </div>
        </Section>

        <div className="bg-slate-100 rounded-xl p-4 text-xs text-slate-500 space-y-1">
          <div className="flex justify-between"><span>Phiên bản</span><span className="font-mono font-semibold text-slate-700">v2.1.0</span></div>
          <div className="flex justify-between"><span>Môi trường</span><span className="font-mono text-emerald-600">development</span></div>
          <div className="flex justify-between"><span>Build</span><span className="font-mono text-slate-600">2026-06-17</span></div>
        </div>
      </div>
    </div>
  )
}
