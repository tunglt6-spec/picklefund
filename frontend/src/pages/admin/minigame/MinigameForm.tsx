import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check, UserPlus, X } from 'lucide-react'
import api from '../../../lib/api'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Button } from '../../../components/ui/Button'
import { useMinigameStore } from '../../../store/minigameStore'
import { useClubDataStore } from '../../../store/clubDataStore'
import { useAuthStore } from '../../../store/authStore'
import type { MinigameFormatType, DrawMode, PairingMode } from '../../../types/minigame'
import { cn } from '../../../lib/utils'
import toast from 'react-hot-toast'

const STEPS = ['Thông Tin Cơ Bản', 'Cấu Hình Điểm Số', 'Chọn Thành Viên']

interface FormState {
  name: string
  description: string
  startDate: string
  endDate: string
  notes: string
  formatType: MinigameFormatType
  drawMode: DrawMode
  pairingMode: PairingMode
  groupSize: number
  allowDraw: boolean
  winPoints: number
  drawPoints: number
  lossPoints: number
  selectedMemberIds: string[]
  guestMembers: Array<{ id: string; name: string }>
}

const DEFAULT: FormState = {
  name: '',
  description: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  notes: '',
  formatType: 'RANDOM_DOUBLES',
  drawMode: 'FAIR_ROTATION',
  pairingMode: 'RANDOM_PAIRING',
  groupSize: 4,
  allowDraw: false,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  selectedMemberIds: [],
  guestMembers: [],
}

