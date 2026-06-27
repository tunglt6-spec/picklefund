import type { InfographicReportData } from './infographic.types';

const VND = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(Math.abs(n))) + ' đ';

function CourtLines() {
  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox="0 0 1080 420"
      preserveAspectRatio="none"
    >
      <rect x="60" y="30" width="960" height="360" fill="none" stroke="white" strokeWidth="3" opacity="0.12" />
      <line x1="540" y1="30" x2="540" y2="390" stroke="white" strokeWidth="2" opacity="0.1" />
      <rect x="60" y="180" width="960" height="60" fill="none" stroke="white" strokeWidth="2" opacity="0.08" />
      <line x1="540" y1="30" x2="540" y2="180" stroke="white" strokeWidth="1.5" opacity="0.08" />
      <line x1="540" y1="240" x2="540" y2="390" stroke="white" strokeWidth="1.5" opacity="0.08" />
      <line x1="60" y1="210" x2="1020" y2="210" stroke="white" strokeWidth="4" opacity="0.18" strokeDasharray="8 6" />
    </svg>
  );
}

function ShieldBadge({ clubName }: { clubName: string }) {
  return (
    <svg width="120" height="140" viewBox="0 0 120 140">
      <ellipse cx="60" cy="135" rx="40" ry="6" fill="rgba(0,0,0,0.4)" />
      <path d="M60 4 L10 24 V68 C10 100 32 122 60 134 C88 122 110 100 110 68 V24 Z" fill="#1A3A5C" stroke="#F59E0B" strokeWidth="3" />
      <path d="M60 14 L18 31 V68 C18 95 38 114 60 124 C82 114 102 95 102 68 V31 Z" fill="#0B2A4A" />
      <text x="60" y="38" textAnchor="middle" fontSize="13" fill="#F59E0B" fontFamily="Arial">★ ★ ★</text>
      <circle cx="60" cy="72" r="24" fill="#FACC15" />
      <path d="M38 66 Q60 52 82 66" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M38 72 Q60 86 82 72" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="70" r="2" fill="white" opacity="0.5" />
      <circle cx="60" cy="65" r="2" fill="white" opacity="0.5" />
      <circle cx="70" cy="70" r="2" fill="white" opacity="0.5" />
      <rect x="20" y="106" width="80" height="22" rx="11" fill="#F59E0B" />
      <text x="60" y="121" textAnchor="middle" fontSize="11" fontWeight="900" fill="#0B2A4A" fontFamily="Arial, sans-serif">
        {clubName.length > 10 ? clubName.slice(0, 10) : clubName}
      </text>
    </svg>
  );
}

function DecoBall() {
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" style={{ position: 'absolute', top: 30, right: 60, opacity: 0.9 }}>
      <circle cx="90" cy="90" r="88" fill="rgba(250,204,21,0.15)" />
      <circle cx="90" cy="90" r="78" fill="#FACC15" />
      <circle cx="90" cy="90" r="78" fill="url(#ballGrad)" opacity="0.7" />
      <defs>
        <radialGradient id="ballGrad" cx="35%" cy="30%">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M28 78 Q90 42 152 78" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M28 102 Q90 138 152 102" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
      {[48, 68, 88, 108, 128].map(x => (
        <circle key={x} cx={x} cy="90" r="4" fill="white" opacity="0.35" />
      ))}
      {[38, 78, 118, 158].map(x => (
        <circle key={x} cx={x} cy="72" r="3" fill="white" opacity="0.25" />
      ))}
      <ellipse cx="62" cy="56" rx="22" ry="14" fill="white" opacity="0.25" transform="rotate(-20 62 56)" />
    </svg>
  );
}

function PlayerSilhouetteLeft() {
  return (
    <svg width="140" height="200" viewBox="0 0 140 200" style={{ position: 'absolute', bottom: 0, left: 30, opacity: 0.22 }}>
      <ellipse cx="22" cy="60" rx="18" ry="22" fill="white" transform="rotate(-30 22 60)" />
      <rect x="30" y="75" width="8" height="30" rx="4" fill="white" transform="rotate(-30 30 75)" />
      <path d="M38 100 Q28 82 22 62" stroke="white" strokeWidth="12" strokeLinecap="round" fill="none" />
      <rect x="44" y="96" width="42" height="58" rx="12" fill="white" />
      <circle cx="65" cy="76" r="22" fill="white" />
      <rect x="46" y="148" width="18" height="52" rx="8" fill="white" transform="rotate(-8 46 148)" />
      <rect x="66" y="148" width="18" height="52" rx="8" fill="white" transform="rotate(8 66 148)" />
    </svg>
  );
}

