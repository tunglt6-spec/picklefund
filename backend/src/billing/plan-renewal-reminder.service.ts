import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PLAN_CONFIGS } from './billing.types';
import { addMonths } from './billing-manual.service';
import { asciiMemo, renderTransferQr, type PlatformBank } from './platform-qr';

export interface RenewalSettings {
  enabled: boolean;
  /** MONTH = mỗi tháng · QUARTER = chỉ mỗi quý · BOTH = mỗi tháng, mốc quý nhắc gia hạn 3 tháng. */
  cadence: 'MONTH' | 'QUARTER' | 'BOTH';
  bank: PlatformBank | null;
  contact: string;
}

export interface RenewalSummary {
  clubs: number;
  reminded: number;
  sent: { inApp: number; email: number; telegram: number };
  failed: number;
  skipped: string[];
}

const KEYS = [
  'renewal_reminder_enabled', 'renewal_reminder_cadence',
  'platform_bank_code', 'platform_bank_account_number', 'platform_bank_account_name', 'platform_contact',
];
const NEAR_EXPIRY_DAYS = 35;

/** Số tháng TRỌN đã qua kể từ `from` đến `now` (theo addMonths: 31/1 → 28/2). */
export function monthsElapsed(from: Date, now: Date): number {
  let m = Math.max(0, (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth()));
  while (m > 0 && addMonths(from, m).getTime() > now.getTime()) m--;
  return m;
}

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Tự động nhắc gia hạn gói: mỗi CLB có gói trả phí (có hạn) khi "tròn tháng/quý" kể từ ngày mở tài khoản CLB
 * VÀ gói sắp hết hạn (≤ 35 ngày) hoặc đã hết hạn → gửi cho các Admin CLB qua chuông + email + Telegram, đính kèm mã QR
 * chuyển khoản và thông tin tài khoản nhận của Super Admin. Mỗi mốc chỉ nhắc 1 lần (khóa periodKey).
 */
@Injectable()
export class PlanRenewalReminderService {
  private readonly logger = new Logger(PlanRenewalReminderService.name);

  constructor(private prisma: PrismaService, private email: EmailService, private config: ConfigService) {}

  async getSettings(): Promise<RenewalSettings> {
    const rows = await this.prisma.systemSetting.findMany({ where: { key: { in: KEYS } } });
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const code = (m.platform_bank_code ?? '').trim();
    const account = (m.platform_bank_account_number ?? '').trim();
    const name = (m.platform_bank_account_name ?? '').trim();
    const cadence = ['MONTH', 'QUARTER', 'BOTH'].includes(m.renewal_reminder_cadence) ? (m.renewal_reminder_cadence as RenewalSettings['cadence']) : 'BOTH';
    return {
      enabled: m.renewal_reminder_enabled === 'true',
      cadence,
      bank: code && account && name ? { code, account, name } : null,
      contact: (m.platform_contact ?? '').trim(),
    };
  }

