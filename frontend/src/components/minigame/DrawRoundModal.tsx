import { useState, useCallback, useEffect } from 'react'
import { X, ChevronRight, RefreshCw, Check, AlertCircle, Users, Zap, Pencil } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useMinigameStore } from '../../store/minigameStore'
import type { DrawMode, DrawRoundPreview, GenderBalanceMode, DoublesPlayer } from '../../types/minigame'
import { isGuestId } from '../../types/minigame'
import { Portal } from '../ui/Portal'

const MODES: { mode: DrawMode; label: string; sublabel: string; icon: string }[] = [
  { mode: 'SMART_DRAW',       label: 'Thông Minh',    sublabel: 'Cân bằng tổng hợp',     icon: '🎯' },
  { mode: 'RANDOM',           label: 'Ngẫu Nhiên',    sublabel: 'Hoàn toàn ngẫu nhiên',  icon: '🎲' },
  { mode: 'FAIR_ROTATION',    label: 'Luân Phiên',    sublabel: 'Ưu tiên ít đánh',        icon: '🔄' },
  { mode: 'BALANCED_SKILL',   label: 'Cân Bằng KN',   sublabel: 'Đội trình độ ngang',    icon: '⚖️' },
  { mode: 'GENDER_BALANCED',  label: 'Cân Bằng GT',   sublabel: 'Mỗi đội nam/nữ',        icon: '⚧' },
]

const GENDER_MODES: { mode: GenderBalanceMode; label: string }[] = [
  { mode: 'OFF', label: 'Tắt' },
  { mode: 'PREFERRED', label: 'Ưu tiên' },
  { mode: 'REQUIRED', label: 'Bắt buộc' },
]

interface Props {
  minigameId: string
  isOpen: boolean
  onClose: () => void
}

type SelectedChip = { kind: 'match'; matchIdx: number; team: 1 | 2; playerIdx: number } | { kind: 'sitout'; playerIdx: number }

function swapPlayers(preview: DrawRoundPreview, a: SelectedChip, b: SelectedChip): DrawRoundPreview {
  const matches = preview.matches.map(m => ({ ...m, team1: [...m.team1], team2: [...m.team2] }))
  const sitOuts = [...preview.sitOuts]

  const getPlayer = (chip: SelectedChip): DoublesPlayer => {
    if (chip.kind === 'sitout') return sitOuts[chip.playerIdx]
    const m = matches[chip.matchIdx]
    return chip.team === 1 ? m.team1[chip.playerIdx] : m.team2[chip.playerIdx]
  }
  const setPlayer = (chip: SelectedChip, player: DoublesPlayer) => {
    if (chip.kind === 'sitout') { sitOuts[chip.playerIdx] = player; return }
    const m = matches[chip.matchIdx]
    if (chip.team === 1) m.team1[chip.playerIdx] = player
    else m.team2[chip.playerIdx] = player
  }

  const playerA = getPlayer(a)
  const playerB = getPlayer(b)
  setPlayer(a, playerB)
  setPlayer(b, playerA)

  const recompute = (m: { team1: DoublesPlayer[]; team2: DoublesPlayer[] }) => {
    const s1 = m.team1.reduce((s, p) => s + (p.skillLevel ?? 50), 0)
    const s2 = m.team2.reduce((s, p) => s + (p.skillLevel ?? 50), 0)
    return {
      skillDiff: Math.abs(s1 - s2),
      isGenderBalanced:
        (m.team1.some(p => p.gender === 'MALE') && m.team1.some(p => p.gender === 'FEMALE')) ||
        (m.team2.some(p => p.gender === 'MALE') && m.team2.some(p => p.gender === 'FEMALE')),
    }
  }

  const newMatches = matches.map(m => ({ ...m, ...recompute(m) }))
  const genderRequirementMet = preview.genderBalanceMode === 'REQUIRED'
    ? newMatches.every(m => m.isGenderBalanced)
    : preview.genderRequirementMet

  return { ...preview, matches: newMatches, sitOuts, genderRequirementMet }
}

