import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';
import { HermesService } from '../hermes/hermes.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

/** Tạo URL ảnh QR VietQR (khớp cách payment.service dùng) cho member tự chuyển khoản. */
function buildVietQRUrl(params: {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
}): string {
  const base = `https://img.vietqr.io/image/${params.bankCode}-${params.accountNumber}-compact2.jpg`;
  const qs = new URLSearchParams({
    amount: String(Math.max(0, Math.round(params.amount))),
    addInfo: params.description,
    accountName: params.accountName,
  });
  return `${base}?${qs.toString()}`;
}

/** Bỏ dấu tiếng Việt + ký tự lạ → nội dung CK ngắn, dễ đối chiếu trên sao kê ngân hàng. */
function asciiMemo(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * MemberPortalService — read-only, JWT-scoped self-view cho MEMBER_VIEW (AUTH-IMPL-01).
 * MỌI phạm vi dữ liệu suy ra từ (memberId, clubId, userId) do controller lấy từ JWT —
 * KHÔNG nhận từ client. Chỉ trả dữ liệu của CHÍNH member; không lộ member khác / dữ liệu quản trị.
 */
@Injectable()
export class MemberPortalService {
  constructor(
    private prisma: PrismaService,
    private calculator: FinancialCalculatorService,
    private hermes: HermesService,
    private audit: AuditLogsService,
  ) {}

  /** Bảo đảm member thuộc đúng club (chống truy cập chéo). */
  private async assertMember(memberId: string | null, clubId: string) {
    if (!memberId)
      throw new ForbiddenException('Tài khoản chưa liên kết thành viên.');
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, clubId, isDeleted: false },
    });
    if (!member) throw new NotFoundException('Không tìm thấy thành viên.');
    return member;
  }

  async getMe(memberId: string | null, clubId: string) {
    const m = await this.assertMember(memberId, clubId);
    return {
      id: m.id,
      clubId: m.clubId,
      fullName: m.fullName,
      phone: m.phone,
      email: m.email,
      joinDate: m.joinDate,
      status: m.status,
      avatarUrl: m.avatarUrl,
    };
  }

  /**
   * Thông tin ngân hàng CLB để member tự thanh toán quỹ (QR VietQR).
   * CHỈ 3 field công khai phục vụ chuyển khoản (mã NH, số TK, tên TK) — không lộ
   * cấu hình nhạy cảm khác. Trả null nếu CLB chưa cấu hình đủ số/tên TK.
   */
  async getBankInfo(memberId: string | null, clubId: string) {
    await this.assertMember(memberId, clubId);
    const prefix = `${clubId}_`;
    const keys = ['bank_code', 'bank_account_number', 'bank_account_name'];
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: keys.map((k) => `${prefix}${k}`) } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key.slice(prefix.length)] = r.value;
    const accNo = map['bank_account_number'] ?? '';
    const accName = map['bank_account_name'] ?? '';
    if (!accNo || !accName) return null;
    return {
      bank_code: map['bank_code'] ?? '',
      bank_account_number: accNo,
      bank_account_name: accName,
    };
  }

  /** Kỳ Quỹ Chính đang mở của CLB (mới nhất theo startDate); null nếu chưa có. */
  private async activePeriod(clubId: string) {
    return this.prisma.fundPeriod.findFirst({
      where: { clubId, status: 'active', type: 'chung' },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Lịch tham gia của member trong kỳ đang mở: liệt kê MỌI buổi của kỳ (kể cả sắp diễn ra)
   * kèm cờ có mặt của CHÍNH member. attendeeCount = số người CÓ MẶT (dùng hiển thị chia phí).
   */
  async getAttendance(memberId: string | null, clubId: string) {
    const member = await this.assertMember(memberId, clubId);
    const period = await this.activePeriod(clubId);
    const sessions = await this.prisma.attendanceSession.findMany({
      where: { clubId, ...(period ? { fundPeriodId: period.id } : {}) },
      include: {
        _count: {
          select: {
            attendanceRecords: { where: { status: 'PRESENT' } },
            registrations: true,
          },
        },
        attendanceRecords: {
          where: { memberId: memberId as string },
          select: { status: true },
        },
        registrations: {
          where: { memberId: memberId as string },
          select: { id: true },
        },
      },
      orderBy: { sessionDate: 'asc' },
    });
    const mapped = sessions.map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate,
      courtName: s.courtName,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      courtFee: s.courtFee,
      attendeeCount: s._count.attendanceRecords,
      registeredCount: s._count.registrations,
      present: s.attendanceRecords[0]?.status === 'PRESENT',
      registered: s.registrations.length > 0,
    }));
    const completed = mapped.filter((s) => s.status === 'completed');
    return {
      memberName: member.fullName,
      period: period ? { id: period.id, name: period.name } : null,
      totalCompleted: completed.length,
      attended: completed.filter((s) => s.present).length,
      upcoming: mapped.filter((s) => s.status === 'scheduled').length,
      sessions: mapped,
    };
  }

  /**
   * Tài chính cá nhân trong kỳ đang mở — số liệu do calculator server-side tính (nguồn chuẩn),
   * chỉ trả DÒNG của chính member (không lộ member khác) + khoản đóng góp COMMON của member.
   */
  async getFinance(memberId: string | null, clubId: string) {
    await this.assertMember(memberId, clubId);
    const period = await this.activePeriod(clubId);
    if (!period) return { period: null, member: null, contribution: null };
    const summary = await this.calculator.calculate(period.id, clubId);
    const mine = summary.members.find((m) => m.memberId === memberId) ?? null;
    const contribution = await this.prisma.fundContribution.findFirst({
      where: {
        clubId,
        fundPeriodId: period.id,
        memberId: memberId as string,
        fundSource: 'COMMON',
      },
      orderBy: { paymentDate: 'desc' },
      select: { amount: true, isConfirmed: true, paymentDate: true },
    });
    return {
      period: {
        id: period.id,
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        contributionAmount: period.contributionAmount,
      },
      totalSessions: summary.totalSessions,
      member: mine,
      contribution,
      // Tổng CLB dùng làm cơ sở phiếu thu (không lộ dữ liệu member khác).
      totals: {
        court: summary.commonFund.totalCourt,
        living: summary.commonFund.totalLiving,
        memberCount: summary.members.length,
      },
    };
  }

  /**
   * Lịch sử đóng góp COMMON của CHÍNH member (scope theo memberId+clubId từ JWT).
   * amount ép về number để frontend cộng/format an toàn (Prisma Decimal serialize ra string).
   */
  async getContributions(memberId: string | null, clubId: string) {
    await this.assertMember(memberId, clubId);
    const rows = await this.prisma.fundContribution.findMany({
      where: { clubId, memberId: memberId as string, fundSource: 'COMMON' },
      include: { fundPeriod: { select: { id: true, name: true } } },
      orderBy: { paymentDate: 'desc' },
    });
    return rows.map((c) => ({
      id: c.id,
      fundPeriodId: c.fundPeriodId,
      periodName: c.fundPeriod?.name ?? null,
      amount: Number(c.amount),
      isConfirmed: c.isConfirmed,
      paymentDate: c.paymentDate,
      paymentMethod: c.paymentMethod,
    }));
  }

  async getPersonalReceipts(memberId: string | null, clubId: string) {
    await this.assertMember(memberId, clubId);
    return this.prisma.personalReceipt.findMany({
      where: { memberId: memberId as string, clubId },
      include: { fundPeriod: { select: { id: true, name: true } } },
      orderBy: { snapshotAt: 'desc' },
    });
  }

  async getMinigames(memberId: string | null, clubId: string) {
    await this.assertMember(memberId, clubId);
    const parts = await this.prisma.minigameParticipant.findMany({
      where: { memberId: memberId as string, minigame: { clubId } },
      include: {
        minigame: {
          select: { id: true, name: true, format: true, status: true },
        },
      },
    });
    return parts.map((p) => ({
      minigameId: p.minigameId,
      name: p.minigame.name,
      format: p.minigame.format,
      status: p.minigame.status,
    }));
  }

  /** Bảo đảm buổi chơi thuộc đúng club (chống truy cập chéo). */
  private async assertSession(sessionId: string, clubId: string) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: sessionId, clubId },
    });
    if (!session) throw new NotFoundException('Không tìm thấy buổi chơi.');
    return session;
  }

  /** Member tự đăng ký / hủy đăng ký 1 buổi chơi (self-scope, idempotent). */
  async selfRegister(
    memberId: string | null,
    clubId: string,
    sessionId: string,
    register: boolean,
  ) {
    // Xác thực member THẬT với DB (thuộc clubId + chưa xóa) — chống memberId stale
    // trong access token cũ khi member bị xóa/đổi CLB. Dùng member.id đã verify, không tin token.
    const member = await this.assertMember(memberId, clubId);
    const session = await this.assertSession(sessionId, clubId);
    if (register) {
      // Guard server-side (không tin UI): chỉ cho đăng ký buổi còn 'scheduled' và chưa qua ngày.
      if (session.status !== 'scheduled') {
        throw new BadRequestException(
          session.status === 'cancelled'
            ? 'Buổi chơi đã bị hủy, không thể đăng ký.'
            : 'Buổi chơi đã kết thúc, không thể đăng ký.',
        );
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(session.sessionDate) < today) {
        throw new BadRequestException('Buổi chơi đã qua, không thể đăng ký.');
      }
      await this.prisma.sessionRegistration.upsert({
        where: {
          attendanceSessionId_memberId: {
            attendanceSessionId: sessionId,
            memberId: member.id,
          },
        },
        create: { clubId, attendanceSessionId: sessionId, memberId: member.id },
        update: {},
      });
    } else {
      await this.prisma.sessionRegistration.deleteMany({
        where: { clubId, attendanceSessionId: sessionId, memberId: member.id },
      });
    }

    // Audit đăng ký/hủy (Scope 2).
    void this.audit.log({
      userId: member.userId ?? '',
      clubId,
      action: register ? 'REGISTER' : 'UNREGISTER',
      resource: 'SessionRegistration',
      resourceId: sessionId,
      detail: `${member.fullName} ${register ? 'đăng ký' : 'hủy đăng ký'} buổi chơi ${this.fmtDate(session.sessionDate)}`,
    });

    // Thông báo Admin khi có đăng ký mới (không cần Admin duyệt — chỉ để nắm số lượng).
    if (register) {
      const when = `${this.fmtDate(session.sessionDate)}${session.startTime ? ` ${session.startTime}` : ''}`;
      await this.hermes
        .dispatch({
          eventType: 'session_registered',
          clubId,
          title: 'Có thành viên đăng ký buổi chơi',
          body: `${member.fullName} đã đăng ký tham gia buổi chơi ${when}${session.courtName ? ` — ${session.courtName}` : ''}.`,
          metadata: { link: '/session-registration', sessionId },
        })
        .catch(() => undefined);
    }
    return { sessionId, registered: register };
  }

  /** Định dạng ngày dd/MM/yyyy cho nội dung thông báo/audit. */
  private fmtDate(d: Date): string {
    try {
      return new Date(d).toLocaleDateString('vi-VN');
    } catch {
      return String(d);
    }
  }

  /** Member tự check-in PRESENT vào buổi chơi (self-scope, idempotent). */
  async selfCheckin(
    memberId: string | null,
    clubId: string,
    sessionId: string,
  ) {
    // Xác thực member THẬT với DB (thuộc clubId + chưa xóa) — chống memberId stale token.
    const member = await this.assertMember(memberId, clubId);
    const session = await this.assertSession(sessionId, clubId);
    if (session.status === 'cancelled')
      throw new BadRequestException('Buổi chơi đã bị hủy, không thể check-in.');
    await this.prisma.attendanceRecord.upsert({
      where: {
        attendanceSessionId_memberId: {
          attendanceSessionId: sessionId,
          memberId: member.id,
        },
      },
      create: {
        attendanceSessionId: sessionId,
        memberId: member.id,
        clubId,
        status: 'PRESENT',
      },
      update: { status: 'PRESENT' },
    });
    return { sessionId, checkedIn: true };
  }

  // ─── Scope 1: Báo đã nộp quỹ ─────────────────────────────────────────────

  /** Đọc cấu hình NH của CLB (theo prefix clubId). Trả rỗng nếu chưa cấu hình. */
  private async getClubBank(clubId: string) {
    const prefix = `${clubId}_`;
    const keys = ['bank_code', 'bank_account_number', 'bank_account_name'];
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: keys.map((k) => `${prefix}${k}`) } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key.slice(prefix.length)] = r.value;
    return {
      bankCode: map['bank_code'] ?? '',
      accountNumber: map['bank_account_number'] ?? '',
      accountName: map['bank_account_name'] ?? '',
    };
  }

  /** Tổng đã đóng (đã xác nhận) của member trong 1 kỳ (COMMON). */
  private async confirmedPaid(memberId: string, clubId: string, periodId: string) {
    const agg = await this.prisma.fundContribution.aggregate({
      where: {
        clubId,
        memberId,
        fundPeriodId: periodId,
        fundSource: 'COMMON',
        isConfirmed: true,
      },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  }

  /**
   * Bối cảnh để member "Báo đã nộp quỹ": số cần nộp, thông tin NH, nội dung CK tự sinh, QR,
   * và trạng thái đang-chờ-duyệt (nếu member đã báo). KHÔNG tạo dữ liệu thanh toán giả.
   */
  async getPaymentContext(memberId: string | null, clubId: string) {
    const member = await this.assertMember(memberId, clubId);
    const period = await this.activePeriod(clubId);
    const contributionAmount = period ? Number(period.contributionAmount) : 0;
    const paid = period ? await this.confirmedPaid(member.id, clubId, period.id) : 0;
    const suggestedAmount = Math.max(0, contributionAmount - paid);

    const bank = await this.getClubBank(clubId);
    const bankConfigured = !!(bank.accountNumber && bank.accountName);
    const memo = asciiMemo(
      `NOP QUY ${member.fullName} ${period?.name ?? ''}`,
    ).slice(0, 50);
    const qrImageUrl =
      bankConfigured && suggestedAmount > 0
        ? buildVietQRUrl({
            bankCode: bank.bankCode || 'MB',
            accountNumber: bank.accountNumber,
            accountName: bank.accountName,
            amount: suggestedAmount,
            description: memo,
          })
        : null;

    // Đang chờ duyệt? (member đã báo, chưa được xác nhận / chưa bị yêu cầu kiểm tra lại)
    const pending = await this.prisma.payment.findFirst({
      where: {
        clubId,
        memberId: member.id,
        reportedByMember: true,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, createdAt: true, description: true },
    });

    return {
      period: period ? { id: period.id, name: period.name } : null,
      contributionAmount,
      paid,
      suggestedAmount,
      bank: bankConfigured
        ? {
            bank_code: bank.bankCode,
            bank_account_number: bank.accountNumber,
            bank_account_name: bank.accountName,
          }
        : null,
      memo,
      qrImageUrl,
      pending: pending
        ? { id: pending.id, amount: Number(pending.amount), createdAt: pending.createdAt }
        : null,
    };
  }

  /** Lịch sử báo nộp quỹ của CHÍNH member (mọi trạng thái). */
  async listMyPayments(memberId: string | null, clubId: string) {
    const member = await this.assertMember(memberId, clubId);
    const rows = await this.prisma.payment.findMany({
      where: { clubId, memberId: member.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      description: p.description,
      status: p.status,
      reportedByMember: p.reportedByMember,
      memberNote: p.memberNote,
      recheckNote: p.recheckNote,
      proofUrl: p.proofUrl,
      createdAt: p.createdAt,
      confirmedAt: p.confirmedAt,
    }));
  }

  /**
   * Member "Tôi đã chuyển khoản" → tạo Payment PENDING (reportedByMember).
   * KHÔNG bao giờ tự thành PAID/CONFIRMED. Idempotent: nếu đã có 1 báo PENDING cho cùng kỳ
   * thì trả lại bản đó (chống double-click/retry). Thông báo Admin/Treasurer + ghi audit.
   */
  async reportPayment(
    memberId: string | null,
    clubId: string,
    dto: { amount?: number; note?: string; proofUrl?: string },
  ) {
    const member = await this.assertMember(memberId, clubId);
    const period = await this.activePeriod(clubId);

    // Số tiền: ưu tiên client gửi (đã validate > 0); nếu không có → gợi ý theo kỳ.
    let amount = dto.amount ?? 0;
    if (!amount || amount <= 0) {
      const contributionAmount = period ? Number(period.contributionAmount) : 0;
      const paid = period
        ? await this.confirmedPaid(member.id, clubId, period.id)
        : 0;
      amount = Math.max(0, contributionAmount - paid);
    }
    if (!amount || amount <= 0)
      throw new BadRequestException('Số tiền báo nộp không hợp lệ.');

    const referenceType = period ? 'CONTRIBUTION' : 'MANUAL';
    const referenceId = period ? period.id : null;

    // Idempotency: đã có báo PENDING cho cùng kỳ (cùng referenceId) → trả lại, không tạo trùng.
    const existing = await this.prisma.payment.findFirst({
      where: {
        clubId,
        memberId: member.id,
        reportedByMember: true,
        status: 'PENDING',
        referenceId: referenceId,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return { id: existing.id, amount: Number(existing.amount), status: existing.status, duplicate: true };
    }

    const bank = await this.getClubBank(clubId);
    const memo = asciiMemo(
      `NOP QUY ${member.fullName} ${period?.name ?? ''}`,
    ).slice(0, 50);
    const bankCode = bank.bankCode || 'MB';
    const accountNumber = bank.accountNumber || '0000000000';
    const accountName = bank.accountName || 'CLB PICKLEBALL';
    const qrImageUrl = buildVietQRUrl({
      bankCode,
      accountNumber,
      accountName,
      amount,
      description: memo,
    });

    // Chỉ lưu link http(s) — chặn javascript:/data: (stored XSS ở màn Admin).
    const safeProof = (() => {
      const u = dto.proofUrl?.trim();
      return u && /^https?:\/\//i.test(u) ? u.slice(0, 1000) : null;
    })();
    let payment: { id: string; amount: any; status: string };
    try {
      payment = await this.prisma.payment.create({
        data: {
          clubId,
          memberId: member.id,
          amount,
          description: memo,
          referenceType: referenceType as any,
          referenceId: referenceId ?? undefined,
          bankCode,
          accountNumber,
          accountName,
          qrImageUrl,
          reportedByMember: true,
          memberNote: dto.note?.trim().slice(0, 500) || null,
          proofUrl: safeProof,
          status: 'PENDING',
        },
      });
    } catch (e: any) {
      // Partial unique index (1 báo PENDING / member / kỳ) chống race double-submit ở tầng DB.
      if (e?.code === 'P2002') {
        const dup = await this.prisma.payment.findFirst({
          where: { clubId, memberId: member.id, reportedByMember: true, status: 'PENDING', referenceId: referenceId },
          orderBy: { createdAt: 'desc' },
        });
        if (dup)
          return { id: dup.id, amount: Number(dup.amount), status: dup.status, duplicate: true };
      }
      throw e;
    }

    void this.audit.log({
      userId: member.userId ?? '',
      clubId,
      action: 'REPORT',
      resource: 'Payment',
      resourceId: payment.id,
      detail: `Member ${member.fullName} báo đã nộp ${new Intl.NumberFormat('vi-VN').format(amount)}đ${period ? ` cho ${period.name}` : ''}`,
    });

    await this.hermes
      .dispatch({
        eventType: 'payment_reported',
        clubId,
        title: 'Có thành viên báo đã nộp quỹ',
        body: `${member.fullName} báo đã nộp ${new Intl.NumberFormat('vi-VN').format(amount)}đ${period ? ` cho ${period.name}` : ''}. Vui lòng kiểm tra & xác nhận.`,
        metadata: { link: '/payments', paymentId: payment.id, memberId: member.id },
      })
      .catch(() => undefined);

    return { id: payment.id, amount: Number(payment.amount), status: payment.status, duplicate: false };
  }

  async getNotifications(userId: string, clubId: string) {
    return this.prisma.notification.findMany({
      where: { userId, clubId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
