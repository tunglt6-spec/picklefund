import type { InfographicReportData } from './infographic.types'

/* ─── Color tokens ─── */
const C = {
  green:     '#10B981',
  greenDark: '#065F46',
  greenDeep: '#022C22',
  navy:      '#0B2A4A',
  blue:      '#2563EB',
  yellow:    '#FACC15',
  orange:    '#F97316',
  red:       '#EF4444',
  success:   '#16A34A',
  bg:        '#F0FDF4',
  white:     '#FFFFFF',
  text:      '#0F172A',
  muted:     '#64748B',
  border:    '#E2E8F0',
  greenTint: '#DCFCE7',
  softBg:    '#F8FAFC',
}

/* ─── Helpers ─── */
const VN = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ'

function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase()
    : (p[p.length - 2][0] + p[p.length - 1][0]).toUpperCase()
}

const AVATAR_BG = ['#059669','#0284C7','#7C3AED','#F59E0B','#EC4899','#EA580C','#0891B2','#9333EA']
function avatarBg(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return AVATAR_BG[Math.abs(h) % AVATAR_BG.length]
}

/* ─── Court background SVG ─── */
function CourtBg({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none"
      style={{ position: 'absolute', inset: 0, opacity: 0.09 }}>
      {/* Outer court */}
      <rect x="30" y="16" width={width - 60} height={height - 32} rx="6"
        stroke="white" strokeWidth="2.5"/>
      {/* Net */}
      <line x1="30" y1={height / 2} x2={width - 30} y2={height / 2}
        stroke="white" strokeWidth="4"/>
      {/* Kitchen (NVZ) upper */}
      <line x1="30" y1={height * 0.32} x2={width - 30} y2={height * 0.32}
        stroke="white" strokeWidth="2"/>
      {/* Kitchen (NVZ) lower */}
      <line x1="30" y1={height * 0.68} x2={width - 30} y2={height * 0.68}
        stroke="white" strokeWidth="2"/>
      {/* Center service line upper */}
      <line x1={width / 2} y1="16" x2={width / 2} y2={height * 0.32}
        stroke="white" strokeWidth="2"/>
      {/* Center service line lower */}
      <line x1={width / 2} y1={height * 0.68} x2={width / 2} y2={height - 16}
        stroke="white" strokeWidth="2"/>
      {/* Ball */}
      <circle cx={width - 60} cy="40" r="20" stroke="white" strokeWidth="2" fill="none" opacity="0.4"/>
      <path d={`M${width-78} 40 Q${width-60} 22 ${width-42} 40`}
        stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d={`M${width-78} 40 Q${width-60} 58 ${width-42} 40`}
        stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

/* ─── Pickleball ball decoration ─── */
function BallDeco({ size = 48, opacity = 0.25 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ opacity }}>
      <circle cx="24" cy="24" r="23" fill={C.yellow} stroke={C.orange} strokeWidth="1.5"/>
      <path d="M4 24 Q24 4 44 24" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M4 24 Q24 44 44 24" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

/* ─── Paddle decoration ─── */
function PaddleDeco({ width = 44, height = 58, opacity = 0.2 }: { width?: number; height?: number; opacity?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 44 58" fill="none" style={{ opacity, transform: 'rotate(20deg)' }}>
      <ellipse cx="22" cy="22" rx="19" ry="21" fill="white"/>
      {/* Grid lines */}
      {[12,17,22,27,32].map(y => (
        <line key={y} x1="5" y1={y} x2="39" y2={y} stroke={C.green} strokeWidth="1" opacity="0.5"/>
      ))}
      {[10,16,22,28,34].map(x => (
        <line key={x} x1={x} y1="3" x2={x} y2="41" stroke={C.green} strokeWidth="1" opacity="0.5"/>
      ))}
      {/* Handle */}
      <rect x="16" y="40" width="12" height="16" rx="6" fill="white"/>
      <rect x="17.5" y="42" width="9" height="11" rx="4" fill={C.orange} opacity="0.6"/>
    </svg>
  )
}

/* ─── Footer player silhouettes ─── */
function PlayerLeft() {
  return (
    <svg width="90" height="130" viewBox="0 0 90 130" fill="none" style={{ opacity: 0.18 }}>
      {/* Head */}
      <circle cx="55" cy="20" r="14" fill="white"/>
      {/* Body leaning forward */}
      <path d="M55 34 Q50 58 44 82" stroke="white" strokeWidth="10" strokeLinecap="round" fill="none"/>
      {/* Left arm extended (reaching) */}
      <path d="M50 50 Q28 42 18 36" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
      {/* Paddle at end of left arm */}
      <ellipse cx="11" cy="30" rx="9" ry="11" fill="white" opacity="0.8"/>
      <rect x="8" y="40" width="6" height="10" rx="3" fill="white" opacity="0.6"/>
      {/* Right arm back */}
      <path d="M56 48 Q70 60 76 74" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
      {/* Legs wide stance */}
      <path d="M44 82 Q32 104 26 126" stroke="white" strokeWidth="9" strokeLinecap="round" fill="none"/>
      <path d="M44 82 Q54 106 60 126" stroke="white" strokeWidth="9" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

function PlayerRight() {
  return (
    <svg width="90" height="130" viewBox="0 0 90 130" fill="none" style={{ opacity: 0.18 }}>
      {/* Head */}
      <circle cx="35" cy="20" r="14" fill="white"/>
      {/* Body */}
      <path d="M35 34 Q40 58 46 82" stroke="white" strokeWidth="10" strokeLinecap="round" fill="none"/>
      {/* Right arm extended with paddle */}
      <path d="M40 50 Q62 42 72 36" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <ellipse cx="79" cy="30" rx="9" ry="11" fill="white" opacity="0.8"/>
      <rect x="76" y="40" width="6" height="10" rx="3" fill="white" opacity="0.6"/>
      {/* Left arm back */}
      <path d="M34 48 Q20 60 14 74" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
      {/* Legs */}
      <path d="M46 82 Q58 104 64 126" stroke="white" strokeWidth="9" strokeLinecap="round" fill="none"/>
      <path d="M46 82 Q36 106 30 126" stroke="white" strokeWidth="9" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

/* ─── Avatar ─── */
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const bg = avatarBg(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, color: C.white,
      boxShadow: `0 3px 8px ${bg}66`,
      letterSpacing: -0.5,
    }}>
      {initials(name)}
    </div>
  )
}

/* ─── Status badge ─── */
function StatusBadge({ isPaid }: { isPaid: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10, fontWeight: 700,
      padding: '3px 10px', borderRadius: 99,
      background: isPaid ? C.greenTint : '#FEF3C7',
      color: isPaid ? C.success : '#B45309',
      border: `1px solid ${isPaid ? '#86EFAC' : '#FCD34D'}`,
      whiteSpace: 'nowrap',
      lineHeight: 1.4,
    }}>
      {isPaid ? '✓ Đã đóng quỹ' : '⏳ Chưa đóng'}
    </span>
  )
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, sub, accent, emoji }:
  { label: string; value: string; sub: string; accent: string; emoji: string }
) {
  return (
    <div style={{
      background: C.white, borderRadius: 20, flex: 1,
      padding: '16px 14px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
      border: `1px solid ${C.border}`,
      borderTop: `4px solid ${accent}`,
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{emoji}</span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: C.muted,
          letterSpacing: 1.2, textTransform: 'uppercase', lineHeight: 1.3,
        }}>{label}</span>
      </div>
      <div style={{
        fontSize: 18, fontWeight: 900, color: C.text,
        lineHeight: 1.2, marginBottom: 6,
        wordBreak: 'break-word',
      }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.4 }}>{sub}</div>
    </div>
  )
}

