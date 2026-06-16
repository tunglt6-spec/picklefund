import { useState, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useMinigameStore } from '../../store/minigameStore'
import type { MiniGameDoublesMatch, MiniGame } from '../../types/minigame'

interface Props {
  open: boolean
  onClose: () => void
  match: MiniGameDoublesMatch | null
  minigame: MiniGame | null
}

export function ScoreEntryDrawer({ open, onClose, match, minigame }: Props) {
  const { enterDoublesMatchResult } = useMinigameStore()
  const [s1, setS1] = useState(0)
  const [s2, setS2] = useState(0)
  const [matchDate, setMatchDate] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (match) {
      setS1(match.team1Score ?? 0)
      setS2(match.team2Score ?? 0)
      setMatchDate(match.matchDate ?? new Date().toISOString().slice(0, 10))
      setNote(match.note ?? '')
    }
  }, [match])

  if (!match || !minigame) return null

  const team1Name = match.team1.map(p => p.memberName).join(' & ')
  const team2Name = match.team2.map(p => p.memberName).join(' & ')

  const isDraw = s1 === s2
  const noDrawAllowed = isDraw && !minigame.allowDraw
  const winningTeam = !isDraw ? (s1 > s2 ? 1 : 2) : null

  const pointsLine = () => {
    const wp = minigame.winPoints, dp = minigame.drawPoints, lp = minigame.lossPoints
    if (isDraw) {
      return [...match.team1, ...match.team2].map(p => `${p.memberName} +${dp}đ`).join(' · ')
    }
    const winners = winningTeam === 1 ? match.team1 : match.team2
    const losers = winningTeam === 1 ? match.team2 : match.team1
    return [...winners.map(p => `${p.memberName} +${wp}đ`), ...losers.map(p => `${p.memberName} +${lp}đ`)].join(' · ')
  }

  const handleSave = () => {
    if (noDrawAllowed) return
    enterDoublesMatchResult(match.id, s1, s2, note || undefined)
    onClose()
  }

  const Stepper = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="w-16 text-center text-2xl font-bold border border-slate-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
      />
      <button
        onClick={() => onChange(value + 1)}
        className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nhập Kết Quả Trận Đôi"
      subtitle={`Trận ${match.matchNumber}${match.matchDate ? ' · ' + match.matchDate : ''}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSave} disabled={noDrawAllowed}>Lưu Kết Quả</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Team 1</p>
            <p className="font-semibold text-slate-800 text-sm mb-2">{team1Name}</p>
            <Stepper value={s1} onChange={setS1} />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Team 2</p>
            <p className="font-semibold text-slate-800 text-sm mb-2">{team2Name}</p>
            <Stepper value={s2} onChange={setS2} />
          </div>
        </div>

        <div className={`rounded-xl py-3 px-3 text-center font-semibold text-xs ${
          noDrawAllowed ? 'bg-red-50 text-red-600 border border-red-200' :
          isDraw ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {noDrawAllowed
            ? '⚠️ Minigame này không cho phép kết quả hòa'
            : isDraw
              ? `🤝 Hòa — ${pointsLine()}`
              : `🏆 Team ${winningTeam} Thắng — ${pointsLine()}`}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Ngày thi đấu</label>
          <input
            type="date"
            value={matchDate}
            onChange={e => setMatchDate(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Ghi chú</label>
          <textarea
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ghi chú về trận đấu..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
      </div>
    </Modal>
  )
}
