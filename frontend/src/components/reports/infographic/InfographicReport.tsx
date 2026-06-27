import type { InfographicReportData } from './infographic.types'

/* ── Helpers ── */
const VN = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = ['#3B82F6','#8B5CF6','#EC4899','#F59E0B','#10B981','#EF4444','#6366F1','#14B8A6']
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

/* ── Shield logo ── */
function ShieldLogo() {
  return (
    <svg width="62" height="70" viewBox="0 0 62 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M31 2L4 13V34C4 49.5 16 62 31 68C46 62 58 49.5 58 34V13L31 2Z" fill="#1E3A5F" stroke="#F59E0B" strokeWidth="2"/>
      <path d="M31 8L9 17.5V34C9 46.5 19 57.5 31 63C43 57.5 53 46.5 53 34V17.5L31 8Z" fill="#162D4A"/>
      {/* Pickleball */}
      <circle cx="31" cy="35" r="13" fill="#F59E0B"/>
      <path d="M22 30 Q31 24 40 30" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M22 35 Q31 29 40 35" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/>
      <path d="M22 40 Q31 34 40 40" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Stars */}
      <text x="31" y="16" textAnchor="middle" fontSize="8" fill="#F59E0B">★ ★ ★</text>
      {/* Badge text */}
      <rect x="10" y="56" width="42" height="10" rx="5" fill="#F59E0B"/>
      <text x="31" y="63.5" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#0F172A" fontFamily="Arial">TEAM B32</text>
    </svg>
  )
}

/* ── Trend arrow icons ── */
function ArrowUp() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="14" fill="rgba(255,255,255,0.12)"/>
      <path d="M14 19V10M10 14l4-4 4 4" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 19h12" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}
function ArrowDown() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="14" fill="rgba(255,255,255,0.12)"/>
      <path d="M14 9v9M10 14l4 4 4-4" stroke="#FCA5A5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 9h12" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}
function WalletIcon({ positive }: { positive: boolean }) {
  const c = positive ? '#93C5FD' : '#DDD6FE'
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="14" fill="rgba(255,255,255,0.12)"/>
      <rect x="6" y="10" width="16" height="11" rx="2" stroke={c} strokeWidth="1.8"/>
      <path d="M6 13h16" stroke={c} strokeWidth="1.5"/>
      <circle cx="18" cy="16.5" r="2" fill={c}/>
      <path d="M10 7h8" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
  )
}

