import type { InfographicReportData } from './infographic.types'

/* ─── Format helpers ─── */
const VN = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ'

function initials(name: string) {
  const p = name.trim().split(/\s+/)
  return p.length === 1
    ? p[0].slice(0, 2).toUpperCase()
    : (p[p.length - 2][0] + p[p.length - 1][0]).toUpperCase()
}

const PALETTE = ['#059669','#0284C7','#7C3AED','#F59E0B','#EC4899','#EA580C','#0891B2','#16A34A']
function avatarBg(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

/* ─── Court SVG (header decoration) ─── */
function CourtSvg() {
  return (
    <svg width="160" height="110" viewBox="0 0 160 110" fill="none" style={{ position: 'absolute', right: 0, top: 0, opacity: 0.12 }}>
      {/* Outer court */}
      <rect x="4" y="4" width="152" height="102" rx="3" stroke="white" strokeWidth="2"/>
      {/* Net */}
      <line x1="4" y1="55" x2="156" y2="55" stroke="white" strokeWidth="2.5"/>
      {/* Kitchen (NVZ) lines — 1/7 of length from net */}
      <line x1="4" y1="33" x2="156" y2="33" stroke="white" strokeWidth="1.5"/>
      <line x1="4" y1="77" x2="156" y2="77" stroke="white" strokeWidth="1.5"/>
      {/* Center service lines */}
      <line x1="80" y1="33" x2="80" y2="4" stroke="white" strokeWidth="1.5"/>
      <line x1="80" y1="77" x2="80" y2="106" stroke="white" strokeWidth="1.5"/>
      {/* Ball */}
      <circle cx="130" cy="22" r="9" fill="white" opacity="0.25"/>
      <path d="M124 22 Q130 16 136 22" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M124 22 Q130 28 136 22" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

/* ─── Paddle SVG (header decoration) ─── */
function PaddleSvg() {
  return (
    <svg width="64" height="80" viewBox="0 0 64 80" fill="none" style={{ position: 'absolute', right: 18, bottom: 14, opacity: 0.22, transform: 'rotate(25deg)' }}>
      {/* Paddle face */}
      <ellipse cx="32" cy="30" rx="26" ry="28" fill="white"/>
      {/* Grid lines */}
      <line x1="32" y1="4" x2="32" y2="56" stroke="#059669" strokeWidth="1.2" opacity="0.6"/>
      <line x1="8" y1="20" x2="56" y2="20" stroke="#059669" strokeWidth="1.2" opacity="0.6"/>
      <line x1="8" y1="30" x2="56" y2="30" stroke="#059669" strokeWidth="1.2" opacity="0.6"/>
      <line x1="8" y1="40" x2="56" y2="40" stroke="#059669" strokeWidth="1.2" opacity="0.6"/>
      {/* Handle */}
      <rect x="26" y="55" width="12" height="22" rx="6" fill="white"/>
      <rect x="28" y="58" width="8" height="14" rx="4" fill="#F59E0B" opacity="0.7"/>
    </svg>
  )
}

/* ─── Player silhouettes (footer) ─── */
function SilhouetteLeft() {
  return (
    <svg width="80" height="120" viewBox="0 0 80 120" fill="none" style={{ opacity: 0.2 }}>
      <circle cx="40" cy="18" r="12" fill="white"/>
      <path d="M40 30 L28 70 L22 110" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <path d="M40 30 L52 70 L58 110" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <path d="M40 40 L15 55" stroke="white" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <ellipse cx="10" cy="50" rx="7" ry="9" fill="white"/>
      <line x1="17" y1="57" x2="8" y2="48" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <path d="M40 40 L62 35" stroke="white" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <circle cx="68" cy="30" r="6" fill="white" opacity="0.5"/>
    </svg>
  )
}

function SilhouetteRight() {
  return (
    <svg width="80" height="120" viewBox="0 0 80 120" fill="none" style={{ opacity: 0.2 }}>
      <circle cx="40" cy="18" r="12" fill="white"/>
      <path d="M40 30 L28 70 L22 110" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <path d="M40 30 L52 70 L58 110" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
      <path d="M40 40 L65 55" stroke="white" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <ellipse cx="70" cy="50" rx="7" ry="9" fill="white"/>
      <line x1="63" y1="57" x2="72" y2="48" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <path d="M40 40 L18 35" stroke="white" strokeWidth="7" strokeLinecap="round" fill="none"/>
      <circle cx="68" cy="28" r="5" fill="#F59E0B" opacity="0.7"/>
    </svg>
  )
}

/* ─── KPI Card ─── */
function KpiCard({
  label, value, sub, accent, icon,
}: { label: string; value: string; sub: string; accent: string; icon: string }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: '14px 14px 12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      borderTop: `4px solid ${accent}`,
      flex: 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 8, fontWeight: 700, color: '#9CA3AF', letterSpacing: 1.2, textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 900, color: '#111827', lineHeight: 1.1, marginBottom: 5 }}>{value}</div>
      <div style={{ fontSize: 9, color: '#6B7280' }}>{sub}</div>
    </div>
  )
}

