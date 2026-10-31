import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseZaloCommand, ZALO_HELP_TEXT } from './zalo-commands';
import type { ZaloCommand } from './zalo-commands';
import {
  rankPlayers,
  rankTeamRows,
  zaloStandingsText,
  type StandingsView,
} from './zalo-standings';
import type { ZaloFinancialReport } from './zalo-report';

export interface CommandConnection {
  version: string;
  chatId?: string;
  commandsEnabled?: boolean;
}

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} đ`;
const dmy = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
/** 00:00 UTC của ngày hiện tại theo giờ Việt Nam (cột @db.Date lưu theo UTC 00:00). */
export function vnToday(now = new Date()): Date {
  return new Date(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
      now,
    ) + 'T00:00:00Z',
  );
}
const THROTTLE_MS = 15_000;

/**
 * Lệnh tra cứu / thao tác nhanh qua bot Zalo. Tra cứu tổng hợp (/quy /congno /lich /bxh) dùng được trong NHÓM CLB
 * đã xác nhận; mọi thao tác theo cá nhân (/dangky /huy /diemdanh /no, chi tiết công nợ) yêu cầu danh tính Zalo đã
 * liên kết với tài khoản app. Không lưu nội dung chat; không lộ tên người nợ trong nhóm.
 */
@Injectable()
export class ZaloCommandService {
  private readonly last = new Map<string, number>();
  constructor(private readonly prisma: PrismaService) {}

  /** Trả nội dung trả lời, hoặc null nếu tin không phải lệnh / không được xử lý. */
  async handle(
    clubId: string,
    c: CommandConnection,
    m: any,
    report: () => Promise<{ report: ZaloFinancialReport }>,
  ): Promise<string | null> {
    if (!c.commandsEnabled || m?.from?.is_bot === true || typeof m?.text !== 'string')
      return null;
    const cmd = parseZaloCommand(m.text);
    if (!cmd) return null;
    const type = m?.chat?.chat_type;
    const inGroup = type === 'GROUP' && !!c.chatId && m.chat.id === c.chatId;
    const inPrivate = type === 'PRIVATE';
    if (!inGroup && !inPrivate) return null;
    const sender = String(m.from?.id ?? '');
    const identity = sender
      ? await this.prisma.zaloIdentity.findFirst({
          where: {
            clubId,
            botVersion: c.version,
            zaloUserId: sender,
            chatId: c.chatId ?? '__none__',
          },
        })
      : null;
    // Chat riêng chỉ dành cho người đã liên kết (không để người lạ đọc số liệu CLB qua tin nhắn riêng).
    if (inPrivate && !identity) return null;
    if (inGroup && !this.allowed(clubId, cmd.name, String(m.chat.id))) return null;
    try {
      return await this.run(clubId, c, cmd, inGroup, identity, report);
    } catch (e) {
      if (e instanceof BadRequestException) return e.message;
      throw e;
    }
  }

  private allowed(clubId: string, name: string, chat: string): boolean {
    const key = `${clubId}:${chat}:${name}`;
    const now = Date.now();
    if (now - (this.last.get(key) ?? 0) < THROTTLE_MS) return false;
    this.last.set(key, now);
    if (this.last.size > 500)
      for (const [k, t] of this.last) if (now - t > 60_000) this.last.delete(k);
    return true;
  }

  private async run(
    clubId: string,
    c: CommandConnection,
    cmd: ZaloCommand,
    inGroup: boolean,
    identity: { userId: string } | null,
    report: () => Promise<{ report: ZaloFinancialReport }>,
  ): Promise<string> {
    switch (cmd.name) {
      case 'help':
        return ZALO_HELP_TEXT;
      case 'quy':
        return this.fund(report);
      case 'congno':
        return this.debts(clubId, inGroup, identity);
      case 'lich':
        return this.schedule(clubId);
      case 'bxh':
        return this.standings(clubId);
      case 'no':
        return this.myDebt(clubId, identity);
      case 'dangky':
      case 'huy':
        return this.register(clubId, cmd, identity);
      case 'diemdanh':
        return this.checkin(clubId, cmd, identity);
    }
  }

  private async fund(
    report: () => Promise<{ report: ZaloFinancialReport }>,
  ): Promise<string> {
    const { report: r } = await report();
    return [
      `${r.clubName} — Quỹ (${r.periodName})`,
      `Quỹ chính: ${vnd(r.balance)} (chuyển kỳ ${vnd(r.carry)}, thu ${vnd(r.income)}, chi ${vnd(r.expense)})`,
      `Quỹ phụ (độc lập): ${vnd(r.mini)}`,
      'Chi tiết: https://picklefund.vn/tai-chinh?tab=reports (cần đăng nhập).',
    ].join('\n');
  }

  private async activePeriod(clubId: string) {
    const period = await this.prisma.fundPeriod.findFirst({
      where: { clubId, type: 'chung', status: 'active' },
      orderBy: { startDate: 'desc' },
    });
    if (!period)
      throw new BadRequestException('CLB chưa có kỳ quỹ chung đang mở.');
    return period;
  }

  /** Thành viên đang hoạt động chưa có khoản đóng ĐÃ XÁC NHẬN trong kỳ (kèm số chờ xác nhận). */
  async unpaidMembers(clubId: string, periodId: string) {
    const [members, rows] = await Promise.all([
      this.prisma.member.findMany({
        where: { clubId, isDeleted: false, status: 'active' },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.fundContribution.findMany({
        where: {
          clubId,
          fundPeriodId: periodId,
          fundSource: 'COMMON',
          memberId: { not: null },
        },
        select: { memberId: true, isConfirmed: true },
      }),
    ]);
    const confirmed = new Set(
      rows.filter((r) => r.isConfirmed).map((r) => r.memberId as string),
    );
    const pending = new Set(
      rows.filter((r) => !r.isConfirmed).map((r) => r.memberId as string),
    );
    const unpaid = members.filter((x) => !confirmed.has(x.id));
    return {
      total: members.length,
      unpaid,
      waitingIds: pending,
      waiting: unpaid.filter((x) => pending.has(x.id)).length,
    };
  }

  private async role(userId: string): Promise<string | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true },
    });
    return u?.isActive ? u.role : null;
  }

  private async debts(
    clubId: string,
    inGroup: boolean,
    identity: { userId: string } | null,
  ): Promise<string> {
    const period = await this.activePeriod(clubId);
    const d = await this.unpaidMembers(clubId, period.id);
    const each = Number(period.contributionAmount);
    const head = `Công nợ kỳ ${period.name}: ${d.unpaid.length}/${d.total} thành viên chưa đóng${d.waiting ? ` (${d.waiting} đã báo nộp, chờ xác nhận)` : ''}`;
    const due = period.dueDate ? `Hạn đóng: ${dmy(period.dueDate)}.` : '';
    const role = identity ? await this.role(identity.userId) : null;
    if (!inGroup && (role === 'CLUB_ADMIN' || role === 'CLUB_TREASURER')) {
      const names = d.unpaid.slice(0, 40).map((x, i) => `${i + 1}. ${x.fullName}`);
      return [
        head,
        `Mức đóng: ${vnd(each)}/người. ${due}`,
        ...names,
        d.unpaid.length > 40 ? `… và ${d.unpaid.length - 40} người khác` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }
    return [
      head + '.',
      `Mức đóng: ${vnd(each)}/người. ${due}`,
      'Danh sách tên chỉ gửi riêng cho quản trị/thủ quỹ; thành viên gõ /no để xem khoản của mình.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async upcoming(clubId: string, take: number) {
    return this.prisma.attendanceSession.findMany({
      where: { clubId, status: 'scheduled', sessionDate: { gte: vnToday() } },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
      take,
      include: { _count: { select: { registrations: true } } },
    });
  }

  private sessionLine(
    s: {
      sessionDate: Date;
      startTime: string | null;
      endTime: string | null;
      courtName: string | null;
      _count?: { registrations: number };
    },
    i: number,
  ) {
    const time = s.startTime
      ? ` ${s.startTime}${s.endTime ? `–${s.endTime}` : ''}`
      : '';
    return `${i + 1}. ${dmy(s.sessionDate)}${time}${s.courtName ? ` · ${s.courtName}` : ''}${s._count ? ` · ${s._count.registrations} đã đăng ký` : ''}`;
  }

  private async schedule(clubId: string): Promise<string> {
    const list = await this.upcoming(clubId, 3);
    if (!list.length) return 'Chưa có buổi chơi nào sắp tới.';
    return [
      'Buổi chơi sắp tới:',
      ...list.map((s, i) => this.sessionLine(s, i)),
      'Đăng ký: /dangky [số] · Hủy: /huy [số] (cần liên kết tài khoản).',
    ].join('\n');
  }

  /** Dữ liệu BXH của giải đang diễn ra (hoặc vừa kết thúc) — dùng cho /bxh và ảnh tự động. */
  async standingsView(
    clubId: string,
    minigameId?: string,
  ): Promise<StandingsView | null> {
    const mg = minigameId
      ? await this.prisma.minigame.findFirst({ where: { id: minigameId, clubId } })
      : ((await this.prisma.minigame.findFirst({
          where: { clubId, status: 'ACTIVE' },
          orderBy: { updatedAt: 'desc' },
        })) ??
        (await this.prisma.minigame.findFirst({
          where: { clubId, status: 'COMPLETED' },
          orderBy: { endedAt: 'desc' },
        })));
    if (!mg) return null;
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { name: true },
    });
    const base = {
      clubName: club?.name ?? 'CLB',
      title: mg.name,
      subtitle: `${mg.sport} · ${mg.status === 'COMPLETED' ? 'Đã kết thúc' : 'Đang diễn ra'}`,
      updatedAt: new Date().toISOString(),
      logo: null as string | null,
    };
    if (mg.scoringModel === 'LEADERBOARD') return { ...base, rows: [] };
    if (mg.format === 'RANDOM_DOUBLES') {
      const matches = await this.prisma.minigameMatch.findMany({
        where: { minigameId: mg.id, status: 'COMPLETED' },
        include: {
          teamA: { include: { player1: true, player2: true } },
          teamB: { include: { player1: true, player2: true } },
        },
      });
      const names = (t: any): string[] =>
        t
          ? [
              t.player1?.fullName ?? t.player1Name,
              t.player2?.fullName ?? t.player2Name,
            ].filter(Boolean)
          : [];
      return {
        ...base,
        rows: rankPlayers(
          matches.map((x) => ({
            scoreA: x.scoreA,
            scoreB: x.scoreB,
            winnerIsA: x.winnerId ? x.winnerId === x.teamAId : null,
            teamA: names(x.teamA),
            teamB: names(x.teamB),
          })),
        ),
      };
    }
    const teams = await this.prisma.minigameTeam.findMany({
      where: { minigameId: mg.id },
    });
    return { ...base, rows: rankTeamRows(teams) };
  }

  private async standings(clubId: string): Promise<string> {
    const v = await this.standingsView(clubId);
    if (!v) return 'Chưa có giải đấu nào đang diễn ra.';
    if (!v.rows.length && /LEADERBOARD|GOLF|RUNNING/.test(v.subtitle))
      return `${v.title}: giải tính theo bảng điểm, xem chi tiết trong app.`;
    return zaloStandingsText(v);
  }

  private async memberOf(clubId: string, identity: { userId: string } | null) {
    if (!identity)
      throw new BadRequestException(
        'Bạn chưa liên kết tài khoản Zalo. Vào app → Liên kết Zalo, rồi nhắn riêng cho bot /lienket MÃ.',
      );
    const member = await this.prisma.member.findFirst({
      where: { clubId, userId: identity.userId, isDeleted: false, status: 'active' },
    });
    if (!member)
      throw new BadRequestException(
        'Tài khoản của bạn chưa gắn với thành viên đang hoạt động trong CLB.',
      );
    return member;
  }

  private async myDebt(
    clubId: string,
    identity: { userId: string } | null,
  ): Promise<string> {
    const member = await this.memberOf(clubId, identity);
    const period = await this.activePeriod(clubId);
    const rows = await this.prisma.fundContribution.findMany({
      where: { clubId, fundPeriodId: period.id, fundSource: 'COMMON', memberId: member.id },
      select: { isConfirmed: true, amount: true },
    });
    const each = Number(period.contributionAmount);
    if (rows.some((r) => r.isConfirmed))
      return `${member.fullName}: bạn đã đóng quỹ kỳ ${period.name}. Cảm ơn bạn!`;
    if (rows.length)
      return `${member.fullName}: bạn đã báo nộp quỹ kỳ ${period.name}, đang chờ thủ quỹ xác nhận.`;
    return `${member.fullName}: kỳ ${period.name} bạn chưa đóng ${vnd(each)}${period.dueDate ? `, hạn ${dmy(period.dueDate)}` : ''}. Nộp hoặc báo nộp trong app: https://picklefund.vn/member/tai-chinh`;
  }

  private async register(
    clubId: string,
    cmd: ZaloCommand,
    identity: { userId: string } | null,
  ): Promise<string> {
    const member = await this.memberOf(clubId, identity);
    const list = await this.upcoming(clubId, 5);
    if (!list.length) return 'Chưa có buổi chơi nào sắp tới.';
    const n = cmd.index ?? 1;
    if (n < 1 || n > list.length)
      return `Chọn số từ 1 đến ${list.length}:\n${list.map((s, i) => this.sessionLine(s, i)).join('\n')}`;
    const s = list[n - 1];
    const reg = cmd.name === 'dangky';
    if (reg)
      await this.prisma.sessionRegistration.upsert({
        where: {
          attendanceSessionId_memberId: { attendanceSessionId: s.id, memberId: member.id },
        },
        create: { clubId, attendanceSessionId: s.id, memberId: member.id },
        update: {},
      });
    else
      await this.prisma.sessionRegistration.deleteMany({
        where: { clubId, attendanceSessionId: s.id, memberId: member.id },
      });
    await this.prisma.auditLog.create({
      data: {
        clubId,
        userId: identity!.userId,
        action: reg ? 'REGISTER' : 'UNREGISTER',
        resource: 'SessionRegistration',
        resourceId: s.id,
        detail: 'Thực hiện qua bot Zalo',
      },
    });
    const count = await this.prisma.sessionRegistration.count({
      where: { attendanceSessionId: s.id },
    });
    return `${reg ? 'Đã đăng ký' : 'Đã hủy đăng ký'} cho ${member.fullName}: ${this.sessionLine({ ...s, _count: undefined }, n - 1).replace(/^\d+\.\s*/, '')}. Hiện có ${count} người đăng ký.`;
  }

  private async checkin(
    clubId: string,
    cmd: ZaloCommand,
    identity: { userId: string } | null,
  ): Promise<string> {
    const member = await this.memberOf(clubId, identity);
    const today = vnToday();
    const list = await this.prisma.attendanceSession.findMany({
      where: { clubId, status: 'scheduled', sessionDate: today },
      orderBy: { startTime: 'asc' },
    });
    if (!list.length) return 'Hôm nay CLB chưa có buổi chơi để điểm danh.';
    const n = cmd.index ?? 1;
    if (n < 1 || n > list.length)
      return `Hôm nay có ${list.length} buổi, chọn số từ 1 đến ${list.length}.`;
    const s = list[n - 1];
    await this.prisma.attendanceRecord.upsert({
      where: {
        attendanceSessionId_memberId: { attendanceSessionId: s.id, memberId: member.id },
      },
      create: { clubId, attendanceSessionId: s.id, memberId: member.id, status: 'PRESENT' },
      update: { status: 'PRESENT' },
    });
    await this.prisma.auditLog.create({
      data: {
        clubId,
        userId: identity!.userId,
        action: 'CHECKIN',
        resource: 'AttendanceRecord',
        resourceId: s.id,
        detail: 'Tự điểm danh qua bot Zalo',
      },
    });
    return `Đã điểm danh cho ${member.fullName} (${s.startTime ?? ''}${s.courtName ? ` · ${s.courtName}` : ''}). Chúc bạn chơi vui!`;
  }
}