export function MinigameForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { user } = useAuthStore()
  const clubId = user?.clubId ?? ''
  const { getClubData } = useClubDataStore()
  const { getMinigame, createMinigame, updateMinigame, addParticipants, syncParticipants, participants } = useMinigameStore()
  const members = getClubData(clubId).members

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(DEFAULT)
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [guestName, setGuestName] = useState('')
  const guestInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEdit && id) {
      const mg = getMinigame(id)
      if (mg) {
        const parts = participants.filter(p => p.minigameId === id && p.status === 'ACTIVE')
        const guestParts = parts.filter(p => p.memberId.startsWith('guest-'))
        setForm({
          name: mg.name,
          description: mg.description ?? '',
          startDate: mg.startDate,
          endDate: mg.endDate ?? '',
          notes: mg.notes ?? '',
          formatType: mg.formatType,
          drawMode: mg.drawMode,
          groupSize: mg.groupSize,
          allowDraw: mg.allowDraw,
          winPoints: mg.winPoints,
          drawPoints: mg.drawPoints,
          lossPoints: mg.lossPoints,
          pairingMode: mg.pairingMode ?? 'RANDOM_PAIRING',
          selectedMemberIds: parts.map(p => p.memberId),
          guestMembers: guestParts.map(p => ({ id: p.memberId, name: p.memberName })),
        })
      }
    }
  }, [id, isEdit])

  const set = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }))

  const addGuest = () => {
    const name = guestName.trim()
    if (!name) return
    const guest = { id: `guest-${Date.now()}`, name }
    setForm(f => ({
      ...f,
      guestMembers: [...f.guestMembers, guest],
      selectedMemberIds: [...f.selectedMemberIds, guest.id],
    }))
    setGuestName('')
    setShowAddGuest(false)
  }

  const removeGuest = (guestId: string) => {
    setForm(f => ({
      ...f,
      guestMembers: f.guestMembers.filter(g => g.id !== guestId),
      selectedMemberIds: f.selectedMemberIds.filter(id => id !== guestId),
    }))
  }

  const toggleMember = (memberId: string) => {
    setForm(f => ({
      ...f,
      selectedMemberIds: f.selectedMemberIds.includes(memberId)
        ? f.selectedMemberIds.filter(id => id !== memberId)
        : [...f.selectedMemberIds, memberId],
    }))
  }

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0
    if (step === 1) return true
    return form.selectedMemberIds.length >= 4
  }

  const handleSubmit = async () => {
    if (form.selectedMemberIds.length < 4) { toast.error('Cần ít nhất 4 thành viên'); return }
    const selectedMembers = form.selectedMemberIds.map(mid => {
      const m = members.find(x => x.id === mid)
      const guest = form.guestMembers.find(g => g.id === mid)
      return { memberId: mid, memberName: m?.fullName ?? guest?.name ?? mid }
    })

    if (isEdit && id) {
      try {
        await api.put(`/minigames/${id}`, {
          name: form.name, description: form.description || undefined,
          format: form.formatType, settings: { groupSize: form.groupSize, allowDraw: form.allowDraw, winPoints: form.winPoints, drawPoints: form.drawPoints },
          notes: form.notes || undefined,
        })
        await api.post(`/minigames/${id}/participants`, { memberIds: form.selectedMemberIds })
        updateMinigame(id, {
          name: form.name, description: form.description, startDate: form.startDate,
          endDate: form.endDate || undefined, notes: form.notes, groupSize: form.groupSize,
          allowDraw: form.allowDraw, winPoints: form.winPoints, drawPoints: form.drawPoints, lossPoints: 0,
          formatType: form.formatType, drawMode: form.drawMode,
        })
        syncParticipants(id, selectedMembers)
        toast.success('Đã cập nhật minigame!')
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Cập nhật minigame thất bại')
        return
      }
    } else {
      try {
        const res = await api.post('/minigames', {
          name: form.name, description: form.description || undefined,
          format: form.formatType, settings: { groupSize: form.groupSize, allowDraw: form.allowDraw, winPoints: form.winPoints, drawPoints: form.drawPoints },
        })
        const mgId: string = res.data?.data?.id
        await api.post(`/minigames/${mgId}/participants`, { memberIds: form.selectedMemberIds })
        const mg = createMinigame({
          clubId, name: form.name, description: form.description || undefined,
          startDate: form.startDate, endDate: form.endDate || undefined, status: 'DRAFT',
          groupSize: form.groupSize, allowDraw: form.allowDraw, winPoints: form.winPoints,
          drawPoints: form.drawPoints, lossPoints: 0, notes: form.notes || undefined,
          createdBy: user?.id ?? 'user-1',
          formatType: form.formatType, drawMode: form.drawMode,
          pairingMode: form.formatType === 'FIXED_DOUBLES_ROUND_ROBIN' ? form.pairingMode : undefined,
          id: mgId,
        })
        addParticipants(mg.id, selectedMembers)
        toast.success('Đã tạo minigame!')
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Tạo minigame thất bại')
        return
      }
    }
    navigate('/minigames')
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <PageHeader
        title={isEdit ? '✏️ Chỉnh Sửa Minigame' : '🏆 Tạo Minigame Mới'}
        subtitle={`Bước ${step + 1}/3: ${STEPS[step]}`}
      />

      {/* Step indicator */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                i < step ? 'bg-green-500 text-white' : i === step ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              )}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className={cn('text-sm font-medium', i === step ? 'text-slate-900' : 'text-slate-400')}>{s}</span>
              {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-300 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">

          {/* Step 1 */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Hình Thức Giải Đấu *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    { value: 'RANDOM_DOUBLES' as const, label: '🏓 Đánh Đôi Ngẫu Nhiên', sub: 'Random Doubles — 2v2 mỗi trận' },
                    { value: 'GROUP_STAGE' as const, label: '👥 Vòng Bảng', sub: 'Group Stage — 1v1 theo bảng' },
                    { value: 'FIXED_DOUBLES_ROUND_ROBIN' as const, label: '🤝 Đôi Cố Định Vòng Tròn', sub: 'Fixed Doubles — Ghép đôi cố định, đấu vòng tròn' },
                  ]).map(opt => (
                    <label key={opt.value} className={cn(
                      'flex flex-col gap-0.5 rounded-lg px-3 py-2.5 cursor-pointer border transition-colors',
                      form.formatType === opt.value ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-50 border-transparent hover:bg-slate-100'
                    )}>
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <input
                          type="radio"
                          name="formatType"
                          checked={form.formatType === opt.value}
                          onChange={() => set({ formatType: opt.value })}
                          className="accent-indigo-600"
                          disabled={isEdit}
                        />
                        {opt.label}
                      </span>
                      <span className="text-xs text-slate-500 ml-5">{opt.sub}</span>
                    </label>
                  ))}
                </div>
                {form.formatType === 'FIXED_DOUBLES_ROUND_ROBIN' && !isEdit && (
                  <div className="mt-3">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Cách Ghép Cặp</label>
                    <div className="grid grid-cols-1 gap-2">
                      {([
                        { value: 'RANDOM_PAIRING' as const, label: '🎲 Ngẫu Nhiên', sub: 'Ghép cặp tự động ngẫu nhiên' },
                        { value: 'BALANCED_SKILL_PAIRING' as const, label: '⚖️ Cân Bằng Trình Độ', sub: 'Ghép cặp để cân bằng skill giữa các đội' },
                        { value: 'MANUAL_PAIRING' as const, label: '✋ Thủ Công', sub: 'Tự chọn cặp đôi trong dashboard' },
                      ] as const).map(opt => (
                        <label key={opt.value} className={cn(
                          'flex flex-col gap-0.5 rounded-lg px-3 py-2 cursor-pointer border transition-colors',
                          form.pairingMode === opt.value ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-transparent hover:bg-slate-100'
                        )}>
                          <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                            <input type="radio" name="pairingMode" checked={form.pairingMode === opt.value}
                              onChange={() => set({ pairingMode: opt.value })} className="accent-orange-500" />
                            {opt.label}
                          </span>
                          <span className="text-xs text-slate-500 ml-5">{opt.sub}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Tên Giải Đấu *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set({ name: e.target.value })}
                  placeholder="VD: Minigame Q2/2026"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Mô tả</label>
                <textarea rows={2} value={form.description} onChange={e => set({ description: e.target.value })}
                  placeholder="Mô tả giải đấu..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Ngày bắt đầu</label>
                  <input type="date" value={form.startDate} onChange={e => set({ startDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Ngày kết thúc</label>
                  <input type="date" value={form.endDate} onChange={e => set({ endDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Ghi chú</label>
                <textarea rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 1 && (
            <div className="space-y-5">
              {form.formatType === 'GROUP_STAGE' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Số người mỗi bảng ({form.groupSize})</label>
                  <input type="range" min={2} max={6} value={form.groupSize} onChange={e => set({ groupSize: +e.target.value })}
                    className="w-full accent-indigo-600" />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    {[2,3,4,5,6].map(n => <span key={n}>{n}</span>)}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Chế độ bốc thăm mặc định</label>
                  <select
                    value={form.drawMode}
                    onChange={e => set({ drawMode: e.target.value as DrawMode })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="RANDOM">Ngẫu Nhiên (Random)</option>
                    <option value="FAIR_ROTATION">Công Bằng Theo Lượt (Fair Rotation)</option>
                    <option value="BALANCED_SKILL">Cân Bằng Trình Độ (Balanced Skill)</option>
                  </select>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">Cho phép hòa</p>
                  <p className="text-xs text-slate-500">Trận có thể kết thúc với tỷ số bằng nhau</p>
                </div>
                <button
                  onClick={() => set({ allowDraw: !form.allowDraw })}
                  className={cn('relative inline-flex h-6 w-11 rounded-full transition-colors', form.allowDraw ? 'bg-indigo-600' : 'bg-slate-200')}
                >
                  <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5', form.allowDraw ? 'translate-x-5 ml-0.5' : 'translate-x-0.5')} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Điểm thắng', key: 'winPoints', disabled: false },
                  { label: 'Điểm hòa', key: 'drawPoints', disabled: !form.allowDraw },
                  { label: 'Điểm thua', key: 'lossPoints', disabled: true },
                ].map(({ label, key, disabled }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">{label}</label>
                    <input type="number" min={0} value={form[key as keyof FormState] as number}
                      onChange={e => set({ [key]: +e.target.value } as Partial<FormState>)}
                      disabled={disabled}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-600">Chọn thành viên tham gia (tối thiểu 4)</p>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', form.selectedMemberIds.length >= 4 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                  {form.selectedMemberIds.length} đã chọn
                </span>
              </div>

              {/* Club members list */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {members.filter(m => m.status === 'active').map(m => {
                  const checked = form.selectedMemberIds.includes(m.id)
                  return (
                    <div key={m.id} className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                      checked ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                    )}>
                      <input type="checkbox" checked={checked} onChange={() => toggleMember(m.id)} className="accent-indigo-600 h-4 w-4 cursor-pointer" />
                      <span className="text-sm font-medium text-slate-800 flex-1 cursor-pointer" onClick={() => toggleMember(m.id)}>{m.fullName}</span>
                      {m.phone && <span className="text-xs text-slate-400">{m.phone}</span>}
                      {checked && (
                        <button type="button" onClick={() => toggleMember(m.id)} className="text-slate-300 hover:text-red-500 transition-colors ml-1">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Guest section */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Khách Mời</span>
                  {!showAddGuest && (
                    <button
                      type="button"
                      onClick={() => { setShowAddGuest(true); setTimeout(() => guestInputRef.current?.focus(), 50) }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <UserPlus size={14} /> Thêm Khách
                    </button>
                  )}
                </div>

                {/* Existing guests */}
                {form.guestMembers.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {form.guestMembers.map(g => {
                      const checked = form.selectedMemberIds.includes(g.id)
                      return (
                        <div key={g.id} className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                          checked ? 'bg-purple-50 border border-purple-200' : 'bg-slate-50 border border-transparent'
                        )}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMember(g.id)}
                            className="accent-purple-600 h-4 w-4 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-slate-800 flex-1">{g.name}</span>
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">Khách</span>
                          <button
                            type="button"
                            onClick={() => removeGuest(g.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add guest inline form */}
                {showAddGuest && (
                  <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <input
                      ref={guestInputRef}
                      type="text"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addGuest(); if (e.key === 'Escape') { setShowAddGuest(false); setGuestName('') } }}
                      placeholder="Tên khách mời..."
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <button
                      type="button"
                      onClick={addGuest}
                      disabled={!guestName.trim()}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Thêm
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddGuest(false); setGuestName('') }}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {form.guestMembers.length === 0 && !showAddGuest && (
                  <p className="text-xs text-slate-400 italic">Chưa có khách mời. Nhấn "Thêm Khách" để thêm người ngoài CLB.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4">
          <Button variant="secondary" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/minigames')}>
            <ChevronLeft size={16} /> {step === 0 ? 'Hủy' : 'Quay lại'}
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              Tiếp theo <ChevronRight size={16} />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={form.selectedMemberIds.length < 4}>
              <Check size={16} /> {isEdit ? 'Lưu Thay Đổi' : 'Tạo Minigame'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
