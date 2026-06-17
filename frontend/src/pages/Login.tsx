import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, type Easing } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import {
  Eye, EyeOff, Building2, ArrowLeft, ArrowRight,
  CheckCircle2, ChevronRight, UserPlus, Users, DollarSign,
  BarChart3, Smartphone, ChevronDown, Lock, ExternalLink,
  Copy, Check, Wifi, QrCode, AlertCircle, Globe,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useRegisteredAccountsStore } from '../store/registeredAccountsStore'
import api from '../lib/api'
import toast from 'react-hot-toast'
import type { User, Role } from '../types'

/* ─── Constants ─── */
const demoAccounts = [
  { username: 'superadmin', password: 'super123', role: 'SUPER_ADMIN' as Role, label: 'Super Admin', desc: 'Quản trị toàn hệ thống', clubId: null, badge: 'purple' },
  { username: 'admin',      password: 'admin123', role: 'CLUB_ADMIN' as Role,    label: 'Quản lý CLB',  desc: 'Admin CLB Hà Nội',        clubId: 'club-1', badge: 'indigo' },
  { username: 'treasurer',  password: 'treasurer123', role: 'CLUB_TREASURER' as Role,label: 'Thủ Quỹ',      desc: 'Thủ quỹ CLB Hà Nội',     clubId: 'club-1', badge: 'teal' },
  { username: 'member',     password: 'member123', role: 'CLUB_MEMBER' as Role,   label: 'Thành viên',   desc: 'Nguyễn Văn A',            clubId: 'club-1', badge: 'green' },
]

const routeByRole: Record<Role, string> = {
  SUPER_ADMIN: '/super/dashboard', CLUB_ADMIN: '/dashboard',
  CLUB_TREASURER: '/treasurer/dashboard', CLUB_MEMBER: '/member/dashboard',
}

const stats = [
  { value: '500+',   label: 'CLB sử dụng' },
  { value: '10K+',   label: 'Thành viên' },
  { value: '1M+',    label: 'Giao dịch' },
  { value: '99.9%',  label: 'Uptime' },
]

const features = [
  { icon: Users,        title: 'Quản lý thành viên',      desc: 'Theo dõi hồ sơ, vai trò và lịch sử tham gia.' },
  { icon: DollarSign,   title: 'Thu chi minh bạch',        desc: 'Tự động phân bổ chi phí theo buổi chơi.' },
  { icon: BarChart3,    title: 'Dashboard thời gian thực', desc: 'Báo cáo tài chính trực quan, cập nhật tức thì.' },
  { icon: Smartphone,   title: 'Mobile Ready',              desc: 'Hoạt động mượt trên điện thoại, tablet và desktop.' },
]

/* ─── Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as unknown as Easing } }),
}
const cardAnim = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as unknown as Easing } },
}

/* ─── Logo SVG ─── */
function PickleFundLogo({ size = 48, className = '' }: { size?: number; className?: string }) {
  const cx = 24, cy = 24, orbit = 14
  const nodes = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI * 2) / 8 - Math.PI / 2
    return { x: cx + orbit * Math.cos(a), y: cy + orbit * Math.sin(a) }
  })
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect width="48" height="48" rx="12" fill="url(#lgNetL)" />
      {nodes.map((n, i) => (
        <line key={i} x1={cx} y1={cy} x2={n.x} y2={n.y}
          stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r="3" fill="rgba(255,255,255,0.75)" />
      ))}
      <circle cx={cx} cy={cy} r="7" fill="white" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontSize="9" fontWeight="800" fill="#4F46E5" fontFamily="Inter,system-ui,sans-serif">P</text>
      <defs>
        <linearGradient id="lgNetL" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/* ─── Input component ─── */
function Field({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        {right}
      </div>
      {children}
    </div>
  )
}

const inputBase = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-indigo-100 transition-all duration-200 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800 dark:focus:border-indigo-400 dark:focus:ring-indigo-900/50'

/* ─── Register Flow ─── */
interface ClubForm  { name: string; code: string; address: string; contactPhone: string; contactEmail: string }
interface AdminForm { fullName: string; username: string; email: string; password: string; confirmPassword: string }

function RegisterFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [showPwd, setShowPwd] = useState(false)
  const [showCfm, setShowCfm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [club, setClub] = useState<ClubForm>({ name: '', code: '', address: '', contactPhone: '', contactEmail: '' })
  const [admin, setAdmin] = useState<AdminForm>({ fullName: '', username: '', email: '', password: '', confirmPassword: '' })
  const { login } = useAuthStore()
  const { addAccount } = useRegisteredAccountsStore()
  const navigate = useNavigate()

  const nextClub = (e: React.FormEvent) => {
    e.preventDefault()
    if (!club.name.trim() || !club.code.trim()) return toast.error('Vui lòng nhập tên và mã CLB')
    setStep(2)
  }

  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (admin.password !== admin.confirmPassword) return toast.error('Mật khẩu xác nhận không khớp')
    if (admin.password.length < 6) return toast.error('Mật khẩu phải có ít nhất 6 ký tự')
    setLoading(true)
    try {
      const res = await api.post('/auth/register', { club, admin: { fullName: admin.fullName, username: admin.username, email: admin.email, password: admin.password } })
      const { accessToken, refreshToken, user: apiUser } = res.data.data ?? res.data
      const user: User = { id: apiUser.id, username: apiUser.username, email: apiUser.email, clubId: apiUser.clubId, role: apiUser.role as Role, memberId: apiUser.memberId }
      login(user, accessToken, refreshToken)
      setStep(3)
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Đăng ký thất bại, vui lòng thử lại'
      if (err?.response?.status === undefined) {
        // API offline: fallback local
        const cid = `club-${Date.now()}`
        const email = admin.email || `${admin.username}@picklefund.vn`
        addAccount({ username: admin.username, password: admin.password, role: 'CLUB_ADMIN', clubId: cid, email, fullName: admin.fullName })
        login({ id: `u-${Date.now()}`, username: admin.username, email, clubId: cid, role: 'CLUB_ADMIN' } as User, `token-${cid}`, `refresh-${cid}`)
        setStep(3)
      } else {
        toast.error(msg)
      }
    }
    setLoading(false)
  }

  const stepLabel = ['Thông tin CLB', 'Tài khoản Admin']

  if (step === 3) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-200 dark:shadow-emerald-900/50 mb-5">
        <CheckCircle2 size={40} className="text-white" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Đăng ký thành công!</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">CLB <strong className="text-indigo-600">{club.name}</strong> đã sẵn sàng. Tài khoản <strong className="text-slate-700 dark:text-slate-200">@{admin.username}</strong> đã được kích hoạt.</p>
      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-left mb-6 space-y-2.5 border border-slate-100 dark:border-slate-700">
        {[['Tên CLB', club.name], ['Mã CLB', club.code], ['Tài khoản', `@${admin.username}`]].map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-slate-500">{k}</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">{v}</span>
          </div>
        ))}
      </div>
      <GradientButton onClick={() => { toast.success(`Chào mừng CLB ${club.name}!`); navigate('/dashboard') }}>
        Vào trang quản lý <ChevronRight size={16} />
      </GradientButton>
    </motion.div>
  )

  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
        {/* Stepper */}
        <div className="flex items-center mb-6">
          {stepLabel.map((lbl, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`ml-2 text-xs font-medium ${step === i + 1 ? 'text-indigo-600' : 'text-slate-400'}`}>{lbl}</span>
              {i === 0 && <div className={`flex-1 h-px mx-3 transition-all ${step >= 2 ? 'bg-indigo-400' : 'bg-slate-200 dark:bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={nextClub} className="space-y-4">
            <Field label="Tên CLB *"><input required value={club.name} onChange={e => setClub({ ...club, name: e.target.value })} placeholder="VD: CLB Pickleball Hà Nội" className={inputBase} /></Field>
            <Field label="Mã CLB *">
              <input required value={club.code} onChange={e => setClub({ ...club, code: e.target.value.toUpperCase() })} placeholder="VD: PBHN" maxLength={10} className={inputBase + ' font-mono uppercase'} />
              <p className="text-xs text-slate-400 mt-1">Mã định danh duy nhất, không thể thay đổi sau này</p>
            </Field>
            <Field label="Địa chỉ sân"><input value={club.address} onChange={e => setClub({ ...club, address: e.target.value })} placeholder="Sân Pickleball Mỹ Đình, Hà Nội" className={inputBase} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Điện thoại"><input value={club.contactPhone} onChange={e => setClub({ ...club, contactPhone: e.target.value })} placeholder="0912345678" className={inputBase} /></Field>
              <Field label="Email CLB"><input type="email" value={club.contactEmail} onChange={e => setClub({ ...club, contactEmail: e.target.value })} placeholder="clb@email.com" className={inputBase} /></Field>
            </div>
            <div className="flex gap-2 pt-1">
              <OutlineButton onClick={onBack}><ArrowLeft size={15} /> Quay lại</OutlineButton>
              <GradientButton type="submit" className="flex-1 justify-center">Tiếp theo <ArrowRight size={15} /></GradientButton>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={doRegister} className="space-y-4">
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 rounded-xl px-4 py-2.5">
              <Building2 size={15} className="text-indigo-500 shrink-0" />
              <span className="font-medium text-sm text-indigo-800 dark:text-indigo-300">{club.name}</span>
              <span className="ml-auto font-mono text-xs text-indigo-400">{club.code}</span>
            </div>
            {[
              { label: 'Họ và tên *', key: 'fullName', placeholder: 'Nguyễn Văn A' },
              { label: 'Tên tài khoản *', key: 'username', placeholder: 'admin_pbhn' },
              { label: 'Email', key: 'email', placeholder: 'admin@email.com', type: 'email', req: false },
            ].map(f => (
              <Field key={f.key} label={f.label}>
                <input required={f.req !== false} type={f.type || 'text'} value={admin[f.key as keyof AdminForm]}
                  onChange={e => setAdmin({ ...admin, [f.key]: f.key === 'username' ? e.target.value.toLowerCase().replace(/\s/g, '') : e.target.value })}
                  placeholder={f.placeholder} className={inputBase} />
              </Field>
            ))}
            {[
              { label: 'Mật khẩu *', key: 'password', show: showPwd, toggle: () => setShowPwd(!showPwd), placeholder: 'Ít nhất 6 ký tự' },
              { label: 'Xác nhận mật khẩu *', key: 'confirmPassword', show: showCfm, toggle: () => setShowCfm(!showCfm), placeholder: 'Nhập lại mật khẩu' },
            ].map(f => (
              <Field key={f.key} label={f.label}>
                <div className="relative">
                  <input required type={f.show ? 'text' : 'password'} value={admin[f.key as keyof AdminForm]}
                    onChange={e => setAdmin({ ...admin, [f.key]: e.target.value })} placeholder={f.placeholder}
                    className={`${inputBase} pr-11 ${f.key === 'confirmPassword' && admin.confirmPassword && admin.password !== admin.confirmPassword ? '!border-red-400 !ring-red-100' : ''}`} />
                  <button type="button" onClick={f.toggle} className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors">{f.show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
                {f.key === 'confirmPassword' && admin.confirmPassword && admin.password !== admin.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Mật khẩu không khớp</p>
                )}
              </Field>
            ))}
            <div className="flex gap-2 pt-1">
              <OutlineButton onClick={() => setStep(1)}><ArrowLeft size={15} /> Quay lại</OutlineButton>
              <GradientButton type="submit" disabled={loading} className="flex-1 justify-center">
                {loading ? <Spinner /> : <><UserPlus size={15} />Tạo CLB &amp; Đăng nhập</>}
              </GradientButton>
            </div>
          </form>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

/* ─── Shared button components ─── */
function GradientButton({ children, className = '', type = 'button', disabled = false, onClick }: {
  children: React.ReactNode; className?: string; type?: 'button' | 'submit'; disabled?: boolean; onClick?: () => void
}) {
  return (
    <motion.button whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -1 }} whileTap={{ scale: disabled ? 1 : 0.98 }}
      type={type} disabled={disabled} onClick={onClick}
      className={`btn-ripple flex items-center gap-2 py-3.5 px-6 rounded-xl text-white text-sm font-semibold transition-shadow duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      style={{ background: disabled ? '#94a3b8' : 'linear-gradient(135deg, #00C896 0%, #4F46E5 100%)', boxShadow: disabled ? 'none' : '0 4px 24px rgba(79,70,229,0.3)' }}
    >
      {children}
    </motion.button>
  )
}

function OutlineButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="button" onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-150"
    >
      {children}
    </motion.button>
  )
}

