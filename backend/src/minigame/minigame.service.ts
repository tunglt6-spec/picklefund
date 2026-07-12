import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HermesEventPublisher } from '../workflows/hermes-event.publisher';
import { MinigameFormat, Prisma } from '@prisma/client';
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

  async update(
    id: string,
    clubId: string,
    dto: { name?: string; scheduledAt?: Date; settings?: Record<string, unknown> },
  ) {
    await this.assertOwnership(id, clubId);
    const data: Prisma.MinigameUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.scheduledAt !== undefined) data.scheduledAt = dto.scheduledAt;
    if (dto.settings !== undefined) {
      // MERGE settings — giữ guests/pairingMode hiện có, chỉ ghi đè key được gửi.
      const cur = await this.prisma.minigame.findUnique({
        where: { id },
        select: { settings: true },
      });
      const curSettings = (cur?.settings as Record<string, unknown> | null) ?? {};
      data.settings = {
        ...curSettings,
        ...dto.settings,
      } as Prisma.InputJsonValue;
    }
    return this.prisma.minigame.update({ where: { id }, data });
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
    // Reset thống kê đội — nếu không, BXH giữ điểm rác từ lịch cũ đã xoá.
    await this.prisma.minigameTeam.updateMany({
      where: { minigameId: id },
      data: { wins: 0, losses: 0, points: 0 },
    });
    return { deleted: count };
  }

  /**
   * Pool người chơi cho ghép cặp/đội = THÀNH VIÊN (minigame_participants) + KHÁCH MỜI
   * (settings.guests). Khách là người chơi hạng nhất — có thể đông hơn thành viên.
   */
  private async getPlayerPool(
    id: string,
  ): Promise<
    Array<{ memberId?: string; guestId?: string; name: string; skill: number }>
  > {
    const parts = await this.prisma.minigameParticipant.findMany({
      where: { minigameId: id },
      include: { member: { select: { fullName: true, skillLevel: true } } },
    });
    const mg = await this.prisma.minigame.findUnique({
      where: { id },
      select: { settings: true },
    });
    const guests =
      ((mg?.settings as Record<string, unknown> | null)?.guests as
        | Array<{ id: string; name: string }>
        | undefined) ?? [];
    return [
      ...parts.map((p) => ({
        memberId: p.memberId,
        name: p.member?.fullName ?? '',
        skill: p.member?.skillLevel ?? 3,
      })),
      ...guests.map((g) => ({ guestId: g.id, name: g.name, skill: 3 })),
    ];
  }

  /** Dựng cột player cho 1 slot đội: MEMBER (id) hoặc KHÁCH (guestId + name). */
  private slotCols(
    prefix: 'player1' | 'player2',
    slot?: { memberId?: string; guestId?: string; name: string },
  ): Partial<Prisma.MinigameTeamUncheckedCreateInput> {
    const idVal = slot?.memberId ?? null;
    const guestVal = slot?.guestId ?? null;
    const nameVal = slot?.guestId ? slot.name : null;
    return prefix === 'player1'
      ? { player1Id: idVal, player1GuestId: guestVal, player1Name: nameVal }
      : { player2Id: idVal, player2GuestId: guestVal, player2Name: nameVal };
  }

  /**
   * Fisher-Yates shuffle (bản sao mới, không đột biến input).
   * KHÔNG dùng `arr.sort(() => Math.random() - 0.5)`: shuffle đó bị lệch và với mảng nhỏ
   * V8 thường GIỮ NGUYÊN thứ tự → "Ghép Lại" bấm mà cặp không đổi.
   */
  private shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async generateTeams(id: string, clubId: string) {
    const mg = await this.assertOwnership(id, clubId);
    // GROUP_STAGE (Vòng bảng): chia bảng thay vì ghép đôi.
    if (mg.format === 'GROUP_STAGE')
      return this.generateGroupStageTeams(id, clubId, mg);
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

    // Chế độ ghép cặp (lưu trong settings). MANUAL → tự tạo cặp qua POST /teams.
    const pairingMode = (mg.settings as Record<string, unknown> | null)
      ?.pairingMode as string | undefined;
    if (pairingMode === 'MANUAL_PAIRING')
      throw new BadRequestException(
        'Chế độ ghép thủ công — hãy tự tạo cặp trong dashboard, không dùng ghép tự động.',
      );

    // Pool = thành viên + KHÁCH MỜI (khách là người chơi hạng nhất).
    const pool = await this.getPlayerPool(id);
    if (pool.length < 2)
      throw new BadRequestException('Cần ít nhất 2 người chơi');

    // Sắp thứ tự người chơi theo chế độ ghép:
    //  - BALANCED_SKILL_PAIRING: sắp theo skill giảm dần rồi xen kẽ mạnh↔yếu để
    //    mỗi đôi = 1 mạnh + 1 yếu → cân bằng trình độ giữa các đội (khách skill=3).
    //  - RANDOM_PAIRING (mặc định): xáo trộn ngẫu nhiên.
    let ordered: typeof pool;
    if (pairingMode === 'BALANCED_SKILL_PAIRING') {
      // Xáo trước RỒI mới sort skill giảm dần (Array.sort ổn định trong Node) → người CÙNG skill
      // được xáo ngẫu nhiên ⇒ "Ghép Lại" cho cặp khác nhau mà vẫn cân bằng mạnh↔yếu.
      const sorted = this.shuffle(pool).sort((a, b) => b.skill - a.skill);
      ordered = [];
      let lo = 0;
      let hi = sorted.length - 1;
      while (lo <= hi) {
        ordered.push(sorted[lo]);
        if (lo !== hi) ordered.push(sorted[hi]);
        lo++;
        hi--;
      }
    } else {
      // RANDOM_PAIRING (mặc định): xáo trộn NGẪU NHIÊN thật (Fisher-Yates).
      ordered = this.shuffle(pool);
    }

    const teams: Prisma.MinigameTeamCreateManyInput[] = [];
    for (let i = 0; i < ordered.length; i += 2) {
      teams.push({
        minigameId: id,
        name: `Đôi ${Math.floor(i / 2) + 1}`,
        ...this.slotCols('player1', ordered[i]),
        ...this.slotCols('player2', ordered[i + 1]),
      });
    }

    await this.prisma.minigameTeam.deleteMany({ where: { minigameId: id } });
    await this.prisma.minigameTeam.createMany({ data: teams });
    return this.findOne(id, clubId);
  }

  async generateSchedule(id: string, clubId: string) {
    const mg = await this.assertOwnership(id, clubId);
    // GROUP_STAGE: vòng tròn TRONG TỪNG BẢNG (đấu đơn), khác circle-method toàn giải của doubles.
    if (mg.format === 'GROUP_STAGE')
      return this.generateGroupStageSchedule(id, clubId);
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

  /** Tên bảng hiển thị: Bảng A, Bảng B, … */
  private groupLabel(i: number): string {
    return `Bảng ${String.fromCharCode(65 + i)}`;
  }

  /** settings của minigame dưới dạng object an toàn (không phải array/null). */
  private asSettings(v: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    return v && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  }

  /**
   * GROUP_STAGE — CHIA BẢNG: pool (thành viên + KHÁCH MỜI) → N bảng cân đối theo groupSize.
   * Mỗi người chơi = 1 "đội-đơn" (MinigameTeam chỉ player1) → tái dùng toàn bộ hạ tầng
   * team/match/score/standings đã có. Bảng lưu vào settings.groups (memberKeys = memberId|guestId).
   * Chặn chia lại nếu đã có lịch (giống doubles) — phải xoá lịch trước.
   */
  private async generateGroupStageTeams(
    id: string,
    clubId: string,
    mg: { settings: Prisma.JsonValue | null },
  ) {
    const existingMatches = await this.prisma.minigameMatch.count({
      where: { minigameId: id },
    });
    if (existingMatches > 0)
      throw new BadRequestException(
        'Đã có lịch thi đấu. Hãy xoá lịch trước khi chia lại bảng.',
      );

    const pool = await this.getPlayerPool(id);
    if (pool.length < 2)
      throw new BadRequestException('Cần ít nhất 2 người chơi để chia bảng');

    const settings = this.asSettings(mg.settings);
    const rawSize = Number(settings.groupSize);
    const groupSize =
      Number.isFinite(rawSize) && rawSize >= 2 ? Math.floor(rawSize) : 4;

    // Xáo ngẫu nhiên rồi chia đều: numGroups = ceil(n/size); dư phân bổ vào các bảng đầu.
    const shuffled = this.shuffle(pool);
    const numGroups = Math.max(1, Math.ceil(shuffled.length / groupSize));
    const base = Math.floor(shuffled.length / numGroups);
    const extra = shuffled.length % numGroups;

    const groups: Array<{
      id: string;
      name: string;
      order: number;
      status: string;
      memberKeys: string[];
    }> = [];
    let offset = 0;
    for (let i = 0; i < numGroups; i++) {
      const size = base + (i < extra ? 1 : 0);
      const slice = shuffled.slice(offset, offset + size);
      offset += size;
      groups.push({
        id: `grp-${randomUUID()}`,
        name: this.groupLabel(i),
        order: i,
        status: 'ACTIVE',
        memberKeys: slice.map((p) => (p.memberId ?? p.guestId) as string),
      });
    }

    // Đội-đơn cho từng người chơi (player1 = member|khách; player2 rỗng).
    const teams: Prisma.MinigameTeamCreateManyInput[] = pool.map((p) => ({
      minigameId: id,
      name: p.name || 'Người chơi',
      ...this.slotCols('player1', p),
    }));

    await this.prisma.minigameTeam.deleteMany({ where: { minigameId: id } });
    await this.prisma.minigameTeam.createMany({ data: teams });
    await this.prisma.minigame.update({
      where: { id },
      data: { settings: { ...settings, groups } as Prisma.InputJsonValue },
    });
    return this.findOne(id, clubId);
  }

  /**
   * GROUP_STAGE — SINH LỊCH: vòng tròn 1 lượt TRONG TỪNG BẢNG (circle method), mỗi trận
   * là đấu ĐƠN (đội-đơn A vs đội-đơn B), gắn groupId. Idempotent: nếu đã có trận ĐÃ CHẤM
   * → giữ nguyên (không xoá kết quả); nếu chỉ toàn trận chờ → dựng lại (an toàn gọi lặp).
   */
  private async generateGroupStageSchedule(id: string, clubId: string) {
    const row = await this.prisma.minigame.findUnique({
      where: { id },
      select: { settings: true, status: true },
    });
    const settings = this.asSettings(row?.settings);
    const groups =
      (settings.groups as
        | Array<{ id: string; memberKeys: string[] }>
        | undefined) ?? [];
    if (groups.length === 0)
      throw new BadRequestException('Vui lòng chia bảng trước khi tạo lịch.');

    // Giữ kết quả: nếu đã chấm điểm bất kỳ trận nào → không dựng lại.
    const completed = await this.prisma.minigameMatch.count({
      where: { minigameId: id, status: 'COMPLETED' },
    });
    if (completed > 0) return this.findOne(id, clubId);

    const teams = await this.prisma.minigameTeam.findMany({
      where: { minigameId: id },
    });
    if (teams.length === 0)
      throw new BadRequestException('Chưa có đội. Hãy chia bảng trước.');
    // playerKey (memberId|guestId) → teamId của đội-đơn.
    const teamOf = new Map<string, string>();
    for (const t of teams) {
      const key = t.player1Id ?? t.player1GuestId;
      if (key) teamOf.set(key, t.id);
    }

    const matches: Prisma.MinigameMatchCreateManyInput[] = [];
    for (const g of groups) {
      const ring: (string | null)[] = g.memberKeys
        .map((k) => teamOf.get(k))
        .filter((x): x is string => !!x);
      if (ring.length < 2) continue;
      if (ring.length % 2 === 1) ring.push(null); // BYE
      const n = ring.length;
      const rounds = n - 1;
      const half = n / 2;
      let cur = [...ring];
      for (let r = 0; r < rounds; r++) {
        let court = 0;
        for (let i = 0; i < half; i++) {
          const a = cur[i];
          const b = cur[n - 1 - i];
          if (a && b) {
            court++;
            matches.push({
              minigameId: id,
              teamAId: a,
              teamBId: b,
              groupId: g.id,
              round: r + 1,
              courtNo: court,
            });
          }
        }
        cur = [cur[0], ...cur.slice(2), cur[1]];
      }
    }

    await this.prisma.minigameMatch.deleteMany({ where: { minigameId: id } });
    await this.prisma.minigameTeam.updateMany({
      where: { minigameId: id },
      data: { wins: 0, losses: 0, points: 0 },
    });
    if (matches.length > 0)
      await this.prisma.minigameMatch.createMany({ data: matches });
    if (row?.status === 'DRAFT')
      await this.prisma.minigame.update({
        where: { id },
        data: { status: 'ACTIVE', startedAt: new Date() },
      });
    return this.findOne(id, clubId);
  }

  /**
   * GROUP_STAGE — LƯU BẢNG: cập nhật settings.groups (sau khi kéo-chuyển người giữa các bảng).
   * Chỉ đổi memberKeys/tên bảng; đội-đơn giữ nguyên. Lịch dựng lại qua generate-schedule.
   */
  async saveGroups(
    id: string,
    clubId: string,
    groups: Array<{
      id: string;
      name: string;
      order: number;
      status?: string;
      memberKeys: string[];
    }>,
  ) {
    await this.assertOwnership(id, clubId);
    const row = await this.prisma.minigame.findUnique({
      where: { id },
      select: { settings: true },
    });
    const settings = this.asSettings(row?.settings);
    await this.prisma.minigame.update({
      where: { id },
      data: {
        settings: {
          ...settings,
          groups: groups.map((g) => ({
            id: g.id,
            name: g.name,
            order: g.order,
            status: g.status ?? 'ACTIVE',
            memberKeys: g.memberKeys,
          })),
        } as Prisma.InputJsonValue,
      },
    });
    return this.findOne(id, clubId);
  }

  /**
   * RANDOM_DOUBLES: bốc 1 VÒNG mới — xáo người chơi, chia nhóm 4 → mỗi nhóm 1 trận
   * 2v2 (2 đội tạm tag theo vòng). Dư <4 người nghỉ vòng. Mỗi lần gọi tạo vòng KẾ TIẾP
   * (không đụng các vòng cũ). Persist server để đồng bộ đa thiết bị.
   */
  async drawRound(id: string, clubId: string) {
    const mg = await this.assertOwnership(id, clubId);
    if (mg.format !== 'RANDOM_DOUBLES')
      throw new BadRequestException(
        'Chỉ áp dụng cho định dạng Đánh đôi ngẫu nhiên',
      );
    // Pool = thành viên + KHÁCH MỜI.
    const pool = await this.getPlayerPool(id);
    if (pool.length < 4)
      throw new BadRequestException('Cần ít nhất 4 người chơi để bốc 1 trận đôi');

    const agg = await this.prisma.minigameTeam.aggregate({
      where: { minigameId: id },
      _max: { round: true },
    });
    const nextRound = (agg._max.round ?? 0) + 1;

    const shuffled = this.shuffle(pool);
    const matchCount = Math.floor(shuffled.length / 4);
    for (let i = 0; i < matchCount; i++) {
      const g = shuffled.slice(i * 4, i * 4 + 4);
      const teamA = await this.prisma.minigameTeam.create({
        data: {
          minigameId: id,
          round: nextRound,
          name: `V${nextRound}-T${i + 1}A`,
          ...this.slotCols('player1', g[0]),
          ...this.slotCols('player2', g[1]),
        },
      });
      const teamB = await this.prisma.minigameTeam.create({
        data: {
          minigameId: id,
          round: nextRound,
          name: `V${nextRound}-T${i + 1}B`,
          ...this.slotCols('player1', g[2]),
          ...this.slotCols('player2', g[3]),
        },
      });
      await this.prisma.minigameMatch.create({
        data: {
          minigameId: id,
          teamAId: teamA.id,
          teamBId: teamB.id,
          round: nextRound,
          courtNo: i + 1,
        },
      });
    }
    if (mg.status === 'DRAFT') {
      await this.prisma.minigame.update({
        where: { id },
        data: { status: 'ACTIVE', startedAt: mg.startedAt ?? new Date() },
      });
    }
    return {
      round: nextRound,
      matches: matchCount,
      sitOut: shuffled.length - matchCount * 4,
    };
  }

  /**
   * BXH cấp CÁ NHÂN (dùng cho RANDOM_DOUBLES): tính ĐỘNG từ các trận COMPLETED —
   * mỗi người cộng theo đội mình ở từng vòng. Tránh double-count vì tính lại từ đầu.
   */
  async getPlayerStandings(id: string, clubId: string) {
    await this.assertOwnership(id, clubId);
    const matches = await this.prisma.minigameMatch.findMany({
      where: { minigameId: id, status: 'COMPLETED' },
      include: { teamA: true, teamB: true },
    });
    // Pool member + KHÁCH → tên hiển thị; key người chơi = memberId HOẶC guestId.
    const pool = await this.getPlayerPool(id);
    type Stat = {
      memberId: string;
      name: string;
      played: number;
      won: number;
      pointsFor: number;
      pointsAgainst: number;
    };
    const stat = new Map<string, Stat>();
    for (const p of pool) {
      const key = (p.memberId ?? p.guestId) as string;
      stat.set(key, {
        memberId: key,
        name: p.name,
        played: 0,
        won: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      });
    }
    const ensure = (mid: string): Stat => {
      let s = stat.get(mid);
      if (!s) {
        s = { memberId: mid, name: mid, played: 0, won: 0, pointsFor: 0, pointsAgainst: 0 };
        stat.set(mid, s);
      }
      return s;
    };
    // Người chơi mỗi đội = member (playerNId) HOẶC khách (playerNGuestId).
    const teamKeys = (t: {
      player1Id: string | null;
      player1GuestId: string | null;
      player2Id: string | null;
      player2GuestId: string | null;
    } | null): string[] =>
      t
        ? ([
            t.player1Id ?? t.player1GuestId,
            t.player2Id ?? t.player2GuestId,
          ].filter(Boolean) as string[])
        : [];
    for (const m of matches) {
      const aPlayers = teamKeys(m.teamA);
      const bPlayers = teamKeys(m.teamB);
      const sa = m.scoreA ?? 0;
      const sb = m.scoreB ?? 0;
      const aWon = m.winnerId === m.teamAId;
      const bWon = m.winnerId === m.teamBId;
      for (const pid of aPlayers) {
        const s = ensure(pid);
        s.played++;
        s.pointsFor += sa;
        s.pointsAgainst += sb;
        if (aWon) s.won++;
      }
      for (const pid of bPlayers) {
        const s = ensure(pid);
        s.played++;
        s.pointsFor += sb;
        s.pointsAgainst += sa;
        if (bWon) s.won++;
      }
    }
    return [...stat.values()]
      .map((s) => ({ ...s, diff: s.pointsFor - s.pointsAgainst }))
      .sort(
        (a, b) => b.won - a.won || b.diff - a.diff || b.pointsFor - a.pointsFor,
      );
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

    // Điểm xếp hạng theo CẤU HÌNH minigame (settings), không hardcode 3/1/0 — khớp BXH hiển thị.
    const s = this.asSettings(match.minigame.settings);
    const winPoints = Number.isFinite(Number(s.winPoints))
      ? Number(s.winPoints)
      : 3;
    const drawPoints = Number.isFinite(Number(s.drawPoints))
      ? Number(s.drawPoints)
      : 1;
    const lossPoints = Number.isFinite(Number(s.lossPoints))
      ? Number(s.lossPoints)
      : 0;
    const allowDraw = s.allowDraw === true;

    // Guard hòa: không cho lưu kết quả hòa nếu minigame không cho phép (khớp guard phía UI).
    if (scoreA === scoreB && !allowDraw)
      throw new BadRequestException(
        'Giải đấu này không cho phép kết quả hòa.',
      );

    // Điểm cộng cho mỗi đội theo kết quả (dùng chung cho cộng mới + đảo kết quả cũ).
    const ptsFor = (won: boolean, draw: boolean) =>
      won ? winPoints : draw ? drawPoints : lossPoints;

    const winnerId =
      scoreA > scoreB ? match.teamAId : scoreB > scoreA ? match.teamBId : null;

    // IDEMPOTENT: nếu trận đã chấm trước đó → ĐẢO kết quả cũ khỏi thống kê đội
    // trước khi cộng kết quả mới, tránh double-count khi sửa điểm.
    if (match.status === 'COMPLETED') {
      const oldA = match.scoreA ?? 0;
      const oldB = match.scoreB ?? 0;
      const oldAWin = oldA > oldB;
      const oldBWin = oldB > oldA;
      const oldDraw = oldA === oldB;
      if (match.teamAId) {
        await this.prisma.minigameTeam.update({
          where: { id: match.teamAId },
          data: {
            wins: { decrement: oldAWin ? 1 : 0 },
            losses: { decrement: oldBWin ? 1 : 0 },
            points: { decrement: ptsFor(oldAWin, oldDraw) },
          },
        });
      }
      if (match.teamBId) {
        await this.prisma.minigameTeam.update({
          where: { id: match.teamBId },
          data: {
            wins: { decrement: oldBWin ? 1 : 0 },
            losses: { decrement: oldAWin ? 1 : 0 },
            points: { decrement: ptsFor(oldBWin, oldDraw) },
          },
        });
      }
    }

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
          points: { increment: ptsFor(scoreA > scoreB, scoreA === scoreB) },
        },
      });
    }
    if (match.teamBId) {
      await this.prisma.minigameTeam.update({
        where: { id: match.teamBId },
        data: {
          wins: { increment: scoreB > scoreA ? 1 : 0 },
          losses: { increment: scoreB < scoreA ? 1 : 0 },
          points: { increment: ptsFor(scoreB > scoreA, scoreA === scoreB) },
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