/* ─── Member Card ─── */
function MemberCard({ m, idx }: { m: InfographicReportData['members'][0]; idx: number }) {
  const attPct = m.totalSessions > 0
    ? Math.round((m.attendedSessions / m.totalSessions) * 100)
    : 0
  const barColor = attPct >= 70 ? C.success : attPct >= 40 ? C.orange : C.red
  const balPos = m.balance >= 0

  return (
    <div style={{
      background: C.white, borderRadius: 20,
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      border: `1px solid ${C.border}`,
      overflow: 'hidden',
    }}>
      {/* Card header accent */}
      <div style={{
        height: 4,
        background: `linear-gradient(90deg, ${avatarBg(m.name)}, ${avatarBg(m.name)}88)`,
      }}/>

      <div style={{ padding: '14px 16px 16px' }}>
        {/* Row 1: number + avatar */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          marginBottom: 12,
        }}>
          {/* Number badge */}
          <div style={{
            flexShrink: 0, width: 22, height: 22,
            background: C.softBg, border: `1px solid ${C.border}`,
            borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: C.muted,
            marginTop: 9,
          }}>
            {idx + 1}
          </div>
          <Avatar name={m.name} size={42} />
          {/* Name + badge: column */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{
              fontSize: 13, fontWeight: 800, color: C.text,
              lineHeight: 1.35, wordBreak: 'break-word',
            }}>
              {m.name}
            </div>
            <StatusBadge isPaid={m.isPaid} />
          </div>
        </div>

        {/* Attendance */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 6,
          }}>
            <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>Tham gia buổi tập</span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: C.text,
              background: C.softBg, padding: '2px 8px', borderRadius: 99,
              border: `1px solid ${C.border}`,
            }}>
              {m.attendedSessions}/{m.totalSessions} ({attPct}%)
            </span>
          </div>
          <div style={{ height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${attPct}%`,
              background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
              borderRadius: 99, transition: 'none',
            }}/>
          </div>
        </div>

        {/* Financial details */}
        <div style={{
          background: C.softBg, borderRadius: 12, padding: '10px 12px',
          border: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', gap: 7,
          marginBottom: 10,
        }}>
          {[
            { label: 'Chi phí sân', val: VN(m.courtFee) },
            { label: 'Sinh hoạt', val: VN(m.livingFee) },
            { label: 'Tổng chi phí', val: VN(m.totalCost), bold: true },
          ].map((row, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: i < 2 ? 7 : 0,
              borderBottom: i < 2 ? `1px dashed ${C.border}` : 'none',
            }}>
              <span style={{ fontSize: 10, color: C.muted, lineHeight: 1.4 }}>{row.label}</span>
              <span style={{
                fontSize: 10,
                fontWeight: row.bold ? 700 : 500,
                color: row.bold ? C.text : '#374151',
                lineHeight: 1.4,
              }}>{row.val}</span>
            </div>
          ))}
        </div>

        {/* Balance */}
        <div style={{
          background: balPos
            ? 'linear-gradient(135deg, #DCFCE7, #F0FDF4)'
            : 'linear-gradient(135deg, #FEE2E2, #FFF5F5)',
          borderRadius: 12,
          padding: '10px 14px',
          border: `1px solid ${balPos ? '#86EFAC' : '#FECACA'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: balPos ? C.success : C.red,
          }}>
            {balPos ? '💚 Số dư còn lại' : '⚠️ Cần nộp thêm'}
          </span>
          <span style={{
            fontSize: 15, fontWeight: 900,
            color: balPos ? C.success : C.red,
          }}>
            {balPos ? '+' : ''}{VN(m.balance)}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ══════════ MAIN COMPONENT ══════════ */
export function InfographicReport({
  data,
  id = 'infographic-export-canvas',
}: {
  data: InfographicReportData
  id?: string
}) {
  const ratio = data.expenseIncomeRatio
  const balPos = data.fundBalance >= 0
  const paidPct = data.totalMembers > 0
    ? Math.round((data.paidMembers / data.totalMembers) * 100) : 0
  const indicatorLeft = Math.min(ratio / 2, 96)
  const ratioStatus = ratio <= 80
    ? { text: 'Trong ngân sách', bg: '#DCFCE7', color: C.success }
    : ratio <= 100
      ? { text: 'Cảnh báo', bg: '#FEF3C7', color: '#B45309' }
      : { text: 'Vượt ngân sách', bg: '#FEE2E2', color: C.red }

  const PG = 24 // page gutter

  return (
    <div
      id={id}
      style={{
        width: 540,
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        background: C.bg,
        color: C.text,
        overflow: 'hidden',
      }}
    >
      {/* ══ HERO HEADER ══ */}
      <div style={{
        background: `linear-gradient(145deg, ${C.greenDark} 0%, #059669 55%, #34D399 100%)`,
        padding: `${PG}px ${PG}px 20px`,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 190,
      }}>
        <CourtBg width={540} height={190} />

        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: 20, right: 80, opacity: 0.9 }}>
          <BallDeco size={52} opacity={0.3} />
        </div>
        <div style={{ position: 'absolute', right: 20, top: 28, opacity: 0.9 }}>
          <PaddleDeco width={40} height={52} opacity={0.22} />
        </div>

        {/* Content: all in normal flow, no absolute */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Sport badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 99, padding: '5px 14px',
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.95)',
            marginBottom: 14, letterSpacing: 0.5,
          }}>
            🏓 PICKLEFUND · SPORT CLUB
          </div>

          {/* Heading block */}
          <div style={{ marginBottom: 14, maxWidth: 380 }}>
            <div style={{
              fontSize: 40, fontWeight: 900, color: C.white,
              letterSpacing: -1.5, lineHeight: 1.0,
              textShadow: '0 2px 16px rgba(0,0,0,0.2)',
            }}>
              PICKLEFUND
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700, color: '#A7F3D0',
              letterSpacing: 3.5, lineHeight: 1.3, marginTop: 4,
            }}>
              BÁO CÁO TÀI CHÍNH
            </div>
          </div>

          {/* Period pill + date — same row, space-between */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 12,
            marginBottom: 16, flexWrap: 'wrap',
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.22)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 99, padding: '6px 18px',
              fontSize: 11, fontWeight: 700, color: C.white,
              letterSpacing: 0.3, lineHeight: 1.4,
            }}>
              📋 {data.periodLabel}
            </div>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
              gap: 2,
            }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>Xuất ngày</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.white, lineHeight: 1.4 }}>
                📅 {data.exportDate}
              </span>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{
            display: 'flex', gap: 0,
            background: 'rgba(0,0,0,0.18)',
            borderRadius: 14, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
            {[
              { emoji: '👥', value: String(data.totalMembers), label: 'thành viên' },
              { emoji: '🗓', value: String(data.totalSessions), label: 'buổi tập' },
              { emoji: '✅', value: `${data.paidMembers}/${data.totalMembers}`, label: `đóng quỹ (${paidPct}%)` },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center', padding: '10px 8px',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}>
                <div style={{ fontSize: 14, lineHeight: 1, marginBottom: 4 }}>{s.emoji}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.white, lineHeight: 1.1, marginBottom: 3 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', lineHeight: 1.3 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ KPI CARDS ══ */}
      <div style={{ display: 'flex', gap: 10, padding: `14px ${PG}px 0` }}>
        <KpiCard
          label="TỔNG THU"
          value={VN(data.totalIncome)}
          sub={`${data.paidMembers}/${data.totalMembers} thành viên đã đóng`}
          accent={C.success}
          emoji="💰"
        />
        <KpiCard
          label="TỔNG CHI"
          value={VN(data.totalExpense)}
          sub={`Tỷ lệ chi/thu: ${ratio}%`}
          accent={C.orange}
          emoji="📤"
        />
        <KpiCard
          label="SỐ DƯ QUỸ"
          value={VN(data.fundBalance)}
          sub={balPos ? 'Quỹ còn dư cuối kỳ ✓' : '⚠ Quỹ âm — cần bổ sung'}
          accent={balPos ? C.blue : C.red}
          emoji={balPos ? '🐷' : '⚠️'}
        />
      </div>

      {/* ══ RATIO BAR ══ */}
      <div style={{
        margin: `12px ${PG}px 0`,
        background: C.white, borderRadius: 20,
        padding: '14px 18px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        border: `1px solid ${C.border}`,
      }}>
        {/* Header row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: C.muted,
            letterSpacing: 1.2, textTransform: 'uppercase',
          }}>
            TỶ LỆ CHI / THU
          </span>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 99,
            background: ratioStatus.bg, color: ratioStatus.color,
            border: `1px solid ${ratioStatus.color}33`,
            whiteSpace: 'nowrap',
          }}>
            {ratio}% — {ratioStatus.text}
          </span>
        </div>
        {/* Bar */}
        <div style={{
          height: 18, borderRadius: 99,
          background: 'linear-gradient(to right, #22C55E 0%, #86EFAC 28%, #FCD34D 55%, #F97316 80%, #EF4444 100%)',
          position: 'relative', marginBottom: 10,
        }}>
          <div style={{
            position: 'absolute',
            left: `${indicatorLeft}%`,
            top: '50%', transform: 'translate(-50%, -50%)',
            width: 26, height: 26, borderRadius: '50%',
            background: C.white,
            border: '3px solid #1E293B',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}/>
        </div>
        {/* Labels */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: C.muted, gap: 8, flexWrap: 'wrap',
        }}>
          <span>Thu: <strong style={{ color: C.success }}>{VN(data.totalIncome)}</strong></span>
          <span>Chi: <strong style={{ color: C.red }}>{VN(data.totalExpense)}</strong></span>
        </div>
      </div>

      {/* ══ STAT BOXES ══ */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: 8, margin: `12px ${PG}px 0`,
      }}>
        {[
          { emoji: '👥', label: 'Thành viên', val: `${data.totalMembers}`, unit: 'người', accent: C.blue },
          { emoji: '🗓', label: 'Buổi tập', val: `${data.totalSessions}`, unit: 'buổi', accent: '#7C3AED' },
          { emoji: '✅', label: 'Đã đóng', val: `${data.paidMembers}/${data.totalMembers}`, unit: '', accent: C.success },
          { emoji: '⏳', label: 'Chưa đóng', val: `${data.unpaidMembers}`, unit: data.unpaidMembers === 0 ? '✓ Tốt' : 'người', accent: data.unpaidMembers === 0 ? C.success : C.orange },
        ].map((s, i) => (
          <div key={i} style={{
            background: C.white, borderRadius: 16,
            padding: '12px 8px', textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            border: `1px solid ${C.border}`,
            borderTop: `4px solid ${s.accent}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{s.emoji}</span>
            <span style={{ fontSize: 9, color: C.muted, lineHeight: 1.3, textAlign: 'center' }}>{s.label}</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: C.text, lineHeight: 1 }}>{s.val}</span>
            {s.unit && <span style={{ fontSize: 9, color: C.muted }}>{s.unit}</span>}
          </div>
        ))}
      </div>

      {/* ══ MEMBER SECTION ══ */}
      <div style={{ margin: `16px ${PG}px 0` }}>
        {/* Section header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 4, height: 22, background: C.green, borderRadius: 2,
            }}/>
            <span style={{
              fontSize: 12, fontWeight: 800, color: C.greenDark,
              letterSpacing: 0.5, textTransform: 'uppercase',
            }}>
              Chi tiết thành viên
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
              background: C.greenTint, color: C.success, border: '1px solid #86EFAC',
              whiteSpace: 'nowrap',
            }}>
              ✓ {data.paidMembers} đã đóng
            </span>
            {data.unpaidMembers > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D',
                whiteSpace: 'nowrap',
              }}>
                ⏳ {data.unpaidMembers} chưa đóng
              </span>
            )}
          </div>
        </div>

        {/* 2-col card grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {data.members.map((m, i) => (
            <MemberCard key={m.id} m={m} idx={i} />
          ))}
        </div>
      </div>

      {/* ══ SUMMARY ══ */}
      <div style={{
        margin: `16px ${PG}px 0`,
        background: C.white, borderRadius: 20,
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(90deg, ${C.greenDark}, #059669)`,
          padding: '10px 18px',
          fontSize: 10, fontWeight: 700, color: '#A7F3D0',
          letterSpacing: 1.2, textTransform: 'uppercase',
        }}>
          📊 Tổng kết kỳ quỹ
        </div>
        {/* Rows */}
        <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Tổng thu quỹ', val: VN(data.totalIncome), color: C.success },
            { label: 'Tổng chi quỹ', val: VN(data.totalExpense), color: C.orange },
            { label: 'Số dư cuối kỳ', val: `${balPos ? '+' : ''}${VN(data.fundBalance)}`, color: balPos ? C.blue : C.red, big: true },
          ].map((row, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: i < 2 ? 10 : 0,
              borderBottom: i < 2 ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{row.label}</span>
              <span style={{
                fontSize: row.big ? 16 : 12,
                fontWeight: row.big ? 900 : 700,
                color: row.color, lineHeight: 1.4,
              }}>{row.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FOOTER BANNER ══ */}
      <div style={{
        background: `linear-gradient(145deg, ${C.navy} 0%, #0A3D2E 60%, ${C.greenDark} 100%)`,
        marginTop: 20, padding: `22px ${PG}px 20px`,
        position: 'relative', overflow: 'hidden',
        minHeight: 150,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Player silhouettes */}
        <div style={{ position: 'absolute', left: 0, bottom: 0 }}><PlayerLeft /></div>
        <div style={{ position: 'absolute', right: 0, bottom: 0 }}><PlayerRight /></div>

        {/* Decorative balls */}
        <div style={{ position: 'absolute', top: 14, left: 80, opacity: 0.6 }}>
          <BallDeco size={32} opacity={0.18} />
        </div>
        <div style={{ position: 'absolute', bottom: 18, right: 80, opacity: 0.6 }}>
          <BallDeco size={24} opacity={0.15} />
        </div>

        {/* Text content — in flow, padded to avoid silhouettes */}
        <div style={{
          position: 'relative', zIndex: 1,
          textAlign: 'center', padding: '0 100px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            fontSize: 16, fontWeight: 900, color: C.white,
            letterSpacing: 0.5, lineHeight: 1.2,
          }}>
            CHƠI HẾT MÌNH
          </div>
          <div style={{
            fontSize: 22, fontWeight: 900, color: C.yellow,
            letterSpacing: 0.3, lineHeight: 1.2,
          }}>
            ĐÓNG QUỸ HẾT Ý
          </div>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.6, textAlign: 'center', marginTop: 4,
          }}>
            Cùng nhau xây dựng CLB
            {'\n'}ngày càng vững mạnh!
          </div>
          {/* Decorative dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {[C.yellow, C.green, '#60A5FA'].map((c, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: c, opacity: 0.8,
              }}/>
            ))}
          </div>
        </div>
      </div>

      {/* ══ BOTTOM BAR ══ */}
      <div style={{
        background: C.greenDeep,
        padding: '10px 20px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 8,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: C.green, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>🥒</div>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.white }}>PickleFund</span>
        </div>
        <span style={{ fontSize: 9, color: '#6EE7B7', textAlign: 'center' }}>
          {data.periodLabel} · {data.exportDate}
        </span>
        <span style={{ fontSize: 9, color: '#4B5563' }}>
          Lúc {data.generatedAt}
        </span>
      </div>
    </div>
  )
}
