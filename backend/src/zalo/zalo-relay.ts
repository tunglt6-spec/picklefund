/**
 * Chuyển tiếp (relay) webhook Zalo: 1 bot Zalo chỉ có MỘT webhook (setWebhook) và getUpdates không chạy khi đã có webhook,
 * nên nếu một nền tảng khác (vd. AI-BOT) cùng dùng token bot thì hai bên giành quyền nhận tin. PickleFund giữ webhook
 * duy nhất và chuyển tiếp tin không thuộc lệnh PickleFund sang URL của nền tảng kia.
 */
import { lookup } from 'dns/promises';
import { parseZaloCommand } from './zalo-commands';

export type RelayMode = 'unhandled' | 'all';

/** Tin này do PickleFund xử lý (theo cấu hình đang bật) → KHÔNG chuyển tiếp ở chế độ 'unhandled'. */
export function isPickleOwned(
  text: string,
  flags: { intakeEnabled?: boolean; commandsEnabled?: boolean },
): boolean {
  const t = text.trim();
  if (!t) return false;
  // Mã kết nối nhóm luôn thuộc PickleFund.
  if (/(?:^|\s)\/ketnoi\s+[A-F0-9]{16}$/i.test(t)) return true;
  if (/(?:^|\s)\/lienket\s/i.test(t)) return !!(flags.intakeEnabled || flags.commandsEnabled);
  if (/(?:^|\s)\/(thu|chi)\s/i.test(t)) return !!flags.intakeEnabled;
  return !!flags.commandsEnabled && parseZaloCommand(t) !== null;
}

export function isPublicIp(ip: string): boolean {
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a >= 224) return false;
    return true;
  }
  const low = ip.toLowerCase();
  if (low === '::1' || low === '::') return false;
  if (low.startsWith('::ffff:')) return isPublicIp(low.replace('::ffff:', ''));
  if (low.startsWith('fe80') || low.startsWith('fc') || low.startsWith('fd')) return false;
  return true;
}

/** Chỉ cho gửi tới host công khai (chặn SSRF vào mạng nội bộ / metadata). */
export async function isHostPublic(hostname: string): Promise<boolean> {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  try {
    const addrs = await lookup(h, { all: true });
    return addrs.length > 0 && addrs.every((a) => isPublicIp(a.address));
  } catch {
    return false;
  }
}
