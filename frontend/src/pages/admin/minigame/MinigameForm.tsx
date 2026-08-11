/**
 * MinigameForm — Sports Tournament Engine wizard (M1). 7 bước, PRESET-DRIVEN.
 *
 * Bước: 1 Thông tin giải · 2 Nội dung thi đấu · 3 Thể thức · 4 Luật thi đấu · 5 VĐV/Cặp/Đội ·
 *       6 Lịch & địa điểm · 7 Xác nhận. Tùy chọn (bộ môn/nội dung/thể thức/luật) lấy từ Sport
 *       Preset (GET /minigames/sport-presets, có fallback nội bộ) → CHỈ hiện tổ hợp hợp lệ; thể
 *       thức chưa có engine hiển thị "sắp có" (disabled) → không tạo giải invalid.
 *
 * QUAN TRỌNG: handleSubmit GIỮ NGUYÊN 3 nhánh create (team/golf/racket) + edit như trước —
 * chỉ bổ sung competition/scheduledAt vào settings (an toàn, backend merge). formatType map từ
 * preset.dbFormat nên hành vi engine không đổi.
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check, UserPlus, X, Info } from 'lucide-react'
import api from '../../../lib/api'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Button } from '../../../components/ui/Button'
import { useMinigameStore } from '../../../store/minigameStore'
import { useClubDataStore } from '../../../store/clubDataStore'
import { useAuthStore } from '../../../store/authStore'
import type { MinigameFormatType, DrawMode, PairingMode } from '../../../types/minigame'
import { cn } from '../../../lib/utils'
import toast from 'react-hot-toast'

// ── Preset types (UI mirror of backend sport-presets.ts) ─────────────────────
interface FmtDef { code: string; label: string; sub?: string; dbFormat: string; implemented: boolean; note?: string }
interface CompDef { code: string; label: string; participantType: string; partnerModes?: string[] }
interface RuleField { key: string; label: string; type: 'int' | 'select' | 'bool'; default: number | string | boolean; options?: Array<{ value: number | string; label: string }> }
interface Preset {
  code: string; name: string; icon: string; participantTypes: string[]
  competitions: CompDef[]; formats: FmtDef[]; matchRules: RuleField[]
  resourceTerm: string; dbScoringModel: string; implemented: boolean
}

// Fallback tối thiểu (các môn đã có engine) — dùng khi endpoint chưa sẵn (local/demo token).
const RACKET_COMPS: CompDef[] = [
  { code: 'MEN_SINGLES', label: 'Đơn nam', participantType: 'INDIVIDUAL' },
  { code: 'WOMEN_SINGLES', label: 'Đơn nữ', participantType: 'INDIVIDUAL' },
  { code: 'MEN_DOUBLES', label: 'Đôi nam', participantType: 'PAIR', partnerModes: ['FIXED', 'RANDOM'] },
  { code: 'WOMEN_DOUBLES', label: 'Đôi nữ', participantType: 'PAIR', partnerModes: ['FIXED', 'RANDOM'] },
  { code: 'MIXED_DOUBLES', label: 'Đôi nam nữ', participantType: 'PAIR', partnerModes: ['FIXED', 'RANDOM'] },
]
const RACKET_FMTS: FmtDef[] = [
  { code: 'AMERICANO', label: 'Đánh đôi ngẫu nhiên', sub: 'Random Doubles — đổi cặp mỗi vòng', dbFormat: 'RANDOM_DOUBLES', implemented: true },
  { code: 'ROUND_ROBIN', label: 'Vòng tròn (đôi cố định)', sub: 'Fixed Doubles Round Robin', dbFormat: 'FIXED_DOUBLES_ROUND_ROBIN', implemented: true },
  { code: 'GROUP_KNOCKOUT', label: 'Vòng bảng', sub: '1v1 theo bảng', dbFormat: 'GROUP_STAGE', implemented: true },
  { code: 'SINGLE_ELIMINATION', label: 'Loại trực tiếp', sub: 'Single Elimination — nhánh đấu loại (đơn)', dbFormat: 'KNOCKOUT', implemented: true },
]
const racket = (code: string, name: string, icon: string): Preset => ({
  code, name, icon, participantTypes: ['INDIVIDUAL', 'PAIR'], competitions: RACKET_COMPS, formats: RACKET_FMTS,
  matchRules: [], resourceTerm: 'Sân', dbScoringModel: 'HEAD_TO_HEAD', implemented: true,
})
const FALLBACK_PRESETS: Preset[] = [
  racket('PICKLEBALL', 'Pickleball', '🏓'), racket('TENNIS', 'Tennis', '🎾'),
  racket('BADMINTON', 'Cầu lông', '🏸'), racket('TABLE_TENNIS', 'Bóng bàn', '🏓'),
  { code: 'FOOTBALL', name: 'Bóng đá', icon: '⚽', participantTypes: ['TEAM'], competitions: [{ code: 'TEAM', label: 'Đội', participantType: 'TEAM' }], formats: [{ code: 'ROUND_ROBIN', label: 'Vòng tròn', dbFormat: 'GROUP_STAGE', implemented: true }, { code: 'SINGLE_ELIMINATION', label: 'Loại trực tiếp', dbFormat: 'GROUP_STAGE', implemented: true }], matchRules: [], resourceTerm: 'Sân', dbScoringModel: 'HEAD_TO_HEAD', implemented: true },
  { code: 'BASKETBALL', name: 'Bóng rổ', icon: '🏀', participantTypes: ['TEAM'], competitions: [{ code: 'TEAM', label: 'Đội', participantType: 'TEAM' }], formats: [{ code: 'ROUND_ROBIN', label: 'Vòng tròn', dbFormat: 'GROUP_STAGE', implemented: true }, { code: 'SINGLE_ELIMINATION', label: 'Loại trực tiếp', dbFormat: 'GROUP_STAGE', implemented: true }], matchRules: [], resourceTerm: 'Sân', dbScoringModel: 'HEAD_TO_HEAD', implemented: true },
  { code: 'GOLF', name: 'Golf', icon: '⛳', participantTypes: ['INDIVIDUAL', 'TEAM'], competitions: [{ code: 'INDIVIDUAL', label: 'Cá nhân', participantType: 'INDIVIDUAL' }, { code: 'TEAM', label: 'Đội', participantType: 'TEAM' }], formats: [{ code: 'GOLF_STROKE_PLAY', label: 'Stroke Play', sub: 'Tổng gậy thấp nhất thắng', dbFormat: 'SINGLES', implemented: true }], matchRules: [], resourceTerm: 'Sân / Tee time', dbScoringModel: 'LEADERBOARD', implemented: true },
]

type StepKey = 'info' | 'competition' | 'format' | 'rules' | 'participants' | 'schedule' | 'confirm'
const STEP_LABEL: Record<StepKey, string> = {
  info: 'Thông tin giải', competition: 'Nội dung thi đấu', format: 'Thể thức', rules: 'Luật thi đấu',
  participants: 'VĐV / Cặp / Đội', schedule: 'Lịch & địa điểm', confirm: 'Xác nhận',
}

type SportType = 'PICKLEBALL' | 'TENNIS' | 'BADMINTON' | 'TABLE_TENNIS' | 'FOOTBALL' | 'BASKETBALL' | 'GOLF' | 'RUNNING' | 'CHESS' | 'XIANGQI' | 'BILLIARDS' | 'VOLLEYBALL' | 'AIR_VOLLEYBALL'
const RACKET_SPORTS: SportType[] = ['PICKLEBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS']

interface FormState {
  sport: SportType
  name: string
  description: string
  startDate: string
  endDate: string
  notes: string
  competition: string
  formatCode: string
  scheduledAt: string
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
  sport: 'PICKLEBALL', name: '', description: '',
  startDate: new Date().toISOString().slice(0, 10), endDate: '', notes: '',
  competition: '', formatCode: 'AMERICANO', scheduledAt: '',
  formatType: 'RANDOM_DOUBLES', drawMode: 'FAIR_ROTATION', pairingMode: 'RANDOM_PAIRING',
  groupSize: 4, allowDraw: false, winPoints: 3, drawPoints: 1, lossPoints: 0, rounds: 1,
  selectedMemberIds: [], guestMembers: [],
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

  const [presets, setPresets] = useState<Preset[]>(FALLBACK_PRESETS)
  const [stepIdx, setStepIdx] = useState(0)
  const [form, setForm] = useState<FormState>(DEFAULT)
  const [creating, setCreating] = useState(false)
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [guestName, setGuestName] = useState('')
  const guestInputRef = useRef<HTMLInputElement>(null)

  const preset = presets.find(p => p.code === form.sport) ?? FALLBACK_PRESETS[0]
  const selectedComp = preset.competitions.find(c => c.code === form.competition) ?? preset.competitions[0]
  const participantType = selectedComp?.participantType ?? 'INDIVIDUAL'
  const isPairComp = participantType === 'PAIR' // nội dung Đôi (cặp)
  const isFootball = form.sport === 'FOOTBALL'
  const isBasketball = form.sport === 'BASKETBALL'
  // Đôi + Vòng bảng/Loại trực tiếp → dùng LUỒNG ĐỘI (cặp = đội 2 người) để chia bảng/RR/knockout/BXH
  // đúng theo cặp; ghép cặp thủ công = tạo đội 2 người ở màn quản lý. (FIXED_DOUBLES_ROUND_ROBIN &
  // RANDOM_DOUBLES giữ luồng đôi cũ.)
  const isPairTeamFlow = isPairComp && (form.formatType === 'GROUP_STAGE' || form.formatType === 'KNOCKOUT')
  const isTeamSport = ['FOOTBALL', 'BASKETBALL', 'VOLLEYBALL', 'AIR_VOLLEYBALL'].includes(form.sport) || isPairTeamFlow
  const isGolf = form.sport === 'GOLF'
  const isRunning = form.sport === 'RUNNING'
  const isGolfMatchPlay = isGolf && form.formatCode === 'GOLF_MATCH_PLAY'
  const isLeaderboard = (isGolf && !isGolfMatchPlay) || isRunning
  const needPairing = form.formatType === 'FIXED_DOUBLES_ROUND_ROBIN' && !isEdit // đôi group/knockout ghép ở màn đội

  // Danh sách bước áp dụng theo môn: team/golf không chọn thành viên lúc tạo (dựng đội/golfer sau).
  const steps: StepKey[] = isTeamSport || isLeaderboard
    ? ['info', 'competition', 'format', 'rules', 'schedule', 'confirm']
    : ['info', 'competition', 'format', 'rules', 'participants', 'schedule', 'confirm']
  const step = steps[Math.min(stepIdx, steps.length - 1)]

  // Nạp preset thật từ backend (nếu đăng nhập thật). Fallback giữ nguyên nếu lỗi/demo.
  useEffect(() => {
    api.get('/minigames/sport-presets')
      .then(r => { const list = (r.data?.data ?? r.data) as Preset[]; if (Array.isArray(list) && list.length) setPresets(list) })
      .catch(() => { /* giữ fallback */ })
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      const mg = getMinigame(id)
      if (mg) {
        const parts = participants.filter(p => p.minigameId === id && p.status === 'ACTIVE')
        const guestParts = parts.filter(p => p.memberId.startsWith('guest-'))
        setForm(f => ({
          ...f,
          sport: ([...RACKET_SPORTS, 'FOOTBALL', 'BASKETBALL', 'GOLF'].includes(mg.sport as SportType) ? mg.sport : 'PICKLEBALL') as SportType,
          rounds: 1, name: mg.name, description: mg.description ?? '', startDate: mg.startDate,
          endDate: mg.endDate ?? '', notes: mg.notes ?? '', formatType: mg.formatType,
          drawMode: mg.drawMode, groupSize: mg.groupSize, allowDraw: mg.allowDraw,
          winPoints: mg.winPoints, drawPoints: mg.drawPoints, lossPoints: mg.lossPoints,
          pairingMode: mg.pairingMode ?? 'RANDOM_PAIRING',
          selectedMemberIds: parts.map(p => p.memberId),
          guestMembers: guestParts.map(p => ({ id: p.memberId, name: p.memberName })),
        }))
      }
    }
  }, [id, isEdit])

  const set = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }))
  useEffect(() => { onSportChange?.(form.sport) }, [form.sport, onSportChange])
  // Đặt competition mặc định theo môn khi đổi bộ môn.
  useEffect(() => { setForm(f => ({ ...f, competition: preset.competitions[0]?.code ?? '' })) }, [form.sport]) // eslint-disable-line

  const addGuest = () => {
    const name = guestName.trim()
    if (!name) return
    const guest = { id: `guest-${Date.now()}`, name }
    setForm(f => ({ ...f, guestMembers: [...f.guestMembers, guest], selectedMemberIds: [...f.selectedMemberIds, guest.id] }))
    setGuestName(''); setShowAddGuest(false)
  }
  const removeGuest = (guestId: string) => setForm(f => ({ ...f, guestMembers: f.guestMembers.filter(g => g.id !== guestId), selectedMemberIds: f.selectedMemberIds.filter(id => id !== guestId) }))
  const toggleMember = (memberId: string) => setForm(f => ({ ...f, selectedMemberIds: f.selectedMemberIds.includes(memberId) ? f.selectedMemberIds.filter(id => id !== memberId) : [...f.selectedMemberIds, memberId] }))

  const canNext = () => {
    if (step === 'info') return form.name.trim().length > 0
    if (step === 'competition') return !!form.competition
    if (step === 'format') {
      const f = preset.formats.find(x => x.dbFormat === form.formatType && x.implemented)
      return !!f // chỉ cho qua khi đã chọn thể thức CÓ engine
    }
    if (step === 'participants') return form.selectedMemberIds.length >= 4
    return true
  }

  // Khi chọn bộ môn: set format mặc định + scoring phù hợp (giữ đúng hành vi cũ).
  const pickSport = (opt: SportType) => {
    if (opt === 'FOOTBALL') set({ sport: 'FOOTBALL', formatType: 'GROUP_STAGE', formatCode: 'ROUND_ROBIN', allowDraw: true, winPoints: 3, drawPoints: 1 })
    else if (opt === 'BASKETBALL') set({ sport: 'BASKETBALL', formatType: 'GROUP_STAGE', formatCode: 'ROUND_ROBIN', allowDraw: false, winPoints: 2, drawPoints: 0 })
    else if (opt === 'GOLF') set({ sport: 'GOLF', formatType: 'SINGLES', formatCode: 'GOLF_STROKE_PLAY', allowDraw: false })
    else if (opt === 'RUNNING') set({ sport: 'RUNNING', formatType: 'SINGLES', formatCode: 'GOLF_STROKE_PLAY', allowDraw: false })
    else {
      // Môn còn lại (racket/cờ/billiards/bóng chuyền): chọn thể thức implemented ĐẦU TIÊN của preset.
      const p = presets.find(x => x.code === opt)
      const f = p?.formats.find(x => x.implemented) ?? { dbFormat: 'RANDOM_DOUBLES', code: 'AMERICANO' }
      const isTeam = ['VOLLEYBALL', 'AIR_VOLLEYBALL'].includes(opt)
      set({ sport: opt, formatType: f.dbFormat as MinigameFormatType, formatCode: f.code, allowDraw: isTeam })
    }
  }

  const handleSubmit = async () => {
    // Bổ sung metadata preset vào settings (an toàn — backend merge Json settings).
    const presetMeta = { competition: form.competition || undefined, formatCode: form.formatCode || undefined }
    if (isTeamSport && !isEdit) {
      const unit = isPairTeamFlow ? 'cặp đôi' : 'đội'
      setCreating(true)
      try {
        const res = await api.post('/minigames', {
          name: form.name, format: 'GROUP_STAGE', sport: form.sport, scoringModel: 'HEAD_TO_HEAD',
          participantType: isPairTeamFlow ? 'PAIR' : 'TEAM',
          scheduledAt: form.scheduledAt || undefined,
          settings: { allowDraw: form.allowDraw, winPoints: form.winPoints, drawPoints: form.drawPoints, koIntent: form.formatType === 'KNOCKOUT', ...presetMeta },
        })
        const mgId: string = res.data?.data?.id
        createMinigame({ id: mgId, clubId, name: form.name, startDate: form.startDate, endDate: form.endDate || undefined, status: 'DRAFT', groupSize: form.groupSize, allowDraw: form.allowDraw, winPoints: form.winPoints, drawPoints: form.drawPoints, lossPoints: 0, notes: form.notes || undefined, createdBy: user?.id ?? 'user-1', formatType: 'GROUP_STAGE', sport: form.sport, scoringModel: 'HEAD_TO_HEAD', drawMode: form.drawMode })
        toast.success(`Đã tạo giải! Hãy tạo ${unit} & thành viên ở màn quản lý.`)
        navigate(`/minigames/${mgId}`)
      } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Tạo giải thất bại') } finally { setCreating(false) }
      return
    }
    if (isLeaderboard && !isEdit) {
      setCreating(true)
      try {
        const res = await api.post('/minigames', {
          name: form.name, format: 'SINGLES', sport: form.sport, scoringModel: 'LEADERBOARD',
          scheduledAt: form.scheduledAt || undefined,
          settings: { rounds: form.rounds, ...presetMeta },
        })
        const mgId: string = res.data?.data?.id
        createMinigame({ id: mgId, clubId, name: form.name, startDate: form.startDate, endDate: form.endDate || undefined, status: 'DRAFT', groupSize: form.groupSize, allowDraw: false, winPoints: 0, drawPoints: 0, lossPoints: 0, notes: form.notes || undefined, createdBy: user?.id ?? 'user-1', formatType: 'SINGLES', sport: form.sport, scoringModel: 'LEADERBOARD', drawMode: form.drawMode })
        toast.success(isRunning ? 'Đã tạo giải chạy bộ! Hãy thêm vận động viên.' : 'Đã tạo giải golf! Hãy thêm golfer.')
        navigate(`/minigames/${mgId}`)
      } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Tạo giải thất bại') } finally { setCreating(false) }
      return
    }
    if (!isEdit && form.selectedMemberIds.length < 4) { toast.error('Cần ít nhất 4 thành viên'); return }
    const selectedMembers = form.selectedMemberIds.map(mid => {
      const m = members.find(x => x.id === mid); const guest = form.guestMembers.find(g => g.id === mid)
      return { memberId: mid, memberName: m?.fullName ?? guest?.name ?? mid }
    })
    const guestIdSet = new Set(form.guestMembers.map(g => g.id))
    const realMemberIds = form.selectedMemberIds.filter(mid => !guestIdSet.has(mid) && !mid.startsWith('guest-'))
    const guestPayload = form.guestMembers.map(g => ({ name: g.name }))

    if (isEdit && id) {
      try {
        await api.put(`/minigames/${id}`, { name: form.name, settings: { groupSize: form.groupSize, allowDraw: form.allowDraw, winPoints: form.winPoints, drawPoints: form.drawPoints, ...presetMeta } })
        if (!isTeamSport && !isLeaderboard) { await api.post(`/minigames/${id}/participants`, { memberIds: realMemberIds, guests: guestPayload }); syncParticipants(id, selectedMembers) }
        updateMinigame(id, { name: form.name, description: form.description, startDate: form.startDate, endDate: form.endDate || undefined, notes: form.notes, groupSize: form.groupSize, allowDraw: form.allowDraw, winPoints: form.winPoints, drawPoints: form.drawPoints, lossPoints: 0, formatType: form.formatType, drawMode: form.drawMode })
        toast.success('Đã cập nhật minigame!')
      } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Cập nhật minigame thất bại'); return }
    } else {
      try {
        const res = await api.post('/minigames', {
          name: form.name, format: form.formatType, sport: form.sport, scoringModel: 'HEAD_TO_HEAD',
          participantType,
          scheduledAt: form.scheduledAt || undefined,
          settings: { groupSize: form.groupSize, allowDraw: form.allowDraw, winPoints: form.winPoints, drawPoints: form.drawPoints, pairingMode: isPairComp ? form.pairingMode : undefined, ...presetMeta },
        })
        const mgId: string = res.data?.data?.id
        await api.post(`/minigames/${mgId}/participants`, { memberIds: realMemberIds, guests: guestPayload })
        const mg = createMinigame({ clubId, name: form.name, description: form.description || undefined, startDate: form.startDate, endDate: form.endDate || undefined, status: 'DRAFT', groupSize: form.groupSize, allowDraw: form.allowDraw, winPoints: form.winPoints, drawPoints: form.drawPoints, lossPoints: 0, notes: form.notes || undefined, createdBy: user?.id ?? 'user-1', formatType: form.formatType, drawMode: form.drawMode, sport: form.sport, scoringModel: 'HEAD_TO_HEAD', pairingMode: form.formatType === 'FIXED_DOUBLES_ROUND_ROBIN' ? form.pairingMode : undefined, id: mgId })
        addParticipants(mg.id, selectedMembers)
        toast.success('Đã tạo minigame!')
        navigate(`/minigames/${mg.id}`)
        return
      } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Tạo minigame thất bại'); return }
    }
    navigate('/minigames')
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide mb-1.5 block">{children}</label>
  )

  return (
    <div className={embedded ? '' : 'flex-1 overflow-y-auto [background:var(--pf-surface-muted)]'}>
      <PageHeader title={isEdit ? '✏️ Chỉnh Sửa Giải Đấu' : '🏆 Tạo Giải Đấu Mới'} subtitle={`Bước ${stepIdx + 1}/${steps.length}: ${STEP_LABEL[step]}`} />

      {/* Step indicator */}
      <div className={cn('[background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 sm:px-6 py-3 overflow-x-auto no-scrollbar', !embedded && 'sticky top-0 z-10')}>
        <div className="flex items-center gap-2 w-max">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', i < stepIdx ? '[background:var(--pf-color-success)] text-white' : i === stepIdx ? '[background:var(--pf-primary)] text-white' : '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]')}>
                {i < stepIdx ? <Check size={12} /> : i + 1}
              </div>
              <span className={cn('text-sm font-medium whitespace-nowrap', i === stepIdx ? '[color:var(--pf-text)]' : '[color:var(--pf-color-muted)]')}>{STEP_LABEL[s]}</span>
              {i < steps.length - 1 && <ChevronRight size={14} className="[color:var(--pf-color-muted)] mx-1 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      <div className={embedded ? 'pt-4' : 'p-6 max-w-2xl'}>
        <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-sm p-6">

          {/* 1 · Thông tin giải */}
          {step === 'info' && (
            <div className="space-y-4">
              {!isEdit && (
                <div>
                  <Label>Bộ Môn *</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {presets.map(p => (
                      <label key={p.code} className={cn('flex flex-col gap-0.5 rounded-lg px-3 py-2.5 border transition-colors', p.implemented ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed', form.sport === p.code ? '[background:var(--pf-primary-soft)] [border-color:var(--pf-primary)]' : '[background:var(--pf-surface-muted)] border-transparent hover:[background:var(--pf-color-muted-soft)]')}>
                        <span className="flex items-center gap-2 text-sm font-medium [color:var(--pf-text)]">
                          <input type="radio" name="sport" checked={form.sport === p.code} disabled={!p.implemented}
                            onChange={() => p.implemented && pickSport(p.code as SportType)} className="accent-[var(--pf-primary)]" />
                          {p.icon} {p.name}
                        </span>
                        <span className="text-xs [color:var(--pf-color-muted)] ml-5">{p.implemented ? p.competitions.map(c => c.label).slice(0, 3).join(' · ') : 'Sắp có (M2)'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div><Label>Tên Giải Đấu *</Label>
                <input type="text" value={form.name} onChange={e => set({ name: e.target.value })} placeholder="VD: Giải Pickleball Q2/2026"
                  className="w-full border border-[color:var(--pf-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" /></div>
              <div><Label>Mô tả</Label>
                <textarea rows={2} value={form.description} onChange={e => set({ description: e.target.value })} placeholder="Mô tả giải đấu..."
                  className="w-full border border-[color:var(--pf-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] resize-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Ngày bắt đầu</Label><input type="date" value={form.startDate} onChange={e => set({ startDate: e.target.value })} className="w-full border border-[color:var(--pf-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" /></div>
                <div><Label>Ngày kết thúc</Label><input type="date" value={form.endDate} onChange={e => set({ endDate: e.target.value })} className="w-full border border-[color:var(--pf-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" /></div>
              </div>
              <div><Label>Ghi chú</Label><textarea rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })} className="w-full border border-[color:var(--pf-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] resize-none" /></div>
            </div>
          )}

          {/* 2 · Nội dung thi đấu */}
          {step === 'competition' && (
            <div className="space-y-3">
              <p className="text-sm [color:var(--pf-color-muted)]">Chọn nội dung thi đấu cho {preset.icon} {preset.name}.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {preset.competitions.map(c => (
                  <label key={c.code} className={cn('flex flex-col gap-0.5 rounded-lg px-3 py-2.5 cursor-pointer border transition-colors', form.competition === c.code ? '[background:var(--pf-primary-soft)] [border-color:var(--pf-primary)]' : '[background:var(--pf-surface-muted)] border-transparent hover:[background:var(--pf-color-muted-soft)]')}>
                    <span className="flex items-center gap-2 text-sm font-medium [color:var(--pf-text)]">
                      <input type="radio" name="competition" checked={form.competition === c.code} onChange={() => set({ competition: c.code })} className="accent-[var(--pf-primary)]" />
                      {c.label}
                    </span>
                    <span className="text-xs [color:var(--pf-color-muted)] ml-5">{c.participantType === 'PAIR' ? 'Đôi' : c.participantType === 'TEAM' ? 'Đội' : 'Cá nhân'}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 3 · Thể thức */}
          {step === 'format' && (
            <div className="space-y-3">
              {isEdit && <div className="rounded-lg border border-[color:var(--pf-color-warning-soft)] [background:var(--pf-color-warning-soft)] px-3 py-2 text-xs [color:var(--pf-color-warning)]">Không đổi thể thức khi chỉnh sửa giải đã tạo.</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {preset.formats.map(f => {
                  const active = form.formatType === f.dbFormat && form.formatCode === f.code
                  return (
                    <label key={f.code} className={cn('flex flex-col gap-0.5 rounded-lg px-3 py-2.5 border transition-colors', (!f.implemented || isEdit) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer', active ? '[background:var(--pf-primary-soft)] [border-color:var(--pf-primary)]' : '[background:var(--pf-surface-muted)] border-transparent hover:[background:var(--pf-color-muted-soft)]')}>
                      <span className="flex items-center gap-2 text-sm font-medium [color:var(--pf-text)]">
                        <input type="radio" name="format" checked={active} disabled={!f.implemented || isEdit}
                          onChange={() => f.implemented && set({ formatType: f.dbFormat as MinigameFormatType, formatCode: f.code })} className="accent-[var(--pf-primary)]" />
                        {f.label}
                        {!f.implemented && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]">Sắp có</span>}
                      </span>
                      <span className="text-xs [color:var(--pf-color-muted)] ml-5">{f.implemented ? (f.sub ?? '') : (f.note ?? 'M2')}</span>
                    </label>
                  )
                })}
              </div>
              {needPairing && (
                <div className="mt-1">
                  <Label>Cách Ghép Cặp (nội dung đôi)</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {([{ value: 'RANDOM_PAIRING', label: '🎲 Ngẫu Nhiên', sub: 'Ghép cặp tự động ngẫu nhiên' }, { value: 'BALANCED_SKILL_PAIRING', label: '⚖️ Cân Bằng Trình Độ', sub: 'Cân bằng skill giữa các đội' }, { value: 'MANUAL_PAIRING', label: '✋ Thủ Công', sub: 'Tự chọn cặp trong dashboard' }] as const).map(opt => (
                      <label key={opt.value} className={cn('flex flex-col gap-0.5 rounded-lg px-3 py-2 cursor-pointer border transition-colors', form.pairingMode === opt.value ? '[background:var(--pf-color-warning-soft)] border-[color:var(--pf-color-warning-soft)]' : '[background:var(--pf-surface-muted)] border-transparent hover:[background:var(--pf-color-muted-soft)]')}>
                        <span className="flex items-center gap-2 text-sm font-medium [color:var(--pf-text)]">
                          <input type="radio" name="pairingMode" checked={form.pairingMode === opt.value} onChange={() => set({ pairingMode: opt.value })} className="accent-[var(--pf-color-warning)]" />
                          {opt.label}
                        </span>
                        <span className="text-xs [color:var(--pf-color-muted)] ml-5">{opt.sub}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4 · Luật thi đấu */}
          {step === 'rules' && (
            <div className="space-y-5">
              {isLeaderboard ? (
                <div>
                  <Label>{isRunning ? `Số lần chạy / cự ly (${form.rounds})` : `Số vòng đấu (${form.rounds})`}</Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(isRunning ? [{ r: 1, label: '1 lần' }, { r: 2, label: '2 lần' }, { r: 3, label: '3 lần' }] : [{ r: 1, label: '1 vòng (18 hố)' }, { r: 2, label: '2 vòng' }, { r: 4, label: '4 vòng (giải lớn)' }]).map(p => (
                      <button key={p.r} type="button" onClick={() => set({ rounds: p.r })} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors', form.rounds === p.r ? 'text-white [background:var(--pf-primary)] border-transparent' : '[color:var(--pf-color-muted)] [background:var(--pf-surface-muted)] border-[color:var(--pf-border)] hover:[background:var(--pf-color-muted-soft)]')}>{p.label}</button>
                    ))}
                  </div>
                  <input type="range" min={1} max={8} value={form.rounds} onChange={e => set({ rounds: +e.target.value })} className="w-full accent-[var(--pf-primary)]" />
                  <p className="mt-2 text-xs [color:var(--pf-color-muted)]">{isRunning ? <>Mỗi lần ghi 1 thời gian về đích. BXH tính <b>tổng thời gian</b> — nhỏ nhất đứng đầu.</> : <>Mỗi vòng golfer ghi 1 số gậy. BXH tính <b>tổng gậy</b> — nhỏ nhất đứng đầu.</>}</p>
                </div>
              ) : (
                <>
                  {isTeamSport && (
                    <div>
                      <Label>Mẫu tính điểm nhanh</Label>
                      <div className="flex flex-wrap gap-2">
                        {(isBasketball ? [{ w: 2, d: 0, label: 'Thắng 2 - Thua 0', draw: false }, { w: 3, d: 0, label: 'Thắng 3 - Thua 0', draw: false }] : [{ w: 3, d: 1, label: 'Chuẩn 3-1-0', draw: true }, { w: 2, d: 1, label: '2-1-0', draw: true }]).map(p => (
                          <button key={p.label} type="button" onClick={() => set({ winPoints: p.w, drawPoints: p.d, lossPoints: 0, allowDraw: p.draw })} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors', form.winPoints === p.w && form.drawPoints === p.d ? 'text-white [background:var(--pf-primary)] border-transparent' : '[color:var(--pf-color-muted)] [background:var(--pf-surface-muted)] border-[color:var(--pf-border)] hover:[background:var(--pf-color-muted-soft)]')}>{p.label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {form.formatType === 'GROUP_STAGE' ? (
                    <div><Label>Số {isPairComp ? 'cặp' : 'người'} mỗi bảng ({form.groupSize})</Label>
                      <input type="range" min={2} max={16} value={form.groupSize} onChange={e => set({ groupSize: +e.target.value })} className="w-full accent-[var(--pf-primary)]" />
                      <div className="mt-1 flex justify-between text-[10px] [color:var(--pf-color-muted)]"><span>2</span><span>16</span></div></div>
                  ) : (
                    <div><Label>Chế độ bốc thăm mặc định</Label>
                      <select value={form.drawMode} onChange={e => set({ drawMode: e.target.value as DrawMode })} className="w-full border border-[color:var(--pf-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]">
                        <option value="RANDOM">Ngẫu Nhiên (Random)</option><option value="FAIR_ROTATION">Công Bằng Theo Lượt</option><option value="BALANCED_SKILL">Cân Bằng Trình Độ</option>
                      </select></div>
                  )}
                  <div className="flex items-center justify-between p-3 [background:var(--pf-surface-muted)] rounded-lg">
                    <div><p className="text-sm font-medium [color:var(--pf-text)]">Cho phép hòa</p><p className="text-xs [color:var(--pf-color-muted)]">Trận có thể kết thúc với tỷ số bằng nhau</p></div>
                    <button onClick={() => set({ allowDraw: !form.allowDraw })} className={cn('relative inline-flex h-6 w-11 rounded-full transition-colors', form.allowDraw ? '[background:var(--pf-primary)]' : '[background:var(--pf-border)]')}>
                      <span className={cn('inline-block h-5 w-5 rounded-full [background:var(--pf-surface)] shadow transition-transform mt-0.5', form.allowDraw ? 'translate-x-5 ml-0.5' : 'translate-x-0.5')} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[{ label: 'Điểm thắng', key: 'winPoints', disabled: false }, { label: 'Điểm hòa', key: 'drawPoints', disabled: !form.allowDraw }, { label: 'Điểm thua', key: 'lossPoints', disabled: true }].map(({ label, key, disabled }) => (
                      <div key={key}><Label>{label}</Label>
                        <input type="number" min={0} value={form[key as keyof FormState] as number} onChange={e => set({ [key]: +e.target.value } as Partial<FormState>)} disabled={disabled} className="w-full border border-[color:var(--pf-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] disabled:[background:var(--pf-surface-muted)] disabled:[color:var(--pf-color-muted)]" /></div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 5 · VĐV / Cặp / Đội (chỉ môn dùng participants) */}
          {step === 'participants' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm [color:var(--pf-color-muted)]">Chọn thành viên tham gia (tối thiểu 4)</p>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', form.selectedMemberIds.length >= 4 ? '[background:var(--pf-color-success-soft)] [color:var(--pf-color-success)]' : '[background:var(--pf-color-warning-soft)] [color:var(--pf-color-warning)]')}>{form.selectedMemberIds.length} đã chọn</span>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {members.filter(m => m.status === 'active').map(m => {
                  const checked = form.selectedMemberIds.includes(m.id)
                  return (
                    <div key={m.id} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors', checked ? '[background:var(--pf-primary-soft)] border [border-color:var(--pf-primary-soft)]' : '[background:var(--pf-surface-muted)] border border-transparent hover:[background:var(--pf-color-muted-soft)]')}>
                      <input type="checkbox" checked={checked} onChange={() => toggleMember(m.id)} className="accent-[var(--pf-primary)] h-4 w-4 cursor-pointer" />
                      <span className="text-sm font-medium [color:var(--pf-text)] flex-1 cursor-pointer" onClick={() => toggleMember(m.id)}>{m.fullName}</span>
                      {m.phone && <span className="text-xs [color:var(--pf-color-muted)]">{m.phone}</span>}
                      {checked && <button type="button" onClick={() => toggleMember(m.id)} className="[color:var(--pf-color-muted)] hover:[color:var(--pf-color-danger)] transition-colors ml-1"><X size={14} /></button>}
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-[color:var(--pf-border)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">Khách Mời</span>
                  {!showAddGuest && <button type="button" onClick={() => { setShowAddGuest(true); setTimeout(() => guestInputRef.current?.focus(), 50) }} className="flex items-center gap-1.5 text-xs font-semibold [color:var(--pf-primary)] transition-colors"><UserPlus size={14} /> Thêm Khách</button>}
                </div>
                {form.guestMembers.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {form.guestMembers.map(g => {
                      const checked = form.selectedMemberIds.includes(g.id)
                      return (
                        <div key={g.id} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors', checked ? '[background:var(--pf-primary-soft)] border [border-color:var(--pf-primary-soft)]' : '[background:var(--pf-surface-muted)] border border-transparent')}>
                          <input type="checkbox" checked={checked} onChange={() => toggleMember(g.id)} className="accent-[var(--pf-primary)] h-4 w-4 cursor-pointer" />
                          <span className="text-sm font-medium [color:var(--pf-text)] flex-1">{g.name}</span>
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">Khách</span>
                          <button type="button" onClick={() => removeGuest(g.id)} className="[color:var(--pf-color-muted)] hover:[color:var(--pf-color-danger)] transition-colors ml-1"><X size={14} /></button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {showAddGuest && (
                  <div className="flex items-center gap-2 p-2 [background:var(--pf-primary-soft)] border [border-color:var(--pf-primary-soft)] rounded-lg">
                    <input ref={guestInputRef} type="text" value={guestName} onChange={e => setGuestName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addGuest(); if (e.key === 'Escape') { setShowAddGuest(false); setGuestName('') } }} placeholder="Tên khách mời..." className="flex-1 [background:var(--pf-surface)] border border-[color:var(--pf-border)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" />
                    <button type="button" onClick={addGuest} disabled={!guestName.trim()} className="px-3 py-1.5 rounded-lg [background:var(--pf-primary)] text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Thêm</button>
                    <button type="button" onClick={() => { setShowAddGuest(false); setGuestName('') }} className="[color:var(--pf-color-muted)] transition-colors"><X size={16} /></button>
                  </div>
                )}
                {form.guestMembers.length === 0 && !showAddGuest && <p className="text-xs [color:var(--pf-color-muted)] italic">Chưa có khách mời. Nhấn "Thêm Khách" để thêm người ngoài CLB.</p>}
              </div>
            </div>
          )}

          {/* 6 · Lịch & địa điểm */}
          {step === 'schedule' && (
            <div className="space-y-4">
              <div><Label>Thời gian dự kiến bắt đầu</Label>
                <input type="datetime-local" value={form.scheduledAt} onChange={e => set({ scheduledAt: e.target.value })} className="w-full border border-[color:var(--pf-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" /></div>
              <div className="rounded-lg border border-[color:var(--pf-color-info-soft)] [background:var(--pf-color-info-soft)] px-3 py-2.5 text-xs [color:var(--pf-color-info)] flex gap-2">
                <Info size={15} className="shrink-0 mt-0.5" />
                <span>Lịch thi đấu chi tiết ({preset.resourceTerm}, vòng, cặp/đội) được tạo & điều chỉnh ở tab <b>Lịch đấu</b> sau khi tạo giải — nơi bốc thăm/sinh vòng đấu và khóa lịch.</span>
              </div>
            </div>
          )}

          {/* 7 · Xác nhận */}
          {step === 'confirm' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold [color:var(--pf-text)]">Kiểm tra lại trước khi tạo</p>
              <div className="rounded-xl border border-[color:var(--pf-border)] divide-y divide-[color:var(--pf-border)] text-sm">
                {[
                  ['Bộ môn', `${preset.icon} ${preset.name}`],
                  ['Nội dung', selectedComp?.label ?? '—'],
                  ['Thể thức', preset.formats.find(f => f.code === form.formatCode)?.label ?? form.formatType],
                  ['Tên giải', form.name || '—'],
                  ['Thời gian', form.startDate + (form.endDate ? ` → ${form.endDate}` : '')],
                  ...(isLeaderboard ? [[isRunning ? 'Số lần chạy' : 'Số vòng', String(form.rounds)]] : []),
                  ...(!isTeamSport && !isLeaderboard ? [['Số VĐV/khách', String(form.selectedMemberIds.length)]] : []),
                  ...(isTeamSport || isLeaderboard ? [['Lưu ý', isRunning ? 'Vận động viên thêm sau khi tạo' : isGolf ? 'Golfer thêm sau khi tạo' : 'Đội & cầu thủ dựng sau khi tạo']] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-3 py-2">
                    <span className="[color:var(--pf-color-muted)]">{k}</span>
                    <span className="font-medium [color:var(--pf-text)] text-right">{v}</span>
                  </div>
                ))}
              </div>
              {!isTeamSport && !isLeaderboard && form.selectedMemberIds.length < 4 && <p className="text-xs [color:var(--pf-color-warning)]">Cần tối thiểu 4 VĐV/khách — quay lại bước "VĐV / Cặp / Đội".</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4">
          <Button variant="secondary" onClick={() => stepIdx > 0 ? setStepIdx(s => s - 1) : navigate('/minigames')}>
            <ChevronLeft size={16} /> {stepIdx === 0 ? 'Hủy' : 'Quay lại'}
          </Button>
          {stepIdx < steps.length - 1 ? (
            <Button onClick={() => setStepIdx(s => s + 1)} disabled={!canNext()}>Tiếp theo <ChevronRight size={16} /></Button>
          ) : (
            <Button onClick={handleSubmit} disabled={creating || (!isTeamSport && !isLeaderboard && form.selectedMemberIds.length < 4)}>
              <Check size={16} /> {isFootball ? 'Tạo Giải Bóng Đá' : isBasketball ? 'Tạo Giải Bóng Rổ' : isGolf ? 'Tạo Giải Golf' : isRunning ? 'Tạo Giải Chạy Bộ' : isEdit ? 'Lưu Thay Đổi' : 'Tạo Giải Đấu'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
