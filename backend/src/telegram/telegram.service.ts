import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { MaikaService } from '../maika/maika.service';
import { LisaService } from '../lisa/lisa.service';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private maika: MaikaService,
    private lisa: LisaService,
  ) {}

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('[Telegram] TELEGRAM_BOT_TOKEN not set — bot disabled');
      return;
    }

    this.bot = new Telegraf(token);
    this.registerCommands();
    this.bot
      .launch()
      .catch((err) =>
        this.logger.error(`[Telegram] Launch error: ${err.message}`),
      );
    this.logger.log('[Telegram] Bot started');
  }

  onModuleDestroy() {
    this.bot?.stop('SIGTERM');
  }

  private registerCommands() {
    if (!this.bot) return;

    this.bot.start((ctx) =>
      ctx.reply(
        '👋 Chào mừng đến với PickleFund Bot!\n\n' +
          '📋 *Các lệnh hỗ trợ:*\n' +
          '/status — Tổng quan CLB\n' +
          '/balance — Số dư quỹ\n' +
          '/debt — Danh sách chưa đóng quỹ\n' +
          '/brief — Báo cáo nhanh hôm nay\n' +
          '/report — Báo cáo tuần\n' +
          '/health — Điểm sức khỏe CLB\n' +
          '/members — Thống kê thành viên\n' +
          '/upcoming — Lịch hoạt động\n' +
          '/reminders — Nhắc nhở hôm nay\n' +
          '/help — Hướng dẫn sử dụng',
        { parse_mode: 'Markdown' },
      ),
    );

    this.bot.help((ctx) =>
      ctx.reply(
        '🤖 PickleFund Bot — Trợ lý quản lý CLB pickleball\n\n' +
          'Sử dụng /status để xem tổng quan CLB.\n' +
          'Để kết nối tài khoản, đăng nhập app và vào Cài đặt → Telegram.',
      ),
    );

    this.bot.command('status', async (ctx) => {
      const clubId = await this.getClubIdForChat(ctx);
      if (!clubId) {
        ctx.reply('❌ Chat này chưa được liên kết với CLB nào.');
        return;
      }
      try {
        const snap = await this.maika.getClubSnapshot(clubId);
        ctx.reply(
          `📊 *${snap.clubName}*\n` +
            `👥 Thành viên: ${snap.activeMembers}/${snap.totalMembers}\n` +
            `💰 Quỹ chung: ${snap.commonBalance.toLocaleString('vi-VN')}đ\n` +
            `💵 Quỹ mini: ${snap.miniBalance.toLocaleString('vi-VN')}đ\n` +
            `⚠️ Chưa đóng quỹ: ${snap.unpaidCount} người`,
          { parse_mode: 'Markdown' },
        );
      } catch (err: any) {
        ctx.reply('❌ Không thể lấy dữ liệu CLB.');
      }
    });

    this.bot.command('brief', async (ctx) => {
      const clubId = await this.getClubIdForChat(ctx);
      if (!clubId) {
        ctx.reply('❌ Chat này chưa được liên kết với CLB nào.');
        return;
      }
      try {
        const brief = await this.maika.generateDailyBrief(clubId);
        ctx.reply(`📋 *Daily Brief*\n\n${brief.summary}`, {
          parse_mode: 'Markdown',
        });
      } catch (err: any) {
        ctx.reply('❌ Không thể tạo báo cáo.');
      }
    });

    this.bot.command('health', async (ctx) => {
      const clubId = await this.getClubIdForChat(ctx);
      if (!clubId) {
        ctx.reply('❌ Chat này chưa được liên kết với CLB nào.');
        return;
      }
      try {
        const result = await this.maika.getHealthScore(clubId);
        const bar = this.progressBar(result.score, 100);
        ctx.reply(
          `💚 *Điểm sức khỏe CLB: ${result.score}/100*\n${bar}\n` +
            `_${result.interpretation}_\n\n` +
            `📌 Khuyến nghị:\n${result.recommendations.map((r) => `• ${r}`).join('\n')}`,
          { parse_mode: 'Markdown' },
        );
      } catch (err: any) {
        ctx.reply('❌ Không thể tính điểm sức khỏe.');
      }
    });

    this.bot.command('reminders', async (ctx) => {
      const clubId = await this.getClubIdForChat(ctx);
      if (!clubId) {
        ctx.reply('❌ Chat này chưa được liên kết với CLB nào.');
        return;
      }
      try {
        const reminders = await this.lisa.generateRemindersForClub(clubId);
        if (reminders.length === 0) {
          ctx.reply('✅ Không có nhắc nhở nào hôm nay.');
          return;
        }
        const text = reminders
          .slice(0, 10)
          .map((r) => `• [${r.priority}] ${r.title}`)
          .join('\n');
        ctx.reply(`🔔 *${reminders.length} nhắc nhở*\n\n${text}`, {
          parse_mode: 'Markdown',
        });
      } catch {
        ctx.reply('❌ Không thể lấy danh sách nhắc nhở.');
      }
    });

    this.bot.command('balance', async (ctx) => {
      const clubId = await this.getClubIdForChat(ctx);
      if (!clubId) {
        ctx.reply('❌ Chat này chưa được liên kết với CLB nào.');
        return;
      }
      try {
        const snap = await this.maika.getClubSnapshot(clubId);
        ctx.reply(
          `💰 *Số dư quỹ — ${snap.clubName}*\n\n` +
            `Quỹ chung: *${snap.commonBalance.toLocaleString('vi-VN')}đ*\n` +
            `Quỹ mini: *${snap.miniBalance.toLocaleString('vi-VN')}đ*\n` +
            `Tổng tài sản: *${snap.totalAssets.toLocaleString('vi-VN')}đ*`,
          { parse_mode: 'Markdown' },
        );
      } catch {
        ctx.reply('❌ Không thể lấy số dư quỹ.');
      }
    });

    this.bot.command('debt', async (ctx) => {
      const clubId = await this.getClubIdForChat(ctx);
      if (!clubId) {
        ctx.reply('❌ Chat này chưa được liên kết với CLB nào.');
        return;
      }
      try {
        const snap = await this.maika.getClubSnapshot(clubId);
        if (snap.unpaidCount === 0) {
          ctx.reply('✅ Tất cả thành viên đã đóng quỹ kỳ này!');
          return;
        }
        ctx.reply(
          `⚠️ *Chưa đóng quỹ: ${snap.unpaidCount} người*\n` +
            `Kỳ: ${snap.currentPeriodName ?? 'Hiện tại'}\n` +
            `Tổng thành viên hoạt động: ${snap.activeMembers}`,
          { parse_mode: 'Markdown' },
        );
      } catch {
        ctx.reply('❌ Không thể lấy danh sách nợ.');
      }
    });

    this.bot.command('report', async (ctx) => {
      const clubId = await this.getClubIdForChat(ctx);
      if (!clubId) {
        ctx.reply('❌ Chat này chưa được liên kết với CLB nào.');
        return;
      }
      ctx.reply('⏳ Đang tạo báo cáo tuần...');
      try {
        const report = await this.maika.generateWeeklyReport(clubId);
        ctx.reply(
          `📊 *Báo cáo tuần*\n\n${report.summary}\n\n` +
            `📌 *Highlights:*\n${report.highlights.map((h) => `• ${h}`).join('\n')}`,
          { parse_mode: 'Markdown' },
        );
      } catch {
        ctx.reply('❌ Không thể tạo báo cáo.');
      }
    });

    this.bot.command('members', async (ctx) => {
      const clubId = await this.getClubIdForChat(ctx);
      if (!clubId) {
        ctx.reply('❌ Chat này chưa được liên kết với CLB nào.');
        return;
      }
      try {
        const snap = await this.maika.getClubSnapshot(clubId);
        const inactive = snap.totalMembers - snap.activeMembers;
        ctx.reply(
          `👥 *Thành viên — ${snap.clubName}*\n\n` +
            `Đang hoạt động: *${snap.activeMembers}*\n` +
            `Tạm nghỉ/Rời CLB: *${inactive}*\n` +
            `Tổng: *${snap.totalMembers}*`,
          { parse_mode: 'Markdown' },
        );
      } catch {
        ctx.reply('❌ Không thể lấy danh sách thành viên.');
      }
    });

    this.bot.command('upcoming', async (ctx) => {
      const clubId = await this.getClubIdForChat(ctx);
      if (!clubId) {
        ctx.reply('❌ Chat này chưa được liên kết với CLB nào.');
        return;
      }
      try {
        const snap = await this.maika.getClubSnapshot(clubId);
        const text = snap.currentPeriodName
          ? `📅 *Kỳ hiện tại: ${snap.currentPeriodName}*\nSố buổi đã tổ chức: ${snap.currentPeriodSessions}`
          : '📅 Hiện chưa có kỳ quỹ đang hoạt động.';
        ctx.reply(text, { parse_mode: 'Markdown' });
      } catch {
        ctx.reply('❌ Không thể lấy lịch hoạt động.');
      }
    });

    this.bot.command('myid', (ctx) => {
      const chatId = ctx.chat?.id?.toString() ?? 'không xác định';
      ctx.reply(
        `🆔 *Chat ID của bạn:* \`${chatId}\`\n\n` +
          `Dùng ID này để kết nối bot với CLB:\n` +
          `1. Vào PickleFund → Cài đặt → Telegram\n` +
          `2. Nhập ID \`${chatId}\` rồi bấm Lưu`,
        { parse_mode: 'Markdown' },
      );
    });

    this.bot.on('text', (ctx) => {
      ctx.reply(
        'Gõ /help để xem các lệnh hỗ trợ. Gõ /myid để lấy Chat ID kết nối CLB.',
      );
    });
  }

  private async getClubIdForChat(ctx: Context): Promise<string | null> {
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) return null;
    const setting = await this.prisma.systemSetting
      .findUnique({
        where: { key: `telegram_chat_${chatId}` },
      })
      .catch(() => null);
    return setting?.value ?? null;
  }

  private progressBar(value: number, max: number, width = 10): string {
    const filled = Math.round((value / max) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
  }

  // ─── Send message to a Telegram chat ─────────────────────────────────────

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    return (await this.sendMessageResult(chatId, text)).ok;
  }

  /** Như sendMessage nhưng trả LÝ DO lỗi từ Telegram (chat not found / bot chưa /start / token sai). */
  async sendMessageResult(
    chatId: string,
    text: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.bot)
      return { ok: false, error: 'Bot chưa cấu hình (thiếu TELEGRAM_BOT_TOKEN)' };
    try {
      await this.bot.telegram.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
      });
      return { ok: true };
    } catch (err: any) {
      const desc =
        err?.response?.description || err?.description || err?.message || 'unknown';
      this.logger.warn(`[Telegram] sendMessage failed to ${chatId}: ${desc}`);
      return { ok: false, error: desc };
    }
  }

  // ─── Link a club's admin chat ─────────────────────────────────────────────

  async linkClubChat(clubId: string, chatId: string): Promise<void> {
    // Remove any existing link for this club first (a club can only have one chat)
    await this.prisma.systemSetting.deleteMany({
      where: { key: { startsWith: 'telegram_chat_' }, value: clubId },
    });
    await this.prisma.systemSetting.upsert({
      where: { key: `telegram_chat_${chatId}` },
      create: { key: `telegram_chat_${chatId}`, value: clubId },
      update: { value: clubId },
    });
    this.logger.log(`[Telegram] Club ${clubId} linked to chat ${chatId}`);
  }

  /** @username của bot app (bot đang chạy = TELEGRAM_BOT_TOKEN). null nếu chưa cấu hình/không lấy được.
   *  Dùng để chỉ cho người dùng ĐÚNG bot cần /start (tránh nhầm với bot khác họ tự tạo). */
  async getBotUsername(): Promise<string | null> {
    if (!this.bot) return null;
    try {
      const me = await this.bot.telegram.getMe();
      return me?.username ?? null;
    } catch {
      return null;
    }
  }

  async getLinkedChatId(clubId: string): Promise<string | null> {
    const setting = await this.prisma.systemSetting
      .findFirst({
        where: { key: { startsWith: 'telegram_chat_' }, value: clubId },
      })
      .catch(() => null);
    return setting ? setting.key.replace('telegram_chat_', '') : null;
  }

  // ─── Bot token RIÊNG theo CLB ─────────────────────────────────────────────
  // Mỗi CLB có thể đăng ký bot Telegram RIÊNG (tự tạo qua @BotFather). App gửi thông báo
  // của CLB đó qua CHÍNH token của CLB — không phụ thuộc bot chung của hệ thống. Gửi tin chỉ
  // cần token + chatId (KHÔNG cần polling), nên bot riêng của CLB dùng để nhận thông báo được
  // ngay mà không cần app chạy process polling cho từng bot.
  //
  // Lưu tại systemSetting key `telegram_bot_token_<clubId>` = token (chỉ CLB đó dùng).

  private clubTokenKey(clubId: string): string {
    return `telegram_bot_token_${clubId}`;
  }

  /** Token bot RIÊNG của CLB (nếu đã đăng ký), else null → caller fallback về TELEGRAM_BOT_TOKEN. */
  async getClubBotToken(clubId: string): Promise<string | null> {
    if (!clubId) return null;
    const s = await this.prisma.systemSetting
      .findUnique({ where: { key: this.clubTokenKey(clubId) } })
      .catch(() => null);
    return s?.value?.trim() || null;
  }

  /** Xác thực token với Telegram (getMe) → trả @username của bot. null nếu token sai. */
  async verifyBotToken(token: string): Promise<{ username: string } | null> {
    const t = token?.trim();
    if (!t) return null;
    try {
      const res = await fetch(`https://api.telegram.org/bot${t}/getMe`);
      const data: any = await res.json().catch(() => null);
      if (data?.ok && data?.result?.username) {
        return { username: data.result.username as string };
      }
      return null;
    } catch {
      return null;
    }
  }

  /** Đăng ký/cập nhật bot RIÊNG cho CLB. Xác thực token trước khi lưu; trả @username.
   *  Throw nếu token không hợp lệ (để controller báo lỗi rõ cho người dùng). */
  async setClubBotToken(
    clubId: string,
    token: string,
  ): Promise<{ username: string }> {
    const info = await this.verifyBotToken(token);
    if (!info) {
      throw new Error(
        'Token bot không hợp lệ. Kiểm tra lại token lấy từ @BotFather.',
      );
    }
    const key = this.clubTokenKey(clubId);
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: token.trim() },
      update: { value: token.trim() },
    });
    this.logger.log(`[Telegram] Club ${clubId} set own bot @${info.username}`);
    return info;
  }

  /** Gỡ bot riêng của CLB → CLB quay lại dùng bot chung (nếu có). */
  async clearClubBotToken(clubId: string): Promise<void> {
    await this.prisma.systemSetting
      .deleteMany({ where: { key: this.clubTokenKey(clubId) } })
      .catch(() => null);
    this.logger.log(`[Telegram] Club ${clubId} cleared own bot token`);
  }

  /** Thông tin bot của CLB cho giao diện: có bot riêng không + @username (bot riêng hoặc bot chung).
   *  KHÔNG bao giờ trả token ra ngoài. */
  async getClubBotInfo(
    clubId: string,
  ): Promise<{ hasOwnBot: boolean; username: string | null }> {
    const clubToken = await this.getClubBotToken(clubId);
    if (clubToken) {
      const info = await this.verifyBotToken(clubToken);
      return { hasOwnBot: true, username: info?.username ?? null };
    }
    return { hasOwnBot: false, username: await this.getBotUsername() };
  }

  /** Gửi tin qua token TUỲ Ý (HTTP trực tiếp) — dùng cho bot riêng của CLB. */
  private async sendViaToken(
    token: string,
    chatId: string,
    text: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
        },
      );
      const data: any = await res.json().catch(() => null);
      if (data?.ok) return { ok: true };
      const desc = data?.description || `Telegram API ${res.status}`;
      this.logger.warn(`[Telegram] sendViaToken failed to ${chatId}: ${desc}`);
      return { ok: false, error: desc };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'unknown' };
    }
  }

  /** Gửi cho CLB: ưu tiên bot RIÊNG của CLB, fallback bot chung của hệ thống. */
  async sendMessageForClub(
    clubId: string,
    chatId: string,
    text: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const clubToken = await this.getClubBotToken(clubId);
    if (clubToken) return this.sendViaToken(clubToken, chatId, text);
    return this.sendMessageResult(chatId, text);
  }

  /**
   * TÁCH một chat id khỏi hệ thống: gỡ liên kết CLB (systemSetting telegram_chat_<id>) +
   * xoá pref.telegramChatId trùng. Dùng để chấm dứt việc nhiều CLB dùng chung một chat
   * (vd chat super admin) — sau đó mỗi CLB phải liên kết chat riêng.
   */
  async detachChat(
    chatId: string,
  ): Promise<{ unlinkedClubs: number; clearedPrefs: number }> {
    const del = await this.prisma.systemSetting.deleteMany({
      where: { key: `telegram_chat_${chatId}` },
    });
    const upd = await this.prisma.notificationPreference.updateMany({
      where: { telegramChatId: chatId },
      data: { telegramChatId: null },
    });
    this.logger.log(
      `[Telegram] detach chat ${chatId}: unlinked ${del.count} club(s), cleared ${upd.count} pref(s)`,
    );
    return { unlinkedClubs: del.count, clearedPrefs: upd.count };
  }
}
