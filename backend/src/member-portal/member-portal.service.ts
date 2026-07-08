import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculatorService } from '../financial/financial-calculator.service';

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
          select: { attendanceRecords: { where: { status: 'PRESENT' } } },
        },
        attendanceRecords: {
          where: { memberId: memberId as string },
          select: { status: true },
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
      present: s.attendanceRecords[0]?.status === 'PRESENT',
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
    await this.assertSession(sessionId, clubId);
    if (register) {
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
    return { sessionId, registered: register };
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

  async getNotifications(userId: string, clubId: string) {
    return this.prisma.notification.findMany({
      where: { userId, clubId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