function PlayerSilhouetteRight() {
  return (
    <svg width="140" height="200" viewBox="0 0 140 200" style={{ position: 'absolute', bottom: 0, right: 30, opacity: 0.22 }}>
      <ellipse cx="118" cy="60" rx="18" ry="22" fill="white" transform="rotate(30 118 60)" />
      <rect x="100" y="75" width="8" height="30" rx="4" fill="white" transform="rotate(30 100 75)" />
      <path d="M100 100 Q110 82 118 62" stroke="white" strokeWidth="12" strokeLinecap="round" fill="none" />
      <rect x="54" y="96" width="42" height="58" rx="12" fill="white" />
      <circle cx="75" cy="76" r="22" fill="white" />
      <rect x="56" y="148" width="18" height="52" rx="8" fill="white" transform="rotate(8 56 148)" />
      <rect x="76" y="148" width="18" height="52" rx="8" fill="white" transform="rotate(-8 76 148)" />
    </svg>
  );
}

export function InfographicTemplateA({ data, id = 'infographic-canvas-a' }: { data: InfographicReportData; id?: string }) {
  const { totalIncome, totalExpense, fundBalance, totalMembers, paidMembers, totalSessions, clubName, periodLabel, exportDate } = data;
  const unpaidMembers = totalMembers - paidMembers;
  const expenseIncomeRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

  const ratioColor = expenseIncomeRatio > 100 ? '#EF4444' : expenseIncomeRatio >= 80 ? '#F59E0B' : '#10B981';
  const ratioBg = expenseIncomeRatio > 100 ? '#FEE2E2' : expenseIncomeRatio >= 80 ? '#FEF3C7' : '#DCFCE7';

  const balancePositive = fundBalance >= 0;

  return (
    <div
      id={id}
      style={{
        width: 1080,
        position: 'relative',
        background: '#F0FDF4',
        fontFamily: "'Inter', 'Arial', sans-serif",
      }}
    >
      {/* SECTION 1: HEADER */}
      <div
        style={{
          height: 420,
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #040E1C 0%, #0B2A4A 55%, #0D3A6E 100%)',
        }}
      >
        <CourtLines />
        <DecoBall />

        {/* Shield */}
        <div style={{ position: 'absolute', top: 40, left: 50 }}>
          <ShieldBadge clubName={clubName} />
        </div>

        {/* Text block */}
        <div style={{ position: 'absolute', top: 40, left: 200, right: 280, zIndex: 2 }}>
          <p style={{ fontSize: 72, fontWeight: 950, color: 'white', letterSpacing: -3, lineHeight: 1, margin: 0 }}>
            PICKLEFUND
          </p>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#FACC15', letterSpacing: 5, marginTop: 8, margin: '8px 0 0' }}>
            BÁO CÁO TÀI CHÍNH
          </p>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', marginTop: 6, fontWeight: 600, margin: '6px 0 0' }}>
            {clubName}
          </p>
          <div
            style={{
              marginTop: 14,
              display: 'inline-block',
              background: 'rgba(250,204,21,0.18)',
              border: '1px solid rgba(250,204,21,0.4)',
              borderRadius: 99,
              padding: '6px 18px',
              fontSize: 14,
              color: '#FACC15',
              fontWeight: 700,
            }}
          >
            {periodLabel}
          </div>
          <p style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '8px 0 0' }}>
            📅 {exportDate}
          </p>
        </div>

        {/* Paddle decoration */}
        <svg width="60" height="130" viewBox="0 0 60 130" style={{ position: 'absolute', bottom: 40, left: 30, opacity: 0.15 }}>
          <ellipse cx="30" cy="42" rx="28" ry="38" fill="white" />
          <rect x="26" y="78" width="8" height="48" rx="4" fill="white" />
        </svg>

        {/* Stats strip */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 100,
            display: 'flex',
            background: 'rgba(0,0,0,0.35)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Col 1 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ fontSize: 22 }}>👥</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'white', lineHeight: 1.1 }}>{totalMembers}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>thành viên</span>
          </div>
          {/* Col 2 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ fontSize: 22 }}>📅</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'white', lineHeight: 1.1 }}>{totalSessions}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>buổi chơi</span>
          </div>
          {/* Col 3 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 22 }}>✅</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#34D399', lineHeight: 1.1 }}>
              {paidMembers}/{totalMembers}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>đã đóng quỹ</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: KPI SCOREBOARD */}
      <div style={{ padding: '40px 32px', display: 'flex', gap: 24 }}>
        {/* Card 1: TỔNG THU */}
        <div
          style={{
            flex: 1,
            background: 'white',
            borderRadius: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            padding: 28,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 6,
              background: 'linear-gradient(90deg, #10B981, #34D399)',
            }}
          />
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              marginBottom: 16,
              background: '#DCFCE7',
            }}
          >
            💰
          </div>
          <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, color: '#64748B', fontWeight: 700 }}>
            TỔNG THU
          </div>
          <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: -1.5, color: '#10B981', marginTop: 8 }}>
            {VND(totalIncome)}
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>
            {paidMembers}/{totalMembers} đã đóng
          </div>
        </div>

        {/* Card 2: TỔNG CHI */}
        <div
          style={{
            flex: 1,
            background: 'white',
            borderRadius: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            padding: 28,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 6,
              background: 'linear-gradient(90deg, #F97316, #FACC15)',
            }}
          />
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              marginBottom: 16,
              background: '#FFF7ED',
            }}
          >
            📤
          </div>
          <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, color: '#64748B', fontWeight: 700 }}>
            TỔNG CHI
          </div>
          <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: -1.5, color: '#F97316', marginTop: 8 }}>
            {VND(totalExpense)}
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>
            Tỷ lệ {Math.round(expenseIncomeRatio)}% so thu
          </div>
        </div>

        {/* Card 3: SỐ DƯ */}
        <div
          style={{
            flex: 1,
            background: 'white',
            borderRadius: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            padding: 28,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 6,
              background: balancePositive
                ? 'linear-gradient(90deg, #10B981, #34D399)'
                : 'linear-gradient(90deg, #EF4444, #F97316)',
            }}
          />
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              marginBottom: 16,
              background: balancePositive ? '#DCFCE7' : '#FEE2E2',
            }}
          >
            {balancePositive ? '🐷' : '⚠️'}
          </div>
          <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, color: '#64748B', fontWeight: 700 }}>
            SỐ DƯ QUỸ
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 950,
              letterSpacing: -1.5,
              color: balancePositive ? '#10B981' : '#EF4444',
              marginTop: 8,
            }}
          >
            {balancePositive ? '+' : '-'}{VND(fundBalance)}
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>
            {balancePositive ? 'Quỹ còn dương — tốt!' : 'Quỹ âm — cần bổ sung'}
          </div>
        </div>
      </div>

      {/* SECTION 3: EXPENSE/INCOME RATIO */}
      <div
        style={{
          margin: '0 32px',
          marginTop: 0,
          background: 'white',
          borderRadius: 24,
          padding: 28,
          boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#0B2A4A' }}>⚡ Tỷ lệ chi / thu</span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: ratioColor,
              background: ratioBg,
              padding: '4px 16px',
              borderRadius: 99,
            }}
          >
            {Math.round(expenseIncomeRatio)}%
          </span>
        </div>

        {/* Bar */}
        <div
          style={{
            marginTop: 20,
            height: 20,
            borderRadius: 99,
            background: '#F1F5F9',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${Math.min(expenseIncomeRatio, 100)}%`,
              height: '100%',
              borderRadius: 99,
              background: 'linear-gradient(90deg, #10B981, #FACC15, #EF4444)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${Math.min(expenseIncomeRatio, 100)}%`,
              transform: 'translate(-50%, -50%)',
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'white',
              border: '4px solid #334155',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          />
        </div>

        {/* Metadata */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 14 }}>
          <span>
            Thu:{' '}
            <span style={{ color: '#10B981', fontWeight: 700 }}>{VND(totalIncome)}</span>
          </span>
          <span>
            Chi:{' '}
            <span style={{ color: '#EF4444', fontWeight: 700 }}>{VND(totalExpense)}</span>
          </span>
        </div>
      </div>

      {/* SECTION 4: STAT BOXES */}
      <div style={{ margin: '24px 32px 0', display: 'flex', gap: 16 }}>
        {/* Box 1 */}
        <div style={{ flex: 1, borderRadius: 20, padding: '20px 16px', textAlign: 'center', background: '#DCFCE7' }}>
          <div style={{ fontSize: 28 }}>👥</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 6 }}>Thành viên</div>
          <div style={{ fontSize: 32, fontWeight: 950, color: '#10B981', lineHeight: 1.1, marginTop: 4 }}>{totalMembers}</div>
        </div>
        {/* Box 2 */}
        <div style={{ flex: 1, borderRadius: 20, padding: '20px 16px', textAlign: 'center', background: '#DBEAFE' }}>
          <div style={{ fontSize: 28 }}>📅</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 6 }}>Buổi chơi</div>
          <div style={{ fontSize: 32, fontWeight: 950, color: '#3B82F6', lineHeight: 1.1, marginTop: 4 }}>{totalSessions}</div>
        </div>
        {/* Box 3 */}
        <div style={{ flex: 1, borderRadius: 20, padding: '20px 16px', textAlign: 'center', background: '#DCFCE7' }}>
          <div style={{ fontSize: 28 }}>✅</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 6 }}>Đã đóng</div>
          <div style={{ fontSize: 32, fontWeight: 950, color: '#10B981', lineHeight: 1.1, marginTop: 4 }}>{paidMembers}</div>
        </div>
        {/* Box 4 */}
        <div style={{ flex: 1, borderRadius: 20, padding: '20px 16px', textAlign: 'center', background: '#FFF7ED' }}>
          <div style={{ fontSize: 28 }}>⏳</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 6 }}>Chưa đóng</div>
          <div style={{ fontSize: 32, fontWeight: 950, color: '#F97316', lineHeight: 1.1, marginTop: 4 }}>{unpaidMembers}</div>
        </div>
      </div>

      {/* SECTION 5: TỔNG KẾT */}
      <div
        style={{
          margin: '24px 32px 0',
          background: 'linear-gradient(135deg, #0B2A4A, #1A3A5C)',
          borderRadius: 24,
          overflow: 'hidden',
        }}
      >
        {/* Header bar */}
        <div
          style={{
            background: 'rgba(0,0,0,0.2)',
            padding: '18px 28px',
            fontSize: 16,
            fontWeight: 900,
            color: 'white',
            letterSpacing: 2,
          }}
        >
          📊 TỔNG KẾT KỲ QUỸ
        </div>

        {/* Rows */}
        <div style={{ padding: '0 28px 24px' }}>
          {/* Row 1 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              minHeight: 56,
            }}
          >
            <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Tổng thu</span>
            <span style={{ color: '#10B981', fontSize: 20, fontWeight: 900 }}>{VND(totalIncome)}</span>
          </div>
          {/* Row 2 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              minHeight: 56,
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: 600 }}>Tổng chi</span>
            <span style={{ color: '#F97316', fontSize: 20, fontWeight: 900 }}>{VND(totalExpense)}</span>
          </div>
          {/* Row 3 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: 56,
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 700 }}>Số dư cuối kỳ</span>
            <span
              style={{
                color: balancePositive ? '#34D399' : '#EF4444',
                fontSize: 24,
                fontWeight: 950,
              }}
            >
              {balancePositive ? '+' : '-'}{VND(Math.abs(fundBalance))}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 7: FOOTER SPORT POSTER */}
      <div
        style={{
          minHeight: 340,
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #040E1C 0%, #0B2A4A 45%, #0A3D2E 80%, #065F46 100%)',
          marginTop: 40,
        }}
      >
        <PlayerSilhouetteLeft />
        <PlayerSilhouetteRight />

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', paddingTop: 60, paddingBottom: 60 }}>
          <div style={{ fontSize: 40 }}>🥒</div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 950,
              color: 'white',
              letterSpacing: 4,
              marginTop: 12,
            }}
          >
            CHƠI HẾT MÌNH
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 950,
              color: '#FACC15',
              letterSpacing: 3,
              marginTop: 4,
            }}
          >
            ĐÓNG QUỸ HẾT Ý
          </div>
          <div
            style={{
              width: 120,
              height: 2,
              background: 'rgba(255,255,255,0.2)',
              margin: '24px auto',
            }}
          />
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>PickleFund Sport Club</div>
          <div style={{ fontSize: 10, color: '#10B981', marginTop: 8 }}>● ● ●</div>
        </div>
      </div>

      {/* SECTION 8: BOTTOM FOOTER BAR */}
      <div
        style={{
          height: 60,
          background: '#020810',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 40px',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 900, color: '#10B981' }}>🥒 PickleFund</span>
        <span
          style={{
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 400,
          }}
        >
          {periodLabel}
        </span>
        <span style={{ fontSize: 12 }}>{exportDate}</span>
      </div>
    </div>
  );
}
