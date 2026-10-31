import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ContributionsService } from '../contributions/contributions.service';
import { ExpensesService } from '../expenses/expenses.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { HermesEventPublisher } from '../workflows/hermes-event.publisher';
import { IntakePayload, parseIntake } from './zalo-intake.parser';
import type { JwtUser } from '../common/decorators';
import type { Prisma, Role } from '@prisma/client';
interface BotConnection {
  version: string;
  chatId?: string;
  intakeEnabled?: boolean;
  commandsEnabled?: boolean;
  webhookReady: boolean;
}
const digest = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class ZaloIntakeService {
  constructor(
    private prisma: PrismaService,
    private contributions: ContributionsService,
    private expenses: ExpensesService,
    private calculator: FinancialCalculatorService,
    private events: HermesEventPublisher,
  ) {}
  private async actor(
    user: Pick<JwtUser, 'userId' | 'clubId'>,
    db: Prisma.TransactionClient = this.prisma,
    roles: Role[] = ['CLUB_ADMIN', 'CLUB_TREASURER'],
  ) {
    const u = await db.user.findFirst({
      where: {
        id: user.userId,
        clubId: user.clubId ?? '__none__',
        isActive: true,
        role: { in: roles },
      },
    });
    if (!u?.clubId)
      throw new ForbiddenException(
        'Chỉ quản trị CLB hoặc thủ quỹ đang hoạt động được nhập liệu Zalo.',
      );
    return u;
  }
  private async connection(
    clubId: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<BotConnection> {
    const row = await db.systemSetting.findUnique({
      where: { key: 'zalo_connection_' + clubId },
    });
    const c = row ? JSON.parse(row.value) : null;
    if (!c?.chatId || !c.webhookReady || !(c.intakeEnabled || c.commandsEnabled))
      throw new BadRequestException(
        'Quản trị CLB cần bật nhập liệu hoặc lệnh Zalo và xác nhận nhóm trước.',
      );
    return c;
  }
  async state(user: JwtUser, roles?: Role[]) {
    const u = await this.actor(user, this.prisma, roles);
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: 'zalo_connection_' + u.clubId },
    });
    const c = row ? JSON.parse(row.value) : null;
    const identity = await this.prisma.zaloIdentity.findUnique({
      where: { clubId_userId: { clubId: u.clubId!, userId: u.id } },
    });
    const challenge = await this.prisma.zaloLinkChallenge.findUnique({
      where: { clubId_userId: { clubId: u.clubId!, userId: u.id } },
    });
    return {
      enabled: !!c?.intakeEnabled,
      commandsEnabled: !!c?.commandsEnabled,
      linked:
        !!identity &&
        identity.botVersion === c?.version &&
        identity.chatId === c?.chatId,
      displayName: identity?.displayName,
      candidate:
        challenge &&
        challenge.expiresAt > new Date() &&
        challenge.botVersion === c?.version &&
        challenge.chatId === c?.chatId &&
        challenge.candidateId
          ? challenge.candidateName
          : null,
    };
  }
  async linkCode(user: JwtUser, roles?: Role[]) {
    const u = await this.actor(user, this.prisma, roles);
    const c = await this.connection(u.clubId!);
    const code = randomBytes(8).toString('hex').toUpperCase();
    const data = {
      clubId: u.clubId!,
      userId: u.id,
      botVersion: c.version,
      chatId: c.chatId!,
      codeHash: digest(code),
      expiresAt: new Date(Date.now() + 600000),
      candidateId: null,
      candidateName: null,
    };
    await this.prisma.zaloLinkChallenge.upsert({
      where: { clubId_userId: { clubId: u.clubId!, userId: u.id } },
      create: data,
      update: data,
    });
    return { command: '/lienket ' + code, expiresAt: data.expiresAt };
  }
  async confirmLink(user: JwtUser, roles?: Role[]) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const u = await this.actor(user, tx, roles);
        const c = await this.connection(u.clubId!, tx);
        const q = await tx.zaloLinkChallenge.findUnique({
          where: { clubId_userId: { clubId: u.clubId!, userId: u.id } },
        });
        if (
          !q?.candidateId ||
          q.expiresAt < new Date() ||
          q.botVersion !== c.version ||
          q.chatId !== c.chatId
        )
          throw new BadRequestException(
            'Chưa có yêu cầu hợp lệ hoặc mã đã hết hạn.',
          );
        await tx.zaloLinkChallenge.delete({ where: { id: q.id } });
        await tx.zaloIdentity.upsert({
          where: { clubId_userId: { clubId: u.clubId!, userId: u.id } },
          create: {
            clubId: u.clubId!,
            userId: u.id,
            botVersion: c.version,
            chatId: c.chatId!,
            zaloUserId: q.candidateId,
            displayName: q.candidateName || 'Zalo',
          },
          update: {
            botVersion: c.version,
            chatId: c.chatId!,
            zaloUserId: q.candidateId,
            displayName: q.candidateName || 'Zalo',
          },
        });
        await tx.auditLog.create({
          data: {
            clubId: u.clubId,
            userId: u.id,
            action: 'ZALO_LINK',
            resource: 'ZaloIdentity',
            detail: 'Liên kết danh tính sau xác nhận trong app',
          },
        });
      });
    } catch (e) {
      if ((e as any).code === 'P2002')
        throw new BadRequestException(
          'Zalo này đã liên kết với tài khoản khác trong CLB. Hủy liên kết cũ trước.',
        );
      throw e;
    }
    return this.state(user, roles);
  }
  async unlink(user: JwtUser, roles?: Role[]) {
    const u = await this.actor(user, this.prisma, roles);
    await this.prisma.$transaction(async (tx) => {
      await tx.zaloIdentity.deleteMany({
        where: { clubId: u.clubId!, userId: u.id },
      });
      await tx.zaloLinkChallenge.deleteMany({
        where: { clubId: u.clubId!, userId: u.id },
      });
      await tx.zaloFinanceDraft.updateMany({
        where: { clubId: u.clubId!, senderUserId: u.id, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });
      await tx.auditLog.create({
        data: {
          clubId: u.clubId,
          userId: u.id,
          action: 'ZALO_UNLINK',
          resource: 'ZaloIdentity',
        },
      });
    });
    return this.state(user, roles);
  }
  async receive(
    clubId: string,
    c: BotConnection,
    m: any,
  ): Promise<string | null> {
    if (!c.intakeEnabled || m?.from?.is_bot || typeof m?.text !== 'string')
      return null;
    const text = m.text.trim();
    const candidate = text.match(/(?:^|\s)\/lienket\s+([A-F0-9]{16})$/i);
    if (candidate) {
      if (m?.chat?.chat_type !== 'PRIVATE')
        return 'Vui lòng gửi mã /lienket trong trò chuyện riêng với bot, không đăng mã cá nhân vào nhóm.';
      const q = await this.prisma.zaloLinkChallenge.findUnique({
        where: { codeHash: digest(candidate[1].toUpperCase()) },
      });
      if (
        !q ||
        q.clubId !== clubId ||
        q.botVersion !== c.version ||
        q.chatId !== c.chatId ||
        q.expiresAt < new Date()
      )
        return 'Mã liên kết không hợp lệ hoặc đã hết hạn. Tạo mã mới trong app.';
      const sender = String(m.from?.id || '');
      if (!sender || sender.length > 200) return null;
      const claimed = await this.prisma.zaloLinkChallenge.updateMany({
        where: { id: q.id, candidateId: null, expiresAt: { gt: new Date() } },
        data: {
          candidateId: sender,
          candidateName: String(m.from.display_name || 'Zalo').slice(0, 100),
        },
      });
      return claimed.count
        ? 'Đã nhận yêu cầu. Quay lại Tài khoản cá nhân → Nhập liệu Zalo để kiểm tra tên và xác nhận liên kết.'
        : null;
    }
    if (
      m?.chat?.chat_type !== 'GROUP' ||
      m?.chat?.id !== c.chatId ||
      !/(?:^|\s)\/(thu|chi)\s/i.test(text)
    )
      return null;
    const identity = await this.prisma.zaloIdentity.findFirst({
      where: {
        clubId,
        botVersion: c.version,
        chatId: c.chatId,
        zaloUserId: String(m.from?.id || ''),
      },
    });
    if (!identity)
      return 'Chưa liên kết tài khoản. Vào PickleFund → Cài đặt → Tài khoản cá nhân → Nhập liệu Zalo.';
    await this.actor({ userId: identity.userId, clubId });
    const parsed = parseIntake(text);
    if (!parsed) return null;
    const messageId = String(m.message_id || '');
    if (!messageId || messageId.length > 200)
      throw new BadRequestException('Tin nhắn không có mã hợp lệ.');
    const unique = {
      clubId,
      botVersion: c.version,
      chatId: c.chatId!,
      messageId,
    };
    if (
      await this.prisma.zaloFinanceDraft.findUnique({
        where: { clubId_botVersion_chatId_messageId: unique },
      })
    )
      return null;
    const pending = await this.prisma.zaloFinanceDraft.count({
      where: {
        clubId,
        senderUserId: identity.userId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });
    if (pending >= 20)
      return 'Đang có 20 phiếu chưa xử lý. Vui lòng kiểm tra các phiếu trong app trước khi gửi thêm.';
    const payload = parsed.payload;
    if (payload.fundSource === 'COMMON') {
      const periods = await this.prisma.fundPeriod.findMany({
        where: {
          clubId,
          type: 'chung',
          status: 'active',
          startDate: { lte: new Date(payload.date) },
          endDate: { gte: new Date(payload.date) },
        },
        take: 2,
      });
      if (periods.length === 1) payload.fundPeriodId = periods[0].id;
      if (parsed.kind === 'INCOME') {
        const members = await this.prisma.member.findMany({
          where: {
            clubId,
            isDeleted: false,
            status: 'active',
            fullName: { equals: payload.description, mode: 'insensitive' },
          },
          take: 2,
        });
        if (members.length === 1) payload.memberId = members[0].id;
      }
    }
    try {
      const draft = await this.prisma.zaloFinanceDraft.create({
        data: {
          ...unique,
          id: randomUUID(),
          senderUserId: identity.userId,
          senderZaloId: identity.zaloUserId,
          kind: parsed.kind,
          payload: payload as unknown as Prisma.InputJsonValue,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      return `Đã tạo phiếu ${parsed.kind === 'INCOME' ? 'thu' : 'chi'} chờ kiểm tra: ${payload.amount.toLocaleString('vi-VN')} đ. Chưa ghi vào sổ quỹ.
Mở và kiểm tra: https://picklefund.vn/tai-chinh?tab=payments&zaloDraft=${draft.id}`;
    } catch (e) {
      if ((e as any).code === 'P2002') return null;
      throw e;
    }
  }
  async list(user: JwtUser) {
    const u = await this.actor(user);
    const c = await this.connection(u.clubId!);
    const [drafts, members, periods] = await Promise.all([
      this.prisma.zaloFinanceDraft.findMany({
        where: {
          clubId: u.clubId!,
          botVersion: c.version,
          chatId: c.chatId!,
          ...(u.role === 'CLUB_TREASURER' ? { senderUserId: u.id } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.member.findMany({
        where: { clubId: u.clubId!, isDeleted: false, status: 'active' },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.fundPeriod.findMany({
        where: { clubId: u.clubId!, type: 'chung', status: 'active' },
        select: { id: true, name: true },
        orderBy: { startDate: 'desc' },
      }),
    ]);
    return {
      drafts: drafts.map(
        ({ botVersion, chatId, messageId, senderZaloId, ...d }) => d,
      ),
      members,
      periods,
    };
  }
  async decide(
    user: JwtUser,
    id: string,
    reject: boolean,
    patch?: IntakePayload,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const u = await this.actor(user, tx);
      const c = await this.connection(u.clubId!, tx);
      const d = await tx.zaloFinanceDraft.findFirst({
        where: {
          id,
          clubId: u.clubId!,
          botVersion: c.version,
          chatId: c.chatId,
        },
      });
      if (!d) throw new NotFoundException('Không tìm thấy phiếu.');
      if (u.role !== 'CLUB_ADMIN' && d.senderUserId !== u.id)
        throw new ForbiddenException('Chỉ xử lý phiếu của chính mình.');
      if (d.status !== 'PENDING')
        throw new BadRequestException('Phiếu đã được xử lý.');
      if (d.expiresAt < new Date())
        throw new BadRequestException(
          'Phiếu đã hết hạn sau 24 giờ. Gửi lại lệnh mới.',
        );
      // Revalidate sender identity and role at execution, not just when the webhook arrived.
      await this.actor({ userId: d.senderUserId, clubId: u.clubId }, tx);
      const identity = await tx.zaloIdentity.findFirst({
        where: {
          clubId: u.clubId!,
          userId: d.senderUserId,
          botVersion: c.version,
          chatId: c.chatId,
          zaloUserId: d.senderZaloId,
        },
      });
      if (!identity)
        throw new BadRequestException('Người gửi đã hủy liên kết Zalo.');
      const claim = await tx.zaloFinanceDraft.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: reject ? 'REJECTED' : 'PROCESSING',
          approvedBy: u.id,
          approvedAt: new Date(),
        },
      });
      if (!claim.count) throw new BadRequestException('Phiếu đã được xử lý.');
      if (reject) {
        await tx.auditLog.create({
          data: {
            clubId: u.clubId,
            userId: u.id,
            action: 'ZALO_DRAFT_REJECT',
            resource: 'ZaloFinanceDraft',
            resourceId: id,
          },
        });
        return { rejected: true };
      }
      if (!patch) throw new BadRequestException('Thiếu thông tin kiểm tra.');
      // Parser validates amount/date/fund again; no arbitrary command or model output reaches writes.
      const validated = parseIntake(
        `/${d.kind === 'INCOME' ? 'thu' : 'chi'} ${patch.amount} | ${patch.description} | ${patch.fundSource === 'COMMON' ? 'quỹ chính' : 'quỹ phụ'} | ${patch.date.slice(8, 10)}/${patch.date.slice(5, 7)}/${patch.date.slice(0, 4)}`,
      );
      if (!validated) throw new BadRequestException('Nội dung phiếu không hợp lệ.');
      if (patch.fundSource === 'COMMON') {
        const period = await tx.fundPeriod.findFirst({
          where: {
            id: patch.fundPeriodId || '__none__',
            clubId: u.clubId!,
            type: 'chung',
            status: 'active',
            startDate: { lte: new Date(patch.date) },
            endDate: { gte: new Date(patch.date) },
          },
        });
        if (!period)
          throw new BadRequestException(
            'Chọn kỳ quỹ đang mở có chứa ngày thu/chi.',
          );
      }
      let record: { id: string };
      if (d.kind === 'INCOME') {
        if (
          patch.fundSource === 'COMMON' &&
          !(await tx.member.findFirst({
            where: {
              id: patch.memberId || '__none__',
              clubId: u.clubId!,
              isDeleted: false,
              status: 'active',
            },
          }))
        )
          throw new BadRequestException('Chọn đúng thành viên đang hoạt động.');
        record = await this.contributions.create(
          u.clubId!,
          u.id,
          {
            fundSource: patch.fundSource,
            memberId:
              patch.fundSource === 'COMMON' ? patch.memberId : undefined,
            fundPeriodId:
              patch.fundSource === 'COMMON' ? patch.fundPeriodId : undefined,
            miniIncomeType: patch.fundSource === 'MINI' ? 'OTHER' : undefined,
            payerName: patch.description,
            amount: patch.amount,
            paidAt: patch.date,
            paymentMethod: patch.paymentMethod,
            notes: `[Zalo ${id}] ${patch.description}`,
            isConfirmed: false,
          },
          tx,
        );
      } else {
        if (
          patch.fundSource === 'COMMON' &&
          (!patch.costType || !patch.allocationRule)
        )
          throw new BadRequestException(
            'Chọn loại chi và cách phân bổ trước khi lưu.',
          );
        record = await this.expenses.create(
          u.clubId!,
          u.id,
          {
            fundSource: patch.fundSource,
            fundPeriodId:
              patch.fundSource === 'COMMON' ? patch.fundPeriodId : undefined,
            miniExpenseType: patch.fundSource === 'MINI' ? 'OTHER' : undefined,
            description: patch.description,
            amount: patch.amount,
            expenseDate: patch.date,
            allocationRule: patch.allocationRule,
            costType: patch.costType,
            notes: `[Zalo ${id}]`,
          },
          tx,
        );
      }
      await tx.fundPeriod.updateMany({
        where: { clubId: u.clubId!, closingBalance: { not: null } },
        data: { closingBalance: null },
      });
      await tx.zaloFinanceDraft.update({
        where: { id },
        data: {
          status: 'RECORDED',
          payload: patch as unknown as Prisma.InputJsonValue,
          recordId: record.id,
        },
      });
      await tx.auditLog.create({
        data: {
          clubId: u.clubId,
          userId: u.id,
          action: 'ZALO_DRAFT_RECORD',
          resource: d.kind === 'INCOME' ? 'FundContribution' : 'LivingExpense',
          resourceId: record.id,
          detail: JSON.stringify({
            draftId: id,
            messageId: d.messageId,
            senderUserId: d.senderUserId,
            before: d.payload,
            after: patch,
          }),
        },
      });
      return {
        recordId: record.id,
        kind: d.kind,
        clubId: u.clubId!,
        actorId: u.id,
        fundSource: patch.fundSource,
      };
    });
    if ('recordId' in result && result.clubId) {
      await this.calculator
        .invalidateClosingBalances(result.clubId)
        .catch(() => undefined);
      if (result.kind === 'EXPENSE')
        this.events.publish({
          clubId: result.clubId,
          userId: result.actorId,
          triggerType: 'EXPENSE_RECORDED',
          context: {
            expenseId: result.recordId,
            fundSource: result.fundSource,
          },
          idempotencyKey: `EXPENSE_RECORDED:${result.recordId}`,
        });
    }
    return result;
  }
}
