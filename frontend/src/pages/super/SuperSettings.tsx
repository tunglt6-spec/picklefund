import { useState, useEffect } from 'react'
import { confirmDialog, promptDialog } from '../../components/ui/ConfirmHost'
import { Save, Shield, Globe, Bell, Database, KeyRound, Eye, EyeOff, CheckCircle, CalendarClock } from 'lucide-react'
import { PageShell, PageHeader } from '../../components/shared'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../store/authStore'
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
  superTelegramChatId: string
  renewalEnabled: boolean
  renewalCadence: string
  bankCode: string
  bankAccount: string
  bankName: string
  contact: string
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
  superTelegramChatId: '',
  renewalEnabled: false,
  renewalCadence: 'BOTH',
  bankCode: '',
  bankAccount: '',
  bankName: '',
  contact: '',
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
    superTelegramChatId: raw.superTelegramChatId ?? DEFAULTS.superTelegramChatId,
    renewalEnabled: raw.renewal_reminder_enabled === 'true',
    renewalCadence: raw.renewal_reminder_cadence || 'BOTH',
    bankCode: raw.platform_bank_code ?? '',
    bankAccount: raw.platform_bank_account_number ?? '',
    bankName: raw.platform_bank_account_name ?? '',
    contact: raw.platform_contact ?? '',
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
    superTelegramChatId: s.superTelegramChatId,
    renewal_reminder_enabled: String(s.renewalEnabled),
    renewal_reminder_cadence: s.renewalCadence,
    platform_bank_code: s.bankCode.trim().toUpperCase(),
    platform_bank_account_number: s.bankAccount.trim(),
    platform_bank_account_name: s.bankName.trim().toUpperCase(),
    platform_contact: s.contact.trim(),
  }
}

// Component định nghĩa ở MODULE SCOPE (không trong render) — nếu không sẽ bị tạo lại mỗi
// render → input remount → mất focus khi gõ. (Sửa cả bug pre-existing của trang này.)
const S = ({ id, label, type = 'text', value, onChange, placeholder = '' }: {
  id: string; label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string
}) => (
  <div>
    <label htmlFor={`ss-${id}`} className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">{label}</label>
    <input id={`ss-${id}`} type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} className="input-base" />
  </div>
)