  @Cron('30 8 * * *', { name: 'plan_renewal_reminders', timeZone: 'Asia/Ho_Chi_Minh' })
  async runDaily() {
    try {
      const s = await this.getSettings();
      if (!s.enabled || !s.bank) return;
      const r = await this.run();
      if (r.reminded) this.logger.log(`Nhắc gia hạn: ${r.reminded}/${r.clubs} CLB — chuông ${r.sent.inApp}, email ${r.sent.email}, telegram ${r.sent.telegram}, lỗi ${r.failed}`);
    } catch (e) {
      this.logger.warn(`Nhắc gia hạn lỗi: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Thông tin + số tiền gợi ý để CLB Admin tự thanh toán gia hạn (màn Gói dịch vụ). */
  async renewalInfo(clubId: string, months: number) {
    const [s, club] = await Promise.all([
      this.getSettings(),
      this.prisma.club.findUnique({ where: { id: clubId }, select: { id: true, name: true, code: true, plan: true, planExpiresAt: true } }),
    ]);
    if (!club || !s.bank) return null;
    const price = PLAN_CONFIGS[club.plan === 'STARTER' ? 'PRO' : club.plan].priceMonthly;
    const amount = price ? price * months : 0;
    const memo = asciiMemo(`GIA HAN ${club.code} ${club.plan === 'CLUB_PLUS' ? 'ENT' : 'PRO'} ${months}T`);
    return { bank: s.bank, contact: s.contact, amount, memo, months, plan: club.plan, planExpiresAt: club.planExpiresAt, clubName: club.name };
  }

  async renewalQr(clubId: string, months: number): Promise<Buffer | null> {
    const info = await this.renewalInfo(clubId, months);
    return info ? renderTransferQr(info.bank, info.amount, info.memo) : null;
  }

  private async sendTelegram(chatId: string, token: string, caption: string, qr: Buffer | null) {
    const base = `https://api.telegram.org/bot${token}`;
    if (qr) {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('caption', caption.slice(0, 1000));
      form.append('photo', new Blob([new Uint8Array(qr)], { type: 'image/png' }), 'qr-gia-han.png');
      const r = await fetch(`${base}/sendPhoto`, { method: 'POST', body: form });
      if (r.ok) return;
    }
    const r2 = await fetch(`${base}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: caption }) });
    if (!r2.ok) throw new Error(`Telegram ${r2.status}`);
  }

  /** Quét toàn bộ CLB đến mốc nhắc. `onlyClubId` để chạy cho 1 CLB (thử/nhắc lại thủ công — vẫn tôn trọng chống nhắc trùng). */
  async run(onlyClubId?: string): Promise<RenewalSummary> {
    const s = await this.getSettings();
    if (!s.bank) throw new BadRequestException('Chưa cấu hình tài khoản nhận tiền (Cài đặt hệ thống → Nhắc gia hạn gói).');
    const out: RenewalSummary = { clubs: 0, reminded: 0, sent: { inApp: 0, email: 0, telegram: 0 }, failed: 0, skipped: [] };
    const now = new Date();
    const clubs = await this.prisma.club.findMany({
      where: { status: 'active', plan: { in: ['PRO', 'CLUB_PLUS'] }, planExpiresAt: { not: null }, ...(onlyClubId ? { id: onlyClubId } : {}) },
      select: { id: true, name: true, code: true, plan: true, planExpiresAt: true, createdAt: true },
    });
    out.clubs = clubs.length;
    const tgToken = this.config.get<string>('TELEGRAM_BOT_TOKEN') || '';

    for (const club of clubs) {
      const m = monthsElapsed(club.createdAt, now);
      if (m < 1) { out.skipped.push(`${club.name}: chưa đủ 1 tháng`); continue; }
      const isQuarter = m % 3 === 0;
      if (s.cadence === 'QUARTER' && !isQuarter) { out.skipped.push(`${club.name}: không phải mốc quý`); continue; }
      const exp = club.planExpiresAt!;
      const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
      if (daysLeft > NEAR_EXPIRY_DAYS) { out.skipped.push(`${club.name}: gói còn ${daysLeft} ngày`); continue; }
      const periodKey = `M${m}`;
      const dup = await this.prisma.notification.findFirst({
        where: { clubId: club.id, eventType: 'plan_renewal_reminder', metadata: { path: ['periodKey'], equals: periodKey } },
        select: { id: true },
      });
      if (dup) { out.skipped.push(`${club.name}: đã nhắc mốc ${periodKey}`); continue; }

      const months = isQuarter && s.cadence !== 'MONTH' ? 3 : 1;
      const price = PLAN_CONFIGS[club.plan].priceMonthly;
      const amount = price ? price * months : 0;
      const memo = asciiMemo(`GIA HAN ${club.code} ${club.plan === 'CLUB_PLUS' ? 'ENT' : 'PRO'} ${months}T`);
      const planName = PLAN_CONFIGS[club.plan].name;
      const milestone = isQuarter ? `đủ ${m / 3} quý (${m} tháng)` : `đủ ${m} tháng`;
      const expText = daysLeft < 0 ? `đã hết hạn ${Math.abs(daysLeft)} ngày` : `còn ${daysLeft} ngày (hết hạn ${exp.toLocaleDateString('vi-VN')})`;
      const title = `Gia hạn gói ${planName} — ${club.name}`;
      const lines = [
        `CLB ${club.name} đã đồng hành cùng PickleFund ${milestone}. Gói ${planName} ${expText}.`,
        `Để gia hạn ${months} tháng${amount ? ` (${vnd(amount)})` : ''}, vui lòng chuyển khoản:`,
        `• Ngân hàng: ${s.bank.code}`,
        `• Số tài khoản: ${s.bank.account}`,
        `• Chủ tài khoản: ${s.bank.name}`,
        `• Nội dung: ${memo}`,
        'Hoặc quét mã QR (đính kèm email/Telegram; trong ứng dụng: Hệ thống → Gói dịch vụ → Thanh toán gia hạn qua QR). Chuyển khoản xong, bấm "Báo đã chuyển khoản" để Super Admin xác nhận.',
        ...(s.contact ? [`Liên hệ: ${s.contact}`] : []),
      ];
      const text = lines.join('\n');
      const qr = await renderTransferQr(s.bank, amount, memo);

      const admins = await this.prisma.user.findMany({
        where: { clubId: club.id, role: 'CLUB_ADMIN', isActive: true },
        select: { id: true, email: true, notificationEnabled: true, notificationPref: { select: { telegramChatId: true } } },
      });
      if (!admins.length) { out.skipped.push(`${club.name}: không có Admin`); continue; }

      const meta = { periodKey, kind: 'plan_renewal', months, amount, memo, bank: { ...s.bank } };
      let any = false;
      for (const a of admins) {
        try {
          await this.prisma.notification.create({
            data: { userId: a.id, clubId: club.id, eventType: 'plan_renewal_reminder', priority: 'HIGH', channel: 'IN_APP', title, body: text, metadata: meta, status: 'SENT', sentAt: new Date() },
          });
          out.sent.inApp++;
          any = true;
        } catch (e) { out.failed++; this.logger.warn(`in-app ${club.code}: ${String(e)}`); }
        if (a.notificationEnabled === false) continue;
        const to = a.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email) && !/\.local$/i.test(a.email) ? a.email : null;
        if (to && this.email.isEnabled) {
          const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
            <h2 style="color:#4f46e5;margin:0 0 12px">${esc(title)}</h2>
            ${lines.map((l) => `<p style="margin:6px 0;color:#1e293b;font-size:14px">${esc(l)}</p>`).join('')}
            ${qr ? '<p style="text-align:center;margin-top:16px"><img src="cid:renewal-qr" alt="QR chuyển khoản" width="240" height="240"/></p>' : ''}
          </div>`;
          const ok = await this.email.send(to, title, html, { fromName: 'PickleFund', ...(qr ? { attachments: [{ filename: 'qr-gia-han.png', content: qr, cid: 'renewal-qr', contentType: 'image/png' }] } : {}) });
          if (ok) { out.sent.email++; any = true; } else out.failed++;
        }
        const chat = a.notificationPref?.telegramChatId;
        if (chat && tgToken) {
          try { await this.sendTelegram(chat, tgToken, `${title}\n\n${text}`, qr); out.sent.telegram++; any = true; }
          catch (e) { out.failed++; this.logger.warn(`telegram ${club.code}: ${String(e)}`); }
        }
      }
      if (any) out.reminded++;
    }
    return out;
  }
}
