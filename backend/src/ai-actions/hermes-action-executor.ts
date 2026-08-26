import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationRuntimeService } from '../notification-runtime/notification-runtime.service';
import type { ActionExecutor, ExecutableAction } from './action-executor';

// email = email nhận (ưu tiên Member.email "Liên hệ", fallback email tài khoản) để gửi EMAIL;
// userId để gửi IN_APP. Một trong hai có thể null (chỉ có tài khoản, hoặc chỉ có email Liên hệ).
type Recipient = {
  memberId: string;
  userId: string | null;
  email: string | null;
};

/** Kênh gửi hợp lệ cho executor (TELEGRAM vẫn DRY_RUN ở runtime → không đưa vào đây). */
const VALID_CHANNELS = ['IN_APP', 'EMAIL'];

/**
 * HermesActionExecutor — Execution Bridge THẬT cho Mít Đặc (Operations Executor).
 *
 * Thay NoOpExecutor: với action ĐÃ DUYỆT, tạo sản phẩm thật = fan-out thông báo.
 * Hỗ trợ:
 * - workflow:DEBT_ESCALATION → nhắc đóng quỹ tới member CHƯA đóng kỳ active.
 * - workflow:EVENT_REMINDER  → nhắc buổi tập sắp tới tới TẤT CẢ member hoạt động.
 * - workflow:REPORT_DISPATCH → báo kỳ quỹ đã chốt tới TẤT CẢ member hoạt động.
 *
 * Route theo kênh (OPT-IN qua requestPayload.channels, mặc định ['IN_APP']):
 * - IN_APP → tài khoản đăng nhập (Member.userId); member không tài khoản → không nhận in-app.
 * - EMAIL  → email Liên hệ (Member.email) ưu tiên, fallback email tài khoản; member không có
 *   email (hoặc .local placeholder) → runtime chặn (DRY_RUN, không tính là gửi).
 *
 * Ranh giới an toàn:
 * - CHỈ chạy trên action đã duyệt (AiActionsService.execute gọi sau khi acquire EXECUTING).
 * - KHÔNG tính/kết luận/ghi tài chính: chỉ ĐỌC member/đóng quỹ/buổi tập/kỳ để chọn người nhận.
 * - Fan-out qua NotificationRuntime (idempotent theo action+user+channel) — không bypass hạ tầng.
 * - Action type chưa hỗ trợ → no-op (tài liệu hoá rõ, không giả lập kết quả).
 */
@Injectable()
export class HermesActionExecutor implements ActionExecutor {
  private readonly logger = new Logger(HermesActionExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationRuntimeService,
  ) {}

  execute(action: ExecutableAction): Promise<Record<string, unknown>> {
    switch (action.actionType) {
      case 'workflow:DEBT_ESCALATION':
        return this.executeDebtEscalation(action);
      case 'workflow:EVENT_REMINDER':
        return this.executeEventReminder(action);
      case 'workflow:REPORT_DISPATCH':
        return this.executeReportDispatch(action);
      // ── Phase 2 — lô Tài chính ──
      case 'workflow:FUND_BALANCE_RISK':
        return this.executeFundBalanceRisk(action);
      case 'workflow:PAYMENT_DUE_REMINDER':
        return this.executePaymentDueReminder(action);
      case 'workflow:MISSING_FINANCE_DOCUMENT':
        return this.executeMissingFinanceDocument(action);
      // ── Phase 3 — lô Hoạt động CLB ──
      case 'workflow:LOW_SESSION_REGISTRATION':
        return this.executeLowSessionRegistration(action);
      case 'workflow:ATTENDANCE_NOT_CLOSED':
        return this.executeAttendanceNotClosed(action);
      case 'workflow:SESSION_CAPACITY_RISK':
        return this.executeSessionCapacityRisk(action);
      case 'workflow:LOW_MEMBER_ATTENDANCE':
        return this.executeLowMemberAttendance(action);
      // ── Phase 4 — Điều phối + Thi đấu + Báo cáo ──
      case 'workflow:APPROVAL_OVERDUE':
        return this.executeApprovalOverdue(action);
      case 'workflow:MATCH_RESULT_MISSING':
        return this.executeMatchResultMissing(action);
      case 'workflow:WEEKLY_CLUB_HEALTH_REPORT':
        return this.executeWeeklyClubHealthReport(action);
      default:
        return Promise.resolve({
          ok: true,
          mode: 'no-op',
          executor: 'MIT_DAT',
          message: `Bridge no-op: chưa hỗ trợ executor thật cho '${action.actionType}'.`,
        });
    }
  }