/* ── Player silhouette SVG for footer banner ── */
function PlayerLeft() {
  return (
    <svg width="90" height="110" viewBox="0 0 90 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="45" cy="72" rx="18" ry="24" fill="#22C55E"/>
      {/* Head */}
      <circle cx="45" cy="38" r="16" fill="#FBBF24"/>
      {/* Headband */}
      <rect x="29" y="32" width="32" height="7" rx="3.5" fill="#DC2626"/>
      {/* Eyes */}
      <circle cx="40" cy="38" r="3" fill="#1E293B"/>
      <circle cx="50" cy="38" r="3" fill="#1E293B"/>
      <circle cx="41" cy="37" r="1" fill="white"/>
      <circle cx="51" cy="37" r="1" fill="white"/>
      {/* Smile */}
      <path d="M39 44 Q45 49 51 44" stroke="#15803D" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Left arm with racquet */}
      <path d="M27 60 Q15 52 12 42" stroke="#22C55E" strokeWidth="8" strokeLinecap="round" fill="none"/>
      {/* Racquet */}
      <ellipse cx="9" cy="36" rx="8" ry="10" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5"/>
      <line x1="9" y1="28" x2="9" y2="44" stroke="white" strokeWidth="1" opacity="0.6"/>
      <line x1="3" y1="36" x2="15" y2="36" stroke="white" strokeWidth="1" opacity="0.6"/>
      <line x1="17" y1="43" x2="21" y2="52" stroke="#92400E" strokeWidth="3" strokeLinecap="round"/>
      {/* Right arm */}
      <path d="M63 60 Q72 68 70 80" stroke="#22C55E" strokeWidth="8" strokeLinecap="round" fill="none"/>
      {/* Legs */}
      <ellipse cx="38" cy="104" rx="8" ry="5" fill="#15803D"/>
      <ellipse cx="52" cy="104" rx="8" ry="5" fill="#15803D"/>
      {/* Ball */}
      <circle cx="80" cy="68" r="8" fill="#FCD34D"/>
      <path d="M74 68 Q80 62 86 68" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M74 68 Q80 74 86 68" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}
function PlayerRight() {
  return (
    <svg width="80" height="100" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="40" cy="66" rx="16" ry="22" fill="#F472B6"/>
      {/* Head */}
      <circle cx="40" cy="34" r="14" fill="#FBBF24"/>
      {/* Hair */}
      <path d="M26 30 Q40 18 54 30" fill="#92400E"/>
      <ellipse cx="26" cy="32" rx="4" ry="7" fill="#92400E"/>
      <ellipse cx="54" cy="32" rx="4" ry="7" fill="#92400E"/>
      {/* Eyes */}
      <circle cx="35" cy="34" r="2.5" fill="#1E293B"/>
      <circle cx="45" cy="34" r="2.5" fill="#1E293B"/>
      <circle cx="36" cy="33" r="1" fill="white"/>
      <circle cx="46" cy="33" r="1" fill="white"/>
      {/* Smile */}
      <path d="M34 40 Q40 44 46 40" stroke="#BE185D" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Left arm */}
      <path d="M24 56 Q16 64 18 74" stroke="#F472B6" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* Right arm with racquet */}
      <path d="M56 54 Q68 46 72 36" stroke="#F472B6" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <ellipse cx="75" cy="30" rx="7" ry="9" fill="#8B5CF6" stroke="#7C3AED" strokeWidth="1.5"/>
      <line x1="75" y1="23" x2="75" y2="37" stroke="white" strokeWidth="1" opacity="0.6"/>
      <line x1="70" y1="30" x2="80" y2="30" stroke="white" strokeWidth="1" opacity="0.6"/>
      <line x1="69" y1="37" x2="65" y2="47" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Legs */}
      <ellipse cx="34" cy="95" rx="7" ry="4.5" fill="#BE185D"/>
      <ellipse cx="46" cy="95" rx="7" ry="4.5" fill="#BE185D"/>
    </svg>
  )
}

/* ── Member avatar circle ── */
function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const bg = avatarColor(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      border: '1.5px solid rgba(255,255,255,0.3)',
      fontSize: size * 0.34, fontWeight: 800, color: 'white',
      letterSpacing: -0.5,
    }}>
      {initials(name)}
    </div>
  )
}

