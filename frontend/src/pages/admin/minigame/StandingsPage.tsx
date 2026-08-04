import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Image as ImageIcon, FileText, Share2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'
import { PageHeader } from '../../../components/layout/PageHeader'
import { useMinigameStore } from '../../../store/minigameStore'
import { useAuthStore } from '../../../store/authStore'
import { useClubDataStore } from '../../../store/clubDataStore'
import { isGuestId } from '../../../types/minigame'
import { useMinigameDetailSync } from '../../../hooks/useMinigameDetailSync'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { cn } from '../../../lib/utils'
import {
  exportInfographicAsPng, shareInfographic, canShare,
} from '../../../components/reports/infographic/infographic.utils'
import { exportStandingsPDF } from '../../../lib/export'

const EXPORT_ID = 'mg-standings-export'

const SPORT_LABEL: Record<string, string> = {
  PICKLEBALL: 'Pickleball', TENNIS: 'Tennis', BADMINTON: 'Cầu lông', TABLE_TENNIS: 'Bóng bàn',
  FOOTBALL: 'Bóng đá', BASKETBALL: 'Bóng rổ', GOLF: 'Golf',
}
const FORMAT_LABEL: Record<string, string> = {
  RANDOM_DOUBLES: 'Đánh đôi ngẫu nhiên', GROUP_STAGE: 'Vòng bảng',
  FIXED_DOUBLES_ROUND_ROBIN: 'Đôi cố định vòng tròn',
}

const RANK_CLASS: Record<number, string> = {
  1: 'bg-yellow-50 border-l-2 border-yellow-400',
  2: '[background:var(--pf-surface-muted)] border-l-2 border-slate-400',
  3: 'bg-amber-50 border-l-2 border-amber-400',
}

const BAR_COLORS = ['#f59e0b', '#94a3b8', '#f97316', '#6D5DFB', '#22c55e', '#06b6d4', '#ec4899', '#8b5cf6']

