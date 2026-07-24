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
// Bóng đá: đội dựng ở màn quản lý sau khi tạo → bỏ bước "Chọn Thành Viên".
const STEPS_FOOTBALL = ['Thông Tin Cơ Bản', 'Cấu Hình Điểm Số']
// Golf: golfer nhập ở màn quản lý → chỉ Thông tin cơ bản + Số vòng đấu.
const STEPS_GOLF = ['Thông Tin Cơ Bản', 'Số Vòng Đấu']

// Môn vợt (TENNIS/BADMINTON/TABLE_TENNIS) chơi như pickleball → dùng chung engine HEAD_TO_HEAD + dashboard.
// Môn đồng đội (FOOTBALL/BASKETBALL): đội roster + trận có điểm (dùng chung FootballDashboardPage).
type SportType = 'PICKLEBALL' | 'TENNIS' | 'BADMINTON' | 'TABLE_TENNIS' | 'FOOTBALL' | 'BASKETBALL' | 'GOLF'
const RACKET_SPORTS: SportType[] = ['PICKLEBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS']

interface FormState {
  sport: SportType
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
  rounds: number
  selectedMemberIds: string[]
  guestMembers: Array<{ id: string; name: string }>
}

const DEFAULT: FormState = {
  sport: 'PICKLEBALL',
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
  rounds: 1,
  selectedMemberIds: [],
  guestMembers: [],
}