/* ══════════════ MAIN COMPONENT ══════════════ */
export function InfographicReport({ data, id = 'infographic-export-canvas' }: { data: InfographicReportData; id?: string }) {
  const ratio = data.expenseIncomeRatio
  const balPos = data.fundBalance >= 0
  const ratioColor = ratio <= 80 ? '#22C55E' : ratio <= 100 ? '#F59E0B' : '#EF4444'
  const ratioLabel = ratio <= 80 ? '✅ Tốt' : ratio <= 100 ? '⚠️ Cảnh báo' : '🔴 Vượt ngân sách'
  const indicatorPct = Math.min(ratio, 200) / 2

  return (
    <div
      id={id}
      style={{
        width: 540,
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        background: '#0F172A',
        color: 'white',
        overflow: 'hidden',
      }}
    >
      {/* ══ HEADER ══ */}
      <div style={{
        background: 'linear-gradient(160deg, #0C1B33 0%, #0F3460 45%, #1B5E3B 100%)',
        padding: '18px 20px 14px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Court lines decoration */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.07 }}>
          <div style={{ position: 'absolute', left: '30%', top: 0, bottom: 0, width: 1, background: 'white' }}/>
          <div style={{ position: 'absolute', left: '70%', top: 0, bottom: 0, width: 1, background: 'white' }}/>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'white' }}/>
          <div style={{ position: 'absolute', top: '50%', left: '30%', right: '30%', height: 40, border: '1px solid white', borderTop: 'none' }}/>
        </div>
        {/* Glow */}
        <div style={{ position: 'absolute', top: -40, right: 60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(251,191,36,0.08)', filter: 'blur(30px)' }}/>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <ShieldLogo />

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'white', letterSpacing: -1, lineHeight: 1 }}>PICKLEFUND</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#F59E0B', letterSpacing: 2, marginTop: 2, marginBottom: 10 }}>
              BÁO CÁO TÀI CHÍNH
            </div>
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(90deg,#059669,#047857)',
              color: 'white',
              borderRadius: 20,
              padding: '5px 14px',
              fontSize: 11,
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              📋 {data.periodLabel}
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: '#94A3B8', marginBottom: 2 }}>Xuất ngày</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>📅 {data.exportDate}</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 18, marginTop: 14,
          background: 'rgba(0,0,0,0.25)', borderRadius: 10,
          padding: '8px 14px',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
        }}>
          {[
            { icon: '👥', val: data.totalMembers, label: 'thành viên' },
            { icon: '📅', val: data.totalSessions, label: 'buổi tập' },
            { icon: '☑️', val: `${data.paidMembers} đã đóng quỹ (${data.totalMembers > 0 ? Math.round(data.paidMembers / data.totalMembers * 100) : 0}%)`, label: '' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#E2E8F0' }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span>
              <span><strong style={{ color: 'white' }}>{s.val}</strong>{s.label ? ` ${s.label}` : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ KPI CARDS ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
        {/* Tổng thu */}
        <div style={{ background: '#064E3B', padding: '14px 16px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 8.5, fontWeight: 700, color: '#6EE7B7', letterSpacing: 1.2, textTransform: 'uppercase' }}>TỔNG THU</span>
            <ArrowUp />
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#4ADE80', marginBottom: 4, lineHeight: 1.2 }}>{VN(data.totalIncome)}</div>
          <div style={{ fontSize: 9, color: '#86EFAC' }}>{data.paidMembers}/{data.totalMembers} thành viên đóng</div>
        </div>
        {/* Tổng chi */}
        <div style={{ background: '#7F1D1D', padding: '14px 16px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 8.5, fontWeight: 700, color: '#FCA5A5', letterSpacing: 1.2, textTransform: 'uppercase' }}>TỔNG CHI</span>
            <ArrowDown />
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#F87171', marginBottom: 4, lineHeight: 1.2 }}>{VN(data.totalExpense)}</div>
          <div style={{ fontSize: 9, color: '#FCA5A5' }}>Tỷ lệ chi / thu: {ratio}%</div>
        </div>
        {/* Số dư */}
        <div style={{ background: balPos ? '#1E3A5F' : '#2D1B69', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 8.5, fontWeight: 700, color: balPos ? '#93C5FD' : '#DDD6FE', letterSpacing: 1.2, textTransform: 'uppercase' }}>SỐ DƯ QUỸ</span>
            <WalletIcon positive={balPos} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: balPos ? '#60A5FA' : '#C4B5FD', marginBottom: 4, lineHeight: 1.2 }}>{VN(data.fundBalance)}</div>
          <div style={{ fontSize: 9, color: balPos ? '#93C5FD' : '#DDD6FE' }}>{balPos ? 'Quỹ còn dư ✓' : '⚠ Quỹ âm — cần bổ sung'}</div>
        </div>
      </div>

      {/* ══ RATIO BAR ══ */}
      <div style={{ background: '#1E293B', margin: '10px 14px', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', letterSpacing: 0.8, textTransform: 'uppercase' }}>TỶ LỆ CHI / THU</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: ratioColor }}>{ratio}% — {ratioLabel}</span>
        </div>
        <div style={{ height: 16, borderRadius: 99, background: 'linear-gradient(to right, #22C55E 0%, #86EFAC 30%, #FCD34D 55%, #F97316 80%, #EF4444 100%)', position: 'relative', marginBottom: 7 }}>
          <div style={{
            position: 'absolute',
            left: `${indicatorPct}%`,
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 22, height: 22,
            borderRadius: '50%',
            background: 'white',
            border: '3px solid #1E293B',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748B' }}>
          <span>Thu: <strong style={{ color: '#4ADE80' }}>{VN(data.totalIncome)}</strong></span>
          <span>Chi: <strong style={{ color: '#F87171' }}>{VN(data.totalExpense)}</strong> ({ratio}%)</span>
        </div>
      </div>

      {/* ══ STAT BOXES 2×2 ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, margin: '0 14px 12px' }}>
        {[
          { icon: '👥', label: 'Tổng số\nthành viên', val: `${data.totalMembers}`, unit: 'người', bg: '#1E293B', valColor: '#E2E8F0' },
          { icon: '📅', label: 'Số buổi\ntập', val: `${data.totalSessions}`, unit: 'buổi', bg: '#1E293B', valColor: '#E2E8F0' },
          { icon: '✅', label: 'Đã đóng\nquỹ', val: `${data.paidMembers} / ${data.totalMembers}`, unit: '', bg: '#064E3B', valColor: '#4ADE80' },
          { icon: '❌', label: 'Chưa đóng\nquỹ', val: `${data.unpaidMembers}`, unit: 'người', bg: '#450A0A', valColor: '#F87171' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 10, padding: '10px 10px 8px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 7.5, color: '#94A3B8', marginBottom: 5, whiteSpace: 'pre-line', lineHeight: 1.4 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: s.valColor, lineHeight: 1 }}>{s.val}</div>
            {s.unit && <div style={{ fontSize: 8, color: '#64748B', marginTop: 2 }}>{s.unit}</div>}
          </div>
        ))}
      </div>

      {/* ══ MEMBER TABLE ══ */}
      <div style={{ margin: '0 14px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
          CHI TIẾT TỪNG THÀNH VIÊN
        </div>

        <div style={{ background: '#1E293B', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '20px 96px 46px 60px 56px 56px 62px 70px',
            background: 'linear-gradient(90deg,#0F3460,#0C1B33)',
            padding: '8px 8px',
            gap: 3,
          }}>
            {['#','THÀNH VIÊN','BUỔI TG','TRẠNG THÁI','CHI PHÍ SÂN','SINH HOẠT','TỔNG CHI','SỐ DƯ'].map((h, i) => (
              <div key={i} style={{
                fontSize: 7,
                fontWeight: 700,
                color: '#94A3B8',
                letterSpacing: 0.4,
                textAlign: i <= 1 ? 'left' : 'right',
              }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {data.members.map((m, i) => {
            const attPct = m.totalSessions > 0 ? (m.attendedSessions / m.totalSessions) * 100 : 0
            const mBalPos = m.balance >= 0
            return (
              <div key={m.id} style={{
                display: 'grid',
                gridTemplateColumns: '20px 96px 46px 60px 56px 56px 62px 70px',
                padding: '7px 8px',
                gap: 3,
                background: i % 2 === 0 ? '#1E293B' : '#172033',
                borderBottom: i < data.members.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                alignItems: 'center',
              }}>
                {/* # */}
                <div style={{ fontSize: 9, color: '#64748B', textAlign: 'center', fontWeight: 600 }}>{i + 1}</div>

                {/* Name + avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                  <Avatar name={m.name} size={24} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                </div>

                {/* Buổi + mini bar */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#CBD5E1' }}>{m.attendedSessions}/{m.totalSessions}</div>
                  <div style={{ height: 3, background: '#334155', borderRadius: 99, marginTop: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${attPct}%`, background: attPct >= 70 ? '#22C55E' : attPct >= 40 ? '#F59E0B' : '#EF4444', borderRadius: 99 }} />
                  </div>
                </div>

                {/* Trạng thái */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 7.5, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                    background: m.isPaid ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                    color: m.isPaid ? '#4ADE80' : '#FCD34D',
                    border: `1px solid ${m.isPaid ? '#22C55E44' : '#F59E0B44'}`,
                  }}>
                    {m.isPaid ? '✓ Đã đóng' : '⏳ Chưa'}
                  </span>
                </div>

                {/* Chi phí sân */}
                <div style={{ fontSize: 8.5, color: '#CBD5E1', textAlign: 'right' }}>{VN(m.courtFee)}</div>
                {/* Sinh hoạt */}
                <div style={{ fontSize: 8.5, color: '#CBD5E1', textAlign: 'right' }}>{VN(m.livingFee)}</div>
                {/* Tổng chi */}
                <div style={{ fontSize: 8.5, fontWeight: 600, color: '#E2E8F0', textAlign: 'right' }}>{VN(m.totalCost)}</div>
                {/* Số dư */}
                <div style={{ fontSize: 8.5, fontWeight: 800, textAlign: 'right', color: mBalPos ? '#4ADE80' : '#F87171' }}>
                  {mBalPos ? '+' : ''}{VN(m.balance)}
                </div>
              </div>
            )
          })}

          {/* Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '20px 96px 46px 60px 56px 56px 62px 70px',
            padding: '8px 8px',
            gap: 3,
            background: 'linear-gradient(90deg, rgba(5,150,105,0.2), rgba(5,150,105,0.08))',
            borderTop: '1px solid rgba(34,197,94,0.3)',
            alignItems: 'center',
          }}>
            <div/>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#6EE7B7' }}>TỔNG CỘNG</div>
            <div/>
            <div/>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: '#6EE7B7', textAlign: 'right' }}>
              {VN(data.members.reduce((s, m) => s + m.courtFee, 0))}
            </div>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: '#6EE7B7', textAlign: 'right' }}>
              {VN(data.members.reduce((s, m) => s + m.livingFee, 0))}
            </div>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: '#6EE7B7', textAlign: 'right' }}>
              {VN(data.totalExpense)}
            </div>
            <div style={{ fontSize: 8.5, fontWeight: 800, textAlign: 'right', color: balPos ? '#4ADE80' : '#F87171' }}>
              {data.fundBalance >= 0 ? '+' : ''}{VN(data.fundBalance)}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginTop: 7, fontSize: 8.5, color: '#64748B' }}>
          <span>● BUỔI TG: Số buổi tham gia / Tổng số buổi</span>
          <span style={{ color: '#4ADE80' }}>✓ Đã đóng: Đã đóng quỹ</span>
          <span style={{ color: '#F87171' }}>✗ Chưa: Chưa đóng quỹ</span>
        </div>
      </div>

      {/* ══ MOTIVATIONAL BANNER ══ */}
      <div style={{
        background: 'linear-gradient(135deg, #0C1B33 0%, #0F3460 50%, #064E3B 100%)',
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 110,
        display: 'flex',
        alignItems: 'center',
      }}>
        {/* Court lines */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05 }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'white' }}/>
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'white' }}/>
        </div>

        {/* Left player */}
        <div style={{ position: 'absolute', left: 0, bottom: 0 }}>
          <PlayerLeft />
        </div>

        {/* Text center */}
        <div style={{ flex: 1, textAlign: 'center', position: 'relative', padding: '0 95px' }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'white', lineHeight: 1.3, letterSpacing: 0.5 }}>
            CHƠI HẾT MÌNH
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#F59E0B', lineHeight: 1.2, letterSpacing: 0.3 }}>
            ĐÓNG QUỸ HẾT Ý
          </div>
          <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 6, lineHeight: 1.5 }}>
            CÙNG NHAU XÂY DỰNG CLB<br />NGÀY CÀNG VỮNG MẠNH!
          </div>
          {/* Stars */}
          <div style={{ fontSize: 12, marginTop: 5 }}>⭐ ⭐ ⭐</div>
        </div>

        {/* Right player */}
        <div style={{ position: 'absolute', right: 0, bottom: 0 }}>
          <PlayerRight />
        </div>
      </div>

      {/* ══ FOOTER BAR ══ */}
      <div style={{
        background: '#0C1B33',
        padding: '9px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🥒</div>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'white', letterSpacing: 0.3 }}>PickleFund</span>
        </div>
        <div style={{ fontSize: 8.5, color: '#64748B', textAlign: 'center' }}>
          Xuất báo cáo: {data.exportDate} | {data.periodLabel}
        </div>
        <div style={{ fontSize: 9, color: '#475569', textAlign: 'right' }}>
          Xuất lúc {data.generatedAt}
        </div>
      </div>
    </div>
  )
}
