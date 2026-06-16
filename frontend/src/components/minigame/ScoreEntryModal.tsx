import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
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

export function ScoreEntryModal({ open, onClose, match, minigame, groupName }: Props) {
  const { enterScore } = useMinigameStore()
  const [p1Score, setP1Score] = useState('')
  const [p2Score, setP2Score] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (match) {
      setP1Score(match.player1Score != null ? String(match.player1Score) : '')
      setP2Score(match.player2Score != null ? String(match.player2Score) : '')
      setMatchDate(match.matchDate ?? new Date().toISOString().slice(0, 10))
      setNotes(match.notes ?? '')
    }
  }, [match])

  if (!match || !minigame) return null

  const s1 = p1Score !== '' ? parseInt(p1Score, 10) : null
  const s2 = p2Score !== '' ? parseInt(p2Score, 10) : null
  const bothEntered = s1 !== null && s2 !== null && !isNaN(s1) && !isNaN(s2)
  const isDraw = bothEntered && s1 === s2
  const noDrawAllowed = isDraw && !minigame.allowDraw
  const winner = bothEntered && !isDraw ? (s1 > s2 ? match.player1Name : match.player2Name) : null

  const handleSave = () => {
    if (!bothEntered) { toast.error('Vui lòng nhập điểm cho cả hai người chơi'); return }
    if (noDrawAllowed) { toast.error('Không cho phép hòa trong giải đấu này'); return }
    enterScore(match.id, s1!, s2!, notes || undefined)
    toast.success('Đã lưu kết quả trận đấu!')
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
          <Button onClick={handleSave} disabled={noDrawAllowed}>Lưu Kết Quả</Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Players */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="font-semibold text-slate-800 text-sm mb-2">{match.player1Name}</p>
            <input
              type="number"
              min={0}
              value={p1Score}
              onChange={e => setP1Score(e.target.value)}
              placeholder="0"
              className="w-full text-center text-3xl font-bold border border-slate-200 rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-800 text-sm mb-2">{match.player2Name}</p>
            <input
              type="number"
              min={0}
              value={p2Score}
              onChange={e => setP2Score(e.target.value)}
              placeholder="0"
              className="w-full text-center text-3xl font-bold border border-slate-200 rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>
        </div>

        {/* Result banner */}
        {bothEntered && (
          <div className={`rounded-xl py-3 text-center font-semibold text-sm ${
            noDrawAllowed ? 'bg-red-50 text-red-600 border border-red-200' :
            isDraw ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {noDrawAllowed ? '⚠️ Không cho phép hòa trong giải đấu này' :
             isDraw ? '🤝 Hòa!' :
             `🏆 ${winner} thắng!`}
          </div>
        )}

        {/* Date */}
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Ngày thi đấu</label>
          <input
            type="date"
            value={matchDate}
            onChange={e => setMatchDate(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Ghi chú</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ghi chú về trận đấu..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
      </div>
    </Modal>
  )
}
