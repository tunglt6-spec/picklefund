import { loadFontsBase64 } from '../executive-report/export-fonts';

export interface StandingRow {
  name: string;
  played: number;
  won: number;
  /** Điểm xếp hạng (đội) hoặc hiệu số điểm (cá nhân). */
  points: number;
}
export interface StandingsView {
  clubName: string;
  title: string;
  /** Mô tả ngắn: bộ môn / trạng thái giải. */
  subtitle: string;
  rows: StandingRow[];
  updatedAt: string;
  logo: string | null;
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

/** Xếp hạng đội: điểm giảm dần → thắng giảm dần → tên. */
export function rankTeamRows(
  teams: Array<{
    name: string;
    wins: number;
    losses: number;
    points: number;
  }>,
): StandingRow[] {
  return teams
    .map((t) => ({
      name: t.name,
      played: t.wins + t.losses,
      won: t.wins,
      points: t.points,
    }))
    .sort(
      (a, b) =>
        b.points - a.points || b.won - a.won || a.name.localeCompare(b.name),
    );
}

export interface PlayedMatch {
  scoreA: number | null;
  scoreB: number | null;
  winnerIsA: boolean | null;
  teamA: string[];
  teamB: string[];
}

/** BXH cá nhân (đánh đôi ngẫu nhiên): tính lại từ các trận đã xong — thắng → hiệu số → điểm ghi. */
export function rankPlayers(matches: PlayedMatch[]): StandingRow[] {
  const stat = new Map<
    string,
    { played: number; won: number; pf: number; pa: number }
  >();
  const get = (n: string) => {
    let s = stat.get(n);
    if (!s) {
      s = { played: 0, won: 0, pf: 0, pa: 0 };
      stat.set(n, s);
    }
    return s;
  };
  for (const m of matches) {
    const a = m.scoreA ?? 0;
    const b = m.scoreB ?? 0;
    for (const n of m.teamA) {
      const s = get(n);
      s.played++;
      s.pf += a;
      s.pa += b;
      if (m.winnerIsA === true) s.won++;
    }
    for (const n of m.teamB) {
      const s = get(n);
      s.played++;
      s.pf += b;
      s.pa += a;
      if (m.winnerIsA === false) s.won++;
    }
  }
  return [...stat.entries()]
    .map(([name, s]) => ({
      name,
      played: s.played,
      won: s.won,
      points: s.pf - s.pa,
      pf: s.pf,
    }))
    .sort(
      (x, y) => y.won - x.won || y.points - x.points || y.pf - x.pf || x.name.localeCompare(y.name),
    )
    .map(({ name, played, won, points }) => ({ name, played, won, points }));
}

export function zaloStandingsText(v: StandingsView, limit = 10): string {
  const lines = v.rows
    .slice(0, limit)
    .map(
      (r, i) =>
        `${i + 1}. ${r.name} — ${r.won}/${r.played} thắng, ${r.points >= 0 ? '+' : ''}${r.points} điểm`,
    );
  return [
    `BẢNG XẾP HẠNG — ${v.title}`,
    v.clubName,
    v.subtitle,
    '',
    ...(lines.length ? lines : ['Chưa có trận nào hoàn thành.']),
    v.rows.length > limit ? `… và ${v.rows.length - limit} người/đội khác` : '',
    'Chi tiết: https://picklefund.vn/thi-dau (cần đăng nhập).',
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');
}

export function zaloStandingsHtml(v: StandingsView): string {
  const fonts = loadFontsBase64();
  const medal = ['#d6a01a', '#8a96a3', '#b4733a'];
  const rows = v.rows
    .slice(0, 12)
    .map(
      (r, i) =>
        `<tr><td class="rank" style="${i < 3 ? `background:${medal[i]};color:#fff` : ''}">${i + 1}</td><td class="name">${esc(r.name)}</td><td>${r.won}/${r.played}</td><td class="pts">${r.points >= 0 ? '+' : ''}${r.points}</td></tr>`,
    )
    .join('');
  const logo = v.logo
    ? `<img src="${esc(v.logo)}" alt="Logo CLB">`
    : `<div class="monogram">${esc(v.clubName.slice(0, 2).toUpperCase())}</div>`;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
  ${fonts ? `@font-face{font-family:BVP;src:url(data:font/ttf;base64,${fonts.regular})} @font-face{font-family:BVP;font-weight:700;src:url(data:font/ttf;base64,${fonts.bold})}` : ''}
  *{box-sizing:border-box}body{margin:0;background:#eaf0f6;color:#163047;font-family:BVP,Arial,sans-serif;font-size:20px;line-height:1.5}
  main{background:#fff;margin:24px;padding:44px;border:1px solid #cad6e2;border-radius:20px;border-top:8px solid #e46b1b}
  header{display:flex;align-items:center;gap:20px;padding-bottom:24px;border-bottom:1px solid #d8e1ea}header img,.monogram{width:84px;height:84px;object-fit:contain;flex-shrink:0}.monogram{display:grid;place-items:center;border-radius:20px;background:#1368d4;color:#fff;font-weight:700;font-size:28px}
  .brand{font-size:26px;font-weight:700;overflow-wrap:anywhere}.overline{font-size:14px;letter-spacing:1.5px;color:#577087;margin:0}.title{font-size:32px;line-height:1.3;margin:28px 0 8px}.muted{color:#577087;font-size:17px;margin:0 0 20px}
  table{width:100%;border-collapse:collapse;font-size:20px}th{font-size:15px;color:#577087;text-align:left;padding:8px 6px;border-bottom:2px solid #d8e1ea}td{padding:12px 6px;border-bottom:1px solid #dde5ed}td.rank{width:46px;text-align:center;font-weight:700;border-radius:8px}td.name{font-weight:700;overflow-wrap:anywhere}td.pts{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
  .footer{border-top:1px solid #d8e1ea;margin-top:26px;padding-top:18px;display:flex;justify-content:space-between;gap:20px;font-size:14px;color:#577087}.footer b{color:#1368d4}footer p{margin:0}
  </style></head><body><main><header>${logo}<div><p class="overline">KẾT QUẢ GIẢI ĐẤU</p><div class="brand">${esc(v.clubName)}</div></div></header>
  <h1 class="title">${esc(v.title)}</h1><p class="muted">${esc(v.subtitle)}</p>
  <table><thead><tr><th>#</th><th>Tên</th><th>Thắng/Trận</th><th style="text-align:right">Điểm</th></tr></thead><tbody>${rows}</tbody></table>
  <footer class="footer"><p>Lập lúc ${esc(new Date(v.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }))}<br>Giờ Việt Nam (UTC+7)</p><p><b>PickleFund</b><br>picklefund.vn</p></footer></main></body></html>`;
}
