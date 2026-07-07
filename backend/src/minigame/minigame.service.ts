import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HermesEventPublisher } from '../workflows/hermes-event.publisher';
import { MinigameFormat } from '@prisma/client';
import { randomUUID } from 'node:crypto';

@Injectable()
export class MinigameService {
  constructor(
    private prisma: PrismaService,
    private events: HermesEventPublisher,
  ) {}

  private async assertOwnership(id: string, clubId: string) {
    const mg = await this.prisma.minigame.findUnique({ where: { id } });
    if (!mg || mg.clubId !== clubId)
      throw new NotFoundException('Minigame không tồn tại');
    return mg;
  }

  async findAll(clubId: string) {
    return this.prisma.minigame.findMany({
      where: { clubId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { participants: true, teams: true, matches: true } },
      },
    });
  }

  async findOne(id: string, clubId: string) {
    const mg = await this.prisma.minigame.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
            player1: { select: { id: true, fullName: true } },
            player2: { select: { id: true, fullName: true } },
          },
          orderBy: { points: 'desc' },
        },
        matches: {
          include: {
            teamA: { select: { id: true, name: true } },
            teamB: { select: { id: true, name: true } },
          },
          orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
        },
        participants: {
          include: { member: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!mg || mg.clubId !== clubId)
      throw new NotFoundException('Minigame không tồn tại');
    return mg;
  }

  async create(
    clubId: string,
    createdById: string,
    dto: {
      name: string;
      format: MinigameFormat;
      scheduledAt?: Date;
      settings?: any;
    },
  ) {
    return this.prisma.minigame.create({
      data: { clubId, createdById, ...dto },
    });
  }

  async addParticipants(
    id: string,
    clubId: string,
    memberIds: string[],
    guests?: { name: string; phone?: string }[],
  ) {
    await this.assertOwnership(id, clubId);

    // ── Thành viên CLB thật: giữ nguyên ràng buộc thuộc CLB ──
    if (memberIds.length > 0) {
      const valid = await this.prisma.member.findMany({
        where: { id: { in: memberIds }, clubId, isDeleted: false },
        select: { id: true },
      });
      if (valid.length !== memberIds.length)
        throw new BadRequestException('Một số thành viên không thuộc CLB này');
    }
    if (memberIds.length > 0) {
      await this.prisma.minigameParticipant.createMany({
        data: memberIds.map((memberId) => ({ minigameId: id, memberId })),
        skipDuplicates: true,
      });
    }

    // ── Khách mời: KHÔNG validate CLB, KHÔNG tạo member. Lưu vào Minigame.settings.guests
    // (JSON đã có sẵn) — không đụng schema/DB.
    // `guests` là AUTHORITATIVE list NẾU field tồn tại trong payload:
    //   - undefined → KHÔNG đụng settings.guests hiện có.
    //   - []        → clear settings.guests = [] (frontend đã xoá hết khách).
    //   - [items]   → replace bằng danh sách mới (không nhân đôi khi lưu lại).
    const shouldUpdateGuests = Array.isArray(guests);
    if (shouldUpdateGuests) {
      const mg = await this.prisma.minigame.findUnique({
        where: { id },
        select: { settings: true },
      });
      const cur = mg?.settings;
      const settings: Record<string, unknown> =
        cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
      const guestRecords = (guests ?? []).map((g) => ({
        id: `guest-${randomUUID()}`,
        name: g.name,
        phone: g.phone ?? null,
        isGuest: true as const,
      }));
      await this.prisma.minigame.update({
        where: { id },
        data: { settings: { ...settings, guests: guestRecords } },
      });
    }

    return this.findOne(id, clubId);
  }

  async createTeam(
    id: string,
    clubId: string,
    dto: { name: string; player1Id: string; player2Id?: string },
  ) {
    await this.assertOwnership(id, clubId);
    const playerIds = [
      dto.player1Id,
      ...(dto.player2Id ? [dto.player2Id] : []),
    ];
    const participants = await this.prisma.minigameParticipant.findMany({
      where: { minigameId: id, memberId: { in: playerIds } },
      select: { memberId: true },
    });
    if (participants.length !== playerIds.length)
      throw new BadRequestException(
        'Cầu thủ phải là thành viên tham gia giải đấu này',
      );
    return this.prisma.minigameTeam.create({
      data: {
        minigameId: id,
        name: dto.name,
        player1Id: dto.player1Id,
        player2Id: dto.player2Id,
      },
      include: {
        player1: { select: { id: true, fullName: true } },
        player2: { select: { id: true, fullName: true } },
      },
    });
  }

  async deleteTeam(id: string, teamId: string, clubId: string) {
    await this.assertOwnership(id, clubId);
    const team = await this.prisma.minigameTeam.findUnique({
      where: { id: teamId },
    });
    if (!team || team.minigameId !== id)
      throw new NotFoundException('Đội không tồn tại');
    await this.prisma.minigameMatch.deleteMany({
      where: { minigameId: id, OR: [{ teamAId: teamId }, { teamBId: teamId }] },
    });
    return this.prisma.minigameTeam.delete({ where: { id: teamId } });
  }

  async clearSchedule(id: string, clubId: string) {
    await this.assertOwnership(id, clubId);
    const { count } = await this.prisma.minigameMatch.deleteMany({
      where: { minigameId: id },
    });
    return { deleted: count };
  }

  async generateTeams(id: string, clubId: string) {
    const mg = await this.assertOwnership(id, clubId);
    if (
      mg.format !== 'RANDOM_DOUBLES' &&
      mg.format !== 'FIXED_DOUBLES_ROUND_ROBIN'
    )
      throw new BadRequestException('Chỉ hỗ trợ format doubles');

    // FIXED TEAM LOCK: đã có lịch/kết quả → KHÔNG cho tạo lại đội (đội cố định cả mùa).
    // Muốn ghép lại phải xoá lịch trước (DELETE /schedule) một cách tường minh.
    const existingMatches = await this.prisma.minigameMatch.count({
      where: { minigameId: id },
    });
    if (existingMatches > 0)
      throw new BadRequestException(
        'Đội đã được cố định. Không thể tạo lại khi đã có lịch thi đấu. Hãy xoá lịch trước.',
      );

    const participants = await this.prisma.minigameParticipant.findMany({
      where: { minigameId: id },
    });
    if (participants.length < 2)
      throw new BadRequestException('Cần ít nhất 2 người chơi');

    // Shuffle
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const teams: Array<{
      minigameId: string;
      name: string;
      player1Id: string;
      player2Id?: string;
    }> = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      teams.push({
        minigameId: id,
        name: `Đôi ${Math.floor(i / 2) + 1}`,
        player1Id: shuffled[i].memberId,
        player2Id: shuffled[i + 1]?.memberId,
      });
    }

    await this.prisma.minigameTeam.deleteMany({ where: { minigameId: id } });
    await this.prisma.minigameTeam.createMany({ data: teams });
    return this.findOne(id, clubId);
  }

  async generateSchedule(id: string, clubId: string) {
    await this.assertOwnership(id, clubId);
    // SCHEDULE LOCK: đã có lịch → KHÔNG sinh lại ngầm (lịch/kết quả cố định cả mùa).
    // Muốn tạo lại phải xoá lịch trước (DELETE /schedule) một cách tường minh.
    const existingMatches = await this.prisma.minigameMatch.count({
      where: { minigameId: id },
    });
    if (existingMatches > 0)
      throw new BadRequestException(
        'Lịch thi đấu đã được cố định. Hãy xoá lịch hiện tại trước khi tạo lại.',
      );
    // Đội CỐ ĐỊNH (MinigameTeam) — order ổn định; lịch chỉ reference teamId, KHÔNG ghép lại.
    const teams = await this.prisma.minigameTeam.findMany({
      where: { minigameId: id },
      orderBy: { createdAt: 'asc' },
    });
    if (teams.length === 0)
      throw new BadRequestException('Vui lòng tạo đội trước khi sinh lịch.');
    if (teams.length < 2) throw new BadRequestException('Cần ít nhất 2 đội');

    // Round-robin CIRCLE METHOD (mỗi đội gặp nhau đúng 1 lần, không đội nào đá 2 trận/vòng):
    //  - Số đội chẵn: rounds = n-1, mỗi vòng n/2 trận.
    //  - Số đội lẻ: thêm 1 BYE (null) → rounds = n, mỗi vòng có 1 đội nghỉ (không sinh trận).
    const slots: (string | null)[] = teams.map((t) => t.id);
    if (slots.length % 2 === 1) slots.push(null); // BYE placeholder
    const n = slots.length;
    const rounds = n - 1;
    const half = n / 2;

    const matches: Array<{
      minigameId: string;
      teamAId: string;
      teamBId: string;
      round: number;
      courtNo: number;
    }> = [];
    // Cố định slot[0], xoay các slot còn lại qua từng vòng.
    let arr = [...slots];
    for (let round = 0; round < rounds; round++) {
      let courtNo = 0;
      for (let i = 0; i < half; i++) {
        const a = arr[i];
        const b = arr[n - 1 - i];
        // a hoặc b = null ⇒ đội còn lại NGHỈ vòng (BYE) — không tạo trận.
        if (a !== null && b !== null) {
          courtNo++;
          matches.push({
            minigameId: id,
            teamAId: a,
            teamBId: b,
            round: round + 1,
            courtNo,
          });
        }
      }
      // Xoay: giữ arr[0], đưa arr[1] về cuối.
      arr = [arr[0], ...arr.slice(2), arr[1]];
    }

    await this.prisma.minigameMatch.deleteMany({ where: { minigameId: id } });
    await this.prisma.minigameMatch.createMany({ data: matches });
    return this.findOne(id, clubId);
  }

  async startMinigame(id: string, clubId: string) {
    await this.assertOwnership(id, clubId);
    return this.prisma.minigame.update({
      where: { id },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });
  }

  async updateMatchScore(
    matchId: string,
    clubId: string,
    scoreA: number,
    scoreB: number,
  ) {
    const match = await this.prisma.minigameMatch.findUnique({
      where: { id: matchId },
      include: { minigame: true },
    });
    if (!match || match.minigame.clubId !== clubId)
      throw new NotFoundException('Trận đấu không tồn tại');

    const winnerId =
      scoreA > scoreB ? match.teamAId : scoreB > scoreA ? match.teamBId : null;

    await this.prisma.minigameMatch.update({
      where: { id: matchId },
      data: {
        scoreA,
        scoreB,
        winnerId,
        status: 'COMPLETED',
        playedAt: new Date(),
      },
    });

    // Update team stats
    if (match.teamAId) {
      await this.prisma.minigameTeam.update({
        where: { id: match.teamAId },
        data: {
          wins: { increment: scoreA > scoreB ? 1 : 0 },
          losses: { increment: scoreA < scoreB ? 1 : 0 },
          points: {
            increment: scoreA > scoreB ? 3 : scoreA === scoreB ? 1 : 0,
          },
        },
      });
    }
    if (match.teamBId) {
      await this.prisma.minigameTeam.update({
        where: { id: match.teamBId },
        data: {
          wins: { increment: scoreB > scoreA ? 1 : 0 },
          losses: { increment: scoreB < scoreA ? 1 : 0 },
          points: {
            increment: scoreB > scoreA ? 3 : scoreA === scoreB ? 1 : 0,
          },
        },
      });
    }

    return this.prisma.minigameMatch.findUnique({ where: { id: matchId } });
  }

  async endMinigame(id: string, clubId: string) {
    await this.assertOwnership(id, clubId);
    const mg = await this.prisma.minigame.update({
      where: { id },
      data: { status: 'COMPLETED', endedAt: new Date() },
    });
    // Epic 7: phát event SAU khi commit — fire-and-forget.
    this.events.publish({
      clubId,
      userId: mg.createdById,
      triggerType: 'MINIGAME_COMPLETED',
      context: { minigameId: id },
      idempotencyKey: `MINIGAME_COMPLETED:${id}`,
    });
    return mg;
  }

  async cancel(id: string, clubId: string) {
    await this.assertOwnership(id, clubId);
    return this.prisma.minigame.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  /** Xóa hẳn giải đấu (hard delete) — participants/teams/matches cascade theo schema. */
  async remove(id: string, clubId: string) {
    await this.assertOwnership(id, clubId);
    await this.prisma.minigame.delete({ where: { id } });
    return { deleted: true };
  }
}
