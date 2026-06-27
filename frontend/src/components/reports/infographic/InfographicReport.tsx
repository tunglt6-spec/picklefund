import type { InfographicReportData, InfographicMemberData } from './infographic.types'

const V = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ'

/* ── Mascot SVG ── */
function MascotSvg() {
  return (
    <svg width="80" height="96" viewBox="0 0 80 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Racquet head */}
      <ellipse cx="68" cy="16" rx="10" ry="13" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
      <line x1="68" y1="8" x2="68" y2="24" stroke="white" strokeWidth="1" opacity="0.6" />
      <line x1="62" y1="16" x2="74" y2="16" stroke="white" strokeWidth="1" opacity="0.6" />
      {/* Racquet handle */}
      <line x1="61" y1="27" x2="54" y2="44" stroke="#92400E" strokeWidth="3.5" strokeLinecap="round" />
      {/* Right arm */}
      <path d="M48 54 Q58 42 57 30" stroke="#16A34A" strokeWidth="7" strokeLinecap="round" fill="none" />
      {/* Body */}
      <ellipse cx="34" cy="68" rx="23" ry="26" fill="#22C55E" />
      <ellipse cx="27" cy="60" rx="8" ry="11" fill="#86EFAC" opacity="0.55" />
      <circle cx="40" cy="74" r="2.5" fill="#15803D" opacity="0.45" />
      <circle cx="32" cy="80" r="1.8" fill="#15803D" opacity="0.35" />
      <circle cx="44" cy="64" r="1.8" fill="#15803D" opacity="0.35" />
      {/* Neck */}
      <rect x="28" y="40" width="12" height="10" rx="4" fill="#22C55E" />
      {/* Head */}
      <circle cx="34" cy="30" r="20" fill="#4ADE80" />
      <ellipse cx="28" cy="22" rx="7" ry="9" fill="#BBF7D0" opacity="0.45" />
      {/* Headband */}
      <rect x="14" y="24" width="40" height="8" rx="4" fill="white" />
      <rect x="14" y="24" width="40" height="3.5" rx="1.5" fill="#FCD34D" />
      {/* Eyes */}
      <circle cx="27" cy="32" r="5" fill="white" />
      <circle cx="41" cy="32" r="5" fill="white" />
      <circle cx="28.5" cy="33" r="2.8" fill="#0F172A" />
      <circle cx="42.5" cy="33" r="2.8" fill="#0F172A" />
      <circle cx="29.5" cy="32" r="1.1" fill="white" />
      <circle cx="43.5" cy="32" r="1.1" fill="white" />
      {/* Smile */}
      <path d="M25 40 Q34 47 43 40" stroke="#15803D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Cheeks */}
      <circle cx="21" cy="38" r="3.5" fill="#FCA5A5" opacity="0.5" />
      <circle cx="47" cy="38" r="3.5" fill="#FCA5A5" opacity="0.5" />
      {/* Left arm */}
      <path d="M13 58 Q8 68 14 76" stroke="#16A34A" strokeWidth="7" strokeLinecap="round" fill="none" />
      {/* Feet */}
      <ellipse cx="26" cy="92" rx="9" ry="4.5" fill="#15803D" />
      <ellipse cx="42" cy="92" rx="9" ry="4.5" fill="#15803D" />
      {/* Ball */}
      <circle cx="6" cy="82" r="7" fill="#FCD34D" />
      <path d="M2 82 Q6 77 10 82" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M2 82 Q6 87 10 82" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/* ── Member card (right panel) ── */
function MemberCard({ m }: { m: InfographicMemberData }) {
  const pct = m.totalSessions > 0 ? Math.round((m.attendedSessions / m.totalSessions) * 100) : 0
  const balanceColor = m.balance >= 0 ? '#15803D' : '#DC2626'
  return (
    <div style={{
      background: 'white',
      borderRadius: 8,
      border: '1px solid #E5E7EB',
      padding: '8px 10px',
      fontSize: 10,
    }}>
      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontWeight: 700, color: '#111827', fontSize: 11 }}>{m.name}</span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
          background: m.isPaid ? '#DCFCE7' : '#FEF3C7',
          color: m.isPaid ? '#15803D' : '#B45309',
        }}>
          {m.isPaid ? 'Đã đóng' : 'Chưa đóng'}
        </span>
      </div>
      {/* Attendance bar */}
      <div style={{ color: '#6B7280', marginBottom: 4 }}>
        {m.attendedSessions}/{m.totalSessions} buổi
      </div>
      <div style={{ height: 5, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', marginBottom: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 70 ? '#22C55E' : pct >= 40 ? '#F59E0B' : '#EF4444', borderRadius: 99 }} />
      </div>
      <div style={{ color: '#9CA3AF', fontSize: 9, marginBottom: 6 }}>{pct}%</div>
      {/* Financial */}
      <div style={{ color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
        <span>Đã nộp quỹ</span>
        <span style={{ fontWeight: 600, color: '#374151' }}>{V(m.paidAmount)}</span>
      </div>
      <div style={{ borderTop: '1px dashed #E5E7EB', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#6B7280' }}>Cần nộp thêm</span>
        <span style={{ fontWeight: 700, color: balanceColor }}>{V(m.balance)}</span>
      </div>
    </div>
  )
}

/* ── Main export ── */
export function InfographicReport({ data, id = 'infographic-export-canvas' }: { data: InfographicReportData; id?: string }) {
  const confirmedTotal = data.totalIncome
  const expenseTotal = data.totalExpense
  const balance = data.fundBalance
  const ratio = confirmedTotal > 0 ? Math.min((expenseTotal / confirmedTotal) * 100, 200) : 0
  const ratioDisplay = confirmedTotal > 0 ? Math.round((expenseTotal / confirmedTotal) * 100) : 0
  const balanceColor = balance >= 0 ? '#15803D' : '#DC2626'
  const balanceLabel = balance > 0 ? 'Quỹ còn dư' : balance < 0 ? 'Quỹ âm — cần bổ sung' : 'Đã cân đối'
  const paidMemberCount = data.members.filter(m => m.isPaid).length
  const unpaidMemberCount = data.totalMembers - paidMemberCount

  const barColor = ratio <= 70 ? '#22C55E' : ratio <= 100 ? '#F59E0B' : '#EF4444'

  return (
    <div
      id={id}
      style={{
        width: 540,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        background: '#F9FAF8',
        color: '#111827',
        overflow: 'hidden',
      }}
    >
      {/* ══ HEADER ══ */}
      <div style={{ background: 'white', padding: '14px 18px 10px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Mascot */}
          <div style={{ flexShrink: 0 }}>
            <MascotSvg />
          </div>

          {/* Branding */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: '#166534', letterSpacing: -0.5 }}>Pickle</span>
              <span style={{ fontSize: 26, fontWeight: 900, color: '#15803D', letterSpacing: -0.5 }}>Fund</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2.5, color: '#374151', marginTop: -2, marginBottom: 6 }}>
              BÁO CÁO TÀI CHÍNH
            </div>
            <div style={{
              display: 'inline-block',
              background: '#0E7490',
              color: 'white',
              borderRadius: 20,
              padding: '3px 12px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}>
              {data.periodLabel}
            </div>
          </div>

          {/* Export date */}
          <div style={{ flexShrink: 0, textAlign: 'right', fontSize: 10, color: '#6B7280' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              <span>📅</span>
              <span>Xuất ngày {data.exportDate}</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: '#374151', fontWeight: 500 }}>
          <span>👥 <strong>{data.totalMembers}</strong> thành viên</span>
          <span style={{ color: '#D1D5DB' }}>•</span>
          <span>📅 <strong>{data.totalSessions}</strong> buổi tập</span>
          <span style={{ color: '#D1D5DB' }}>•</span>
          <span>✓ <strong>{paidMemberCount}</strong> đã đóng quỹ ({data.totalMembers > 0 ? Math.round((paidMemberCount / data.totalMembers) * 100) : 0}%)</span>
        </div>
      </div>

      {/* ══ KPI CARDS ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '12px 14px' }}>
        {/* Tổng thu */}
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>💰</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#6B7280', letterSpacing: 1, textTransform: 'uppercase' }}>Tổng thu</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#15803D' }}>{V(confirmedTotal)}</div>
          <div style={{ fontSize: 9, color: '#6B7280', marginTop: 3 }}>{paidMemberCount}/{data.totalMembers} thành viên đóng</div>
        </div>
        {/* Tổng chi */}
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>👛</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#6B7280', letterSpacing: 1, textTransform: 'uppercase' }}>Tổng chi</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#DC2626' }}>{V(expenseTotal)}</div>
          <div style={{ fontSize: 9, color: '#6B7280', marginTop: 3 }}>Tỷ lệ chi / thu: {ratioDisplay}%</div>
        </div>
        {/* Số dư */}
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🐷</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#6B7280', letterSpacing: 1, textTransform: 'uppercase' }}>Số dư quỹ</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: balanceColor }}>{V(balance)}</div>
          <div style={{ fontSize: 9, color: balanceColor, marginTop: 3 }}>{balanceLabel}</div>
        </div>
      </div>

      {/* ══ RATIO BAR + STAT BOXES ══ */}
      <div style={{ display: 'flex', gap: 10, padding: '0 14px 12px' }}>
        {/* Ratio bar */}
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', padding: '10px 12px', flex: '0 0 200px' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#374151', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Tỷ lệ chi / thu
          </div>
          {/* Gradient bar */}
          <div style={{ height: 12, borderRadius: 99, background: 'linear-gradient(to right, #22C55E, #F59E0B, #EF4444)', overflow: 'hidden', position: 'relative', marginBottom: 6 }}>
            {/* Indicator */}
            <div style={{
              position: 'absolute',
              left: `${Math.min(ratio / 2, 96)}%`,
              top: 0,
              width: 3,
              height: '100%',
              background: 'white',
              borderRadius: 99,
              boxShadow: '0 0 4px rgba(0,0,0,0.3)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#6B7280' }}>
            <span>Thu: {V(confirmedTotal)}</span>
            <span style={{ color: barColor, fontWeight: 700 }}>Chi: {V(expenseTotal)} ({ratioDisplay}%)</span>
          </div>
        </div>

        {/* Stat boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
          {[
            { label: 'Tổng số thành viên', value: `${data.totalMembers} người`, icon: '👥', color: '#374151' },
            { label: 'Số buổi tập', value: `${data.totalSessions} buổi`, icon: '📅', color: '#374151' },
            { label: 'Đã đóng quỹ', value: `${paidMemberCount} / ${data.totalMembers}`, icon: '✅', color: '#15803D' },
            { label: 'Chưa đóng quỹ', value: `${unpaidMemberCount} người`, icon: '⚠️', color: '#DC2626' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 8, border: '1px solid #E5E7EB', padding: '7px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 8.5, color: '#9CA3AF', marginBottom: 2 }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ BOTTOM: TABLE (left) + CARDS (right) ══ */}
      <div style={{ display: 'flex', gap: 10, padding: '0 14px 14px', alignItems: 'flex-start' }}>

        {/* Left: Member table */}
        <div style={{ flex: '0 0 238px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#166534', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7, paddingLeft: 2 }}>
            Chi tiết từng thành viên
          </div>
          <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '16px 60px 30px 34px 34px 34px 34px',
              background: '#F3F4F6',
              padding: '5px 8px',
              gap: 2,
              borderBottom: '1px solid #E5E7EB',
            }}>
              {['#', 'Thành viên', 'Buổi', 'Phí sân', 'S. hoạt', 'Tổng chi', 'Số dư'].map((h, i) => (
                <div key={i} style={{ fontSize: 7.5, fontWeight: 700, color: '#6B7280', textAlign: i === 0 ? 'center' : i >= 3 ? 'right' : 'left', letterSpacing: 0.3 }}>{h}</div>
              ))}
            </div>
            {/* Rows */}
            {data.members.map((m, i) => (
              <div key={m.id} style={{
                display: 'grid',
                gridTemplateColumns: '16px 60px 30px 34px 34px 34px 34px',
                padding: '5px 8px',
                gap: 2,
                background: i % 2 === 0 ? 'white' : '#F9FAFB',
                borderBottom: i < data.members.length - 1 ? '1px solid #F3F4F6' : 'none',
                alignItems: 'center',
              }}>
                <div style={{ fontSize: 8, color: '#9CA3AF', textAlign: 'center', fontWeight: 600 }}>{i + 1}</div>
                <div style={{ fontSize: 8.5, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                <div style={{ fontSize: 8, color: '#374151', fontWeight: 500 }}>
                  <span style={{ color: m.isPaid ? '#15803D' : '#D97706', fontWeight: 700 }}>
                    {m.isPaid ? '✓' : '✗'}
                  </span>
                  {' '}{m.attendedSessions}/{m.totalSessions}
                </div>
                <div style={{ fontSize: 7.5, color: '#374151', textAlign: 'right' }}>{(m.courtFee / 1000).toFixed(0)}K</div>
                <div style={{ fontSize: 7.5, color: '#374151', textAlign: 'right' }}>{(m.livingFee / 1000).toFixed(0)}K</div>
                <div style={{ fontSize: 7.5, color: '#374151', textAlign: 'right' }}>{(m.totalCost / 1000).toFixed(0)}K</div>
                <div style={{ fontSize: 7.5, fontWeight: 700, textAlign: 'right', color: m.balance >= 0 ? '#15803D' : '#DC2626' }}>
                  {m.balance >= 0 ? '+' : ''}{(m.balance / 1000).toFixed(0)}K
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Member cards */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#166534', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7, paddingLeft: 2 }}>
            Chi tiết thành viên
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
            {data.members.map(m => <MemberCard key={m.id} m={m} />)}
          </div>
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <div style={{
        background: 'linear-gradient(135deg, #14532D, #166534)',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🥒</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'white' }}>PickleFund</div>
            <div style={{ fontSize: 9, color: '#86EFAC' }}>Quản lý tài chính CLB Pickleball</div>
          </div>
        </div>
        <div style={{ fontSize: 9, color: '#A7F3D0', textAlign: 'right' }}>
          📅 Xuất lúc {data.generatedAt} {data.exportDate}
        </div>
        <span style={{ fontSize: 16 }}>🏓</span>
      </div>
    </div>
  )
}