/* ─── Member Card ─── */
function MemberCard({ m, idx }: { m: InfographicReportData['members'][0]; idx: number }) {
  const attPct = m.totalSessions > 0 ? Math.round((m.attendedSessions / m.totalSessions) * 100) : 0
  const barColor = attPct >= 70 ? '#059669' : attPct >= 40 ? '#F59E0B' : '#EF4444'
  const balPos = m.balance >= 0

  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      padding: '11px 12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      border: '1px solid #F3F4F6',
    }}>
      {/* Row 1: avatar + name + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `linear-gradient(135deg, ${avatarBg(m.name)}, ${avatarBg(m.name)}cc)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 11, fontWeight: 800, color: 'white',
          boxShadow: `0 2px 6px ${avatarBg(m.name)}55`,
        }}>
          {initials(m.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {idx + 1}. {m.name}
          </div>
          <span style={{
            display: 'inline-block', marginTop: 2,
            fontSize: 8, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
            background: m.isPaid ? '#DCFCE7' : '#FEF3C7',
            color: m.isPaid ? '#059669' : '#B45309',
            border: `1px solid ${m.isPaid ? '#86EFAC' : '#FCD34D'}`,
          }}>
            {m.isPaid ? '✓ Đã đóng' : '⏳ Chưa đóng'}
          </span>
        </div>
      </div>

      {/* Row 2: attendance */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#6B7280', marginBottom: 4 }}>
          <span>Tham gia</span>
          <span style={{ fontWeight: 700, color: '#374151' }}>{m.attendedSessions}/{m.totalSessions} buổi ({attPct}%)</span>
        </div>
        <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${attPct}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`, borderRadius: 99 }}/>
        </div>
      </div>

      {/* Row 3: financials 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 8px', borderTop: '1px dashed #F3F4F6', paddingTop: 8 }}>
        <div>
          <div style={{ fontSize: 7.5, color: '#9CA3AF', marginBottom: 2 }}>Chi phí sân</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#374151' }}>{VN(m.courtFee)}</div>
        </div>
        <div>
          <div style={{ fontSize: 7.5, color: '#9CA3AF', marginBottom: 2 }}>Sinh hoạt</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#374151' }}>{VN(m.livingFee)}</div>
        </div>
        <div>
          <div style={{ fontSize: 7.5, color: '#9CA3AF', marginBottom: 2 }}>Tổng chi</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#111827' }}>{VN(m.totalCost)}</div>
        </div>
        <div>
          <div style={{ fontSize: 7.5, color: '#9CA3AF', marginBottom: 2 }}>Số dư</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: balPos ? '#059669' : '#EF4444' }}>
            {balPos ? '+' : ''}{VN(m.balance)}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════ MAIN COMPONENT ══════════════ */
export function InfographicReport({ data, id = 'infographic-export-canvas' }: { data: InfographicReportData; id?: string }) {
  const ratio = data.expenseIncomeRatio
  const balPos = data.fundBalance >= 0
  const paidPct = data.totalMembers > 0 ? Math.round((data.paidMembers / data.totalMembers) * 100) : 0
  const indicatorLeft = Math.min(ratio / 2, 96)
  const ratioStatus = ratio <= 80 ? { label: 'Trong ngân sách', color: '#059669', bg: '#DCFCE7' }
    : ratio <= 100 ? { label: 'Cảnh báo', color: '#B45309', bg: '#FEF3C7' }
    : { label: 'Vượt ngân sách', color: '#DC2626', bg: '#FEE2E2' }

  return (
    <div
      id={id}
      style={{
        width: 540,
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        background: '#F0FDF4',
        color: '#111827',
        overflow: 'hidden',
      }}
    >
      {/* ══ HERO HEADER ══ */}
      <div style={{
        background: 'linear-gradient(145deg, #064E3B 0%, #059669 55%, #10B981 100%)',
        padding: '20px 20px 16px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 168,
      }}>
        <CourtSvg />
        <PaddleSvg />

        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', filter: 'blur(20px)' }}/>
        <div style={{ position: 'absolute', bottom: -20, right: 80, width: 80, height: 80, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', filter: 'blur(16px)' }}/>

        {/* Date top-right */}
        <div style={{ position: 'absolute', top: 16, right: 20, textAlign: 'right' }}>
          <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Xuất ngày</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>📅 {data.exportDate}</div>
        </div>

        {/* Sport badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 99, padding: '4px 12px',
          fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
          marginBottom: 10, backdropFilter: 'blur(4px)',
        }}>
          🏓 PICKLEFUND · SPORT CLUB
        </div>

        {/* Main title */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: 'white', letterSpacing: -1.2, lineHeight: 1, textShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            PICKLEFUND
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#A7F3D0', letterSpacing: 3.5, marginTop: 2 }}>
            BÁO CÁO TÀI CHÍNH
          </div>
        </div>

        {/* Period pill */}
        <div style={{
          display: 'inline-block',
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 99, padding: '5px 16px',
          fontSize: 11, fontWeight: 700, color: 'white',
          backdropFilter: 'blur(4px)',
          marginBottom: 14,
        }}>
          📋 {data.periodLabel}
        </div>

        {/* Stats strip */}
        <div style={{
          display: 'flex', gap: 0,
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 12, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {[
            { icon: '👥', val: data.totalMembers, label: 'thành viên' },
            { icon: '🗓', val: data.totalSessions, label: 'buổi tập' },
            { icon: '✅', val: `${data.paidMembers}/${data.totalMembers}`, label: `đã đóng (${paidPct}%)` },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center', padding: '9px 6px',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}>
              <div style={{ fontSize: 13, marginBottom: 3 }}>{s.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ KPI CARDS ══ */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 14px 0' }}>
        <KpiCard
          label="TỔNG THU"
          value={VN(data.totalIncome)}
          sub={`${data.paidMembers}/${data.totalMembers} thành viên đóng`}
          accent="#059669"
          icon="💰"
        />
        <KpiCard
          label="TỔNG CHI"
          value={VN(data.totalExpense)}
          sub={`Tỷ lệ chi/thu: ${ratio}%`}
          accent="#F97316"
          icon="📤"
        />
        <KpiCard
          label="SỐ DƯ QUỸ"
          value={VN(data.fundBalance)}
          sub={balPos ? 'Quỹ còn dư ✓' : '⚠ Quỹ âm — cần bổ sung'}
          accent={balPos ? '#0284C7' : '#EF4444'}
          icon={balPos ? '🐷' : '⚠️'}
        />
      </div>

      {/* ══ RATIO BAR ══ */}
      <div style={{ margin: '10px 14px', background: 'white', borderRadius: 16, padding: '12px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', letterSpacing: 1, textTransform: 'uppercase' }}>TỶ LỆ CHI / THU</span>
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 99,
            background: ratioStatus.bg, color: ratioStatus.color,
          }}>
            {ratio}% — {ratioStatus.label}
          </span>
        </div>
        <div style={{ height: 16, borderRadius: 99, background: 'linear-gradient(to right, #22C55E 0%, #86EFAC 30%, #FCD34D 58%, #F97316 80%, #EF4444 100%)', position: 'relative', marginBottom: 8 }}>
          <div style={{
            position: 'absolute',
            left: `${indicatorLeft}%`,
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 24, height: 24, borderRadius: '50%',
            background: 'white',
            border: '3px solid #374151',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9CA3AF' }}>
          <span>Thu: <strong style={{ color: '#059669' }}>{VN(data.totalIncome)}</strong></span>
          <span>Chi: <strong style={{ color: '#EF4444' }}>{VN(data.totalExpense)}</strong></span>
        </div>
      </div>

      {/* ══ STAT BOXES ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, margin: '0 14px 12px' }}>
        {[
          { icon: '👥', label: 'Thành viên', val: `${data.totalMembers}`, unit: 'người', accent: '#0284C7' },
          { icon: '🗓', label: 'Buổi tập', val: `${data.totalSessions}`, unit: 'buổi', accent: '#7C3AED' },
          { icon: '✅', label: 'Đã đóng', val: `${data.paidMembers}/${data.totalMembers}`, unit: '', accent: '#059669' },
          { icon: '⏳', label: 'Chưa đóng', val: `${data.unpaidMembers}`, unit: 'người', accent: '#F97316' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: 14, padding: '10px 8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid #F3F4F6', textAlign: 'center',
            borderTop: `3px solid ${s.accent}`,
          }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 7.5, color: '#9CA3AF', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{s.val}</div>
            {s.unit && <div style={{ fontSize: 8, color: '#9CA3AF', marginTop: 2 }}>{s.unit}</div>}
          </div>
        ))}
      </div>

      {/* ══ MEMBER SECTION ══ */}
      <div style={{ margin: '0 14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#065F46', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            👤 Chi tiết thành viên
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 8.5, background: '#DCFCE7', color: '#059669', padding: '3px 9px', borderRadius: 99, fontWeight: 700, border: '1px solid #86EFAC' }}>
              ✓ {data.paidMembers} đã đóng
            </span>
            {data.unpaidMembers > 0 && (
              <span style={{ fontSize: 8.5, background: '#FEF3C7', color: '#B45309', padding: '3px 9px', borderRadius: 99, fontWeight: 700, border: '1px solid #FCD34D' }}>
                ⏳ {data.unpaidMembers} chưa đóng
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          {data.members.map((m, i) => <MemberCard key={m.id} m={m} idx={i} />)}
        </div>
      </div>

      {/* ══ SUMMARY ROW ══ */}
      <div style={{ margin: '0 14px 14px', background: 'white', borderRadius: 16, padding: '12px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #E5E7EB' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>📊 Tổng kết kỳ quỹ</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'Tổng thu quỹ', val: VN(data.totalIncome), color: '#059669' },
            { label: 'Tổng chi quỹ', val: VN(data.totalExpense), color: '#F97316' },
            { label: 'Số dư cuối kỳ', val: `${balPos ? '+' : ''}${VN(data.fundBalance)}`, color: balPos ? '#0284C7' : '#EF4444' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '8px', background: '#F9FAFB', borderRadius: 10 }}>
              <div style={{ fontSize: 8, color: '#9CA3AF', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FOOTER BANNER ══ */}
      <div style={{
        background: 'linear-gradient(145deg, #0A4D2E 0%, #065F46 50%, #1E3A5F 100%)',
        padding: '20px 20px 18px',
        position: 'relative', overflow: 'hidden',
        minHeight: 130,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Decorative balls */}
        <div style={{ position: 'absolute', top: 10, left: 10, width: 40, height: 40, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1.5px solid rgba(245,158,11,0.25)' }}/>
        <div style={{ position: 'absolute', bottom: 12, right: 12, width: 28, height: 28, borderRadius: '50%', background: 'rgba(167,243,208,0.12)', border: '1.5px solid rgba(167,243,208,0.2)' }}/>
        <div style={{ position: 'absolute', top: 20, right: 60, width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>

        {/* Player silhouettes */}
        <div style={{ position: 'absolute', left: 0, bottom: 0 }}><SilhouetteLeft /></div>
        <div style={{ position: 'absolute', right: 0, bottom: 0 }}><SilhouetteRight /></div>

        {/* Slogan */}
        <div style={{ textAlign: 'center', position: 'relative', padding: '0 90px' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'white', letterSpacing: 0.3, lineHeight: 1.3 }}>
            CHƠI HẾT MÌNH
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#F59E0B', letterSpacing: 0.2, lineHeight: 1.2, marginBottom: 6 }}>
            ĐÓNG QUỸ HẾT Ý
          </div>
          <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            Cùng nhau xây dựng CLB ngày càng vững mạnh!
          </div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 4 }}>
            {['#F59E0B','#10B981','#60A5FA'].map((c, i) => (
              <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: c, opacity: 0.7, border: '2px solid rgba(255,255,255,0.3)' }}/>
            ))}
          </div>
        </div>
      </div>

      {/* ══ BOTTOM BAR ══ */}
      <div style={{
        background: '#022C22',
        padding: '9px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🥒</div>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'white', letterSpacing: 0.3 }}>PickleFund</span>
        </div>
        <div style={{ fontSize: 8.5, color: '#6EE7B7', textAlign: 'center' }}>
          Xuất báo cáo: {data.exportDate} · {data.periodLabel}
        </div>
        <div style={{ fontSize: 8.5, color: '#4B5563' }}>
          Xuất lúc {data.generatedAt}
        </div>
      </div>
    </div>
  )
}
