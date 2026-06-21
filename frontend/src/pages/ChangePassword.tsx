import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export function ChangePassword() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [show, setShow] = useState({ old: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)

  const errors: string[] = []
  if (form.newPassword && form.newPassword.length < 6) errors.push('Mật khẩu mới tối thiểu 6 ký tự')
  if (form.newPassword && form.newPassword === '123456') errors.push('Không được dùng mật khẩu mặc định 123456')
  if (form.confirm && form.newPassword !== form.confirm) errors.push('Mật khẩu xác nhận không khớp')

  const canSubmit = form.oldPassword && form.newPassword && form.confirm && errors.length === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    try {
      await api.patch('/auth/change-password', {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      })
      if (user) setUser({ ...user, mustChangePassword: false })
      toast.success('Đổi mật khẩu thành công!')
      navigate(user?.role === 'CLUB_MEMBER' ? '/member/dashboard' : '/')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Đổi mật khẩu thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg mb-4">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Đổi mật khẩu</h1>
          <p className="text-sm text-slate-500 mt-2">
            Tài khoản của bạn đang dùng mật khẩu tạm.<br />
            Vui lòng đặt mật khẩu mới để tiếp tục.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Old password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu hiện tại</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={show.old ? 'text' : 'password'}
                  value={form.oldPassword}
                  onChange={e => setForm(f => ({ ...f, oldPassword: e.target.value }))}
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  required
                />
                <button type="button" onClick={() => setShow(s => ({ ...s, old: !s.old }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show.old ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu mới</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={show.new ? 'text' : 'password'}
                  value={form.newPassword}
                  onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  required
                />
                <button type="button" onClick={() => setShow(s => ({ ...s, new: !s.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={show.confirm ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  required
                />
                <button type="button" onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Validation errors */}
            {errors.length > 0 && (
              <ul className="space-y-1">
                {errors.map(e => (
                  <li key={e} className="text-xs text-red-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                    {e}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-cyan-600 transition-all"
            >
              {saving ? 'Đang lưu...' : 'Xác nhận đổi mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
