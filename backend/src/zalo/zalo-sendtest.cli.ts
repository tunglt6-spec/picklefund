/**
 * Gửi 1 tin vào nhóm Zalo đã ghép của CLB, theo mẫu "Nhắc lịch hoạt động" + "Thành viên mới",
 * dùng DỮ LIỆU THẬT (buổi chơi sắp tới + thành viên gia nhập gần nhất). Không in token.
 * Dùng trong container: `node dist/zalo/zalo-sendtest.cli.js [--dry] [clubId]`
 *   --dry : chỉ in nội dung sẽ gửi, không gửi.
 */
import { PrismaClient } from '@prisma/client';
import { createDecipheriv, createHash } from 'crypto';

const PREFIX = 'zalo_connection_';

function unseal(token: string): string {
  const key = createHash('sha256').update(`picklefund:zalo:v1:${process.env.JWT_SECRET}`).digest();
  const [iv, tag, content] = token.split('.').map((v) => Buffer.from(v, 'base64url'));
  const d = createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(content), d.final()]).toString('utf8');
}
const dmy = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const wanted = args.find((a) => !a.startsWith('--'));
  if (!process.env.JWT_SECRET) throw new Error('Thiếu JWT_SECRET');
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.systemSetting.findMany({ where: { key: { startsWith: PREFIX } } });
    const ready = rows
      .map((r) => ({ clubId: r.key.slice(PREFIX.length), c: JSON.parse(r.value) }))
      .filter((x) => x.c.enabled && x.c.chatId && x.c.announcements && x.c.canJoinGroups && x.c.webhookReady);
    console.log(`ZALOSEND clubs_san_sang=${ready.length}`);
    const pick = wanted ? ready.find((x) => x.clubId === wanted) : ready.length === 1 ? ready[0] : undefined;
    if (!pick) {
      console.log(`ZALOSEND CANCHON clubIds=${ready.map((x) => x.clubId).join(',')}`);
      return;
    }
    const club = await prisma.club.findUnique({ where: { id: pick.clubId }, select: { name: true } });
    const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) + 'T00:00:00Z');
    const session = await prisma.attendanceSession.findFirst({
      where: { clubId: pick.clubId, status: 'scheduled', sessionDate: { gte: today } },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
    });
    const member = await prisma.member.findFirst({
      where: { clubId: pick.clubId, isDeleted: false, status: 'active' },
      orderBy: [{ joinDate: 'desc' }, { createdAt: 'desc' }],
    });
    const name = club?.name ?? 'CLB';
    const parts: string[] = [];
    if (session) {
      const time = session.startTime ? ` ${session.startTime}${session.endTime ? `–${session.endTime}` : ''}` : '';
      parts.push(`${name} — Nhắc lịch hoạt động\nBuổi sắp tới: ${dmy(session.sessionDate)}${time}${session.courtName ? ` tại ${session.courtName}` : ''}. Các bạn nhớ đăng ký và có mặt đúng giờ nhé!`);
    }
    if (member) parts.push(`${name} — Thành viên mới\nChào mừng ${member.fullName} gia nhập CLB! Cả nhóm cùng chào bạn nhé.`);
    if (parts.length === 0) {
      console.log('ZALOSEND KHONG_CO_DU_LIEU (không có buổi sắp tới và không có thành viên)');
      return;
    }
    const text = parts.join('\n\n');
    console.log(`ZALOSEND NOIDUNG\n${text}\n--- (${dry ? 'DRY RUN, chưa gửi' : 'sẽ gửi'}) club=${pick.clubId} nhom=${pick.c.chatName ?? '?'}`);
    if (dry) return;
    const token = unseal(pick.c.token);
    const res = await fetch(`https://bot-api.zaloplatforms.com/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: pick.c.chatId, text }),
      signal: AbortSignal.timeout(12000),
    });
    const data = (await res.json()) as { ok?: boolean; error_code?: number };
    console.log(`ZALOSEND ${data.ok === true ? 'DA_GUI' : `LOI API_${data.error_code ?? res.status}`}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.log(`ZALOSEND LOI ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`);
  process.exit(1);
});
