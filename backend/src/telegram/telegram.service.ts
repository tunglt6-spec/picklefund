import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Telegraf, Context } from 'telegraf'
import { PrismaService } from '../prisma/prisma.service'
import { MaikaService } from '../maika/maika.service'
import { LisaService } from '../lisa/lisa.service'

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name)
  private bot: Telegraf | null = null

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private maika: MaikaService,
    private lisa: LisaService,
  ) {}

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN')
    if (!token) {
      this.logger.warn('[Telegram] TELEGRAM_BOT_TOKEN not set — bot disabled')
      return
    }

    this.bot = new Telegraf(token)
    this.registerCommands()
    this.bot.launch().catch(err => this.logger.error(`[Telegram] Launch error: ${err.message}`))
    this.logger.log('[Telegram] Bot started')
  }

  onModuleDestroy() {
    this.bot?.stop('SIGTERM')
  }

  private registerCommands() {
    if (!this.bot) return

    this.bot.start(ctx => ctx.reply(
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
    ))

    this.bot.help(ctx => ctx.reply(
      '🤖 PickleFund Bot — Trợ lý quản lý CLB pickleball\n\n' +
      'Sử dụng /status để xem tổng quan CLB.\n' +
      'Để kết nối tài khoản, đăng nhập app và vào Cài đặt → Telegram.',
    ))

    this.bot.command('status', async ctx => {
      const clubId = await this.getClubIdForChat(ctx)
      if (!clubId) { ctx.reply('❌ Chat này chưa được liên kết với CLB nào.'); return }
      try {
        const snap = await this.maika.getClubSnapshot(clubId)
        ctx.reply(
          `📊 *${snap.clubName}*\n` +
          `👥 Thành viên: ${snap.activeMembers}/${snap.totalMembers}\n` +
          `💰 Quỹ chung: ${snap.commonBalance.toLocaleString('vi-VN')}đ\n` +
          `💵 Quỹ mini: ${snap.miniBalance.toLocaleString('vi-VN')}đ\n` +
          `⚠️ Chưa đóng quỹ: ${snap.unpaidCount} người`,
          { parse_mode: 'Markdown' },
        )
      } catch (err: any) {
        ctx.reply('❌ Không thể lấy dữ liệu CLB.')
      }
    })

    this.bot.command('brief', async ctx => {
      const clubId = await this.getClubIdForChat(ctx)
      if (!clubId) { ctx.reply('❌ Chat này chưa được liên kết với CLB nào.'); return }
      try {
        const brief = await this.maika.generateDailyBrief(clubId)
        ctx.reply(`📋 *Daily Brief*\n\n${brief.summary}`, { parse_mode: 'Markdown' })
      } catch (err: any) {
        ctx.reply('❌ Không thể tạo báo cáo.')
      }
    })

    this.bot.command('health', async ctx => {
      const clubId = await this.getClubIdForChat(ctx)
      if (!clubId) { ctx.reply('❌ Chat này chưa được liên kết với CLB nào.'); return }
      try {
        const result = await this.maika.getHealthScore(clubId)
        const bar = this.progressBar(result.score, 100)
        ctx.reply(
          `💚 *Điểm sức khỏe CLB: ${result.score}/100*\n${bar}\n` +
          `_${result.interpretation}_\n\n` +
          `📌 Khuyến nghị:\n${result.recommendations.map(r => `• ${r}`).join('\n')}`,
          { parse_mode: 'Markdown' },
        )
      } catch (err: any) {
        ctx.reply('❌ Không thể tính điểm sức khỏe.')
      }
    })

    this.bot.command('reminders', async ctx => {
      const clubId = await this.getClubIdForChat(ctx)
      if (!clubId) { ctx.reply('❌ Chat này chưa được liên kết với CLB nào.'); return }
      try {
        const reminders = await this.lisa.generateRemindersForClub(clubId)
        if (reminders.length === 0) { ctx.reply('✅ Không có nhắc nhở nào hôm nay.'); return }
        const text = reminders.slice(0, 10).map(r => `• [${r.priority}] ${r.title}`).join('\n')
        ctx.reply(`🔔 *${reminders.length} nhắc nhở*\n\n${text}`, { parse_mode: 'Markdown' })
      } catch { ctx.reply('❌ Không thể lấy danh sách nhắc nhở.') }
    })

    this.bot.command('balance', async ctx => {
      const clubId = await this.getClubIdForChat(ctx)
      if (!clubId) { ctx.reply('❌ Chat này chưa được liên kết với CLB nào.'); return }
      try {
        const snap = await this.maika.getClubSnapshot(clubId)
        ctx.reply(
          `💰 *Số dư quỹ — ${snap.clubName}*\n\n` +
          `Quỹ chung: *${snap.commonBalance.toLocaleString('vi-VN')}đ*\n` +
          `Quỹ mini: *${snap.miniBalance.toLocaleString('vi-VN')}đ*\n` +
          `Tổng tài sản: *${snap.totalAssets.toLocaleString('vi-VN')}đ*`,
          { parse_mode: 'Markdown' },
        )
      } catch { ctx.reply('❌ Không thể lấy số dư quỹ.') }
    })

    this.bot.command('debt', async ctx => {
      const clubId = await this.getClubIdForChat(ctx)
      if (!clubId) { ctx.reply('❌ Chat này chưa được liên kết với CLB nào.'); return }
      try {
        const snap = await this.maika.getClubSnapshot(clubId)
        if (snap.unpaidCount === 0) {
          ctx.reply('✅ Tất cả thành viên đã đóng quỹ kỳ này!'); return
        }
        ctx.reply(
          `⚠️ *Chưa đóng quỹ: ${snap.unpaidCount} người*\n` +
          `Kỳ: ${snap.currentPeriodName ?? 'Hiện tại'}\n` +
          `Tổng thành viên hoạt động: ${snap.activeMembers}`,
          { parse_mode: 'Markdown' },
        )
      } catch { ctx.reply('❌ Không thể lấy danh sách nợ.') }
    })

    this.bot.command('report', async ctx => {
      const clubId = await this.getClubIdForChat(ctx)
      if (!clubId) { ctx.reply('❌ Chat này chưa được liên kết với CLB nào.'); return }
      ctx.reply('⏳ Đang tạo báo cáo tuần...')
      try {
        const report = await this.maika.generateWeeklyReport(clubId)
        ctx.reply(
          `📊 *Báo cáo tuần*\n\n${report.summary}\n\n` +
          `📌 *Highlights:*\n${report.highlights.map(h => `• ${h}`).join('\n')}`,
          { parse_mode: 'Markdown' },
        )
      } catch { ctx.reply('❌ Không thể tạo báo cáo.') }
    })

    this.bot.command('members', async ctx => {
      const clubId = await this.getClubIdForChat(ctx)
      if (!clubId) { ctx.reply('❌ Chat này chưa được liên kết với CLB nào.'); return }
      try {
        const snap = await this.maika.getClubSnapshot(clubId)
        const inactive = snap.totalMembers - snap.activeMembers
        ctx.reply(
          `👥 *Thành viên — ${snap.clubName}*\n\n` +
          `Đang hoạt động: *${snap.activeMembers}*\n` +
          `Tạm nghỉ/Rời CLB: *${inactive}*\n` +
          `Tổng: *${snap.totalMembers}*`,
          { parse_mode: 'Markdown' },
        )
      } catch { ctx.reply('❌ Không thể lấy danh sách thành viên.') }
    })

    this.bot.command('upcoming', async ctx => {
      const clubId = await this.getClubIdForChat(ctx)
      if (!clubId) { ctx.reply('❌ Chat này chưa được liên kết với CLB nào.'); return }
      try {
        const snap = await this.maika.getClubSnapshot(clubId)
        const text = snap.currentPeriodName
          ? `📅 *Kỳ hiện tại: ${snap.currentPeriodName}*\nSố buổi đã tổ chức: ${snap.currentPeriodSessions}`
          : '📅 Hiện chưa có kỳ quỹ đang hoạt động.'
        ctx.reply(text, { parse_mode: 'Markdown' })
      } catch { ctx.reply('❌ Không thể lấy lịch hoạt động.') }
    })

    this.bot.command('myid', ctx => {
      const chatId = ctx.chat?.id?.toString() ?? 'không xác định'
      ctx.reply(
        `🆔 *Chat ID của bạn:* \`${chatId}\`\n\n` +
        `Dùng ID này để kết nối bot với CLB:\n` +
        `1. Vào PickleFund → Cài đặt → Telegram\n` +
        `2. Nhập ID \`${chatId}\` rồi bấm Lưu`,
        { parse_mode: 'Markdown' },
      )
    })

    this.bot.on('text', ctx => {
      ctx.reply('Gõ /help để xem các lệnh hỗ trợ. Gõ /myid để lấy Chat ID kết nối CLB.')
    })
  }

  private async getClubIdForChat(ctx: Context): Promise<string | null> {
    const chatId = ctx.chat?.id?.toString()
    if (!chatId) return null
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: `telegram_chat_${chatId}` },
    }).catch(() => null)
    return setting?.value ?? null
  }

  private progressBar(value: number, max: number, width = 10): string {
    const filled = Math.round((value / max) * width)
    return '█'.repeat(filled) + '░'.repeat(width - filled)
  }

  // ─── Send message to a Telegram chat ─────────────────────────────────────

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.bot) return false
    try {
      await this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' })
      return true
    } catch (err: any) {
      this.logger.warn(`[Telegram] sendMessage failed to ${chatId}: ${err.message}`)
      return false
    }
  }

  // ─── Link a club's admin chat ─────────────────────────────────────────────

  async linkClubChat(clubId: string, chatId: string): Promise<void> {
    // Remove any existing link for this club first (a club can only have one chat)
    await this.prisma.systemSetting.deleteMany({
      where: { key: { startsWith: 'telegram_chat_' }, value: clubId },
    })
    await this.prisma.systemSetting.upsert({
      where: { key: `telegram_chat_${chatId}` },
      create: { key: `telegram_chat_${chatId}`, value: clubId },
      update: { value: clubId },
    })
    this.logger.log(`[Telegram] Club ${clubId} linked to chat ${chatId}`)
  }

  async getLinkedChatId(clubId: string): Promise<string | null> {
    const setting = await this.prisma.systemSetting.findFirst({
      where: { key: { startsWith: 'telegram_chat_' }, value: clubId },
    }).catch(() => null)
    return setting ? setting.key.replace('telegram_chat_', '') : null
  }
}
