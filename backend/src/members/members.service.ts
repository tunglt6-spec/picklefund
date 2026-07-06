import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_MEMBER_LIMIT } from '../clubs/clubs.service';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async findAll(clubId: string, search?: string) {
    return this.prisma.member.findMany({
      where: {
        clubId,
        isDeleted: false,
        ...(search
          ? { fullName: { contains: search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string, clubId: string) {
    const m = await this.prisma.member.findFirst({
      where: { id, clubId, isDeleted: false },
    });
    if (!m) throw new NotFoundException('Thành viên không tồn tại');
    return m;
  }

  async create(
    clubId: string,
    dto: {
      fullName: string;
      phone?: string;
      email?: string;
      joinDate: string;
      notes?: string;
    },
  ) {
    // V2.2 SaaS: enforce giới hạn thành viên theo gói dịch vụ (STARTER giới hạn; PRO/CLUB_PLUS mở).
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { plan: true },
    });
    const limit = club ? PLAN_MEMBER_LIMIT[club.plan] : null;
    if (limit !== null) {
      const count = await this.prisma.member.count({
        where: { clubId, isDeleted: false },
      });
      if (count >= limit) {
        throw new BadRequestException(
          `Gói dịch vụ hiện tại giới hạn ${limit} thành viên. Vui lòng nâng gói để thêm thành viên.`,
        );
      }
    }
    return this.prisma.member.create({
      data: { ...dto, clubId, joinDate: new Date(dto.joinDate) },
    });
  }

  async update(id: string, clubId: string, dto: any) {
    await this.findOne(id, clubId);
    const { clubId: _c, createdById: _b, id: _id, ...safeDto } = dto;
    return this.prisma.member.update({
      where: { id, clubId },
      data: {
        ...safeDto,
        ...(safeDto.joinDate ? { joinDate: new Date(safeDto.joinDate) } : {}),
      },
    });
  }

  async remove(id: string, clubId: string) {
    await this.findOne(id, clubId);
    return this.prisma.member.update({
      where: { id, clubId },
      data: { isDeleted: true, status: 'left' },
    });
  }

  async summary(memberId: string, fundPeriodId: string, clubId: string) {
    const [attended, contributions] = await Promise.all([
      this.prisma.attendanceRecord.count({
        where: {
          memberId,
          status: 'PRESENT',
          attendanceSession: { fundPeriodId },
        },
      }),
      this.prisma.fundContribution.aggregate({
        where: { memberId, fundPeriodId, clubId },
        _sum: { amount: true },
      }),
    ]);
    return {
      attendedSessions: attended,
      amountPaid: Number(contributions._sum.amount ?? 0),
    };
  }

  /**
   * AI Rating (điểm HOẠT ĐỘNG) trung bình 0–100 — compute-on-read, KHÔNG đổi schema.
   * Mỗi thành viên = trung bình CÓ TRỌNG SỐ các thành phần CÓ dữ liệu:
   *   - Điểm danh (0.4): tỉ lệ có mặt buổi đã hoàn tất (kỳ active; không có kỳ → toàn CLB).
   *   - Đóng quỹ (0.4): đã đóng quỹ chung kỳ active (1) / chưa (0).
   *   - Minigame (0.2): có tham gia ≥1 minigame của CLB (1) / chưa (0).
   * Thành phần thiếu dữ liệu (không kỳ active / chưa có buổi hoàn tất / CLB chưa có minigame)
   * → loại khỏi mẫu số (renormalize) để không phạt oan. Thành viên không có thành phần nào
   * → không tính. TB = trung bình điểm các thành viên được chấm.
   */
  async aiRating(clubId: string): Promise<{
    average: number | null;
    rated: number;
    total: number;
  }> {
    const members = await this.prisma.member.findMany({
      where: { clubId, isDeleted: false },
      select: { id: true },
    });
    if (members.length === 0) return { average: null, rated: 0, total: 0 };
    const memberIds = members.map((m) => m.id);

    const period = await this.prisma.fundPeriod.findFirst({
      where: { clubId, status: 'active' },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });

    // Điểm danh: buổi đã hoàn tất (kỳ active nếu có, không thì toàn CLB).
    const sessions = await this.prisma.attendanceSession.findMany({
      where: {
        clubId,
        status: 'completed',
        ...(period ? { fundPeriodId: period.id } : {}),
      },
      select: { id: true },
    });
    const totalCompleted = sessions.length;
    const presentByMember = new Map<string, number>();
    if (totalCompleted > 0) {
      const grouped = await this.prisma.attendanceRecord.groupBy({
        by: ['memberId'],
        where: {
          clubId,
          status: 'PRESENT',
          attendanceSessionId: { in: sessions.map((s) => s.id) },
          memberId: { in: memberIds },
        },
        _count: { _all: true },
      });
      for (const g of grouped) presentByMember.set(g.memberId, g._count._all);
    }

    // Đóng quỹ: đã đóng quỹ chung kỳ active.
    const paidSet = new Set<string>();
    if (period) {
      const paid = await this.prisma.fundContribution.findMany({
        where: {
          clubId,
          fundPeriodId: period.id,
          fundSource: 'COMMON',
          isConfirmed: true,
          memberId: { in: memberIds },
        },
        select: { memberId: true },
        distinct: ['memberId'],
      });
      for (const p of paid) if (p.memberId) paidSet.add(p.memberId);
    }

    // Minigame: CLB có minigame? Thành viên có tham gia?
    const clubMinigames = await this.prisma.minigame.findMany({
      where: { clubId },
      select: { id: true },
    });
    const hasMinigames = clubMinigames.length > 0;
    const participantSet = new Set<string>();
    if (hasMinigames) {
      const parts = await this.prisma.minigameParticipant.findMany({
        where: {
          minigameId: { in: clubMinigames.map((mg) => mg.id) },
          memberId: { in: memberIds },
        },
        select: { memberId: true },
        distinct: ['memberId'],
      });
      for (const p of parts) participantSet.add(p.memberId);
    }

    const hasAttendance = totalCompleted > 0;
    const hasContribution = !!period;
    const W_ATT = 0.4;
    const W_CONTRIB = 0.4;
    const W_MINI = 0.2;

    let sum = 0;
    let rated = 0;
    for (const m of members) {
      let wSum = 0;
      let acc = 0;
      if (hasAttendance) {
        wSum += W_ATT;
        acc +=
          W_ATT *
          Math.min(1, (presentByMember.get(m.id) ?? 0) / totalCompleted);
      }
      if (hasContribution) {
        wSum += W_CONTRIB;
        acc += W_CONTRIB * (paidSet.has(m.id) ? 1 : 0);
      }
      if (hasMinigames) {
        wSum += W_MINI;
        acc += W_MINI * (participantSet.has(m.id) ? 1 : 0);
      }
      if (wSum === 0) continue;
      sum += (acc / wSum) * 100;
      rated += 1;
    }
    const average = rated > 0 ? Math.round(sum / rated) : null;
    return { average, rated, total: members.length };
  }
}
