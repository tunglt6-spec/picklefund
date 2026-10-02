import {
  COLORS,
  CONTENT_W,
  DEFAULT_BRAND,
  DEFAULT_BRAND_BADGE,
  DEFAULT_BRAND_BORDER,
  DEFAULT_BRAND_DARK,
  DEFAULT_BRAND_INK,
  DEFAULT_BRAND_SOFT,
  MIN_FONT_PT,
  PAGE,
  PAGE_CSS,
  PDF_MARGIN,
  TYPE,
  buildFooterTemplate,
  contrast,
  docCode,
  dateTimeVN,
  escHtml,
  footerLeftText,
  makeBrand,
  vnd,
  vndCompact,
} from './export-tokens';
import { buildExecModel, healthTone, monogram } from './executive-report-model';
import { buildReportHtml } from './executive-report-html';
import { buildExecutiveReportPdf } from './executive-report-pdf';

const AA = 4.5;

// Báo cáo tối thiểu (có thành viên + chart) để quét HTML/PDF.
function report(clubName = 'CLB Thăng Long', members = 3): any {
  return {
    meta: { clubName, periodName: 'Kỳ 03/2026' },
    summary: { clubHealthScore: 78, activeMembers: 38, totalMembers: 40, participationRate: 82, outstandingCount: 3, completedSessions: 12, cancelledSessions: 1, tournamentsCount: 2 },
    finance: { totalIncome: 12345678, totalExpense: 9876543, balance: 2469135, carryForward: 1200000, clubAssets: 5315000, avgIncomePerMember: 308641, trends: [{ name: 'T1', thu: 9e6, chi: 6e6 }, { name: 'T2', thu: 12345678, chi: 9876543 }], compare: { incomeDeltaPct: 12, expenseDeltaPct: -5, balanceDeltaPct: null } },
    members: { avgHealth: 71, distribution: { excellent: 5, good: 10, fair: 20, atRisk: 5 }, all: Array.from({ length: members }, (_, i) => ({ name: 'Thành viên ' + (i + 1), participationRate: 50 + i, paymentStatus: ['paid', 'debt', 'x'][i % 3], stars: i % 6, conductScore: i % 2 ? 90 : null, healthScore: 30 + i * 25 })) },
    dna: { archetype: 'Cộng đồng gắn kết', traits: [{ key: 'Gắn kết', score: 80 }, { key: 'Tài chính', score: null }] },
    health: { dimensions: [{ key: 'Tài chính', score: 70 }, { key: 'Tham gia', score: null }] },
    ai: { hermes: { completed: 5, runs: 6, failed: 1, running: 0 }, lisa: { answered: 20, reminders: 4 }, maika: { insights: 3, actions: 2 }, mitdac: { executed: 7, failed: 0, avgMs: 120 }, notification: { sent: 30, byChannel: { IN_APP: 20, EMAIL: 5, TELEGRAM: 5 } }, automationScore: { score: 66 } },
    tournament: { tournamentsCount: 2, teamsCount: 8, matchesCount: 20, topPlayers: [{ name: 'Lê Thị Hồng Nhung', wins: 9, winRate: 90 }] },
    activity: { totalSessions: 13, completed: 12, cancelled: 1, avgPresentPerSession: 30.5, busiest: { name: 'Thứ Bảy', present: 40 }, emptiest: { name: 'Thứ Tư', present: 5 } },
    forecast: { dailyNet: -100000, note: 'Dự báo', projected30: 1e6, projected60: -2e6, projected90: -5e6, trendLabel: 'Giảm' },
    timeline: [{ type: 'income', date: '2026-03-01', label: 'Thu Phạm Quang Huy', amount: 5e6 }],
    alerts: [{ message: 'Quỹ Phụ sắp về mức âm' }],
    recommendations: [{ agent: 'Maika', text: 'Nhắc nợ' }],
    generatedAt: '2026-03-31',
  };
}

const AA_LARGE = 3; // số ĐẬM cỡ lớn (≥ 8.5pt bold) — WCAG large text

