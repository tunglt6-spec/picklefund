import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { EmailService } from '../email/email.service';
import { buildReceiptPdf, buildReceiptsPdf, type ReceiptPdfMeta, type ReceiptPdfRow } from './receipt-pdf';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PersonalReceiptsService {
  private readonly logger = new Logger(PersonalReceiptsService.name);

  constructor(
    private prisma: PrismaService,
    private calculator: FinancialCalculatorService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  async findByMember(memberId: string, clubId: string) {
    return this.prisma.personalReceipt.findMany({
      where: { memberId, clubId },
      include: { fundPeriod: true },
      orderBy: { snapshotAt: 'desc' },
    });
  }

  async findByPeriod(fundPeriodId: string, clubId: string) {
    return this.prisma.personalReceipt.findMany({
      where: { fundPeriodId, clubId },
      include: { member: { select: { fullName: true } } },
    });
  }

  async findMine(memberId: string, clubId: string) {
    return this.prisma.personalReceipt.findMany({
      where: { memberId, clubId },
      include: { fundPeriod: true },
      orderBy: { snapshotAt: 'desc' },
    });
  }

  // Compute and snapshot all member receipts for a fund period
  async generateForPeriod(fundPeriodId: string, clubId: string) {
    // Chống nhiễm chéo tenant: kỳ quỹ BẮT BUỘC thuộc clubId người gọi (calculate() nhận id từ URL param).
    const period = await this.prisma.fundPeriod.findFirst({
      where: { id: fundPeriodId, clubId },
      select: { id: true },
    });
    if (!period) throw new NotFoundException('Kỳ quỹ không thuộc CLB này');
    const summary = await this.calculator.calculate(fundPeriodId, clubId);

    const receipts = await Promise.all(
      summary.members.map(async (m) => {
        const attendanceRate =
          summary.totalSessions > 0
            ? new Decimal(m.attendedSessions / summary.totalSessions).toDecimalPlaces(2)
            : new Decimal(0);
        const needToPay =
          m.balance < 0 ? new Decimal(Math.abs(m.balance)) : new Decimal(0);

        return this.prisma.personalReceipt.upsert({
          where: { fundPeriodId_memberId: { fundPeriodId, memberId: m.memberId } },
          create: {
            fundPeriodId,
            memberId: m.memberId,
            clubId,
            attendedSessions: m.attendedSessions,
            totalSessions: m.totalSessions,
            attendanceRate,
            amountPaid: new Decimal(m.paidAmount),
            courtCost: new Decimal(m.courtFee),
            livingCost: new Decimal(m.livingFee),
            totalCost: new Decimal(m.totalCost),
            balance: new Decimal(m.balance),
            needToPay,
          },
          update: {
            attendedSessions: m.attendedSessions,
            totalSessions: m.totalSessions,
            attendanceRate,
            amountPaid: new Decimal(m.paidAmount),
            courtCost: new Decimal(m.courtFee),
            livingCost: new Decimal(m.livingFee),
            totalCost: new Decimal(m.totalCost),
            balance: new Decimal(m.balance),
            needToPay,
          },
        });
      }),
    );

    const notified = await this.notifyMembers(fundPeriodId, clubId, receipts);
    return { receipts, notified };
  }

  private async pdfRows(fundPeriodId: string, clubId: string, memberId?: string) {
    const period = await this.prisma.fundPeriod.findFirst({
      where: { id: fundPeriodId, clubId },
      select: {
        name: true, startDate: true, endDate: true, contributionAmount: true,
        club: { select: { name: true } },
      },
    });
    if (!period) throw new NotFoundException('Kỳ quỹ không thuộc CLB này');
    const list = await this.prisma.personalReceipt.findMany({
      where: { fundPeriodId, clubId, ...(memberId ? { memberId } : {}) },
      include: { member: { select: { fullName: true, user: { select: { username: true } } } } },
      orderBy: { member: { fullName: 'asc' } },
    });
    const contribs = await this.prisma.fundContribution.findMany({
      where: { fundPeriodId, clubId, isConfirmed: true, memberId: { in: list.map((r) => r.memberId) } },
      select: { memberId: true, paymentDate: true },
      orderBy: { paymentDate: 'desc' },
    });
    const lastPaid = new Map<string, Date>();
    for (const c of contribs) if (c.memberId && c.paymentDate && !lastPaid.has(c.memberId)) lastPaid.set(c.memberId, c.paymentDate);
    const summary = await this.calculator.calculate(fundPeriodId, clubId).catch(() => null);
    const ddmmyyyy = (x: Date) =>
      `${String(x.getUTCDate()).padStart(2, '0')}/${String(x.getUTCMonth() + 1).padStart(2, '0')}/${x.getUTCFullYear()}`;
    const meta: ReceiptPdfMeta = {
      clubName: period.club?.name ?? 'PickleFund',
      periodName: period.name,
      startDate: ddmmyyyy(period.startDate),
      endDate: ddmmyyyy(period.endDate),
      contributionAmount: Number(period.contributionAmount),
      totalCourtFee: summary?.commonFund.totalCourt,
      totalOtherFee: summary?.commonFund.totalLiving,
      memberCountForSplit: summary && summary.memberCount > 0 ? summary.memberCount : undefined,
      generatedAt: new Date(),
    };
    const rows: (ReceiptPdfRow & { memberId: string })[] = list.map((r) => {
      const paid = lastPaid.get(r.memberId);
      return {
        memberId: r.memberId,
        memberName: r.member.fullName,
        loginName: r.member.user?.username,
        attendedSessions: r.attendedSessions,
        totalSessions: r.totalSessions,
        courtCost: Number(r.courtCost),
        livingCost: Number(r.livingCost),
        totalCost: Number(r.totalCost),
        amountPaid: Number(r.amountPaid),
        balance: Number(r.balance),
        needToPay: Number(r.needToPay),
        paymentDate: paid ? ddmmyyyy(paid) : '',
        isConfirmed: Number(r.amountPaid) > 0,
      };
    });
    return { meta, rows };
  }

  /** PDF gộp cả kỳ (mỗi thành viên 1 trang) hoặc riêng 1 thành viên. */
  async pdfForPeriod(fundPeriodId: string, clubId: string, memberId?: string) {
    const { meta, rows } = await this.pdfRows(fundPeriodId, clubId, memberId);
    if (rows.length === 0) throw new NotFoundException('Chưa có phiếu thu — hãy tạo phiếu thu trước');
    const buffer = await buildReceiptsPdf(meta, rows);
    return { buffer, filename: `phieu-thu-${meta.periodName}${memberId ? '-' + rows[0].memberName : ''}.pdf` };
  }

  private async sendTelegramMessage(
    chatId: string,
    token: string,
    text: string,
    pdf?: { buffer: Buffer; filename: string },
  ) {
    const base = `https://api.telegram.org/bot${token}`;
    const r1 = await fetch(`${base}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!r1.ok) throw new Error(`Telegram sendMessage ${r1.status}`);
    if (pdf) {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('document', new Blob([new Uint8Array(pdf.buffer)], { type: 'application/pdf' }), pdf.filename);
      const r2 = await fetch(`${base}/sendDocument`, { method: 'POST', body: form });
      if (!r2.ok) throw new Error(`Telegram sendDocument ${r2.status}`);
    }
  }

  /**
   * Báo từng member qua: in-app (chuông) + email (kèm PDF) + Telegram (kèm PDF). Mỗi kênh độc lập —
   * lỗi 1 kênh KHÔNG ảnh hưởng kênh khác hay việc tạo phiếu. In-app không báo lặp khi tạo lại.
   * Email/Telegram tôn trọng User.notificationEnabled; Telegram cần member đã liên kết chat.
   */
  private async notifyMembers(
    fundPeriodId: string,
    clubId: string,
    receipts: { memberId: string; needToPay: Decimal }[],
  ) {
    const out = { inApp: 0, email: 0, telegram: 0, failed: 0 };
    try {
      const { meta, rows } = await this.pdfRows(fundPeriodId, clubId);
      const members = await this.prisma.member.findMany({
        where: { id: { in: receipts.map((r) => r.memberId) }, isDeleted: false },
        select: {
          id: true,
          email: true,
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
              notificationEnabled: true,
              notificationPref: { select: { telegramChatId: true } },
            },
          },
        },
      });
      const already = await this.prisma.notification.findMany({
        where: { clubId, eventType: 'receipt_generated', metadata: { path: ['fundPeriodId'], equals: fundPeriodId } },
        select: { userId: true },
      });
      const done = new Set(already.map((n) => n.userId));
      const need = new Map(receipts.map((r) => [r.memberId, r.needToPay]));
      const setting = await this.prisma.systemSetting
        .findUnique({ where: { key: `telegram_bot_token_${clubId}` } })
        .catch(() => null);
      const tgToken = setting?.value?.trim() || this.config.get<string>('TELEGRAM_BOT_TOKEN') || '';
      const isRealEmail = (e?: string | null): e is string =>
        !!e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !/\.local$/i.test(e);

      for (const m of members) {
        const due = need.get(m.id);
        const owes = !!due && due.greaterThan(0);
        const title = `Phiếu thu kỳ ${meta.periodName}`;
        const body = owes
          ? `Phiếu thu cá nhân đã sẵn sàng. Bạn cần đóng thêm ${due!.toFixed(0)} đ. Xem chi tiết tại mục Phiếu thu.`
          : 'Phiếu thu cá nhân đã sẵn sàng. Xem chi tiết tại mục Phiếu thu.';
        const row = rows.find((r) => r.memberId === m.id);
        const single = row ? buildReceiptPdf(meta, row) : null;
        const filename = `phieu-thu-${meta.periodName}.pdf`;

        if (m.userId && !done.has(m.userId)) {
          try {
            await this.prisma.notification.create({
              data: {
                userId: m.userId,
                clubId,
                eventType: 'receipt_generated',
                priority: 'MEDIUM',
                channel: 'IN_APP',
                title,
                body,
                metadata: { fundPeriodId },
                status: 'SENT',
                sentAt: new Date(),
              },
            });
            out.inApp++;
          } catch (e) {
            out.failed++;
            this.logger.warn(`in-app: ${String(e)}`);
          }
        }
        if (m.user && m.user.notificationEnabled === false) continue;

        const to = [m.email, m.user?.email].find(isRealEmail);
        if (to && this.email.isEnabled) {
          const sent = await this.email.send(to, title, this.email.buildNotifHtml(title, body), {
            fromName: meta.clubName,
            ...(single ? { attachments: [{ filename, content: single }] } : {}),
          });
          if (sent) out.email++;
          else out.failed++;
        }
        const chatId = m.user?.notificationPref?.telegramChatId;
        if (chatId && tgToken) {
          try {
            await this.sendTelegramMessage(chatId, tgToken, `${title}\n${body}`, single ? { buffer: single, filename } : undefined);
            out.telegram++;
          } catch (e) {
            out.failed++;
            this.logger.warn(`telegram: ${String(e)}`);
          }
        }
      }
    } catch (e) {
      this.logger.warn(`notifyMembers: ${String(e)}`);
    }
    return out;
  }
}