function Spinner() {
  return <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
}

const badgeStyle: Record<string, string> = {
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  teal:   'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  green:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

/* ─── Detect LAN IP via WebRTC ─── */
async function detectLanIP(): Promise<string | null> {
  return new Promise(resolve => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] })
      pc.createDataChannel('')
      pc.createOffer().then(o => pc.setLocalDescription(o))
      const timer = setTimeout(() => { pc.close(); resolve(null) }, 1500)
      pc.onicecandidate = e => {
        if (!e.candidate) return
        const m = e.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/)
        if (m && !m[1].startsWith('127.')) {
          clearTimeout(timer)
          pc.close()
          resolve(m[1])
        }
      }
    } catch { resolve(null) }
  })
}

/* ─── Mobile Link Widget ─── */
function MobileLinkWidget() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [mobileUrl, setMobileUrl] = useState('')
  const [isLocalhost, setIsLocalhost] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [tab, setTab] = useState<'lan' | 'internet'>('lan')
  const [tunnelInput, setTunnelInput] = useState('')
  const [tunnelCopied, setTunnelCopied] = useState(false)

  useEffect(() => {
    const host = window.location.hostname
    const port = window.location.port
    const isLocal = host === 'localhost' || host === '127.0.0.1'
    setIsLocalhost(isLocal)
    if (!isLocal) {
      setMobileUrl(`${window.location.protocol}//${host}${port ? `:${port}` : ''}/login`)
    }
  }, [])

  const handleOpen = async () => {
    if (!open && isLocalhost && !mobileUrl && tab === 'lan') {
      setDetecting(true)
      const ip = await detectLanIP()
      const port = window.location.port
      setMobileUrl(ip ? `http://${ip}${port ? `:${port}` : ''}/login` : '')
      setDetecting(false)
    }
    setOpen(!open)
  }

  const handleTabChange = async (t: 'lan' | 'internet') => {
    setTab(t)
    if (t === 'lan' && isLocalhost && !mobileUrl) {
      setDetecting(true)
      const ip = await detectLanIP()
      const port = window.location.port
      setMobileUrl(ip ? `http://${ip}${port ? `:${port}` : ''}/login` : '')
      setDetecting(false)
    }
  }

  const copy = (url: string, setFn: (v: boolean) => void) => {
    navigator.clipboard.writeText(url).then(() => {
      setFn(true)
      setTimeout(() => setFn(false), 2000)
    })
  }

  // Normalize tunnel URL: ensure it ends with /login
  const tunnelQrUrl = (() => {
    const raw = tunnelInput.trim()
    if (!raw) return ''
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
      if (!u.pathname.includes('login')) u.pathname = '/login'
      return u.toString()
    } catch { return '' }
  })()

  const QRBlock = ({ url }: { url: string }) => (
    <div className="shrink-0 rounded-xl overflow-hidden border border-slate-100 p-2 bg-white shadow-sm">
      <QRCodeSVG
        value={url}
        size={120}
        bgColor="#ffffff"
        fgColor="#0F172A"
        level="M"
        imageSettings={{
          src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath d='M24 4L6 11v12c0 10.5 7.6 20.3 18 23 10.4-2.7 18-12.5 18-23V11L24 4z' fill='%234F46E5'/%3E%3C/svg%3E",
          height: 18, width: 18, excavate: true,
        }}
      />
    </div>
  )

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={handleOpen}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium hover:border-indigo-200 dark:hover:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all duration-200"
      >
        {detecting
          ? <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          : <QrCode size={14} />
        }
        {detecting ? 'Đang tìm địa chỉ mạng...' : 'Mở trên điện thoại'}
        <Wifi size={12} className="ml-0.5 opacity-60" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16,1,0.3,1] as unknown as Easing }}
            className="absolute bottom-full mb-3 left-0 right-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-slate-950/60 p-4 z-50"
          >
            {/* Arrow tip */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-slate-100 dark:border-slate-800 rotate-45" />

            {/* Tab switcher */}
            <div className="flex gap-1 bg-slate-50 dark:bg-slate-800 rounded-xl p-1 mb-4 border border-slate-100 dark:border-slate-700">
              {([['lan', <Wifi key="w" size={12}/>, 'Nội bộ (LAN)'], ['internet', <Globe key="g" size={12}/>, 'Mạng ngoài']] as const).map(([id, icon, label]) => (
                <button key={id} onClick={() => handleTabChange(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    tab === id
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  {icon}{label}
                </button>
              ))}
            </div>

            {tab === 'lan' ? (
              /* ── LAN tab ── */
              (mobileUrl || !isLocalhost) ? (
                <div className="flex gap-3 items-start">
                  <QRBlock url={mobileUrl} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Smartphone size={13} className="text-indigo-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Cùng mạng WiFi</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl px-2.5 py-1.5 mb-2.5 border border-slate-100 dark:border-slate-700">
                      <span className="text-[11px] text-indigo-600 font-mono truncate flex-1">{mobileUrl}</span>
                      <button onClick={() => copy(mobileUrl, setCopied)} className={`shrink-0 ${copied ? 'text-emerald-500' : 'text-slate-400 hover:text-indigo-500'}`}>
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                    <div className="space-y-1">
                      {['Kết nối điện thoại vào cùng WiFi', 'Quét mã QR bằng Camera', 'Đăng nhập và dùng ngay'].map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                            style={{ background: 'linear-gradient(135deg,#00C896,#4F46E5)' }}>{i+1}</span>
                          <span className="text-[11px] text-slate-500">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 items-start">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
                    <AlertCircle size={17} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 mb-1">Không phát hiện được địa chỉ mạng</p>
                    <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">Khởi động lại Vite với flag <code className="bg-slate-100 px-1 rounded font-mono">--host</code>:</p>
                    <div className="bg-slate-900 rounded-xl px-3 py-2 mb-2">
                      <code className="text-emerald-400 text-[11px] font-mono">npm run dev:mobile</code>
                    </div>
                    <p className="text-[11px] text-slate-400">Vite sẽ hiện địa chỉ <span className="font-mono text-indigo-500">http://192.168.x.x:5173</span></p>
                  </div>
                </div>
              )
            ) : (
              /* ── Internet tab ── */
              !isLocalhost ? (
                /* Already on a public URL — show QR directly */
                <div>
                  <div className="flex gap-2 items-start mb-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
                      <Globe size={15} className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Ứng dụng đã có thể truy cập từ internet</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">Quét QR bên dưới từ bất kỳ mạng nào — WiFi, 4G, 5G.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <QRBlock url={mobileUrl} />
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-emerald-600 mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sẵn sàng quét!
                      </p>
                      <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2.5 py-1.5 mb-2 border border-slate-100">
                        <span className="text-[10px] text-violet-600 font-mono truncate flex-1">{mobileUrl}</span>
                        <button onClick={() => copy(mobileUrl, setCopied)} className={`shrink-0 ${copied ? 'text-emerald-500' : 'text-slate-400 hover:text-violet-500'}`}>
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {['Mở Camera điện thoại', 'Quét mã QR', 'Đăng nhập và dùng ngay'].map((t, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                              style={{ background: 'linear-gradient(135deg,#00C896,#4F46E5)' }}>{i+1}</span>
                            <span className="text-[11px] text-slate-500">{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* localhost — tunnel paste flow */
                <div>
                  <div className="flex gap-2 items-start mb-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 border border-violet-100">
                      <Globe size={15} className="text-violet-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Truy cập từ bất kỳ đâu</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">Tạo URL công khai qua tunnel — điện thoại 4G/5G cũng vào được.</p>
                    </div>
                  </div>

                  {/* Step 1: run tunnel */}
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-slate-600 mb-1.5">① Chạy lệnh này trong terminal:</p>
                    <div className="bg-slate-900 rounded-xl px-3 py-2 flex items-center gap-2">
                      <code className="text-emerald-400 text-[11px] font-mono flex-1">npm run dev:tunnel:all</code>
                      <button onClick={() => copy('npm run dev:tunnel:all', setTunnelCopied)}
                        className={`shrink-0 transition-colors ${tunnelCopied ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'}`}>
                        {tunnelCopied ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      Terminal sẽ hiện URL dạng <span className="font-mono text-violet-500">https://xxxx.loca.lt</span>
                    </p>
                    <p className="text-[10px] text-amber-500 mt-1 leading-relaxed">
                      ⚠ Lần đầu mở URL: nhấn <strong>"Click to Continue"</strong> để vượt qua trang xác nhận tunnel.
                    </p>
                  </div>

                  {/* Step 2: paste URL */}
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-slate-600 mb-1.5">② Dán URL tunnel vào đây để tạo QR:</p>
                    <input
                      type="url"
                      value={tunnelInput}
                      onChange={e => setTunnelInput(e.target.value)}
                      placeholder="https://xxxx.loca.lt"
                      className="w-full text-[11px] font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 placeholder:text-slate-300 transition"
                    />
                  </div>

                  {/* QR or placeholder */}
                  {tunnelQrUrl ? (
                    <div className="flex gap-3 items-start mt-3 pt-3 border-t border-slate-100">
                      <QRBlock url={tunnelQrUrl} />
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold text-emerald-600 mb-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sẵn sàng quét!
                        </p>
                        <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2.5 py-1.5 border border-slate-100">
                          <span className="text-[10px] text-violet-600 font-mono truncate flex-1">{tunnelQrUrl}</span>
                          <button onClick={() => copy(tunnelQrUrl, setCopied)} className={`shrink-0 ${copied ? 'text-emerald-500' : 'text-slate-400 hover:text-violet-500'}`}>
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                          Hoạt động trên mọi mạng — WiFi, 4G, 5G.
                          <br/>URL hết hạn khi tắt terminal.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-100 text-slate-300">
                      <QrCode size={18} />
                      <span className="text-[11px]">QR xuất hiện sau khi dán URL</span>
                    </div>
                  )}
                </div>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Main Login ─── */
export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showDemo, setShowDemo] = useState(false)
  const { login } = useAuthStore()
  const { accounts: registeredAccounts } = useRegisteredAccountsStore()
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const localAccount = registeredAccounts.find(a => a.username === username && a.password === password)
      if (localAccount) {
        const user: User = {
          id: `u-${localAccount.username}`,
          username: localAccount.username,
          email: localAccount.email,
          clubId: localAccount.clubId,
          role: localAccount.role,
        }
        login(user, `local-token-${localAccount.clubId}`, `local-refresh-${localAccount.clubId}`)
        toast.success(`Chào mừng trở lại, ${localAccount.fullName || localAccount.username}!`, { duration: 5000 })
        navigate(routeByRole[localAccount.role])
        setLoading(false)
        return
      }

      const res = await api.post('/auth/login', { username, password, rememberMe: remember })
      const { accessToken, refreshToken, user: apiUser } = res.data.data ?? res.data
      const user: User = {
        id: apiUser.id,
        username: apiUser.username,
        email: apiUser.email,
        clubId: apiUser.clubId ?? null,
        role: apiUser.role as Role,
        memberId: apiUser.memberId,
      }
      login(user, accessToken, refreshToken)
      toast.success(`Chào mừng, ${apiUser.username}!`)
      navigate(routeByRole[user.role])
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401) {
        const reg = registeredAccounts.find(a => a.username === username && a.password === password)
        if (reg) {
          const user: User = { id: `u-${reg.username}`, username: reg.username, email: reg.email, clubId: reg.clubId, role: reg.role }
          login(user, `local-token-${reg.clubId}`, `local-refresh-${reg.clubId}`)
          toast.success(`Chào mừng trở lại, ${reg.fullName || reg.username}!`, { duration: 5000 })
          navigate(routeByRole[reg.role])
          setLoading(false)
          return
        }
        toast.error('Tài khoản hoặc mật khẩu không đúng')
      } else if (status === 429) {
        toast.error('Quá nhiều lần thử. Vui lòng đợi một chút.')
      } else {
        // API offline → fallback to registered accounts (local store only)
        const reg = registeredAccounts.find(a => a.username === username && a.password === password)
        if (reg) {
          const user: User = { id: `u-${reg.username}`, username: reg.username, email: reg.email, clubId: reg.clubId, role: reg.role }
          login(user, `local-token-${reg.clubId}`, `local-refresh-${reg.clubId}`)
          toast.success(`Chào mừng trở lại, ${reg.fullName || reg.username}!`, { duration: 5000 })
          navigate(routeByRole[reg.role])
          setLoading(false)
          return
        }
        toast.error('Không thể kết nối server. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">

      {/* ═══════════════════════════════════════
          LEFT PANEL  60%
      ═══════════════════════════════════════ */}
      <div className="hidden lg:flex w-[60%] relative flex-col overflow-hidden">

        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 mesh-bg" />

        {/* Gradient overlay for depth */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(79,70,229,0.35) 50%, rgba(6,182,212,0.25) 100%)' }} />

        {/* Floating orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="orb-1 absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #4F46E5, transparent 70%)' }} />
          <div className="orb-2 absolute top-1/2 -right-24 w-80 h-80 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #06B6D4, transparent 70%)' }} />
          <div className="orb-3 absolute -bottom-24 left-1/4 w-64 h-64 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }} />
          {/* Dot grid */}
          <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-12">

          {/* Logo */}
          <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show" className="flex items-center gap-3">
            <PickleFundLogo size={44} />
            <div>
              <span className="text-white font-extrabold text-xl tracking-tight">PickleFund</span>
              <p className="text-cyan-300 text-xs font-medium mt-0.5">Sports Community Platform</p>
            </div>
          </motion.div>

          {/* Hero headline */}
          <div className="mt-auto mb-8">
            <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show"
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 mb-8">
              <span className="pulse-glow w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span className="text-white/90 text-xs font-medium tracking-wide">Nền tảng quản lý quỹ CLB thể thao thế hệ mới</span>
            </motion.div>

            <motion.h1 variants={fadeUp} custom={2} initial="hidden" animate="show"
              className="text-[56px] font-extrabold leading-[1.05] mb-5 tracking-tight"
              style={{ fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
              <span className="text-gradient-animate block">Kết nối đam mê.</span>
              <span className="text-white block">Quản lý chuyên nghiệp.</span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={3} initial="hidden" animate="show"
              className="text-white/70 text-base max-w-md leading-relaxed mb-10">
              Giải pháp quản lý quỹ, thành viên và hoạt động CLB trên một nền tảng duy nhất — từ Pickleball, Tennis đến bất kỳ môn thể thao nào.
            </motion.p>

            {/* Feature glass cards */}
            <motion.div variants={fadeUp} custom={4} initial="hidden" animate="show"
              className="grid grid-cols-2 gap-3 mb-10">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="glass-card rounded-2xl p-4 group hover:bg-white/15 transition-all duration-300 cursor-default">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15 group-hover:bg-white/20 transition-colors">
                      <Icon size={16} className="text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm leading-tight">{title}</p>
                      <p className="text-white/55 text-xs mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Social proof KPI row */}
            <motion.div variants={fadeUp} custom={5} initial="hidden" animate="show"
              className="glass-card rounded-2xl px-5 py-4 flex items-center justify-between">
              {stats.map((s, i) => (
                <div key={s.label} className={`text-center ${i < stats.length - 1 ? 'pr-4 border-r border-white/10' : ''}`} style={{ flex: 1 }}>
                  <p className="text-white font-extrabold text-xl">{s.value}</p>
                  <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Bottom testimonial */}
          <motion.div variants={fadeUp} custom={6} initial="hidden" animate="show"
            className="glass-card rounded-2xl p-4 flex items-center gap-4">
            <div className="flex -space-x-2">
              {['#4F46E5', '#00C896', '#f59e0b', '#ef4444'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: c }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">"PickleFund tiết kiệm cho CLB chúng tôi 5 giờ/tuần."</p>
              <p className="text-white/50 text-xs mt-0.5">— Admin CLB Pickleball Hà Nội, 45 thành viên</p>
            </div>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => <span key={i} className="text-amber-400 text-sm">★</span>)}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          RIGHT PANEL  40%
      ═══════════════════════════════════════ */}
      <div className="flex-1 lg:w-[40%] flex flex-col items-center justify-center p-6 lg:p-10 overflow-y-auto">

        {/* Mobile logo */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="lg:hidden flex flex-col items-center mb-8">
          <PickleFundLogo size={56} className="mb-3" />
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">PickleFund</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Quản lý quỹ CLB thể thao</p>
        </motion.div>

        <div className="w-full max-w-[480px]">
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.div key="login" variants={cardAnim} initial="hidden" animate="show" exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}>

                {/* Card */}
                <div className="bg-white dark:bg-[#111827] rounded-[28px] border border-slate-100 dark:border-slate-800"
                  style={{ padding: '40px', boxShadow: '0 25px 80px rgba(0,0,0,0.08)' }}>

                  {/* Header */}
                  <div className="flex items-center gap-3 mb-8">
                    <PickleFundLogo size={36} />
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Chào mừng trở lại!</h2>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Đăng nhập để tiếp tục quản lý CLB của bạn.</p>
                    </div>
                  </div>

                  <form ref={formRef} onSubmit={doLogin} className="space-y-4">
                    <Field label="Email hoặc Tên đăng nhập">
                      <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                        placeholder="Nhập tài khoản của bạn" className={inputBase}
                        required autoComplete="username" autoFocus />
                    </Field>

                    <Field label="Mật khẩu" right={
                      <button type="button" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors">
                        Quên mật khẩu?
                      </button>
                    }>
                      <div className="relative">
                        <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                          placeholder="Nhập mật khẩu" className={`${inputBase} pr-11`} required autoComplete="current-password" />
                        <button type="button" onClick={() => setShowPwd(!showPwd)}
                          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                          {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </Field>

                    {/* Remember me toggle */}
                    <label className="flex items-center gap-3 cursor-pointer group py-1">
                      <div className="relative shrink-0" onClick={() => setRemember(!remember)}>
                        <div className={`w-11 h-6 rounded-full transition-all duration-300 ${remember ? 'bg-gradient-to-r from-indigo-500 to-cyan-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${remember ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">Ghi nhớ đăng nhập</span>
                    </label>

                    {/* Login button */}
                    <GradientButton type="submit" disabled={loading} className="w-full justify-center py-4 text-base">
                      {loading ? <><Spinner />Đang đăng nhập...</> : <><Lock size={16} />Đăng nhập</>}
                    </GradientButton>
                  </form>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                    <span className="text-xs text-slate-400">hoặc</span>
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                  </div>

                  {/* SSO button */}
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all duration-200">
                    <Building2 size={17} className="text-indigo-500" />
                    Đăng nhập bằng tài khoản CLB
                    <ExternalLink size={13} className="text-slate-400 ml-auto" />
                  </motion.button>

                  {/* Demo accounts accordion */}
                  <div className="mt-4 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <motion.button whileTap={{ scale: 0.99 }}
                      onClick={() => setShowDemo(!showDemo)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Tài khoản dùng thử
                      </span>
                      <motion.div animate={{ rotate: showDemo ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={16} />
                      </motion.div>
                    </motion.button>

                    <AnimatePresence>
                      {showDemo && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                          className="overflow-hidden border-t border-slate-100 dark:border-slate-800">
                          {demoAccounts.map(a => (
                            <button key={a.role}
                              onClick={() => { setUsername(a.username); setPassword(a.password); setShowDemo(false) }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left border-b border-slate-50 dark:border-slate-800 last:border-0">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${badgeStyle[a.badge]}`}>{a.label}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 flex-1">{a.desc}</span>
                              <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono shrink-0">{a.username}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Register CTA */}
                <div className="mt-5 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">CLB mới chưa có tài khoản?</p>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setMode('register')}
                    className="inline-flex items-center gap-2 py-3 px-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all duration-200 w-full justify-center">
                    <Building2 size={16} />
                    Đăng ký CLB mới — Miễn phí
                  </motion.button>
                </div>

                {/* Mobile link widget */}
                <div className="mt-5">
                  <MobileLinkWidget />
                </div>

                {/* Footer links */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-400 dark:text-slate-600 mb-2">© 2026 PickleFund · SportsTech Vietnam</p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {['Giới thiệu', 'Hướng dẫn', 'Bảo mật', 'Điều khoản', 'Liên hệ'].map(l => (
                      <button key={l} className="text-xs text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{l}</button>
                    ))}
                  </div>
                </div>
              </motion.div>

            ) : (
              <motion.div key="register" variants={cardAnim} initial="hidden" animate="show" exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}>
                <div className="bg-white dark:bg-[#111827] rounded-[28px] border border-slate-100 dark:border-slate-800"
                  style={{ padding: '40px', boxShadow: '0 25px 80px rgba(0,0,0,0.08)' }}>
                  <div className="flex items-center gap-3 mb-7">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => setMode('login')}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                      <ArrowLeft size={16} />
                    </motion.button>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Đăng ký CLB mới</h2>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Tạo câu lạc bộ và tài khoản quản lý</p>
                    </div>
                  </div>
                  <RegisterFlow onBack={() => setMode('login')} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