export function StandingsPage() {
  const { id } = useParams<{ id: string }>()
  useMinigameDetailSync(id)
  const navigate = useNavigate()
  const { getMinigame, getStandings, groups } = useMinigameStore()
  const { user } = useAuthStore()
  const { getClubData } = useClubDataStore()
  const mg = getMinigame(id!)
  const standings = getStandings(id!)
  const myGroups = groups.filter(g => g.minigameId === id).sort((a, b) => a.groupOrder - b.groupOrder)

  const [activeTab, setActiveTab] = useState<'all' | string>('all')
  const isMobile = useIsMobile()

  // Trang BXH generic chỉ phục vụ RANDOM_DOUBLES + GROUP_STAGE. Format đội (đôi cố định/bóng đá/
  // bóng rổ) & golf có BXH RIÊNG trong dashboard của chúng → điều hướng về dashboard (tránh trang
  // trống do đọc nhầm slice matches/groups). Chặn được cả #1/#3 trong audit.
  useEffect(() => {
    if (mg && mg.formatType !== 'RANDOM_DOUBLES' && mg.formatType !== 'GROUP_STAGE') {
      navigate(`/minigames/${id}`, { replace: true })
    }
  }, [mg, id, navigate])

  if (!mg) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="[color:var(--pf-color-muted)]">Không tìm thấy minigame</p>
    </div>
  )

  const fileBase = `BXH_${mg.name.replace(/[^a-zA-Z0-9À-ỹ]/g, '_').replace(/_+/g, '_')}`
  const doExportPng = async () => {
    try { await exportInfographicAsPng(EXPORT_ID, `${fileBase}.png`); toast.success('Đã tải ảnh bảng xếp hạng') }
    catch { toast.error('Xuất ảnh thất bại') }
  }
  const doExportPdf = async () => {
    // PDF VECTOR chuẩn SaaS (mẫu báo cáo tài chính) — không dùng html2canvas (từng ra 15 trang).
    try {
      const rowsData = [...standings].sort((a, b) =>
        b.rankingPoints - a.rankingPoints || b.pointDifference - a.pointDifference || b.pointsFor - a.pointsFor,
      )
      await exportStandingsPDF({
        clubName: getClubData(user?.clubId ?? '').settings?.name ?? 'CLB',
        tournamentName: mg.name,
        sportLabel: SPORT_LABEL[mg.sport ?? 'PICKLEBALL'] ?? 'Giải đấu',
        formatLabel: FORMAT_LABEL[mg.formatType] ?? 'Bảng xếp hạng',
        rankNote: 'Xếp theo: Điểm → Hiệu số → Điểm ghi được.',
        stats: [
          { label: 'Thành viên', value: standings.length },
          ...(myGroups.length ? [{ label: 'Số bảng', value: myGroups.length }] : []),
        ],
        columns: [
          { key: 'rank', label: '#', w: 8, align: 'left' },
          { key: 'name', label: 'THÀNH VIÊN', w: 44, align: 'left', bold: true },
          { key: 'group', label: 'BẢNG', w: 20, align: 'center', tone: 'muted' },
          { key: 'played', label: 'TRẬN', w: 12, align: 'center' },
          { key: 'won', label: 'THẮNG', w: 14, align: 'center', tone: 'win' },
          { key: 'drawn', label: 'HÒA', w: 12, align: 'center', tone: 'muted' },
          { key: 'lost', label: 'THUA', w: 12, align: 'center', tone: 'loss' },
          { key: 'pf', label: 'ĐIỂM+', w: 16, align: 'center' },
          { key: 'pa', label: 'ĐIỂM-', w: 16, align: 'center', tone: 'muted' },
          { key: 'diff', label: 'HS', w: 16, align: 'center', tone: 'sign' },
          { key: 'pts', label: 'ĐIỂM', w: 16, align: 'right', tone: 'points' },
        ],
        rows: rowsData.map(s => ({
          name: s.memberName, group: s.groupName ?? '', played: s.played, won: s.won,
          drawn: s.drawn, lost: s.lost, pf: s.pointsFor, pa: s.pointsAgainst,
          diff: s.pointDifference > 0 ? `+${s.pointDifference}` : String(s.pointDifference),
          pts: s.rankingPoints,
        })),
      })
      toast.success('Đã tải PDF bảng xếp hạng')
    } catch { toast.error('Xuất PDF thất bại') }
  }
  const doShare = async () => {
    try { await shareInfographic(EXPORT_ID, `Bảng xếp hạng ${mg.name}`) }
    catch { /* user hủy hoặc không hỗ trợ */ }
  }

  const displayed = activeTab === 'all'
    ? standings
    : standings.filter(s => s.groupId === activeTab)

  const sorted = [...displayed].sort((a, b) =>
    b.rankingPoints - a.rankingPoints || b.pointDifference - a.pointDifference || b.pointsFor - a.pointsFor
  ).map((s, i) => ({ ...s, overallRank: i + 1 }))

  const chartData = sorted.map(s => ({ name: s.memberName.split(' ').pop()!, points: s.rankingPoints }))

  const tabs = [
    { id: 'all' as const, label: 'Tổng Quan' },
    ...myGroups.map(g => ({ id: g.id, label: g.groupName })),
  ]

  if (isMobile) {
    return (
      <div className="min-h-screen [background:var(--pf-bg)]">
        <div className="sticky top-0 z-10 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/minigames/${id}`)} className="[color:var(--pf-color-muted)]">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold [color:var(--pf-text)] truncate">Bảng Xếp Hạng</p>
            <p className="text-[11px] [color:var(--pf-color-muted)] truncate">{mg.name} · {standings.length} thành viên</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={doExportPng} aria-label="Xuất ảnh" className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-[11px] font-semibold [background:var(--pf-primary-soft)] [color:var(--pf-primary)] active:opacity-70">
              <ImageIcon size={14} /> Ảnh
            </button>
            <button onClick={doExportPdf} aria-label="Xuất PDF" className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-[11px] font-semibold [background:var(--pf-primary-soft)] [color:var(--pf-primary)] active:opacity-70">
              <FileText size={14} /> PDF
            </button>
            {canShare() && (
              <button onClick={doShare} aria-label="Chia sẻ" className="flex h-9 w-9 items-center justify-center rounded-xl text-white [background:var(--pf-primary)] active:opacity-70">
                <Share2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable group tabs */}
        <div className="flex gap-1.5 [background:var(--pf-surface)] border-b border-[color:var(--pf-border)] px-3 py-2 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn(
                'shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-[8px] transition-colors',
                activeTab === t.id ? 'text-white shadow-sm' : '[color:var(--pf-color-muted)] [background:var(--pf-surface-muted)]'
              )}
              style={activeTab === t.id ? { background: 'var(--pf-primary)' } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        <div id={EXPORT_ID} className="px-4 py-4 space-y-3">
          {/* Bar chart */}
          {sorted.length > 0 && (
            <div className="[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] p-4 shadow-sm">
              <p className="text-[13px] font-semibold [color:var(--pf-text)] mb-3">Điểm Xếp Hạng</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={22}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={28} />
                    <Tooltip formatter={(v) => [`${v} điểm`, 'Điểm']} />
                    <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Rank cards */}
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="[color:var(--pf-color-muted)] text-[13px]">Chưa có dữ liệu xếp hạng</p>
            </div>
          ) : sorted.map(s => (
            <div key={`${s.memberId}-${s.groupId}`}
              className={cn('[background:var(--pf-surface)] rounded-[16px] border border-[color:var(--pf-border)] p-4 shadow-sm', RANK_CLASS[s.overallRank] ?? '')}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className={cn('h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-[13px] font-bold',
                  s.overallRank === 1 ? 'bg-yellow-400 text-white' :
                  s.overallRank === 2 ? 'bg-slate-400 text-white' :
                  s.overallRank === 3 ? 'bg-amber-500 text-white' :
                  '[background:var(--pf-color-muted-soft)] [color:var(--pf-color-muted)]'
                )}>
                  {s.overallRank === 1 ? '🥇' : s.overallRank === 2 ? '🥈' : s.overallRank === 3 ? '🥉' : s.overallRank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold [color:var(--pf-text)] text-[14px] flex items-center gap-1.5">{s.memberName}{isGuestId(s.memberId) && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full [background:var(--pf-primary-soft)] [color:var(--pf-primary)]">Khách</span>}</p>
                  <p className="text-[11px] [color:var(--pf-color-muted)]">{s.groupName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[20px] font-black [color:var(--pf-primary)] leading-tight">{s.rankingPoints}</p>
                  <p className="text-[10px] [color:var(--pf-color-muted)]">điểm</p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: 'Trận', value: s.played, cls: '[color:var(--pf-text)]' },
                  { label: 'Thắng', value: s.won, cls: 'text-green-700' },
                  { label: 'Hòa', value: s.drawn, cls: 'text-amber-600' },
                  { label: 'Thua', value: s.lost, cls: 'text-red-500' },
                  { label: 'Hiệu số', value: `${s.pointDifference > 0 ? '+' : ''}${s.pointDifference}`, cls: s.pointDifference >= 0 ? 'text-green-600' : 'text-red-500' },
                ].map(item => (
                  <div key={item.label} className="[background:var(--pf-surface-muted)] rounded-[8px] py-1.5 text-center">
                    <p className={cn('text-[13px] font-bold', item.cls)}>{item.value}</p>
                    <p className="text-[9px] [color:var(--pf-color-muted)] mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto [background:var(--pf-surface-muted)]">
      <PageHeader
        title={`Bảng Xếp Hạng – ${mg.name}`}
        subtitle={`${standings.length} thành viên`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={doExportPng} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold [color:var(--pf-primary)] [background:var(--pf-primary-soft)] hover:opacity-90">
              <ImageIcon size={14} />Ảnh
            </button>
            <button onClick={doExportPdf} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border border-[color:var(--pf-border)] [color:var(--pf-color-muted)] [background:var(--pf-surface)] hover:[background:var(--pf-surface-muted)]">
              <FileText size={14} />PDF
            </button>
            {canShare() && (
              <button onClick={doShare} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)]">
                <Share2 size={14} />Chia sẻ
              </button>
            )}
          </div>
        }
      />

      <div className="p-6">
        <button onClick={() => navigate(`/minigames/${id}`)} className="flex items-center gap-1.5 text-sm [color:var(--pf-color-muted)] hover:[color:var(--pf-text)] mb-4 transition-colors">
          <ArrowLeft size={14} /> {mg.name}
        </button>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 [background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-sm p-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeTab === t.id ? '[background:var(--pf-primary)] text-white' : '[color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] hover:[color:var(--pf-text)]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div id={EXPORT_ID} className="space-y-4">
        {/* Bar chart */}
        {sorted.length > 0 && (
          <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-sm p-4">
            <p className="text-sm font-semibold [color:var(--pf-text)] mb-3">Điểm Xếp Hạng</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} điểm`, 'Điểm']} />
                  <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Standings table */}
        <div className="[background:var(--pf-surface)] rounded-xl border border-[color:var(--pf-border)] shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--pf-border)] bg-slate-50/50">
                <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Thành Viên</th>
                <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Bảng</th>
                <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Trận</th>
                <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Thắng</th>
                <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Hòa</th>
                <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Thua</th>
                <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Điểm+</th>
                <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Điểm-</th>
                <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase">Hiệu Số</th>
                <th className="text-center px-3 py-3 text-xs font-semibold [color:var(--pf-color-muted)] uppercase font-bold">Điểm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.length === 0 && (
                <tr><td colSpan={11} className="text-center py-10 [color:var(--pf-color-muted)] text-sm">Chưa có dữ liệu</td></tr>
              )}
              {sorted.map((s) => (
                <tr key={`${s.memberId}-${s.groupId}`} className={cn('transition-colors', RANK_CLASS[s.overallRank] ?? 'hover:bg-slate-50/50')}>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                      s.overallRank === 1 ? 'bg-yellow-400 text-white' :
                      s.overallRank === 2 ? 'bg-slate-400 text-white' :
                      s.overallRank === 3 ? 'bg-amber-500 text-white' :
                      '[color:var(--pf-color-muted)]'
                    )}>
                      {s.overallRank}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium [color:var(--pf-text)]">{s.memberName}</td>
                  <td className="px-3 py-2.5 text-center text-xs [color:var(--pf-color-muted)]">{s.groupName}</td>
                  <td className="px-3 py-2.5 text-center [color:var(--pf-text)]">{s.played}</td>
                  <td className="px-3 py-2.5 text-center text-green-700 font-semibold">{s.won}</td>
                  <td className="px-3 py-2.5 text-center text-amber-600">{s.drawn}</td>
                  <td className="px-3 py-2.5 text-center text-red-500">{s.lost}</td>
                  <td className="px-3 py-2.5 text-center [color:var(--pf-text)]">{s.pointsFor}</td>
                  <td className="px-3 py-2.5 text-center [color:var(--pf-color-muted)]">{s.pointsAgainst}</td>
                  <td className={cn('px-3 py-2.5 text-center font-semibold', s.pointDifference >= 0 ? 'text-green-600' : 'text-red-500')}>
                    {s.pointDifference > 0 ? '+' : ''}{s.pointDifference}
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold [color:var(--pf-primary)] text-base">{s.rankingPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  )
}