const Toggle = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between py-3 border-b border-[color:var(--pf-border)] last:border-0">
    <div>
      <p className="text-sm font-medium [color:var(--pf-text)]">{label}</p>
      <p className="text-xs [color:var(--pf-color-muted)]">{desc}</p>
    </div>
    <button onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${value ? '[background:var(--pf-primary)]' : '[background:var(--pf-border)]'}`}>
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 [background:var(--pf-surface)] rounded-full shadow-sm transition-transform duration-300 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
)

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="pf-glass-strong rounded-xl overflow-hidden">
    <div className="px-5 py-3.5 border-b border-[color:var(--pf-border)] flex items-center gap-2.5">
      <div className="h-7 w-7 rounded-lg [background:var(--pf-primary-soft)] flex items-center justify-center">{icon}</div>
      <h3 className="text-sm font-semibold [color:var(--pf-text)]">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
)

export function SuperSettings() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [tgBusy, setTgBusy] = useState(false)
  const [renewBusy, setRenewBusy] = useState(false)

  /** Lưu cấu hình rồi chạy nhắc gia hạn ngay cho mọi CLB đến mốc (chống nhắc trùng theo mốc). */
  const runRenewalNow = async () => {
    if (!(await confirmDialog({ title: 'Gửi nhắc gia hạn thật?', message: 'Thao tác sẽ LƯU cài đặt đang sửa và gửi thông báo THẬT (chuông, email, Telegram) tới Admin các CLB đến mốc nhắc. Mỗi mốc chỉ gửi 1 lần.', confirmLabel: 'Lưu và gửi' }))) return
    setRenewBusy(true)
    const t = toast.loading('Đang quét và gửi nhắc gia hạn…')
    try {
      await api.put('/system-settings', toApi(settings))
      const res = await api.post('/billing/renewal-reminders/run', {})
      const d = res.data?.data
      toast.dismiss(t)
      toast.success(`Đã nhắc ${d?.reminded ?? 0}/${d?.clubs ?? 0} CLB — chuông ${d?.sent?.inApp ?? 0}, email ${d?.sent?.email ?? 0}, Telegram ${d?.sent?.telegram ?? 0}${d?.failed ? `, lỗi ${d.failed}` : ''}`, { duration: 7000 })
    } catch (e: any) {
      toast.dismiss(t)
      toast.error(e?.response?.data?.message ?? 'Chạy nhắc gia hạn thất bại')
    } finally { setRenewBusy(false) }
  }

  /** Tách 1 chat id dùng chung khỏi mọi CLB + xóa pref trùng (chấm dứt việc nhiều CLB chung 1 chat). */
  const detachSharedChat = async () => {
    const chatId = (await promptDialog('Tách chat khỏi mọi CLB', 'Nhập Chat ID cần tách khỏi tất cả CLB (vd 455750167)', '455750167'))?.trim()
    if (!chatId) return
    if (!(await confirmDialog({ title: 'Tách chat khỏi mọi CLB?', message: `Tách chat ${chatId} khỏi mọi CLB? Các CLB đó sẽ ngừng nhận Telegram cho tới khi liên kết chat riêng.`, confirmLabel: 'Tách', variant: 'warning' }))) return
    const t = toast.loading('Đang tách chat…')
    try {
      const res = await api.post('/telegram/detach', { chatId })
      const d = res.data?.data ?? res.data
      toast.dismiss(t)
      toast.success(`Đã tách: gỡ ${d?.unlinkedClubs ?? 0} liên kết CLB, xóa ${d?.clearedPrefs ?? 0} pref.`)
    } catch (e: any) {
      toast.dismiss(t); toast.error(e?.response?.data?.message ?? 'Tách chat thất bại')
    }
  }

  /** Kiểm tra kết nối Telegram: lưu Chat ID hiện tại → gọi backend gửi tin thử → hiện kết quả. */
  const testTelegram = async () => {
    setTgBusy(true)
    const t = toast.loading('Đang gửi thử Telegram…')
    try {
      // Lưu Chat ID trước (backend đọc từ cài đặt đã lưu). upsert theo key — không xóa key khác.
      await api.put('/system-settings', { superTelegramChatId: settings.superTelegramChatId })
      const res = await api.post('/account-notify/telegram-test')
      const d = res.data?.data ?? res.data
      toast.dismiss(t)
      if (d?.ok) toast.success('Đã gửi tin thử — kiểm tra Telegram của bạn.')
      else toast.error(`Chưa gửi được: ${d?.error ?? 'không rõ nguyên nhân'}`, { duration: 7000 })
    } catch (e: any) {
      toast.dismiss(t)
      toast.error(e?.response?.data?.message ?? 'Không gọi được kiểm tra Telegram')
    } finally {
      setTgBusy(false)
    }
  }

  // Đổi mật khẩu cá nhân (đồng nhất với màn Cài đặt của admin CLB) — PATCH /auth/change-password.
  const [pw, setPw] = useState({ old: '', new: '', confirm: '' })
  const [showPw, setShowPw] = useState({ old: false, new: false, confirm: false })
  const [savingPw, setSavingPw] = useState(false)

  const handleChangePw = async () => {
    if (!pw.old || !pw.new || !pw.confirm)
      return toast.error('Vui lòng điền đầy đủ thông tin')
    if (pw.new.length < 6)
      return toast.error('Mật khẩu mới phải tối thiểu 6 ký tự')
    if (pw.new !== pw.confirm)
      return toast.error('Mật khẩu xác nhận không khớp')
    setSavingPw(true)
    try {
      await api.patch('/auth/change-password', {
        oldPassword: pw.old,
        newPassword: pw.new,
      })
      setPw({ old: '', new: '', confirm: '' })
      toast.success('Đã đổi mật khẩu thành công')
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Đổi mật khẩu thất bại'
      toast.error(msg)
    } finally {
      setSavingPw(false)
    }
  }

  useEffect(() => {
    api.get('/system-settings')
      .then(r => setSettings(fromApi(r.data.data)))
      .catch(() => toast.error('Không thể tải cài đặt'))
      .finally(() => setLoading(false))
  }, [])

  const validate = (): string | null => {
    for (const [k, v] of [['Số CLB tối đa', settings.maxClubs], ['Thành viên/CLB tối đa', settings.maxMembersPerClub], ['Thời gian hết phiên', settings.sessionTimeoutMinutes]] as const) {
      if (!/^\d{1,6}$/.test(v) || Number(v) < 1) return `${k} phải là số nguyên dương`
    }
    if (settings.supportEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(settings.supportEmail)) return 'Email hỗ trợ không hợp lệ'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { toast.error(err); return }
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

  if (loading) return (
    <PageShell maxWidth={1280}>
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 rounded-full border-2 [border-color:var(--pf-primary)] border-t-transparent animate-spin" />
      </div>
    </PageShell>
  )

  return (
    <PageShell maxWidth={1280}>
      <PageHeader
        title="Cài đặt hệ thống"
        subtitle="Cấu hình toàn bộ nền tảng PickleFund"
        actions={
          <Button onClick={handleSave} disabled={saving}>
            <Save size={14} />{saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </Button>
        }
      />

      <div className="space-y-5">
        <Section icon={<Globe size={14} className="[color:var(--pf-primary-text)]" />} title="Thông tin hệ thống">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <S id="siteName" label="Tên nền tảng" value={settings.siteName} onChange={v => setSettings(p => ({ ...p, siteName: v }))} />
            <S id="email" label="Email hỗ trợ" type="email" value={settings.supportEmail} onChange={v => setSettings(p => ({ ...p, supportEmail: v }))} />
            <S id="maxClubs" label="Số CLB tối đa" type="number" value={settings.maxClubs} onChange={v => setSettings(p => ({ ...p, maxClubs: v }))} />
            <S id="maxMembers" label="Thành viên/CLB tối đa" type="number" value={settings.maxMembersPerClub} onChange={v => setSettings(p => ({ ...p, maxMembersPerClub: v }))} />
          </div>
        </Section>

        <Section icon={<Shield size={14} className="[color:var(--pf-primary-text)]" />} title="Bảo mật & Phiên đăng nhập">
          <div className="space-y-4">
            <S id="timeout" label="Thời gian hết phiên (phút)" type="number" value={settings.sessionTimeoutMinutes} onChange={v => setSettings(p => ({ ...p, sessionTimeoutMinutes: v }))} />
            <Toggle label="Xác minh email bắt buộc" desc="Người dùng mới phải xác minh email trước khi đăng nhập"
              value={settings.requireEmailVerification}
              onChange={v => setSettings(p => ({ ...p, requireEmailVerification: v }))} />
          </div>
        </Section>

        <Section icon={<Bell size={14} className="[color:var(--pf-primary-text)]" />} title="Thông báo & Đăng ký">
          <div>
            <Toggle label="Thông báo email hệ thống" desc="Gửi email khi có sự kiện quan trọng (lỗi, đăng ký mới...)"
              value={settings.emailNotifications}
              onChange={v => setSettings(p => ({ ...p, emailNotifications: v }))} />
            <Toggle label="Mở đăng ký CLB mới" desc="Cho phép tổ chức đăng ký CLB mới qua trang công khai"
              value={settings.registrationOpen}
              onChange={v => setSettings(p => ({ ...p, registrationOpen: v }))} />
            <div className="mt-4">
              <S id="superTgChat" label="Telegram Chat ID (Super Admin)" value={settings.superTelegramChatId}
                onChange={v => setSettings(p => ({ ...p, superTelegramChatId: v }))}
                placeholder="VD: 123456789 — nhắn /myid cho bot để lấy" />
              <p className="text-xs [color:var(--pf-color-muted)] mt-1">Nhận thông báo biến động hệ thống qua Telegram. Để trống = tắt kênh này. Bạn phải <b>/start</b> bot trước để bot được phép nhắn.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={testTelegram} disabled={tgBusy || !settings.superTelegramChatId}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold [color:var(--pf-primary-text)] border-[color:var(--pf-border)] hover:[background:var(--pf-surface-muted)] disabled:opacity-60">
                  {tgBusy ? 'Đang gửi…' : 'Gửi thử Telegram'}
                </button>
                <button type="button" onClick={detachSharedChat}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold [color:var(--pf-color-warning)] [border-color:var(--pf-color-warning)] hover:[background:var(--pf-color-warning-soft)]">
                  Tách chat dùng chung khỏi CLB
                </button>
              </div>
            </div>
          </div>
        </Section>

        <Section icon={<CalendarClock size={14} className="[color:var(--pf-primary-text)]" />} title="Nhắc gia hạn gói tự động">
          <div className="space-y-4">
            <Toggle label="Tự động nhắc gia hạn" desc="Mỗi sáng 08:30: CLB trả phí đủ tháng/quý kể từ ngày mở tài khoản và gói sắp hết hạn (≤35 ngày) hoặc đã hết hạn sẽ được nhắc qua chuông, email, Telegram kèm mã QR"
              value={settings.renewalEnabled} onChange={v => setSettings(p => ({ ...p, renewalEnabled: v }))} />
            <div>
              <label htmlFor="ss-cadence" className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Mốc nhắc</label>
              <select id="ss-cadence" className="input-base" value={settings.renewalCadence} onChange={e => setSettings(p => ({ ...p, renewalCadence: e.target.value }))}>
                <option value="BOTH">Mỗi tháng (mốc quý đề nghị gia hạn 3 tháng)</option>
                <option value="MONTH">Mỗi tháng</option>
                <option value="QUARTER">Chỉ mỗi quý</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <S id="bankCode" label="Mã ngân hàng nhận" value={settings.bankCode} onChange={v => setSettings(p => ({ ...p, bankCode: v }))} placeholder="VD: TPB, VCB, MB" />
              <S id="bankAcc" label="Số tài khoản" value={settings.bankAccount} onChange={v => setSettings(p => ({ ...p, bankAccount: v }))} />
              <S id="bankName" label="Chủ tài khoản" value={settings.bankName} onChange={v => setSettings(p => ({ ...p, bankName: v }))} placeholder="TÊN KHÔNG DẤU" />
            </div>
            <S id="contact" label="Liên hệ hỗ trợ (hiện trong thông báo)" value={settings.contact} onChange={v => setSettings(p => ({ ...p, contact: v }))} placeholder="VD: Zalo/SĐT/email của Super Admin" />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={runRenewalNow} disabled={renewBusy || !settings.bankCode || !settings.bankAccount || !settings.bankName}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold [color:var(--pf-primary-text)] border-[color:var(--pf-border)] disabled:opacity-50">
                {renewBusy ? 'Đang gửi…' : 'Lưu và chạy nhắc ngay'}
              </button>
              <p className="text-xs [color:var(--pf-color-muted)]">Thông báo gửi tới Admin của từng CLB; mỗi mốc chỉ nhắc 1 lần. Cần điền đủ tài khoản nhận mới gửi được.</p>
            </div>
          </div>
        </Section>

        <Section icon={<Database size={14} className="[color:var(--pf-primary-text)]" />} title="Hệ thống & Backup">
          <div>
            <Toggle label="Tự động backup dữ liệu" desc="Backup toàn bộ dữ liệu lúc 2:00 AM mỗi ngày"
              value={settings.autoBackup}
              onChange={v => setSettings(p => ({ ...p, autoBackup: v }))} />
            <Toggle label="Chế độ bảo trì" desc="Tạm khóa truy cập người dùng để thực hiện bảo trì hệ thống"
              value={settings.maintenanceMode}
              onChange={v => setSettings(p => ({ ...p, maintenanceMode: v }))} />
          </div>
        </Section>

        <Section icon={<KeyRound size={14} className="[color:var(--pf-primary-text)]" />} title="Tài khoản & Mật khẩu">
          <div className="space-y-4 max-w-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="f-SuperSettings-1" className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Tên đăng nhập</label>
                <input id="f-SuperSettings-1" className="input-base [background:var(--pf-surface-muted)] [color:var(--pf-color-muted)] cursor-not-allowed" value={user?.username ?? ''} readOnly />
              </div>
              <div>
                <label htmlFor="f-SuperSettings-2" className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">Email</label>
                <input id="f-SuperSettings-2" className="input-base [background:var(--pf-surface-muted)] [color:var(--pf-color-muted)] cursor-not-allowed" value={user?.email ?? ''} readOnly />
              </div>
            </div>
            {([
              { label: 'Mật khẩu hiện tại', key: 'old' as const },
              { label: 'Mật khẩu mới', key: 'new' as const },
              { label: 'Xác nhận mật khẩu mới', key: 'confirm' as const },
            ]).map(f => (
              <div key={f.key}>
                <label htmlFor={`ss-pw-${f.key}`} className="block text-xs font-medium [color:var(--pf-text)] mb-1.5">{f.label}</label>
                <div className="relative">
                  <input
                    id={`ss-pw-${f.key}`}
                    type={showPw[f.key] ? 'text' : 'password'}
                    className="input-base pr-10"
                    value={pw[f.key]}
                    onChange={e => setPw(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPw(s => ({ ...s, [f.key]: !s[f.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 [color:var(--pf-color-muted)] hover:[color:var(--pf-color-muted)]">
                    {showPw[f.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}
            {pw.new && pw.confirm && (
              <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ background: pw.new === pw.confirm ? 'var(--pf-color-success-soft)' : 'var(--pf-color-danger-soft)', color: pw.new === pw.confirm ? 'var(--pf-color-success)' : 'var(--pf-color-danger)' }}>
                <CheckCircle size={14} />
                {pw.new === pw.confirm ? 'Mật khẩu khớp' : 'Mật khẩu không khớp'}
              </div>
            )}
            <Button onClick={handleChangePw} disabled={savingPw}>
              <KeyRound size={14} />{savingPw ? 'Đang lưu...' : 'Đổi mật khẩu'}
            </Button>
          </div>
        </Section>

        <div className="[background:var(--pf-color-muted-soft)] rounded-xl p-4 text-xs [color:var(--pf-color-muted)] space-y-1">
          <div className="flex justify-between"><span>Phiên bản</span><span className="font-mono font-semibold [color:var(--pf-text)]">v{__APP_VERSION__}</span></div>
          <div className="flex justify-between"><span>Môi trường</span><span className="font-mono" style={{ color: 'var(--pf-color-success)' }}>{import.meta.env.PROD ? 'production' : 'development'}</span></div>
          <div className="flex justify-between"><span>Build</span><span className="font-mono [color:var(--pf-color-muted)]">{__BUILD_DATE__}</span></div>
        </div>
      </div>
    </PageShell>
  )
}