describe('export-tokens', () => {
  it('palette SINH ĐỘNG khớp bản sắc app (tím #6D5DFB/#4F46E5, xanh thu, đỏ chi)', () => {
    expect(DEFAULT_BRAND).toBe('#6D5DFB');
    expect(DEFAULT_BRAND_DARK).toBe('#4F46E5');
    expect(DEFAULT_BRAND_BORDER).toBe('#C7D2FE');
    expect(DEFAULT_BRAND_BADGE).toBe('#988CFC');
    expect(COLORS.posVivid).toBe('#16A34A');
    expect(COLORS.negVivid).toBe('#DC2626');
    expect(COLORS.negFill).toBe('#EF4444');
    expect(COLORS.orange).toBe('#EA580C');
    expect(COLORS.infoFill).toBe('#0891B2');
    expect(COLORS.warnFill).toBe('#D97706');
    expect(COLORS.posTint).toBe('#F0FDF4');
    expect(COLORS.posBorder).toBe('#BBF7D0');
    expect(COLORS.negTint).toBe('#FEF2F2');
    expect(COLORS.negBorder).toBe('#FECACA');
    expect(COLORS.surface2).toBe('#F8FAFC');
    expect(makeBrand(null)).toMatchObject({
      brand: '#6D5DFB', brandDeep: '#4F46E5', brandInk: '#4F46E5', brandSoft: '#EEF2FF', brandBorder: '#C7D2FE', badge: '#988CFC',
    });
  });

  it('chữ TRẮNG trên băng/bìa/header bảng (brandDeep) ≥ 4.5 và số vivid lớn ≥ 3 trên trắng/nền nhạt', () => {
    expect(contrast('#FFFFFF', makeBrand(null).brandDeep)).toBeGreaterThanOrEqual(AA);
    const pairs: Array<[string, string, string]> = [
      ['posVivid/white', COLORS.posVivid, '#FFFFFF'],
      ['posVivid/posTint', COLORS.posVivid, COLORS.posTint],
      ['negVivid/white', COLORS.negVivid, '#FFFFFF'],
      ['negVivid/negTint', COLORS.negVivid, COLORS.negTint],
      ['orange/white', COLORS.orange, '#FFFFFF'],
      ['orange/warnTint', COLORS.orange, COLORS.warnTint],
      ['cyan/white', COLORS.infoFill, '#FFFFFF'],
      ['cyan/infoTint', COLORS.infoFill, COLORS.infoTint],
      ['brandInk/brandSoft', DEFAULT_BRAND_INK, DEFAULT_BRAND_SOFT],
    ];
    for (const [n, fg, bg] of pairs) expect({ n, c: contrast(fg, bg) >= AA_LARGE }).toEqual({ n, c: true });
    // chữ THƯỜNG nhỏ trên nền nhạt vẫn dùng bản AA
    for (const bg of [COLORS.posTint, COLORS.negTint, COLORS.warnTint, COLORS.infoTint, DEFAULT_BRAND_SOFT, '#FFFFFF']) {
      expect(contrast(COLORS.muted, bg)).toBeGreaterThanOrEqual(AA);
    }
    expect(contrast(COLORS.gray, '#FFFFFF')).toBeGreaterThanOrEqual(AA);
    for (const c of ['#F59E0B', '#FACC15', '#FFFFFF', '#000000', '#0F766E', '#22D3EE']) {
      const b = makeBrand(c);
      expect(contrast('#FFFFFF', b.brandDeep)).toBeGreaterThanOrEqual(AA);
      expect(contrast(b.brandInk, b.brandBorder)).toBeGreaterThanOrEqual(3);
    }
  });

  it('khớp giá trị spec Luxury SaaS', () => {
    expect(COLORS.ink).toBe('#1E293B');
    expect(COLORS.ink2).toBe('#475569');
    expect(COLORS.muted).toBe('#5A6678');
    expect(COLORS.hairline).toBe('#E2E8F0');
    expect(COLORS.pos).toBe('#15803D'); // bản AA cho chữ thường nhỏ
    expect(COLORS.neg).toBe('#B91C1C');
    expect(COLORS.warn).toBe('#B45309');
    expect(COLORS.info).toBe('#0E7490');
    expect(DEFAULT_BRAND).toBe('#6D5DFB');
    expect(DEFAULT_BRAND_INK).toBe('#4F46E5');
    expect(DEFAULT_BRAND_SOFT).toBe('#EEF2FF');
    expect(TYPE).toMatchObject({ display: 22, h1: 16, kpi: 14, h2: 11, body: 8.5, table: 8, label: 7, caption: 7 });
    expect(PAGE.bottom).toBeGreaterThanOrEqual(18);
    expect(CONTENT_W).toBe(178);
  });

  it('mọi cỡ chữ ≥ 7pt', () => {
    for (const v of Object.values(TYPE)) expect(v).toBeGreaterThanOrEqual(MIN_FONT_PT);
  });

  describe('tương phản WCAG ≥ 4.5 cho cặp chữ/nền dùng thật', () => {
    const pairs: Array<[string, string, string]> = [
      ['ink/white', COLORS.ink, '#FFFFFF'],
      ['ink2/white', COLORS.ink2, '#FFFFFF'],
      ['muted/white', COLORS.muted, '#FFFFFF'],
      ['muted/surface2', COLORS.muted, COLORS.surface2],
      ['pos/white', COLORS.pos, '#FFFFFF'],
      ['pos/posTint', COLORS.pos, COLORS.posTint],
      ['neg/white', COLORS.neg, '#FFFFFF'],
      ['neg/negTint', COLORS.neg, COLORS.negTint],
      ['warn/white', COLORS.warn, '#FFFFFF'],
      ['warn/warnTint', COLORS.warn, COLORS.warnTint],
      ['info/white', COLORS.info, '#FFFFFF'],
      ['info/infoTint', COLORS.info, COLORS.infoTint],
      ['brandInk(default)/white', DEFAULT_BRAND_INK, '#FFFFFF'],
      ['brandInk(default)/brandSoft', DEFAULT_BRAND_INK, DEFAULT_BRAND_SOFT],
    ];
    it.each(pairs)('%s', (_n, fg, bg) => {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA);
    });

    it('healthTone: chữ trên nền trắng và trên tint đều AA', () => {
      for (const v of [0, 55, 70, 85]) {
        const t = healthTone(v);
        expect(contrast(t.text, '#FFFFFF')).toBeGreaterThanOrEqual(AA);
        expect(contrast(t.text, t.tint)).toBeGreaterThanOrEqual(AA);
      }
    });

    it('makeBrand: màu CLB sáng/tối đều cho chữ trắng trên brandDeep và brandInk trên brandSoft ≥ 4.5', () => {
      for (const c of ['#F59E0B', '#FACC15', '#FFFFFF', '#000000', '#0F766E', '#6D5DFB', '#EEEEEE', '#22D3EE']) {
        const b = makeBrand(c);
        expect(contrast('#FFFFFF', b.brandDeep)).toBeGreaterThanOrEqual(AA);
        expect(contrast(b.brandInk, '#FFFFFF')).toBeGreaterThanOrEqual(AA);
        expect(contrast(b.brandInk, b.brandSoft)).toBeGreaterThanOrEqual(AA);
      }
    });

    it('makeBrand: rỗng/sai định dạng → mặc định', () => {
      expect(makeBrand(null).brand).toBe(DEFAULT_BRAND);
      expect(makeBrand('red').brand).toBe(DEFAULT_BRAND);
      expect(makeBrand('#6d5dfb')).toMatchObject({ brand: DEFAULT_BRAND, brandInk: DEFAULT_BRAND_INK, brandSoft: DEFAULT_BRAND_SOFT });
    expect(makeBrand('#6d5dfb').brandDeep).toBe(DEFAULT_BRAND_DARK);
    });
  });

  describe('đơn vị tiền vi-VN', () => {
    it('vnd: nhóm nghìn "." + " đ"', () => {
      expect(vnd(1234567)).toBe('1.234.567 đ');
      expect(vnd(0)).toBe('0 đ');
      expect(vnd(null)).toBe('0 đ');
    });
    it('vndCompact: "1,2 triệu đ" / "5,3 tr đ", không còn "Mđ"', () => {
      expect(vndCompact(1200000)).toBe('1,2 triệu đ');
      expect(vndCompact(5300000, true)).toBe('5,3 tr đ');
      expect(vndCompact(9000000, true)).toBe('9 tr đ');
      expect(vndCompact(850000)).toBe('850 nghìn đ');
      expect(vndCompact(850000, true)).toBe('850 k đ');
      expect(vndCompact(2500000000)).toBe('2,5 tỷ đ');
      expect(vndCompact(-2000000)).toBe('-2 triệu đ');
      expect(vndCompact(500)).toBe('500 đ');
      expect(vndCompact(5315000)).not.toMatch(/Mđ|\dM/);
    });
  });

  describe('mã tài liệu / footer', () => {
    const d = new Date('2026-10-02T03:15:00Z'); // 10:15 giờ VN (GMT+7)
    it('docCode PF-EXEC-yyMMdd-HHmm theo giờ VN', () => {
      expect(docCode(d)).toBe('PF-EXEC-261002-1015');
      expect(docCode(d, 'CMD')).toBe('PF-CMD-261002-1015');
      expect(docCode(new Date('2026-10-01T17:05:00Z'))).toBe('PF-EXEC-261002-0005'); // qua nửa đêm VN
      expect(dateTimeVN(d)).toBe('02/10/2026 10:15');
    });

    it('footerLeftText: "CLB · Tên TL · Mã TL", tên rỗng → PickleFund, giữ dấu', () => {
      expect(footerLeftText('CLB Thăng Long', 'Báo cáo điều hành', 'PF-EXEC-261002-1015')).toBe(
        'CLB Thăng Long · Báo cáo điều hành · PF-EXEC-261002-1015',
      );
      expect(footerLeftText('  ', 'Báo cáo điều hành', 'X')).toBe('PickleFund · Báo cáo điều hành · X');
      expect(footerLeftText(undefined, 'T', 'X')).toBe('PickleFund · T · X');
    });

    it('buildFooterTemplate: 7pt, muted, escape, trang x / y, nhúng font khi có', () => {
      const t = buildFooterTemplate(footerLeftText('CLB <Đống Đa> "x"', 'Báo cáo điều hành', 'PF-EXEC-1'), 'QUJD');
      expect(t).toContain('font-size:7pt');
      expect(t).toContain(COLORS.muted);
      expect(t).toContain('CLB &lt;Đống Đa&gt; &quot;x&quot; · Báo cáo điều hành · PF-EXEC-1'); // giữ dấu, không bỏ dấu
      expect(t).toContain('class="pageNumber"');
      expect(t).toContain('class="totalPages"');
      expect(t).toContain('@font-face');
      expect(t).toContain('data:font/ttf;base64,QUJD');
      expect(t).not.toContain('<script');
      expect(buildFooterTemplate('x', null)).not.toContain('@font-face');
    });

    it('lề in: dưới ≥ 18mm và @page khớp lề page.pdf()', () => {
      expect(parseFloat(PDF_MARGIN.bottom)).toBeGreaterThanOrEqual(18);
      expect(PAGE_CSS).toContain(`${PDF_MARGIN.top} ${PDF_MARGIN.right} ${PDF_MARGIN.bottom} ${PDF_MARGIN.left}`);
    });
  });

  it('escHtml escape & < > " \'', () => {
    expect(escHtml(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
    expect(escHtml(null)).toBe('');
  });
});

describe('executive-report-model', () => {
  it('monogram bỏ "CLB/Câu lạc bộ", lấy tối đa 2 chữ đầu', () => {
    expect(monogram('CLB Pickleball Thăng Long')).toBe('PT');
    expect(monogram('Câu lạc bộ Đống Đa')).toBe('ĐĐ');
    expect(monogram('CLB')).toBe('C');
    expect(monogram('')).toBe('C');
  });

  it('footerLeft + mã TL khớp bản Chrome/FE', () => {
    const now = new Date('2026-10-02T03:15:00Z');
    const m = buildExecModel(report(), 'AI', now);
    expect(m.footerLeft).toBe('CLB Thăng Long · Báo cáo điều hành · PF-EXEC-261002-1015');
    expect(buildExecModel(report(''), 'AI', now).footerLeft.startsWith('PickleFund · ')).toBe(true);
    expect(m.coverStats[1].v).toBe('5,3 triệu đ');
  });
});

describe('HTML Chrome đạt chuẩn Luxury SaaS', () => {
  const html = buildReportHtml(report('CLB Thăng Long', 5), 'Tóm tắt', null, { brandColor: '#F59E0B', now: new Date('2026-10-02T03:15:00Z') });
  const css = html.replace(/base64,[A-Za-z0-9+/=]+/g, 'base64,');

  it('SINH ĐỘNG: băng/bìa/header bảng nền ĐẶC brandDeep chữ trắng, KPI số xanh/đỏ, hộp AI brandSoft', () => {
    const b = makeBrand('#F59E0B');
    expect(css).toMatch(/\.cv-hero\{background:var\(--brandDeep\);color:#fff/);
    expect(css).toMatch(/\.mast\{[^}]*background:var\(--brandDeep\);color:#fff/);
    expect(css).toMatch(/thead th\{background:var\(--brandDeep\);color:#fff/);
    expect(css).toMatch(/\.aibox\{background:var\(--brandSoft\);border:[^;]*solid var\(--brandBorder\)/);
    expect(css).toContain(`--brandBorder:${b.brandBorder}`);
    expect(css).toContain(`.tn-pos{--t:${COLORS.posTint};--b:${COLORS.posBorder};--f:${COLORS.posFill};--v:${COLORS.posVivid}}`);
    expect(css).toContain(`.tn-neg{--t:${COLORS.negTint};--b:${COLORS.negBorder};--f:${COLORS.negFill};--v:${COLORS.negVivid}}`);
    expect(css).toContain(`.tb.thu{background:${COLORS.posFill}}.tb.chi{background:${COLORS.negFill}}`);
    // Tổng thu = tông pos, Tổng chi = tông neg, Tổng tài sản âm = neg
    expect(html).toMatch(/class="kpi tn-pos"><div class="kl">Tổng thu</);
    expect(html).toMatch(/class="kpi tn-neg"><div class="kl">Tổng chi</);
    expect(html).toMatch(/class="kpi tn-brand acc"><div class="kl">Tổng tài sản</);
  });

  it('chữ ≥ 7pt: không còn font-size px, mọi pt ≥ 7', () => {
    expect(css).not.toMatch(/font-size:\s*[\d.]+px/);
    const sizes = [...css.matchAll(/font-size:\s*([\d.]+)pt/g)].map((x) => parseFloat(x[1]));
    expect(sizes.length).toBeGreaterThan(20);
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(MIN_FONT_PT);
  });

  it('không gradient / đổ bóng / emoji / glyph ngoài font', () => {
    expect(css).not.toMatch(/gradient\(|box-shadow|backdrop-filter/);
    expect(css).not.toMatch(/linear-gradient|radial-gradient|drop-shadow/);
    expect(css).not.toMatch(/[◆▲▼★⚠✓✨🏓🎮]/u);
  });

  it('màu hex trong HTML chỉ thuộc token (COLORS) hoặc bộ màu thương hiệu', () => {
    const b = makeBrand('#F59E0B');
    const allowed = new Set<string>(
      [...Object.values(COLORS), b.brand, b.brandDeep, b.brandInk, b.brandSoft, b.brandBorder, b.badge, '#FFFFFF'].map((c) => c.toUpperCase()),
    );
    const found = [...css.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((x) => x[0].toUpperCase());
    expect(found.length).toBeGreaterThan(10);
    for (const c of found) expect(allowed.has(c)).toBe(true);
  });

  it('@page khai báo CÙNG lề với page.pdf() (tránh footer đè nội dung) + tr không ngắt giữa hàng', () => {
    expect(css).toContain(PAGE_CSS);
    expect(css).not.toContain('@page{size:A4;margin:0}');
    expect(css).toMatch(/tr\{break-inside:avoid/);
  });

  it('nền đặc bìa dùng brandDeep (tự tối từ màu CLB sáng) và chữ trắng đạt AA', () => {
    const b = makeBrand('#F59E0B');
    expect(css).toContain(`--brandDeep:${b.brandDeep}`);
    expect(contrast('#FFFFFF', b.brandDeep)).toBeGreaterThanOrEqual(AA);
  });

  it('model: tông số liệu — thu pos, chi neg, số âm luôn neg, dự báo theo dấu', () => {
    const m = buildExecModel(report(), 'AI', new Date('2026-10-02T03:15:00Z'));
    expect(m.kpis.find((k) => k.l === 'Tổng thu')?.tone).toBe('pos');
    expect(m.kpis.find((k) => k.l === 'Tổng chi')?.tone).toBe('neg');
    expect(m.finRows[2].tone).toBe('pos'); // cân đối dương
    expect(m.forecast.tiles.map((t) => t.tone)).toEqual(['pos', 'neg', 'neg']);
    expect(healthTone(90).vivid).toBe(COLORS.posVivid);
    expect(healthTone(20).vivid).toBe(COLORS.negVivid);
    for (const v of [90, 70, 55, 10]) {
      const t = healthTone(v);
      expect(contrast(t.vivid, '#FFFFFF')).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('đơn vị tiền kiểu vi-VN, không còn "Mđ"; không có placeholder logo "C" khi có tên CLB', () => {
    expect(html).toContain('5,3 triệu đ');
    expect(html).toContain('12,3 tr đ');
    expect(html).not.toMatch(/\d\.\dMđ|\dMđ/);
    expect(html).toContain('>TL<'); // monogram "Thăng Long" → TL
  });
});

describe('fallback jsPDF', () => {
  it('sinh PDF hợp lệ (có/không thành viên, màu CLB sáng)', () => {
    for (const [n, color] of [[0, null], [40, '#F59E0B'], [3, '#0F766E']] as const) {
      const buf = buildExecutiveReportPdf(report('CLB Đống Đa', n), 'Tóm tắt AI', { brandColor: color, now: new Date('2026-10-02T03:15:00Z') });
      expect(buf).not.toBeNull();
      expect(buf!.subarray(0, 5).toString()).toBe('%PDF-');
      expect(buf!.length).toBeGreaterThan(5000);
    }
  });
});