export function MinigameForm({ embedded = false, onSportChange }: { embedded?: boolean; onSportChange?: (sport: string) => void } = {}) {
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
  const isFootball = form.sport === 'FOOTBALL'
  const isBasketball = form.sport === 'BASKETBALL'
  const isTeamSport = isFootball || isBasketball // môn đồng đội: đội roster + trận có điểm
  const isGolf = form.sport === 'GOLF'
  const steps = isGolf ? STEPS_GOLF : isTeamSport ? STEPS_FOOTBALL : STEPS
  const [creating, setCreating] = useState(false)
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
          sport: ([...RACKET_SPORTS, 'FOOTBALL', 'BASKETBALL', 'GOLF'].includes(mg.sport as SportType) ? mg.sport : 'PICKLEBALL') as SportType,
          rounds: 1,
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

  // Báo bộ môn đang chọn ra ngoài (hub 2 cột: panel tổng quan bám theo bộ môn của form).
  useEffect(() => { onSportChange?.(form.sport) }, [form.sport, onSportChange])

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
    // ── Môn đồng đội (bóng đá/bóng rổ): tạo giải (không cần chọn thành viên) → dựng đội ở màn quản lý ──
    if (isTeamSport && !isEdit) {
      const sportLabel = isBasketball ? 'bóng rổ' : 'bóng đá'
      setCreating(true)
      try {
        const res = await api.post('/minigames', {
          name: form.name,
          format: 'GROUP_STAGE',
          sport: form.sport,
          scoringModel: 'HEAD_TO_HEAD',
          settings: { allowDraw: form.allowDraw, winPoints: form.winPoints, drawPoints: form.drawPoints },
        })
        const mgId: string = res.data?.data?.id
        // Đưa vào store ngay để dashboard hiển thị (sync API sẽ xác nhận lại).
        createMinigame({
          id: mgId, clubId, name: form.name, startDate: form.startDate,
          endDate: form.endDate || undefined, status: 'DRAFT',
          groupSize: form.groupSize, allowDraw: form.allowDraw, winPoints: form.winPoints,
          drawPoints: form.drawPoints, lossPoints: 0, notes: form.notes || undefined,
          createdBy: user?.id ?? 'user-1', formatType: 'GROUP_STAGE',
          sport: form.sport, scoringModel: 'HEAD_TO_HEAD', drawMode: form.drawMode,
        })
        toast.success(`Đã tạo giải ${sportLabel}! Hãy tạo đội & thành viên.`)
        navigate(`/minigames/${mgId}`)
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? `Tạo giải ${sportLabel} thất bại`)
      } finally { setCreating(false) }
      return
    }
    // ── Golf: tạo giải (không cần chọn thành viên) → thêm golfer ở màn quản lý ──
    if (isGolf && !isEdit) {
      setCreating(true)
      try {
        const res = await api.post('/minigames', {
          name: form.name,
          format: 'SINGLES',
          sport: 'GOLF',
          scoringModel: 'LEADERBOARD',
          settings: { rounds: form.rounds },
        })
        const mgId: string = res.data?.data?.id
        createMinigame({
          id: mgId, clubId, name: form.name, startDate: form.startDate,
          endDate: form.endDate || undefined, status: 'DRAFT',
          groupSize: form.groupSize, allowDraw: false, winPoints: 0,
          drawPoints: 0, lossPoints: 0, notes: form.notes || undefined,
          createdBy: user?.id ?? 'user-1', formatType: 'SINGLES',
          sport: 'GOLF', scoringModel: 'LEADERBOARD', drawMode: form.drawMode,
        })
        toast.success('Đã tạo giải golf! Hãy thêm golfer.')
        navigate(`/minigames/${mgId}`)
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Tạo giải golf thất bại')
      } finally { setCreating(false) }
      return
    }
    if (form.selectedMemberIds.length < 4) { toast.error('Cần ít nhất 4 thành viên'); return }
    const selectedMembers = form.selectedMemberIds.map(mid => {
      const m = members.find(x => x.id === mid)
      const guest = form.guestMembers.find(g => g.id === mid)
      return { memberId: mid, memberName: m?.fullName ?? guest?.name ?? mid }
    })

    // Tách participant gửi lên API: member CLB thật (validate clubId ở backend) vs khách mời.
    // Khách KHÔNG gửi qua memberIds (không phải member) → gửi qua `guests` (name/phone),
    // backend lưu ở Minigame.settings.guests, không tạo member.
    const guestIdSet = new Set(form.guestMembers.map(g => g.id))
    const realMemberIds = form.selectedMemberIds.filter(mid => !guestIdSet.has(mid) && !mid.startsWith('guest-'))
    const guestPayload = form.guestMembers.map(g => ({ name: g.name }))

    if (isEdit && id) {
      try {
        // Minigame model chỉ có name/format/settings/scheduledAt (không có description/notes);
        // format không đổi khi sửa (UI disabled) → chỉ gửi name + settings. settings được
        // MERGE ở backend (giữ guests/pairingMode).
        await api.put(`/minigames/${id}`, {
          name: form.name,
          settings: { groupSize: form.groupSize, allowDraw: form.allowDraw, winPoints: form.winPoints, drawPoints: form.drawPoints },
        })
        await api.post(`/minigames/${id}/participants`, { memberIds: realMemberIds, guests: guestPayload })
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
        // Minigame entity không có field `description` (backend CreateMinigameDto +
        // Prisma model không hỗ trợ); ValidationPipe forbidNonWhitelisted sẽ 400 nếu gửi.
        // description chỉ là field UI cục bộ → không gửi lên API create.
        const res = await api.post('/minigames', {
          name: form.name,
          format: form.formatType,
          // Môn vợt (tennis/cầu lông/bóng bàn) chơi như pickleball → cùng HEAD_TO_HEAD, chỉ khác nhãn sport.
          sport: form.sport, scoringModel: 'HEAD_TO_HEAD',
          settings: { groupSize: form.groupSize, allowDraw: form.allowDraw, winPoints: form.winPoints, drawPoints: form.drawPoints, pairingMode: form.formatType === 'FIXED_DOUBLES_ROUND_ROBIN' ? form.pairingMode : undefined },
        })
        const mgId: string = res.data?.data?.id
        await api.post(`/minigames/${mgId}/participants`, { memberIds: realMemberIds, guests: guestPayload })
        const mg = createMinigame({
          clubId, name: form.name, description: form.description || undefined,
          startDate: form.startDate, endDate: form.endDate || undefined, status: 'DRAFT',
          groupSize: form.groupSize, allowDraw: form.allowDraw, winPoints: form.winPoints,
          drawPoints: form.drawPoints, lossPoints: 0, notes: form.notes || undefined,
          createdBy: user?.id ?? 'user-1',
          formatType: form.formatType, drawMode: form.drawMode,
          sport: form.sport, scoringModel: 'HEAD_TO_HEAD',
          pairingMode: form.formatType === 'FIXED_DOUBLES_ROUND_ROBIN' ? form.pairingMode : undefined,
          id: mgId,
        })
        addParticipants(mg.id, selectedMembers)
        toast.success('Đã tạo minigame!')
        navigate(`/minigames/${mg.id}`) // tạo xong → vào thẳng dashboard giải mới
        return
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Tạo minigame thất bại')
        return
      }
    }
    navigate('/minigames')
  }

  return (
    <div className={embedded ? '' : 'flex-1 overflow-y-auto bg-slate-50'}>
      <PageHeader
        title={isEdit ? '✏️ Chỉnh Sửa Minigame' : '🏆 Tạo Minigame Mới'}
        subtitle={`Bước ${step + 1}/${steps.length}: ${steps[step]}`}
      />

      {/* Step indicator */}
      <div className={cn('bg-white border-b border-slate-100 px-4 sm:px-6 py-3', !embedded && 'sticky top-0 z-10')}>
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                i < step ? 'bg-green-500 text-white' : i === step ? '[background:var(--pf-primary)] text-white' : 'bg-slate-100 text-slate-400'
              )}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className={cn('text-sm font-medium', i === step ? 'text-slate-900' : 'text-slate-400')}>{s}</span>
              {i < steps.length - 1 && <ChevronRight size={14} className="text-slate-300 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className={embedded ? 'pt-4' : 'p-6 max-w-2xl'}>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">

          {/* Step 1 */}
          {step === 0 && (
            <div className="space-y-4">
              {/* Chọn bộ môn (đa môn thể thao). Đổi bộ môn → set format + scoring phù hợp. */}
              {!isEdit && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Bộ Môn *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {([
                      { value: 'PICKLEBALL' as const, label: '🏓 Pickleball', sub: 'Đánh đôi / vòng bảng / đôi cố định' },
                      { value: 'TENNIS' as const, label: '🎾 Tennis', sub: 'Chơi như pickleball (đôi/đơn/vòng bảng)' },
                      { value: 'BADMINTON' as const, label: '🏸 Cầu lông', sub: 'Chơi như pickleball (đôi/đơn/vòng bảng)' },
                      { value: 'TABLE_TENNIS' as const, label: '🏓 Bóng bàn', sub: 'Chơi như pickleball (đôi/đơn/vòng bảng)' },
                      { value: 'FOOTBALL' as const, label: '⚽ Bóng đá', sub: 'Đội nhiều người · vòng tròn / loại trực tiếp' },
                      { value: 'BASKETBALL' as const, label: '🏀 Bóng rổ', sub: 'Đội nhiều người · vòng tròn / loại trực tiếp' },
                      { value: 'GOLF' as const, label: '⛳ Golf', sub: 'Cá nhân · tính tổng gậy (stroke-play)' },
                    ]).map(opt => (
                      <label key={opt.value} className={cn(
                        'flex flex-col gap-0.5 rounded-lg px-3 py-2.5 cursor-pointer border transition-colors',
                        form.sport === opt.value ? '[background:var(--pf-primary-soft)] [border-color:var(--pf-primary)]' : 'bg-slate-50 border-transparent hover:bg-slate-100'
                      )}>
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                          <input type="radio" name="sport" checked={form.sport === opt.value}
                            onChange={() => set(opt.value === 'FOOTBALL'
                              ? { sport: 'FOOTBALL', formatType: 'GROUP_STAGE', allowDraw: true }
                              : opt.value === 'BASKETBALL'
                              ? { sport: 'BASKETBALL', formatType: 'GROUP_STAGE', allowDraw: false, winPoints: 2, drawPoints: 0 }
                              : opt.value === 'GOLF'
                              ? { sport: 'GOLF', formatType: 'SINGLES', allowDraw: false }
                              : { sport: opt.value, formatType: 'RANDOM_DOUBLES', allowDraw: false })}
                            className="accent-[var(--pf-primary)]" />
                          {opt.label}
                        </span>
                        <span className="text-xs text-slate-500 ml-5">{opt.sub}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {isTeamSport ? (
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-800">
                  Thể thức: <b>Vòng tròn</b> (xếp theo điểm & hiệu số {isBasketball ? 'điểm' : 'bàn thắng'}) hoặc <b>Loại trực tiếp</b> (đấu loại tìm nhà vô địch).
                  Chọn thể thức khi tạo lịch. Đội + {isBasketball ? 'vận động viên' : 'cầu thủ'} dựng ở màn quản lý sau khi tạo giải.
                </div>
              ) : isGolf ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
                  Golf <b>stroke-play</b>: mỗi golfer ghi số gậy từng vòng, <b>tổng gậy nhỏ nhất</b> đứng đầu bảng.
                  Golfer (thành viên CLB + khách) sẽ thêm ở màn quản lý sau khi tạo giải.
                </div>
              ) : (
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
                      form.formatType === opt.value ? '[background:var(--pf-primary-soft)] [border-color:var(--pf-primary)]' : 'bg-slate-50 border-transparent hover:bg-slate-100'
                    )}>
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <input
                          type="radio"
                          name="formatType"
                          checked={form.formatType === opt.value}
                          onChange={() => set({ formatType: opt.value })}
                          className="accent-[var(--pf-primary)]"
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
              )}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Tên Giải Đấu *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set({ name: e.target.value })}
                  placeholder="VD: Minigame Q2/2026"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Mô tả</label>
                <textarea rows={2} value={form.description} onChange={e => set({ description: e.target.value })}
                  placeholder="Mô tả giải đấu..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Ngày bắt đầu</label>
                  <input type="date" value={form.startDate} onChange={e => set({ startDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Ngày kết thúc</label>
                  <input type="date" value={form.endDate} onChange={e => set({ endDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Ghi chú</label>
                <textarea rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] resize-none" />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 1 && isGolf && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Số vòng đấu ({form.rounds})</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {([
                    { r: 1, label: '1 vòng (18 hố)' },
                    { r: 2, label: '2 vòng' },
                    { r: 4, label: '4 vòng (giải lớn)' },
                  ]).map(p => (
                    <button key={p.r} type="button" onClick={() => set({ rounds: p.r })}
                      className={cn('rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors',
                        form.rounds === p.r ? 'text-white [background:var(--pf-primary)] border-transparent' : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100')}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <input type="range" min={1} max={8} value={form.rounds} onChange={e => set({ rounds: +e.target.value })}
                  className="w-full accent-[var(--pf-primary)]" />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  {[1,2,3,4,5,6,7,8].map(n => <span key={n}>{n}</span>)}
                </div>
                <p className="mt-2 text-xs text-slate-500">Mỗi vòng golfer ghi 1 số gậy. Bảng xếp hạng tính <b>tổng gậy</b> tất cả các vòng — nhỏ nhất đứng đầu.</p>
              </div>
            </div>
          )}

          {/* Step 2 (pickleball/bóng đá) */}
          {step === 1 && !isGolf && (
            <div className="space-y-5">
              {isTeamSport && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Mẫu tính điểm nhanh</label>
                  <div className="flex flex-wrap gap-2">
                    {(isBasketball
                      ? [{ w: 2, d: 0, label: 'Thắng 2 - Thua 0', draw: false }, { w: 3, d: 0, label: 'Thắng 3 - Thua 0', draw: false }]
                      : [{ w: 3, d: 1, label: 'Chuẩn 3-1-0', draw: true }, { w: 2, d: 1, label: '2-1-0', draw: true }]
                    ).map(p => (
                      <button key={p.label} type="button" onClick={() => set({ winPoints: p.w, drawPoints: p.d, lossPoints: 0, allowDraw: p.draw })}
                        className={cn('rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors',
                          form.winPoints === p.w && form.drawPoints === p.d ? 'text-white [background:var(--pf-primary)] border-transparent' : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100')}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {form.formatType === 'GROUP_STAGE' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Số người mỗi bảng ({form.groupSize})</label>
                  <input type="range" min={2} max={6} value={form.groupSize} onChange={e => set({ groupSize: +e.target.value })}
                    className="w-full accent-[var(--pf-primary)]" />
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
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]"
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
                  className={cn('relative inline-flex h-6 w-11 rounded-full transition-colors', form.allowDraw ? '[background:var(--pf-primary)]' : 'bg-slate-200')}
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
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] disabled:bg-slate-50 disabled:text-slate-400" />
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
                      checked ? '[background:var(--pf-primary-soft)] border [border-color:var(--pf-primary-soft)]' : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                    )}>
                      <input type="checkbox" checked={checked} onChange={() => toggleMember(m.id)} className="accent-[var(--pf-primary)] h-4 w-4 cursor-pointer" />
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
                      className="flex items-center gap-1.5 text-xs font-semibold [color:var(--pf-primary)] hover:[color:var(--pf-primary)] transition-colors"
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
                          checked ? '[background:var(--pf-primary-soft)] border [border-color:var(--pf-primary-soft)]' : 'bg-slate-50 border border-transparent'
                        )}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMember(g.id)}
                            className="accent-[var(--pf-primary)] h-4 w-4 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-slate-800 flex-1">{g.name}</span>
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">Khách</span>
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
                  <div className="flex items-center gap-2 p-2 [background:var(--pf-primary-soft)] border [border-color:var(--pf-primary-soft)] rounded-lg">
                    <input
                      ref={guestInputRef}
                      type="text"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addGuest(); if (e.key === 'Escape') { setShowAddGuest(false); setGuestName('') } }}
                      placeholder="Tên khách mời..."
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]"
                    />
                    <button
                      type="button"
                      onClick={addGuest}
                      disabled={!guestName.trim()}
                      className="px-3 py-1.5 rounded-lg [background:var(--pf-primary)] text-white text-xs font-semibold hover:[background:var(--pf-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              Tiếp theo <ChevronRight size={16} />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={creating || (!isTeamSport && !isGolf && form.selectedMemberIds.length < 4)}>
              <Check size={16} /> {isFootball ? 'Tạo Giải Bóng Đá' : isBasketball ? 'Tạo Giải Bóng Rổ' : isGolf ? 'Tạo Giải Golf' : isEdit ? 'Lưu Thay Đổi' : 'Tạo Minigame'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