function chipKey(chip: SelectedChip): string {
  return chip.kind === 'sitout' ? `sitout-${chip.playerIdx}` : `match-${chip.matchIdx}-${chip.team}-${chip.playerIdx}`
}

export function DrawRoundModal({ minigameId, isOpen, onClose }: Props) {
  const { participants, previewDrawRound, confirmRoundFromPreview, getRoundDetail, getRounds } = useMinigameStore()

  const activeParts = participants.filter(p => p.minigameId === minigameId && p.status === 'ACTIVE')

  const [step, setStep] = useState<'config' | 'preview'>('config')
  const [drawMode, setDrawMode] = useState<DrawMode>('SMART_DRAW')
  const [avoidRepeatPartners, setAvoidRepeatPartners] = useState(true)
  const [avoidRepeatOpponents, setAvoidRepeatOpponents] = useState(true)
  const [prioritizeSitOuts, setPrioritizeSitOuts] = useState(true)
  const [genderBalanceMode, setGenderBalanceMode] = useState<GenderBalanceMode>('PREFERRED')
  const [courtCount, setCourtCount] = useState(2)
  const [maxMatchesAuto, setMaxMatchesAuto] = useState(true)
  const [maxMatches, setMaxMatches] = useState(2)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(activeParts.map(p => p.memberId)))
  const [preview, setPreview] = useState<DrawRoundPreview | null>(null)
  const [acknowledgeInProgress, setAcknowledgeInProgress] = useState(false)
  const [isManualEdit, setIsManualEdit] = useState(false)
  const [selectedChip, setSelectedChip] = useState<SelectedChip | null>(null)

  useEffect(() => {
    if (isOpen) {
      setStep('config')
      setDrawMode('SMART_DRAW')
      setAvoidRepeatPartners(true)
      setAvoidRepeatOpponents(true)
      setPrioritizeSitOuts(true)
      setGenderBalanceMode('PREFERRED')
      setCourtCount(2)
      setMaxMatchesAuto(true)
      setMaxMatches(2)
      setSelectedIds(new Set(activeParts.map(p => p.memberId)))
      setPreview(null)
      setAcknowledgeInProgress(false)
      setIsManualEdit(false)
      setSelectedChip(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const toggleMember = (memberId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  // Round-in-progress guard
  const mgRounds = getRounds(minigameId)
  const currentRound = mgRounds.length > 0 ? mgRounds[mgRounds.length - 1] : null
  let pendingCount = 0
  if (currentRound && currentRound.status === 'ACTIVE') {
    const { matches } = getRoundDetail(currentRound.id)
    pendingCount = matches.filter(m => m.status === 'PENDING').length
  }
  const showInProgressGuard = pendingCount > 0

  const buildOptions = useCallback(() => ({
    avoidRepeatPartners,
    avoidRepeatOpponents,
    prioritizeSitOuts,
    memberIds: [...selectedIds],
    genderBalanceMode,
    courtCount,
    maxMatches: maxMatchesAuto ? null : maxMatches,
  }), [avoidRepeatPartners, avoidRepeatOpponents, prioritizeSitOuts, selectedIds, genderBalanceMode, courtCount, maxMatchesAuto, maxMatches])

  const handlePreview = useCallback(() => {
    const result = previewDrawRound(minigameId, drawMode, buildOptions())
    setPreview(result)
    setIsManualEdit(false)
    setSelectedChip(null)
    setStep('preview')
  }, [minigameId, drawMode, buildOptions, previewDrawRound])

  const handleConfirm = () => {
    if (!preview) return
    confirmRoundFromPreview(minigameId, preview)
    onClose()
  }

  const handleRedraw = () => {
    const result = previewDrawRound(minigameId, drawMode, buildOptions())
    setPreview(result)
    setIsManualEdit(false)
    setSelectedChip(null)
  }

  const handleChipClick = (chip: SelectedChip) => {
    if (!preview) return
    if (!selectedChip) {
      setSelectedChip(chip)
      return
    }
    if (chipKey(selectedChip) === chipKey(chip)) {
      setSelectedChip(null)
      return
    }
    const newPreview = swapPlayers(preview, selectedChip, chip)
    setPreview(newPreview)
    setSelectedChip(null)
  }

  if (!isOpen) return null

  const selectedCount = selectedIds.size
  const canPreview = selectedCount >= 4 && (!showInProgressGuard || acknowledgeInProgress)

  const fairnessColor = preview
    ? preview.fairnessScore >= 80 ? '[color:var(--pf-color-success)]' : preview.fairnessScore >= 60 ? '[color:var(--pf-color-warning)]' : '[color:var(--pf-color-danger)]'
    : ''

  const confirmBlockedByGender = !!preview && preview.genderBalanceMode === 'REQUIRED' && !preview.genderRequirementMet

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className={cn(
        'relative w-full sm:max-w-lg [background:var(--pf-surface)] shadow-2xl z-10 flex flex-col',
        'rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[85vh]',
      )}>
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full [background:var(--pf-color-muted-soft)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--pf-border)]">
          <div>
            <h2 className="text-base font-bold [color:var(--pf-text)]">
              {step === 'config' ? 'Rút Thăm Vòng Mới' : 'Xem Trước Kết Quả'}
            </h2>
            <p className="text-xs [color:var(--pf-color-muted)] mt-0.5">
              {step === 'config' ? 'Cấu hình thuật toán & thành viên' : 'Kiểm tra trước khi xác nhận'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'config' && (
            <div className="p-5 space-y-5">
              {showInProgressGuard && (
                <div className="p-3 [background:var(--pf-color-warning-soft)] border [border-color:var(--pf-color-warning-soft)] rounded-xl space-y-2">
                  <p className="text-xs [color:var(--pf-color-warning)] flex items-start gap-1.5">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    ⚠ Vòng hiện tại còn {pendingCount} trận chưa hoàn thành. Tạo vòng mới sẽ không xóa lượt cũ nhưng nên hoàn thành lượt trước.
                  </p>
                  <label className="flex items-center gap-2 text-xs [color:var(--pf-color-warning)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acknowledgeInProgress}
                      onChange={e => setAcknowledgeInProgress(e.target.checked)}
                      className="w-3.5 h-3.5 accent-[var(--pf-color-warning)]"
                    />
                    Tôi hiểu, vẫn tiếp tục
                  </label>
                </div>
              )}

              {/* Mode selector */}
              <div>
                <label className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide block mb-2">Chế độ bốc thăm</label>
                <div className="space-y-2">
                  {MODES.map(m => (
                    <button
                      key={m.mode}
                      onClick={() => setDrawMode(m.mode)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                        drawMode === m.mode
                          ? '[border-color:var(--pf-primary)] [background:var(--pf-primary-soft)]'
                          : 'border-[color:var(--pf-border)] hover:border-[color:var(--pf-border)] [background:var(--pf-surface)]',
                      )}
                    >
                      <span className="text-xl shrink-0">{m.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-semibold', drawMode === m.mode ? '[color:var(--pf-primary)]' : '[color:var(--pf-text)]')}>
                            {m.label}
                          </span>
                          {m.mode === 'SMART_DRAW' && (
                            <span className="text-[10px] font-bold [background:var(--pf-primary-soft)] [color:var(--pf-primary)] px-1.5 py-0.5 rounded-full">MẶC ĐỊNH</span>
                          )}
                        </div>
                        <p className="text-xs [color:var(--pf-color-muted)] truncate">{m.sublabel}</p>
                      </div>
                      {drawMode === m.mode && <Check size={16} className="[color:var(--pf-primary)] shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide block mb-2">Tùy chọn</label>
                <div className="space-y-2">
                  {[
                    { key: 'avoidRepeatPartners', label: 'Tránh ghép cặp lặp lại', value: avoidRepeatPartners, set: setAvoidRepeatPartners },
                    { key: 'avoidRepeatOpponents', label: 'Tránh đối thủ lặp lại', value: avoidRepeatOpponents, set: setAvoidRepeatOpponents },
                    { key: 'prioritizeSitOuts', label: 'Ưu tiên người ngồi ngoài', value: prioritizeSitOuts, set: setPrioritizeSitOuts },
                  ].map(opt => (
                    <label key={opt.key} className="flex items-center gap-3 p-3 rounded-xl [background:var(--pf-surface-muted)] cursor-pointer hover:[background:var(--pf-color-muted-soft)] transition-colors">
                      <input
                        type="checkbox"
                        checked={opt.value}
                        onChange={e => opt.set(e.target.checked)}
                        className="w-4 h-4 rounded accent-[var(--pf-primary)]"
                      />
                      <span className="text-sm [color:var(--pf-text)]">{opt.label}</span>
                    </label>
                  ))}

                  {/* Gender balance segmented control */}
                  <div className="p-3 rounded-xl [background:var(--pf-surface-muted)]">
                    <p className="text-sm [color:var(--pf-text)] mb-2">Cân bằng nam/nữ</p>
                    <div className="flex gap-1.5">
                      {GENDER_MODES.map(g => (
                        <button
                          key={g.mode}
                          onClick={() => setGenderBalanceMode(g.mode)}
                          className={cn(
                            'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            genderBalanceMode === g.mode
                              ? '[background:var(--pf-primary)] text-white'
                              : '[background:var(--pf-surface)] [color:var(--pf-color-muted)] border border-[color:var(--pf-border)] hover:border-[color:var(--pf-border)]',
                          )}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Court count / max matches */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl [background:var(--pf-surface-muted)]">
                      <label className="text-xs [color:var(--pf-color-muted)] block mb-1.5">Số sân đang có</label>
                      <input
                        type="number"
                        min={1}
                        value={courtCount}
                        onChange={e => setCourtCount(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full border border-[color:var(--pf-border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]"
                      />
                    </div>
                    <div className="p-3 rounded-xl [background:var(--pf-surface-muted)]">
                      <label className="text-xs [color:var(--pf-color-muted)] block mb-1.5">Số trận tối đa</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          disabled={maxMatchesAuto}
                          value={maxMatches}
                          onChange={e => setMaxMatches(Math.max(1, Number(e.target.value) || 1))}
                          className="w-full border border-[color:var(--pf-border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] disabled:[background:var(--pf-color-muted-soft)] disabled:[color:var(--pf-color-muted)]"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 mt-1.5 text-xs [color:var(--pf-color-muted)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={maxMatchesAuto}
                          onChange={e => setMaxMatchesAuto(e.target.checked)}
                          className="w-3.5 h-3.5 accent-[var(--pf-primary)]"
                        />
                        Tự động
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Member selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">
                    Thành viên tham gia
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs [color:var(--pf-color-muted)]">{selectedCount}/{activeParts.length}</span>
                    <button
                      onClick={() => {
                        if (selectedCount === activeParts.length) setSelectedIds(new Set())
                        else setSelectedIds(new Set(activeParts.map(p => p.memberId)))
                      }}
                      className="text-xs [color:var(--pf-primary)] hover:underline"
                    >
                      {selectedCount === activeParts.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
                  {activeParts.map(p => (
                    <label
                      key={p.memberId}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-all',
                        selectedIds.has(p.memberId)
                          ? '[border-color:var(--pf-primary)] [background:var(--pf-primary-soft)] [color:var(--pf-primary)]'
                          : 'border-[color:var(--pf-border)] [background:var(--pf-surface)] [color:var(--pf-color-muted)] hover:border-[color:var(--pf-border)]',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.memberId)}
                        onChange={() => toggleMember(p.memberId)}
                        className="w-3.5 h-3.5 accent-[var(--pf-primary)] shrink-0"
                      />
                      <span className="truncate font-medium text-xs">{p.memberName}</span>
                      {isGuestId(p.memberId) && <span className="shrink-0 text-[9px] font-medium px-1 py-0.5 rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">Khách</span>}
                    </label>
                  ))}
                </div>
                {selectedCount < 4 && (
                  <p className="text-xs [color:var(--pf-color-danger)] mt-2 flex items-center gap-1">
                    <AlertCircle size={12} /> Cần chọn tối thiểu 4 thành viên
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="p-5 space-y-4">
              {/* Fairness score */}
              <div className="flex items-center justify-between p-4 [background:var(--pf-surface-muted)] rounded-xl">
                <div>
                  <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide">Chỉ số công bằng</p>
                  <p className={cn('text-3xl font-bold mt-0.5', fairnessColor)}>{preview.fairnessScore}<span className="text-lg font-normal [color:var(--pf-color-muted)]">/100</span></p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs [color:var(--pf-color-muted)]">Lượt <span className="font-bold [color:var(--pf-text)]">#{preview.roundNumber}</span></p>
                  <p className="text-xs [color:var(--pf-color-muted)]">{preview.totalPlayers} người · {preview.totalMatches} trận</p>
                  {preview.sitOutCount > 0 && (
                    <p className="text-xs [color:var(--pf-color-warning)] font-medium">{preview.sitOutCount} người ngồi ngoài</p>
                  )}
                </div>
              </div>

              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <div className="space-y-1.5">
                  {preview.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 [background:var(--pf-color-warning-soft)] rounded-lg">
                      <AlertCircle size={14} className="[color:var(--pf-color-warning)] shrink-0 mt-0.5" />
                      <p className="text-xs [color:var(--pf-color-warning)]">{w}</p>
                    </div>
                  ))}
                </div>
              )}

              {confirmBlockedByGender && (
                <div className="flex items-start gap-2 p-3 [background:var(--pf-color-danger-soft)] rounded-lg">
                  <AlertCircle size={14} className="[color:var(--pf-color-danger)] shrink-0 mt-0.5" />
                  <p className="text-xs [color:var(--pf-color-danger)]">Không thể xác nhận: chưa đạt yêu cầu cân bằng nam/nữ bắt buộc.</p>
                </div>
              )}

              {isManualEdit && (
                <p className="text-xs [color:var(--pf-primary)] font-medium">Chọn 2 người để đổi chỗ</p>
              )}

              {/* Matches */}
              <div>
                <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide mb-2">Danh sách trận</p>
                <div className="space-y-2">
                  {preview.matches.map((m, matchIdx) => (
                    <div key={m.matchNumber} className="[background:var(--pf-surface)] border border-[color:var(--pf-border)] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold [color:var(--pf-color-muted)]">Trận #{m.matchNumber}</span>
                        <div className="flex items-center gap-1.5">
                          {m.isGenderBalanced && (
                            <span className="text-[10px] [background:var(--pf-color-info-soft)] [color:var(--pf-color-info)] px-1.5 py-0.5 rounded-full font-semibold">Nam/Nữ</span>
                          )}
                          <span className="text-[10px] [color:var(--pf-color-muted)]">Chênh KN: {m.skillDiff}</span>
                        </div>
                      </div>
                      {!isManualEdit ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 [background:var(--pf-primary-soft)] rounded-lg px-2.5 py-1.5">
                            <p className="text-xs font-semibold [color:var(--pf-primary)] truncate">{m.team1.map(p => p.memberName).join(' & ')}</p>
                          </div>
                          <span className="text-xs font-bold [color:var(--pf-color-muted)] shrink-0">vs</span>
                          <div className="flex-1 [background:var(--pf-primary-soft)] rounded-lg px-2.5 py-1.5">
                            <p className="text-xs font-semibold [color:var(--pf-primary)] truncate">{m.team2.map(p => p.memberName).join(' & ')}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex flex-wrap gap-1">
                            {m.team1.map((p, playerIdx) => {
                              const chip: SelectedChip = { kind: 'match', matchIdx, team: 1, playerIdx }
                              const isSelected = selectedChip && chipKey(selectedChip) === chipKey(chip)
                              return (
                                <button
                                  key={p.memberId}
                                  onClick={() => handleChipClick(chip)}
                                  className={cn(
                                    'text-xs font-semibold px-2 py-1 rounded-lg transition-colors',
                                    isSelected ? '[background:var(--pf-primary)] text-white' : '[background:var(--pf-primary-soft)] [color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)]',
                                  )}
                                >
                                  {p.memberName}
                                </button>
                              )
                            })}
                          </div>
                          <span className="text-xs font-bold [color:var(--pf-color-muted)] shrink-0">vs</span>
                          <div className="flex-1 flex flex-wrap gap-1">
                            {m.team2.map((p, playerIdx) => {
                              const chip: SelectedChip = { kind: 'match', matchIdx, team: 2, playerIdx }
                              const isSelected = selectedChip && chipKey(selectedChip) === chipKey(chip)
                              return (
                                <button
                                  key={p.memberId}
                                  onClick={() => handleChipClick(chip)}
                                  className={cn(
                                    'text-xs font-semibold px-2 py-1 rounded-lg transition-colors',
                                    isSelected ? '[background:var(--pf-primary)] text-white' : '[background:var(--pf-primary-soft)] [color:var(--pf-primary)] hover:[background:var(--pf-primary-soft)]',
                                  )}
                                >
                                  {p.memberName}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sit outs */}
              {preview.sitOuts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold [color:var(--pf-color-muted)] uppercase tracking-wide mb-2">Ngồi ngoài lượt này</p>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.sitOuts.map((p, playerIdx) => {
                      if (!isManualEdit) {
                        return (
                          <span key={p.memberId} className="text-xs [background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] px-2.5 py-1 rounded-full font-medium">
                            {p.memberName}
                          </span>
                        )
                      }
                      const chip: SelectedChip = { kind: 'sitout', playerIdx }
                      const isSelected = selectedChip && chipKey(selectedChip) === chipKey(chip)
                      return (
                        <button
                          key={p.memberId}
                          onClick={() => handleChipClick(chip)}
                          className={cn(
                            'text-xs px-2.5 py-1 rounded-full font-medium transition-colors',
                            isSelected ? '[background:var(--pf-color-muted)] text-white' : '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] hover:[background:var(--pf-color-muted-soft)]',
                          )}
                        >
                          {p.memberName}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && !preview && (
            <div className="p-5 flex flex-col items-center justify-center gap-3 min-h-[200px] text-center">
              <Users size={32} className="[color:var(--pf-color-muted)]" />
              <p className="text-sm [color:var(--pf-color-muted)]">Không đủ thành viên để tạo vòng đấu</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[color:var(--pf-border)] flex gap-3">
          {step === 'config' && (
            <>
              <button onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl border border-[color:var(--pf-border)] text-sm font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] transition-colors">
                Hủy
              </button>
              <button
                onClick={handlePreview}
                disabled={!canPreview}
                className={cn(
                  'flex-[2] py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
                  canPreview
                    ? '[background:var(--pf-primary)] text-white hover:[background:var(--pf-primary-hover)]'
                    : '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] cursor-not-allowed',
                )}
              >
                Xem Trước
                <ChevronRight size={16} />
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('config')}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[color:var(--pf-border)] text-sm font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] transition-colors"
              >
                Quay lại
              </button>
              <button
                onClick={handleRedraw}
                className="py-2.5 px-3 rounded-xl border border-[color:var(--pf-border)] text-sm font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                Rút lại
              </button>
              <button
                onClick={() => { setIsManualEdit(v => !v); setSelectedChip(null) }}
                disabled={!preview}
                className={cn(
                  'py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors flex items-center gap-1.5',
                  isManualEdit
                    ? '[border-color:var(--pf-primary)] [background:var(--pf-primary-soft)] [color:var(--pf-primary)]'
                    : 'border-[color:var(--pf-border)] [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)]',
                )}
              >
                <Pencil size={14} />
                Chỉnh tay
              </button>
              <button
                onClick={handleConfirm}
                disabled={!preview || confirmBlockedByGender}
                className={cn(
                  'flex-[2] py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
                  preview && !confirmBlockedByGender
                    ? '[background:var(--pf-color-success)] text-white hover:[background:var(--pf-color-success)]'
                    : '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)] cursor-not-allowed',
                )}
              >
                <Zap size={15} />
                Xác nhận tạo vòng
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    </Portal>
  )
}
