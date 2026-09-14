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
  // Bot RIÊNG của CLB đang được app polling (để trả lời lệnh /start,/myid,/status…).
  // Key = TOKEN (không phải clubId) → nếu nhiều CLB dùng CHUNG một token thì chỉ 1 poller
  // (tránh Telegram 409 "terminated by other getUpdates"). ownerClubId = CLB gắn với bot này
  // (để lệnh /status… scope đúng CLB). Gửi thông báo KHÔNG cần map này (chỉ cần token).
  private clubBots = new Map<string, { bot: Telegraf; ownerClubId: string }>();

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
    this.registerCommands(this.bot);
    this.bot
      .launch()
      .catch((err) =>
        this.logger.error(`[Telegram] Launch error: ${err.message}`),
      );
    this.logger.log('[Telegram] Bot started');

    // Ngoài bot chung, app còn polling bot RIÊNG của từng CLB đã đăng ký → bot riêng
    // cũng trả lời lệnh (/start,/myid,/status…). Fire-and-forget, không chặn khởi động.
    void this.launchAllClubBots();
  }

  onModuleDestroy() {
    this.bot?.stop('SIGTERM');
    for (const [token, entry] of this.clubBots) {
      try {
        entry.bot.stop('SIGTERM');
      } catch (err: any) {
        this.logger.warn(
          `[Telegram] stop club bot (token …${token.slice(-6)}) lỗi: ${err?.message ?? err}`,
        );
      }
    }
    this.clubBots.clear();
  }

  /** Nạp mọi token bot RIÊNG của CLB (systemSetting telegram_bot_token_<clubId>) và polling.
   *  Nhiều CLB trùng token → chỉ polling 1 lần (launchClubBot tự khử trùng theo token). */
  private async launchAllClubBots(): Promise<void> {
    const rows = await this.prisma.systemSetting
      .findMany({ where: { key: { startsWith: 'telegram_bot_token_' } } })
      .catch(() => [] as { key: string; value: string }[]);
    for (const r of rows) {
      const clubId = r.key.replace('telegram_bot_token_', '');
      const token = r.value?.trim();
      if (clubId && token) this.launchClubBot(token, clubId);
    }
    if (this.clubBots.size) {
      this.logger.log(
        `[Telegram] Đang polling ${this.clubBots.size} bot riêng của CLB`,
      );
    }
  }

  /** Khởi động polling cho 1 TOKEN bot riêng. Đã polling token này rồi → bỏ qua (khử trùng). */
  private launchClubBot(token: string, ownerClubId: string): void {
    if (this.clubBots.has(token)) return; // token đã có poller → không tạo poller thứ 2
    let bot: Telegraf;
    try {
      bot = new Telegraf(token);
    } catch (err: any) {
      this.logger.warn(
        `[Telegram] Không tạo được bot riêng CLB ${ownerClubId}: ${err?.message ?? err}`,
      );
      return;
    }
    this.registerCommands(bot, ownerClubId);
    this.clubBots.set(token, { bot, ownerClubId });
    bot
      .launch()
      .catch((err) =>
        this.logger.warn(
          `[Telegram] Launch bot riêng CLB ${ownerClubId} lỗi (token sai/trùng poller?): ${err?.message ?? err}`,
        ),
      );
    this.logger.log(`[Telegram] Bot riêng CLB ${ownerClubId} started`);
  }

  /** Dừng polling 1 TOKEN (khi không CLB nào còn dùng token đó nữa). */
  private stopClubBotToken(token: string): void {
    const entry = this.clubBots.get(token);
    if (!entry) return;
    try {
      entry.bot.stop('SIGTERM');
    } catch {
      /* bỏ qua */
    }
    this.clubBots.delete(token);
    this.logger.log(`[Telegram] Bot riêng CLB ${entry.ownerClubId} stopped`);
  }

  /** Còn CLB nào dùng token này không (để quyết định có dừng poller khi 1 CLB gỡ/đổi token). */
  private async tokenStillUsed(token: string): Promise<boolean> {
    const n = await this.prisma.systemSetting
      .count({ where: { key: { startsWith: 'telegram_bot_token_' }, value: token } })
      .catch(() => 0);
    return n > 0;
  }

  private registerCommands(bot: Telegraf, ownerClubId?: string) {

    bot.start((ctx) =>
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

    bot.help((ctx) =>
      ctx.reply(
        '🤖 PickleFund Bot — Trợ lý quản lý CLB pickleball\n\n' +
          'Sử dụng /status để xem tổng quan CLB.\n' +
          'Để kết nối tài khoản, đăng nhập app và vào Cài đặt → Telegram.',
      ),
    );

    bot.command('status', async (ctx) => {
      const clubId = await this.resolveClubId(ctx, ownerClubId);
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

    bot.command('brief', async (ctx) => {
      const clubId = await this.resolveClubId(ctx, ownerClubId);
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

    bot.command('health', async (ctx) => {
      const clubId = await this.resolveClubId(ctx, ownerClubId);
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

    bot.command('reminders', async (ctx) => {
      const clubId = await this.resolveClubId(ctx, ownerClubId);
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

    bot.command('balance', async (ctx) => {
      const clubId = await this.resolveClubId(ctx, ownerClubId);
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

    bot.command('debt', async (ctx) => {
      const clubId = await this.resolveClubId(ctx, ownerClubId);
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

    bot.command('report', async (ctx) => {
      const clubId = await this.resolveClubId(ctx, ownerClubId);
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

    bot.command('members', async (ctx) => {
      const clubId = await this.resolveClubId(ctx, ownerClubId);
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

    bot.command('upcoming', async (ctx) => {
      const clubId = await this.resolveClubId(ctx, ownerClubId);
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

    bot.command('myid', (ctx) => {
      const chatId = ctx.chat?.id?.toString() ?? 'không xác định';
      ctx.reply(
        `🆔 *Chat ID của bạn:* \`${chatId}\`\n\n` +
          `Dùng ID này để kết nối bot với CLB:\n` +
          `1. Vào PickleFund → Cài đặt → Telegram\n` +
          `2. Nhập ID \`${chatId}\` rồi bấm Lưu`,
        { parse_mode: 'Markdown' },
      );
    });

    bot.on('text', (ctx) => {
      ctx.reply(
        'Gõ /help để xem các lệnh hỗ trợ. Gõ /myid để lấy Chat ID kết nối CLB.',
      );
    });
  }

  /** CLB cho ngữ cảnh lệnh: ưu tiên CLB CHỦ của bot (bot riêng → xác định CLB chắc chắn),
   *  fallback tra ngược theo chat (bot chung / chat dùng chung → CLB đầu tiên khớp). */
  private async resolveClubId(
    ctx: Context,
    ownerClubId?: string,
  ): Promise<string | null> {
    if (ownerClubId) return ownerClubId;
    return this.getClubIdForChat(ctx);
  }

  /** Tra ngược 1 chat → clubId (khóa-theo-CLB telegram_club_chat_<clubId>=chatId).
   *  Chat dùng chung nhiều CLB → trả CLB đầu tiên (chỉ dùng cho bot chung; bot riêng đã có ownerClubId). */
  private async getClubIdForChat(ctx: Context): Promise<string | null> {
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) return null;
    const setting = await this.prisma.systemSetting
      .findFirst({
        where: { key: { startsWith: 'telegram_club_chat_' }, value: chatId },
      })
      .catch(() => null);
    return setting ? setting.key.replace('telegram_club_chat_', '') : null;
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
    // Khóa-theo-CLB: mỗi CLB một key telegram_club_chat_<clubId>=chatId. KHÔNG đè CLB khác →
    // một Chat ID có thể DÙNG CHUNG cho nhiều CLB (link chat cho CLB B không mất ở CLB A).
    const key = `telegram_club_chat_${clubId}`;
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: chatId },
      update: { value: chatId },
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
      .findFirst({ where: { key: `telegram_club_chat_${clubId}` } })
      .catch(() => null);
    return setting?.value ?? null;
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
    const newToken = token.trim();
    const oldToken = await this.getClubBotToken(clubId); // để dừng poller token cũ nếu đổi
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: newToken },
      update: { value: newToken },
    });
    // CLB đổi token → dừng poller token cũ nếu không CLB nào khác còn dùng nó.
    if (oldToken && oldToken !== newToken && !(await this.tokenStillUsed(oldToken))) {
      this.stopClubBotToken(oldToken);
    }
    // Bắt đầu polling bot riêng này (khử trùng theo token) → nó trả lời /start,/myid,/status…
    this.launchClubBot(newToken, clubId);
    this.logger.log(`[Telegram] Club ${clubId} set own bot @${info.username}`);
    return info;
  }

  /** Gỡ bot riêng của CLB → CLB quay lại dùng bot chung (nếu có). */
  async clearClubBotToken(clubId: string): Promise<void> {
    const oldToken = await this.getClubBotToken(clubId);
    await this.prisma.systemSetting
      .deleteMany({ where: { key: this.clubTokenKey(clubId) } })
      .catch(() => null);
    // Chỉ dừng poller khi KHÔNG CLB nào khác còn dùng token này (tránh cắt bot của CLB khác).
    if (oldToken && !(await this.tokenStillUsed(oldToken))) {
      this.stopClubBotToken(oldToken);
    }
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
   * TÁCH một chat id khỏi MỌI CLB (gỡ mọi key telegram_club_chat_<clubId> có value=chatId) +
   * xoá pref.telegramChatId trùng. Dùng khi muốn chấm dứt việc dùng chung một chat cụ thể.
   */
  async detachChat(
    chatId: string,
  ): Promise<{ unlinkedClubs: number; clearedPrefs: number }> {
    const del = await this.prisma.systemSetting.deleteMany({
      where: { key: { startsWith: 'telegram_club_chat_' }, value: chatId },
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
