/**
 * CompeteHub — màn chính module "Tạo Giải đấu" (/thi-dau).
 * 2 cột: TRÁI = form tạo giải (MinigameForm nhúng); PHẢI = tổng quan trực tiếp bám theo bộ môn
 * đang chọn ở form (MinigameOverviewPanel). Danh sách/Lịch sử/BXH/dashboard bộ môn vào qua các
 * link "Xem thêm" trong panel + khi mở 1 giải (full-page, giữ nguyên).
 * MEMBER_VIEW không có quyền tạo → ẩn form, chỉ chọn bộ môn + xem tổng quan.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListChecks } from 'lucide-react'
import { MinigameForm } from '../minigame/MinigameForm'
import { MinigameOverviewPanel } from '../minigame/MinigameOverviewPanel'
import { useAuthStore } from '../../../store/authStore'
import { sportEmoji } from '../../../types/minigame'
import { cn } from '../../../lib/utils'

const SPORTS: { v: string; label: string }[] = [
  { v: 'PICKLEBALL', label: 'Pickleball' },
  { v: 'TENNIS', label: 'Tennis' },
  { v: 'BADMINTON', label: 'Cầu lông' },
  { v: 'TABLE_TENNIS', label: 'Bóng bàn' },
  { v: 'FOOTBALL', label: 'Bóng đá' },
  { v: 'BASKETBALL', label: 'Bóng rổ' },
  { v: 'GOLF', label: 'Golf' },
]

export function CompeteHub() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isMember = user?.role === 'MEMBER_VIEW'
  const [sport, setSport] = useState('PICKLEBALL')

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-bg)]">
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
        {isMember ? (
          // MEMBER: không tạo giải → chọn bộ môn + xem tổng quan.
          <div className="flex flex-col gap-5">
            <div className="rounded-[18px] border p-4 [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h1 className="text-lg font-bold [color:var(--pf-text)]">🏆 Giải đấu — Tổng quan theo bộ môn</h1>
                <button onClick={() => navigate('/minigames')} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold [color:var(--pf-primary)] [background:var(--pf-primary-soft)] hover:[background:var(--pf-primary)] hover:text-white transition-colors">
                  <ListChecks size={14} /> Danh sách giải
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {SPORTS.map(s => (
                  <button key={s.v} onClick={() => setSport(s.v)}
                    className={cn('inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold border transition-colors',
                      sport === s.v ? 'text-white [background:var(--pf-primary)] border-transparent' : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100')}>
                    {sportEmoji(s.v) || '🏓'} {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-w-xl">
              <MinigameOverviewPanel sport={sport} />
            </div>
          </div>
        ) : (
          // ADMIN: form tạo (trái) + tổng quan (phải, bám bộ môn của form).
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-end">
              <button onClick={() => navigate('/minigames')} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold [color:var(--pf-primary)] [background:var(--pf-primary-soft)] hover:[background:var(--pf-primary)] hover:text-white transition-colors">
                <ListChecks size={14} /> Danh sách giải
              </button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-5 items-start">
              <div className="rounded-[18px] border overflow-hidden [background:var(--pf-surface)] border-[color:var(--pf-border)] [box-shadow:var(--pf-shadow)]">
                <MinigameForm embedded onSportChange={setSport} />
              </div>
              <MinigameOverviewPanel sport={sport} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
