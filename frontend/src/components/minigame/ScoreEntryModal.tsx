import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import api from '../../lib/api'
import { useMinigameStore } from '../../store/minigameStore'
import type { MiniGameMatch, MiniGame } from '../../types/minigame'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  match: MiniGameMatch | null
  minigame: MiniGame | null
  groupName?: string
}

const SET_BASED = ['TENNIS', 'BADMINTON', 'TABLE_TENNIS', 'VOLLEYBALL', 'AIR_VOLLEYBALL']

export function ScoreEntryModal({ open, onClose, match, minigame, groupName }: Props) {
  const { enterScore } = useMinigameStore()
  const [p1Score, setP1Score] = useState('')
  const [p2Score, setP2Score] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [notes, setNotes] = useState('')
  // M9: nhập theo SET cho môn set-based (Tennis/Cầu lông/Bóng bàn/Bóng chuyền).
  const [sets, setSets] = useState<Array<{ a: string; b: string }>>([{ a: '', b: '' }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (match) {
      setP1Score(match.player1Score != null ? String(match.player1Score) : '')
      setP2Score(match.player2Score != null ? String(match.player2Score) : '')
      setMatchDate(match.matchDate ?? new Date().toISOString().slice(0, 10))
      setNotes(match.notes ?? '')
      const detail = (match as unknown as { scoreDetail?: Array<{ a: number; b: number }> }).scoreDetail
      setSets(Array.isArray(detail) && detail.length ? detail.map(d => ({ a: String(d.a), b: String(d.b) })) : [{ a: '', b: '' }])
    }
  }, [match])

  if (!match || !minigame) return null

  const setBased = SET_BASED.includes((minigame as unknown as { sport?: string }).sport ?? '')

  // Set-based: đếm số set thắng từ các set đã nhập đầy đủ.
  const validSets = sets.filter(s => s.a !== '' && s.b !== '' && !isNaN(+s.a) && !isNaN(+s.b) && +s.a !== +s.b)
  const setsWonA = validSets.filter(s => +s.a > +s.b).length
  const setsWonB = validSets.filter(s => +s.b > +s.a).length

  const s1 = setBased ? (validSets.length ? setsWonA : null) : (p1Score !== '' ? parseInt(p1Score, 10) : null)
  const s2 = setBased ? (validSets.length ? setsWonB : null) : (p2Score !== '' ? parseInt(p2Score, 10) : null)
  const bothEntered = s1 !== null && s2 !== null && !isNaN(s1) && !isNaN(s2)
  const isDraw = bothEntered && s1 === s2
  const noDrawAllowed = isDraw && !minigame.allowDraw
  const winner = bothEntered && !isDraw ? (s1! > s2! ? match.player1Name : match.player2Name) : null

  const handleSave = async () => {
    if (setBased && validSets.length === 0) { toast.error('Nhập ít nhất 1 set hợp lệ (không hòa từng set)'); return }
    if (!bothEntered) { toast.error('Vui lòng nhập điểm cho cả hai người chơi'); return }
    if (noDrawAllowed) { toast.error('Không cho phép hòa trong giải đấu này'); return }
    enterScore(match.id, s1!, s2!, notes || undefined)
    setSaving(true)
    try {
      await api.patch(`/minigames/matches/${match.id}/score`, {
        scoreA: s1!, scoreB: s2!, playedAt: matchDate || undefined, note: notes || undefined,
        ...(setBased ? { scoreDetail: validSets.map(s => ({ a: +s.a, b: +s.b })) } : {}),
      })
      toast.success('Đã lưu kết quả trận đấu!')
    } catch {
      toast.error('Kết quả đã lưu cục bộ nhưng không thể đồng bộ lên server')
    } finally {
      setSaving(false)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nhập Kết Quả Trận Đấu"
      subtitle={groupName ? `${groupName}${match.matchDate ? ' · ' + match.matchDate : ''}` : undefined}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSave} disabled={noDrawAllowed || saving}>{saving ? 'Đang lưu…' : 'Lưu Kết Quả'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        {setBased ? (
          /* M9: nhập theo SET — mỗi set 1 dòng điểm; số set thắng = kết quả trận. */
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold [color:var(--pf-color-muted)]">
              <span className="truncate max-w-[40%]">{match.player1Name}</span>
              <span>Điểm từng set</span>
              <span className="truncate max-w-[40%] text-right">{match.player2Name}</span>
            </div>
            {sets.map((st, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs [color:var(--pf-color-muted)] w-10">Set {i + 1}</span>
                <input inputMode="numeric" value={st.a} onChange={e => setSets(s => s.map((x, j) => j === i ? { ...x, a: e.target.value.replace(/\D/g, '') } : x))}
                  className="flex-1 text-center text-lg font-bold border border-[color:var(--pf-border)] rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" />
                <span className="[color:var(--pf-color-muted)]">-</span>
                <input inputMode="numeric" value={st.b} onChange={e => setSets(s => s.map((x, j) => j === i ? { ...x, b: e.target.value.replace(/\D/g, '') } : x))}
                  className="flex-1 text-center text-lg font-bold border border-[color:var(--pf-border)] rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]" />
                {sets.length > 1 && <button onClick={() => setSets(s => s.filter((_, j) => j !== i))} className="[color:var(--pf-color-danger)] text-xs px-1">✕</button>}
              </div>
            ))}
            <button onClick={() => setSets(s => [...s, { a: '', b: '' }])} className="text-xs font-semibold [color:var(--pf-primary)]">+ Thêm set</button>
            {validSets.length > 0 && <p className="text-xs [color:var(--pf-color-muted)]">Tỉ số set: <b>{setsWonA} - {setsWonB}</b></p>}
          </div>
        ) : (
          /* Players (điểm đơn) */
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="font-semibold [color:var(--pf-text)] text-sm mb-2">{match.player1Name}</p>
              <input type="number" min={0} value={p1Score} onChange={e => setP1Score(e.target.value)} placeholder="0"
                className="w-full text-center text-3xl font-bold border border-[color:var(--pf-border)] rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] [color:var(--pf-text)]" />
            </div>
            <div className="text-center">
              <p className="font-semibold [color:var(--pf-text)] text-sm mb-2">{match.player2Name}</p>
              <input type="number" min={0} value={p2Score} onChange={e => setP2Score(e.target.value)} placeholder="0"
                className="w-full text-center text-3xl font-bold border border-[color:var(--pf-border)] rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] [color:var(--pf-text)]" />
            </div>
          </div>
        )}

        {/* Result banner */}
        {bothEntered && (
          <div className={`rounded-xl py-3 text-center font-semibold text-sm ${
            noDrawAllowed ? '[background:var(--pf-color-danger-soft)] [color:var(--pf-color-danger)] border border-[color:var(--pf-color-danger-soft)]' :
            isDraw ? '[background:var(--pf-color-warning-soft)] [color:var(--pf-color-warning)] border border-[color:var(--pf-color-warning-soft)]' :
            '[background:var(--pf-color-success-soft)] [color:var(--pf-color-success)] border border-[color:var(--pf-color-success-soft)]'
          }`}>
            {noDrawAllowed ? '⚠️ Không cho phép hòa trong giải đấu này' :
             isDraw ? '🤝 Hòa!' :
             `🏆 ${winner} thắng!`}
          </div>
        )}

        {/* Date */}
        <div>
          <label className="text-xs font-medium [color:var(--pf-color-muted)] mb-1 block">Ngày thi đấu</label>
          <input
            type="date"
            value={matchDate}
            onChange={e => setMatchDate(e.target.value)}
            className="w-full border border-[color:var(--pf-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)]"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium [color:var(--pf-color-muted)] mb-1 block">Ghi chú</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ghi chú về trận đấu..."
            className="w-full border border-[color:var(--pf-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--pf-primary)] resize-none"
          />
        </div>
      </div>
    </Modal>
  )
}