  // ---------- Helpers dùng chung ----------

  /** Kênh gửi từ rule (requestPayload.channels) — lọc hợp lệ, mặc định IN_APP. */
  private resolveChannels(payload: unknown): string[] {
    const raw = (payload as { channels?: unknown } | null | undefined)
      ?.channels;
    if (Array.isArray(raw)) {
      const chosen = Array.from(
        new Set(
          raw
            .filter((c): c is string => typeof c === 'string')
            .map((c) => c.toUpperCase())
            .filter((c) => VALID_CHANNELS.includes(c)),
        ),
      );
      if (chosen.length) return chosen;
    }
    return ['IN_APP'];
  }

  /**
   * Fan-out tới từng recipient qua từng kênh; idempotent per action+user+channel.
   * Trả số job GỬI MỚI (READY, !duplicate) theo từng kênh, ví dụ { IN_APP: 8, EMAIL: 0 }.
   */
  private async fanOut(
    clubId: string,
    actionId: string,
    recipients: Recipient[],
    title: string,
    body: string,
    channels: string[],
  ): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const channel of channels) {
      let n = 0;
      for (const r of recipients) {
        // IN_APP → tài khoản (userId); EMAIL → thành viên (memberId → Member.email "Liên hệ").
        // Recipient thiếu đích của kênh đó → bỏ qua (vd EMAIL nhưng không có email Liên hệ).
        const target =
          channel === 'IN_APP'
            ? r.userId
              ? {
                  targetType: 'USER',
                  targetId: r.userId,
                  key: `USER:${r.userId}`,
                }
              : null
            : r.email
              ? {
                  targetType: 'MEMBER',
                  targetId: r.memberId,
                  key: `MEMBER:${r.memberId}`,
                }
              : null;
        if (!target) continue;
        const job = (await this.notifications.dispatch(clubId, {
          channel,
          targetType: target.targetType,
          targetId: target.targetId,
          title,
          bodySummary: body,
          idempotencyKey: `AI_ACTION:${actionId}:${target.key}`,
          aiActionId: actionId,
        })) as { status?: string; duplicate?: boolean } | null;
        if (job && job.status === 'READY' && !job.duplicate) n++;
      }
      counts[channel] = n;
    }
    return counts;
  }

  /** "IN_APP:8, EMAIL:0" — tóm tắt số đã gửi theo kênh cho message. */
  private countsStr(counts: Record<string, number>): string {
    return Object.entries(counts)
      .map(([c, n]) => `${c}:${n}`)
      .join(', ');
  }

  /** Tất cả thành viên đang hoạt động → recipient (userId cho IN_APP, email Liên hệ cho EMAIL). */
  private async activeMembers(clubId: string): Promise<Recipient[]> {
    const members = await this.prisma.member.findMany({
      // Thống nhất tiêu chí "hoạt động" với toàn app (ai.service/maika/lisa/members):
      // status='active' + isDeleted=false → KHÔNG gửi cho member inactive/suspended.
      where: { clubId, status: 'active', isDeleted: false },
      select: {
        id: true,
        userId: true,
        email: true,
        user: { select: { email: true } },
      },
    });
    return members.map((m) => this.toRecipient(m));
  }

  /** Chuẩn hoá 1 member → Recipient: email = Member.email (Liên hệ) ưu tiên, fallback email tài khoản. */
  private toRecipient(m: {
    id: string;
    userId: string | null;
    email: string | null;
    user: { email: string | null } | null;
  }): Recipient {
    return {
      memberId: m.id,
      userId: m.userId,
      email: m.email ?? m.user?.email ?? null,
    };
  }

  /** dd/m/yyyy theo UTC (cột @db.Date lưu ngày trần — tránh lệch múi giờ). */
  private fmtDate(d: Date): string {
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
  }

  /** "1.234.567 đ" — deterministic, không phụ thuộc ICU. */
  private fmtMoney(n: number): string {
    const neg = n < 0;
    const s = String(Math.round(Math.abs(n))).replace(
      /\B(?=(\d{3})+(?!\d))/g,
      '.',
    );
    return `${neg ? '-' : ''}${s} đ`;
  }

  /**
   * Người nhận là QUẢN TRỊ CLB (CLUB_ADMIN/CLUB_TREASURER) — cho cảnh báo nội bộ (quỹ âm,
   * thiếu chứng từ). IN_APP tới tài khoản; memberId chỉ là placeholder (kênh IN_APP dùng userId).
   */
  private async adminRecipients(clubId: string): Promise<Recipient[]> {
    const admins = await this.prisma.user.findMany({
      where: { clubId, role: { in: ['CLUB_ADMIN', 'CLUB_TREASURER'] } },
      select: { id: true, email: true },
    });
    return admins.map((u) => ({
      memberId: u.id,
      userId: u.id,
      email: u.email ?? null,
    }));
  }

  private liveResult(message: string): Record<string, unknown> {
    return { ok: true, mode: 'live', executor: 'MIT_DAT', message };
  }

  // ---------- Branch: DEBT_ESCALATION ----------

  /** Nhắc đóng quỹ tới member chưa đóng kỳ active có tài khoản. */
  private async executeDebtEscalation(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;

    const period = await this.prisma.fundPeriod.findFirst({
      where: { clubId, status: 'active', type: 'chung' },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true },
    });
    if (!period) {
      return this.liveResult(
        'Không có kỳ quỹ đang mở — không có thành viên nào để nhắc.',
      );
    }

    const [members, paidRows] = await Promise.all([
      this.prisma.member.findMany({
        // Chỉ nhắc nợ member đang hoạt động (thống nhất status='active' + isDeleted=false).
        where: { clubId, status: 'active', isDeleted: false },
        select: {
          id: true,
          userId: true,
          email: true,
          user: { select: { email: true } },
        },
      }),
      this.prisma.fundContribution.findMany({
        where: {
          clubId,
          fundPeriodId: period.id,
          fundSource: 'COMMON',
          isConfirmed: true,
          memberId: { not: null },
        },
        select: { memberId: true },
        distinct: ['memberId'],
      }),
    ]);

    const paid = new Set(paidRows.map((r) => r.memberId));
    const unpaid = members.filter((m) => !paid.has(m.id));
    const recipients = unpaid.map((m) => this.toRecipient(m));

    const channels = this.resolveChannels(action.requestPayload);
    const title = `Nhắc đóng quỹ kỳ ${period.name}`;
    const body =
      `Bạn chưa hoàn tất đóng quỹ kỳ "${period.name}". Vui lòng đóng quỹ sớm nhé.`;

    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );

    this.logger.log(
      `DEBT_ESCALATION ${action.id}: unpaid=${unpaid.length} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Nhắc nợ kỳ "${period.name}": ${unpaid.length} thành viên chưa đóng. Đã gửi [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Branch: EVENT_REMINDER ----------

  /** Nhắc buổi tập sắp tới (gần nhất) tới tất cả member hoạt động có tài khoản. */
  private async executeEventReminder(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const session = await this.prisma.attendanceSession.findFirst({
      where: { clubId, sessionDate: { gte: today } },
      orderBy: { sessionDate: 'asc' },
      select: {
        sessionDate: true,
        startTime: true,
        endTime: true,
        courtName: true,
      },
    });
    if (!session) {
      return this.liveResult(
        'Không có buổi tập sắp tới — không có gì để nhắc.',
      );
    }

    const recipients = await this.activeMembers(clubId);
    const dateStr = this.fmtDate(session.sessionDate);
    const timeStr =
      session.startTime && session.endTime
        ? ` (${session.startTime}–${session.endTime})`
        : '';
    const court = session.courtName ? ` tại ${session.courtName}` : '';

    const channels = this.resolveChannels(action.requestPayload);
    const title = `Nhắc buổi tập ${dateStr}${court}`;
    const body =
      `Sắp có buổi tập ngày ${dateStr}${timeStr}${court}. Nhớ sắp xếp tham gia nhé.`;

    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );

    this.logger.log(
      `EVENT_REMINDER ${action.id}: recipients=${recipients.length} date=${dateStr} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Nhắc lịch tập ngày ${dateStr}: ${recipients.length} thành viên. Đã gửi [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Branch: REPORT_DISPATCH ----------

  /** Báo kỳ quỹ đã chốt (finalized gần nhất) tới tất cả member có tài khoản. */
  private async executeReportDispatch(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;

    const period = await this.prisma.fundPeriod.findFirst({
      where: { clubId, status: 'finalized', type: 'chung' },
      orderBy: { startDate: 'desc' },
      select: { name: true },
    });
    if (!period) {
      return this.liveResult(
        'Chưa có kỳ quỹ nào chốt — không có báo cáo để gửi.',
      );
    }

    const recipients = await this.activeMembers(clubId);
    const channels = this.resolveChannels(action.requestPayload);
    const title = `Báo cáo kỳ quỹ ${period.name}`;
    const body =
      `Báo cáo kỳ "${period.name}" đã chốt. Bạn có thể xem phiếu thu/quyết toán của mình trong app.`;

    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );

    this.logger.log(
      `REPORT_DISPATCH ${action.id}: recipients=${recipients.length} period=${period.name} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Gửi báo cáo kỳ "${period.name}": ${recipients.length} thành viên. Đã gửi [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Phase 2: FUND_BALANCE_RISK ----------

  /** Cảnh báo quỹ âm tới quản trị (đọc lại số dư thật; số dư đã dương → không gửi). */
  private async executeFundBalanceRisk(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;
    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.fundContribution.aggregate({
        where: { clubId, fundSource: 'COMMON', isConfirmed: true },
        _sum: { amount: true },
      }),
      this.prisma.livingExpense.aggregate({
        where: {
          clubId,
          fundSource: 'COMMON',
          status: { in: ['approved', 'paid'] },
        },
        _sum: { amount: true },
      }),
    ]);
    const balance =
      Number(incomeAgg._sum.amount ?? 0) - Number(expenseAgg._sum.amount ?? 0);
    if (balance >= 0) {
      return this.liveResult('Số dư Quỹ Chính không còn âm — không cần cảnh báo.');
    }
    const recipients = await this.adminRecipients(clubId);
    const channels = this.resolveChannels(action.requestPayload);
    const title = `Cảnh báo quỹ âm ${this.fmtMoney(balance)}`;
    const body =
      `Số dư Quỹ Chính đang âm (${this.fmtMoney(balance)}). Vui lòng rà soát thu/chi và bổ sung quỹ.`;
    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );
    this.logger.log(
      `FUND_BALANCE_RISK ${action.id}: balance<0 admins=${recipients.length} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Cảnh báo quỹ âm (${this.fmtMoney(balance)}) tới ${recipients.length} quản trị. Đã gửi [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Phase 2: PAYMENT_DUE_REMINDER ----------

  /** Nhắc TRƯỚC hạn tới member chưa đóng kỳ active (khác Debt = sau hạn). */
  private async executePaymentDueReminder(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;
    const period = await this.prisma.fundPeriod.findFirst({
      where: { clubId, status: 'active', type: 'chung' },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, endDate: true },
    });
    if (!period) {
      return this.liveResult('Không có kỳ quỹ đang mở — không có ai để nhắc.');
    }
    const [members, paidRows] = await Promise.all([
      this.prisma.member.findMany({
        where: { clubId, status: 'active', isDeleted: false },
        select: {
          id: true,
          userId: true,
          email: true,
          user: { select: { email: true } },
        },
      }),
      this.prisma.fundContribution.findMany({
        where: {
          clubId,
          fundPeriodId: period.id,
          fundSource: 'COMMON',
          isConfirmed: true,
          memberId: { not: null },
        },
        select: { memberId: true },
        distinct: ['memberId'],
      }),
    ]);
    const paid = new Set(paidRows.map((r) => r.memberId));
    const recipients = members
      .filter((m) => !paid.has(m.id))
      .map((m) => this.toRecipient(m));
    const channels = this.resolveChannels(action.requestPayload);
    const title = `Nhắc đóng quỹ kỳ ${period.name} trước ${this.fmtDate(period.endDate)}`;
    const body =
      `Sắp đến hạn đóng quỹ kỳ "${period.name}" (${this.fmtDate(period.endDate)}). Bạn vui lòng đóng trước hạn nhé.`;
    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );
    this.logger.log(
      `PAYMENT_DUE_REMINDER ${action.id}: unpaid=${recipients.length} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Nhắc trước hạn kỳ "${period.name}": ${recipients.length} thành viên chưa đóng. Đã gửi [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Phase 2: MISSING_FINANCE_DOCUMENT ----------

  /** Nhắc quản trị bổ sung chứng từ cho khoản chi đã duyệt/đã chi còn thiếu. */
  private async executeMissingFinanceDocument(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;
    const cutoff = new Date(Date.now() - 3 * 86_400_000);
    const missing = await this.prisma.livingExpense.count({
      where: {
        clubId,
        fundSource: 'COMMON',
        status: { in: ['approved', 'paid'] },
        receiptUrl: null,
        createdAt: { lte: cutoff },
      },
    });
    if (missing === 0) {
      return this.liveResult('Không còn khoản chi nào thiếu chứng từ.');
    }
    const recipients = await this.adminRecipients(clubId);
    const channels = this.resolveChannels(action.requestPayload);
    const title = `Bổ sung chứng từ chi (${missing} khoản)`;
    const body =
      `Có ${missing} khoản chi đã duyệt nhưng thiếu hóa đơn/chứng từ. Vui lòng bổ sung để hoàn thiện hồ sơ.`;
    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );
    this.logger.log(
      `MISSING_FINANCE_DOCUMENT ${action.id}: missing=${missing} admins=${recipients.length} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Thiếu chứng từ: ${missing} khoản chi. Đã nhắc ${recipients.length} quản trị [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Phase 3: LOW_SESSION_REGISTRATION ----------

  /** Nhắc thành viên CHƯA đăng ký buổi sắp tới (hôm nay/mai) đăng ký tham gia. */
  private async executeLowSessionRegistration(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 1);
    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        clubId,
        status: 'scheduled',
        sessionDate: { gte: today, lte: horizon },
      },
      orderBy: { sessionDate: 'asc' },
      select: { id: true, sessionDate: true, startTime: true, courtName: true },
    });
    if (!session) {
      return this.liveResult('Không có buổi sắp tới cần nhắc đăng ký.');
    }
    const [all, regs] = await Promise.all([
      this.activeMembers(clubId),
      this.prisma.sessionRegistration.findMany({
        where: { clubId, attendanceSessionId: session.id },
        select: { memberId: true },
      }),
    ]);
    const registered = new Set(regs.map((r) => r.memberId));
    const recipients = all.filter((r) => !registered.has(r.memberId));
    const channels = this.resolveChannels(action.requestPayload);
    const dateStr = this.fmtDate(session.sessionDate);
    const court = session.courtName ? ` tại ${session.courtName}` : '';
    const title = `Buổi ${dateStr}${court} ít người đăng ký`;
    const body =
      `Buổi ngày ${dateStr}${court} đang ít người đăng ký. Nếu tham gia được, bạn đăng ký sớm nhé.`;
    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );
    this.logger.log(
      `LOW_SESSION_REGISTRATION ${action.id}: notReg=${recipients.length} date=${dateStr} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Nhắc đăng ký buổi ${dateStr}: ${recipients.length} thành viên chưa đăng ký. Đã gửi [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Phase 3: ATTENDANCE_NOT_CLOSED ----------

  /** Nhắc quản trị chốt điểm danh các buổi đã qua nhưng chưa chốt (KHÔNG tự chốt). */
  private async executeAttendanceNotClosed(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    const notClosed = await this.prisma.attendanceSession.count({
      where: { clubId, status: 'scheduled', sessionDate: { lt: cutoff } },
    });
    if (notClosed === 0) {
      return this.liveResult('Không còn buổi nào chưa chốt điểm danh.');
    }
    const recipients = await this.adminRecipients(clubId);
    const channels = this.resolveChannels(action.requestPayload);
    const title = `Nhắc chốt điểm danh (${notClosed} buổi)`;
    const body =
      `Có ${notClosed} buổi đã qua nhưng chưa chốt điểm danh. Vui lòng vào chốt để tính quỹ chính xác.`;
    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );
    this.logger.log(
      `ATTENDANCE_NOT_CLOSED ${action.id}: notClosed=${notClosed} admins=${recipients.length} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Chưa chốt điểm danh: ${notClosed} buổi. Đã nhắc ${recipients.length} quản trị [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Phase 3: SESSION_CAPACITY_RISK ----------

  /** Cảnh báo quản trị buổi sắp tới đông nhất (KHÔNG tự đổi buổi/loại người). */
  private async executeSessionCapacityRisk(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessions = await this.prisma.attendanceSession.findMany({
      where: { clubId, status: 'scheduled', sessionDate: { gte: today } },
      select: {
        id: true,
        sessionDate: true,
        courtName: true,
        _count: { select: { registrations: true } },
      },
      orderBy: { sessionDate: 'asc' },
      take: 30,
    });
    let top: {
      count: number;
      date: Date;
      court: string | null;
    } | null = null;
    for (const s of sessions) {
      const c = s._count.registrations;
      if (!top || c > top.count) {
        top = { count: c, date: s.sessionDate, court: s.courtName };
      }
    }
    if (!top) return this.liveResult('Không có buổi sắp tới để đánh giá.');
    const recipients = await this.adminRecipients(clubId);
    const channels = this.resolveChannels(action.requestPayload);
    const dateStr = this.fmtDate(top.date);
    const court = top.court ? ` tại ${top.court}` : '';
    const title = `Buổi ${dateStr}${court} quá đông (${top.count} đăng ký)`;
    const body =
      `Buổi ngày ${dateStr}${court} đang có ${top.count} người đăng ký — cân nhắc tăng sân/đổi giờ/giới hạn.`;
    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );
    this.logger.log(
      `SESSION_CAPACITY_RISK ${action.id}: max=${top.count} admins=${recipients.length} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Cảnh báo quá đông (${top.count} đăng ký, ${dateStr}) tới ${recipients.length} quản trị [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Phase 3: LOW_MEMBER_ATTENDANCE ----------

  /** Hỏi thăm thành viên chuyên cần thấp (< 50%) trong kỳ active (điểm danh THỰC TẾ). */
  private async executeLowMemberAttendance(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;
    const period = await this.prisma.fundPeriod.findFirst({
      where: { clubId, status: 'active', type: 'chung' },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });
    if (!period) return this.liveResult('Không có kỳ active để đánh giá.');
    const sessions = await this.prisma.attendanceSession.findMany({
      where: { clubId, fundPeriodId: period.id, status: 'completed' },
      select: { id: true },
    });
    const totalCompleted = sessions.length;
    if (totalCompleted < 3) {
      return this.liveResult('Chưa đủ buổi đã chốt để đánh giá chuyên cần.');
    }
    const [members, present] = await Promise.all([
      this.prisma.member.findMany({
        where: { clubId, isDeleted: false, status: 'active' },
        select: {
          id: true,
          userId: true,
          email: true,
          user: { select: { email: true } },
        },
      }),
      this.prisma.attendanceRecord.groupBy({
        by: ['memberId'],
        where: {
          clubId,
          status: 'PRESENT',
          attendanceSessionId: { in: sessions.map((s) => s.id) },
        },
        _count: { _all: true },
      }),
    ]);
    const presentMap = new Map<string, number>(
      present.map((p) => [p.memberId, p._count._all]),
    );
    const recipients = members
      .filter((m) => (presentMap.get(m.id) ?? 0) / totalCompleted < 0.5)
      .map((m) => this.toRecipient(m));
    const channels = this.resolveChannels(action.requestPayload);
    const title = action.title || 'Câu lạc bộ nhớ bạn!';
    const body =
      'Gần đây bạn tham gia hơi ít buổi. CLB mong gặp lại bạn ở các buổi tới nhé — có gì cần hỗ trợ cứ nhắn CLB.';
    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );
    this.logger.log(
      `LOW_MEMBER_ATTENDANCE ${action.id}: low=${recipients.length}/${members.length} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Hỏi thăm ${recipients.length} thành viên chuyên cần thấp. Đã gửi [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Phase 4: APPROVAL_OVERDUE ----------

  /** Nhắc quản trị duyệt các AI Action chờ quá 48h (KHÔNG tự duyệt, không tự chạy tác vụ gốc). */
  private async executeApprovalOverdue(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;
    const cutoff = new Date(Date.now() - 48 * 3_600_000);
    const overdue = await this.prisma.aiAction.count({
      where: {
        clubId,
        status: 'PENDING_APPROVAL',
        createdAt: { lte: cutoff },
        NOT: { actionType: 'workflow:APPROVAL_OVERDUE' },
      },
    });
    if (overdue === 0) {
      return this.liveResult('Không còn AI Action nào chờ duyệt quá hạn.');
    }
    const recipients = await this.adminRecipients(clubId);
    const channels = this.resolveChannels(action.requestPayload);
    const title = `Nhắc duyệt ${overdue} AI Action tồn đọng`;
    const body =
      `Có ${overdue} hành động AI chờ duyệt quá lâu. Vui lòng vào Hộp Duyệt xử lý.`;
    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );
    this.logger.log(
      `APPROVAL_OVERDUE ${action.id}: overdue=${overdue} admins=${recipients.length} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Nhắc duyệt ${overdue} AI Action tồn đọng tới ${recipients.length} quản trị [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Phase 4: MATCH_RESULT_MISSING ----------

  /** Nhắc quản trị/trọng tài nhập kết quả trận (KHÔNG tự suy đoán tỷ số/đội thắng). */
  private async executeMatchResultMissing(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;
    const cutoff = new Date(Date.now() - 1 * 86_400_000);
    const missing = await this.prisma.minigameMatch.count({
      where: {
        minigame: { clubId, status: 'ACTIVE', startedAt: { lte: cutoff } },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        scoreA: null,
      },
    });
    if (missing === 0) {
      return this.liveResult('Không còn trận nào thiếu kết quả.');
    }
    const recipients = await this.adminRecipients(clubId);
    const channels = this.resolveChannels(action.requestPayload);
    const title = `Nhắc nhập kết quả ${missing} trận đấu`;
    const body =
      `Có ${missing} trận trong giải đang diễn ra chưa nhập kết quả. Vui lòng cập nhật để hoàn tất bảng đấu.`;
    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );
    this.logger.log(
      `MATCH_RESULT_MISSING ${action.id}: missing=${missing} admins=${recipients.length} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Nhắc nhập kết quả ${missing} trận tới ${recipients.length} quản trị [${this.countsStr(counts)}].`,
    );
  }

  // ---------- Phase 4: WEEKLY_CLUB_HEALTH_REPORT ----------

  /** Gửi báo cáo sức khỏe CLB tuần (quỹ/công nợ/hoạt động) tới Ban quản trị. */
  private async executeWeeklyClubHealthReport(
    action: ExecutableAction,
  ): Promise<Record<string, unknown>> {
    const clubId = action.clubId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [incomeAgg, expenseAgg, period, upcoming] = await Promise.all([
      this.prisma.fundContribution.aggregate({
        where: { clubId, fundSource: 'COMMON', isConfirmed: true },
        _sum: { amount: true },
      }),
      this.prisma.livingExpense.aggregate({
        where: {
          clubId,
          fundSource: 'COMMON',
          status: { in: ['approved', 'paid'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.fundPeriod.findFirst({
        where: { clubId, status: 'active', type: 'chung' },
        orderBy: { startDate: 'desc' },
        select: { id: true },
      }),
      this.prisma.attendanceSession.count({
        where: { clubId, status: 'scheduled', sessionDate: { gte: today } },
      }),
    ]);
    let unpaidCount = 0;
    if (period) {
      const [memberCount, paidRows] = await Promise.all([
        this.prisma.member.count({ where: { clubId, isDeleted: false } }),
        this.prisma.fundContribution.findMany({
          where: {
            clubId,
            fundPeriodId: period.id,
            fundSource: 'COMMON',
            isConfirmed: true,
            memberId: { not: null },
          },
          select: { memberId: true },
          distinct: ['memberId'],
        }),
      ]);
      unpaidCount = Math.max(0, memberCount - paidRows.length);
    }
    const balance =
      Number(incomeAgg._sum.amount ?? 0) - Number(expenseAgg._sum.amount ?? 0);
    const recipients = await this.adminRecipients(clubId);
    const channels = this.resolveChannels(action.requestPayload);
    const title = action.title || 'Báo cáo sức khỏe CLB tuần';
    const body =
      `Số dư quỹ: ${this.fmtMoney(balance)} · Chưa đóng kỳ: ${unpaidCount} · Buổi sắp tới: ${upcoming}.`;
    const counts = await this.fanOut(
      clubId,
      action.id,
      recipients,
      title,
      body,
      channels,
    );
    this.logger.log(
      `WEEKLY_CLUB_HEALTH_REPORT ${action.id}: balance=${balance} unpaid=${unpaidCount} admins=${recipients.length} counts=${this.countsStr(counts)}`,
    );
    return this.liveResult(
      `Gửi báo cáo sức khỏe tuần tới ${recipients.length} quản trị [${this.countsStr(counts)}].`,
    );
  }
}
