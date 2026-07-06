/**
 * Onboarding (03) — tạo CLB mới theo stepper: Thông tin CLB → Tài khoản admin → Hoàn tất.
 * SUPER_ADMIN. Tái dụng POST /clubs (tạo Club + CLUB_ADMIN Argon2, mustChangePassword).
 * V2.2 Clean Modern SaaS. Validation thân thiện.
 */
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Building2, UserCog, PartyPopper } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const STEPS = ['Thông tin CLB', 'Tài khoản admin', 'Hoàn tất'] as const

interface FormState {
  name: string
  code: string
  address: string
  contactEmail: string
  contactPhone: string
  adminUsername: string
  adminEmail: string
  adminPassword: string
}

const EMPTY: FormState = {
  name: '', code: '', address: '', contactEmail: '', contactPhone: '',
  adminUsername: '', adminEmail: '', adminPassword: '',
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const isLocal = (s: string) => /\.local$/i.test(s.trim())

export function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(false)

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const step1Valid = form.name.trim().length >= 2
  const step2Valid =
    form.adminUsername.trim().length >= 3 &&
    isEmail(form.adminEmail) &&
    !isLocal(form.adminEmail) &&
    form.adminPassword.length >= 6

  const submit = async () => {
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        ...(form.code.trim() ? { code: form.code.trim() } : {}),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        ...(form.contactEmail.trim() ? { contactEmail: form.contactEmail.trim() } : {}),
        ...(form.contactPhone.trim() ? { contactPhone: form.contactPhone.trim() } : {}),
        adminUsername: form.adminUsername.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
      }
      await api.post('/clubs', payload)
      setCreated(true)
      setStep(2)
      toast.success(`Đã tạo CLB ${form.name}`)
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: unknown } } }).response?.data?.message
          : undefined
      toast.error(typeof msg === 'string' ? msg : 'Tạo CLB thất bại. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold [color:var(--pf-text)]">Tạo CLB mới</h1>
        <p className="mt-0.5 text-sm [color:var(--pf-color-muted)]">Thiết lập câu lạc bộ và tài khoản quản trị trong vài bước.</p>
      </div>

      {/* Stepper */}
      <div className="mb-6 flex items-center">
        {STEPS.map((label, i) => {
          const done = i < step || (created && i <= step)
          const active = i === step
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors"
                  style={
                    done
                      ? { background: 'var(--pf-primary)', color: '#fff' }
                      : active
                        ? { background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)', border: '2px solid var(--pf-primary)' }
                        : { background: 'var(--pf-surface-muted)', color: 'var(--pf-color-muted)' }
                  }
                >
                  {done ? <Check size={15} /> : i + 1}
                </span>
                <span className="hidden text-sm font-medium sm:block" style={{ color: active || done ? 'var(--pf-text)' : 'var(--pf-color-muted)' }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="mx-2 h-0.5 flex-1 rounded-full" style={{ background: i < step ? 'var(--pf-primary)' : 'var(--pf-border)' }} />
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border p-5 [background:var(--pf-surface)] [border-color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
        {/* Step 1 — CLB info */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Building2 size={16} style={{ color: 'var(--pf-primary)' }} /> Thông tin câu lạc bộ</div>
            <Field label="Tên CLB *" value={form.name} onChange={(v) => set('name', v)} placeholder="VD: CLB The Ping" />
            <Field label="Mã CLB (tuỳ chọn)" value={form.code} onChange={(v) => set('code', v)} placeholder="VD: THEPING" />
            <Field label="Địa chỉ" value={form.address} onChange={(v) => set('address', v)} placeholder="Sân / địa điểm sinh hoạt" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Email liên hệ" value={form.contactEmail} onChange={(v) => set('contactEmail', v)} placeholder="clb@email.com" />
              <Field label="Điện thoại" value={form.contactPhone} onChange={(v) => set('contactPhone', v)} placeholder="09xx xxx xxx" />
            </div>
            <div className="flex justify-end">
              <StepButton disabled={!step1Valid} onClick={() => setStep(1)}>Tiếp tục <ChevronRight size={16} /></StepButton>
            </div>
          </div>
        )}

        {/* Step 2 — Admin account */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><UserCog size={16} style={{ color: 'var(--pf-primary)' }} /> Tài khoản quản trị CLB</div>
            <p className="rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
              Admin bắt buộc có email cá nhân thật (để gửi thông báo cho thành viên). Mật khẩu khởi tạo sẽ được yêu cầu đổi ở lần đăng nhập đầu.
            </p>
            <Field label="Tên đăng nhập *" value={form.adminUsername} onChange={(v) => set('adminUsername', v.trim())} placeholder="VD: admin_theping" />
            <Field
              label="Email admin *"
              value={form.adminEmail}
              onChange={(v) => set('adminEmail', v)}
              placeholder="admin@email.com"
              error={form.adminEmail.length > 0 && (!isEmail(form.adminEmail) || isLocal(form.adminEmail)) ? 'Email không hợp lệ (không dùng đuôi .local).' : undefined}
            />
            <Field
              label="Mật khẩu khởi tạo *"
              type="password"
              value={form.adminPassword}
              onChange={(v) => set('adminPassword', v)}
              placeholder="Tối thiểu 6 ký tự"
              error={form.adminPassword.length > 0 && form.adminPassword.length < 6 ? 'Mật khẩu tối thiểu 6 ký tự.' : undefined}
            />
            <div className="flex justify-between">
              <StepButton variant="ghost" onClick={() => setStep(0)}><ChevronLeft size={16} /> Quay lại</StepButton>
              <StepButton disabled={!step2Valid || saving} onClick={submit}>{saving ? 'Đang tạo…' : 'Tạo CLB'}</StepButton>
            </div>
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 2 && created && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--pf-primary-soft)', color: 'var(--pf-primary)' }}>
              <PartyPopper size={26} />
            </div>
            <p className="text-lg font-bold [color:var(--pf-text)]">Đã tạo CLB {form.name}!</p>
            <p className="max-w-sm text-sm [color:var(--pf-color-muted)]">
              Admin đăng nhập bằng <span className="font-semibold [color:var(--pf-text)]">{form.adminUsername}</span> và mật khẩu vừa đặt, sẽ được yêu cầu đổi mật khẩu ở lần đầu.
            </p>
            <div className="mt-2 flex gap-2">
              <StepButton variant="ghost" onClick={() => { setForm(EMPTY); setCreated(false); setStep(0) }}>Tạo CLB khác</StepButton>
              <StepButton onClick={() => navigate('/super/clubs')}>Về danh sách CLB</StepButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, type = 'text', error,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; error?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold [color:var(--pf-color-muted)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl border px-3 text-sm [background:var(--pf-surface)] [color:var(--pf-text)] placeholder:[color:var(--pf-color-muted)] focus:outline-none focus:[box-shadow:0_0_0_3px_var(--pf-focus-ring)]"
        style={{ borderColor: error ? 'var(--pf-color-danger)' : 'var(--pf-border)' }}
      />
      {error && <span className="text-xs" style={{ color: 'var(--pf-color-danger)' }}>{error}</span>}
    </label>
  )
}

function StepButton({
  children, onClick, disabled, variant = 'primary',
}: {
  children: ReactNode; onClick: () => void; disabled?: boolean; variant?: 'primary' | 'ghost'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
      style={
        variant === 'primary'
          ? { background: 'var(--pf-primary)', color: '#fff', boxShadow: 'var(--pf-shadow)' }
          : { border: '1px solid var(--pf-border)', background: 'var(--pf-surface)', color: 'var(--pf-text)' }
      }
    >
      {children}
    </button>
  )
}
