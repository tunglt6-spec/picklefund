/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MinigameService } from './minigame.service';
import { PrismaService } from '../prisma/prisma.service';
import { HermesEventPublisher } from '../workflows/hermes-event.publisher';

const mockPrisma = {
  minigame: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  minigameParticipant: {
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
  minigameTeam: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  minigameMatch: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  member: { findMany: jest.fn() },
};

const mockEvents = { publish: jest.fn() };

const baseMg = {
  id: 'mg-1',
  clubId: 'club-1',
  name: 'Test Minigame',
  format: 'RANDOM_DOUBLES',
  status: 'draft',
  createdById: 'user-1',
  scheduledAt: null,
  settings: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fullMg = {
  ...baseMg,
  teams: [],
  matches: [],
  participants: [],
};

describe('MinigameService', () => {
  let service: MinigameService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinigameService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HermesEventPublisher, useValue: mockEvents },
      ],
    }).compile();
    service = module.get<MinigameService>(MinigameService);
  });

  /* ── findAll ── */
  describe('findAll', () => {
    it('returns list filtered by clubId (kèm firstPlayedAt/lastPlayedAt = ngày thi đấu thực tế)', async () => {
      mockPrisma.minigame.findMany.mockResolvedValue([baseMg]);
      mockPrisma.minigameMatch.groupBy.mockResolvedValue([
        { minigameId: 'mg-1', _min: { playedAt: new Date('2026-07-10') }, _max: { playedAt: new Date('2026-07-12') } },
      ]);
      const result = await service.findAll('club-1');
      expect(result).toEqual([
        { ...baseMg, firstPlayedAt: new Date('2026-07-10'), lastPlayedAt: new Date('2026-07-12') },
      ]);
      expect(mockPrisma.minigame.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: 'club-1' } }),
      );
    });

    it('giải chưa có trận đấu → firstPlayedAt/lastPlayedAt = null', async () => {
      mockPrisma.minigame.findMany.mockResolvedValue([baseMg]);
      mockPrisma.minigameMatch.groupBy.mockResolvedValue([]);
      const result = await service.findAll('club-1');
      expect(result).toEqual([{ ...baseMg, firstPlayedAt: null, lastPlayedAt: null }]);
    });
  });

  /* ── findOne ── */
  describe('findOne', () => {
    it('returns minigame when owner matches', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(fullMg);
      const result = await service.findOne('mg-1', 'club-1');
      expect(result).toEqual(fullMg);
    });

    it('throws NotFoundException when clubId mismatches', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue({
        ...baseMg,
        clubId: 'other-club',
      });
      await expect(service.findOne('mg-1', 'club-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(null);
      await expect(service.findOne('mg-1', 'club-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /* ── create ── */
  describe('create', () => {
    it('creates minigame with correct data', async () => {
      mockPrisma.minigame.create.mockResolvedValue(baseMg);
      const result = await service.create('club-1', 'user-1', {
        name: 'Test Minigame',
        format: 'RANDOM_DOUBLES',
      });
      expect(result).toEqual(baseMg);
      expect(mockPrisma.minigame.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clubId: 'club-1',
          createdById: 'user-1',
        }),
      });
    });
  });

  /* ── addParticipants ── */
  describe('addParticipants', () => {
    beforeEach(() => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(baseMg); // assertOwnership
    });

    it('throws BadRequestException when memberIds contain invalid members', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.member.findMany.mockResolvedValue([{ id: 'm-1' }]); // only 1 valid
      await expect(
        service.addParticipants('mg-1', 'club-1', ['m-1', 'm-invalid']),
      ).rejects.toThrow(BadRequestException);
    });

    it('skips member validation when memberIds is empty', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.minigameParticipant.createMany.mockResolvedValue({ count: 0 });
      mockPrisma.minigame.findUnique.mockResolvedValue(fullMg);
      await expect(
        service.addParticipants('mg-1', 'club-1', []),
      ).resolves.toBeDefined();
      expect(mockPrisma.member.findMany).not.toHaveBeenCalled();
    });
  });

  /* ── clearSchedule ── */
  describe('clearSchedule', () => {
    it('deletes all matches and returns count', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.minigameMatch.deleteMany.mockResolvedValue({ count: 6 });
      const result = await service.clearSchedule('mg-1', 'club-1');
      expect(result).toEqual({ deleted: 6 });
    });

    it('throws NotFoundException when minigame not owned by club', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(null);
      await expect(service.clearSchedule('mg-1', 'club-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /* ── generateTeams ── */
  describe('generateTeams', () => {
    it('throws BadRequestException for unsupported format', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue({
        ...baseMg,
        format: 'SINGLES',
      });
      await expect(service.generateTeams('mg-1', 'club-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when fewer than 2 participants', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.minigameParticipant.findMany.mockResolvedValue([
        { memberId: 'm-1' },
      ]);
      await expect(service.generateTeams('mg-1', 'club-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates teams from participants', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(baseMg); // assertOwnership
      mockPrisma.minigameParticipant.findMany.mockResolvedValue([
        { memberId: 'm-1' },
        { memberId: 'm-2' },
        { memberId: 'm-3' },
        { memberId: 'm-4' },
      ]);
      mockPrisma.minigameTeam.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.minigameTeam.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(fullMg); // findOne
      const result = await service.generateTeams('mg-1', 'club-1');
      expect(mockPrisma.minigameTeam.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ minigameId: 'mg-1' }),
        ]),
      });
      expect(result).toBeDefined();
    });
  });

  /* ── createTeam: ghép thủ công member + KHÁCH mời ── */
  describe('createTeam', () => {
    it('tạo cặp member + khách mời (khách lưu qua GuestId/Name)', async () => {
      mockPrisma.minigame.findUnique
        .mockResolvedValueOnce(baseMg) // assertOwnership
        .mockResolvedValueOnce({
          settings: { guests: [{ id: 'guest-1', name: 'Khách A' }] },
        }); // settings
      mockPrisma.minigameParticipant.findMany.mockResolvedValue([
        { memberId: 'm-1' },
      ]);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([]); // dedupe tên đội
      mockPrisma.minigameTeam.create.mockResolvedValue({ id: 't-1' });
      await service.createTeam('mg-1', 'club-1', {
        name: 'Đôi 1',
        player1Id: 'm-1',
        player2Id: 'guest-1',
      });
      expect(mockPrisma.minigameTeam.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            player1Id: 'm-1',
            player1GuestId: null,
            player2Id: null,
            player2GuestId: 'guest-1',
            player2Name: 'Khách A',
          }),
        }),
      );
    });

    it('từ chối player không phải thành viên/khách', async () => {
      mockPrisma.minigame.findUnique
        .mockResolvedValueOnce(baseMg)
        .mockResolvedValueOnce({ settings: {} });
      mockPrisma.minigameParticipant.findMany.mockResolvedValue([
        { memberId: 'm-1' },
      ]);
      await expect(
        service.createTeam('mg-1', 'club-1', {
          name: 'x',
          player1Id: 'm-1',
          player2Id: 'ghost',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /* ── shuffle (Fisher-Yates) — nền tảng cho "Ghép Lại" đổi cặp ── */
  describe('shuffle (Fisher-Yates)', () => {
    it('giữ nguyên tập phần tử (là hoán vị) và không đột biến input', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const out = (service as unknown as { shuffle: <T>(a: readonly T[]) => T[] }).shuffle(input);
      expect(out).toHaveLength(input.length);
      expect([...out].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // input bất biến
    });

    it('ĐẢO thứ tự thật (khác input) — không bị kẹt như sort(()=>Math.random()-0.5)', () => {
      const spy = jest.spyOn(Math, 'random').mockReturnValue(0);
      const input = [0, 1, 2, 3, 4, 5];
      const out = (service as unknown as { shuffle: <T>(a: readonly T[]) => T[] }).shuffle(input);
      expect(out).not.toEqual(input);
      spy.mockRestore();
    });
  });

  /* ── generateSchedule ── */
  describe('generateSchedule', () => {
    it('throws BadRequestException when fewer than 2 teams', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([{ id: 't-1' }]);
      await expect(service.generateSchedule('mg-1', 'club-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates round-robin matches for 4 teams', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(baseMg);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([
        { id: 't-1' },
        { id: 't-2' },
        { id: 't-3' },
        { id: 't-4' },
      ]);
      mockPrisma.minigameMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.minigameMatch.createMany.mockResolvedValue({ count: 6 });
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(fullMg);
      await service.generateSchedule('mg-1', 'club-1');
      // 4 teams = C(4,2) = 6 matches
      expect(mockPrisma.minigameMatch.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ minigameId: 'mg-1' }),
        ]),
      });
      const callArg = mockPrisma.minigameMatch.createMany.mock.calls[0][0];
      expect(callArg.data).toHaveLength(6);
      // 1 lượt ⇒ tất cả leg = 1
      expect(callArg.data.every((m: { leg: number }) => m.leg === 1)).toBe(true);
    });

    it('creates DOUBLE round-robin (lượt đi & về) = 2×C(n,2) matches, leg 1 & 2, đội đổi sân', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(baseMg);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([
        { id: 't-1' },
        { id: 't-2' },
        { id: 't-3' },
        { id: 't-4' },
      ]);
      mockPrisma.minigameMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.minigameMatch.createMany.mockResolvedValue({ count: 12 });
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(fullMg);
      await service.generateSchedule('mg-1', 'club-1', true);
      const data = mockPrisma.minigameMatch.createMany.mock.calls[0][0].data as Array<{
        teamAId: string;
        teamBId: string;
        round: number;
        leg: number;
      }>;
      // 4 đội = 2×C(4,2) = 12 trận; leg1=6, leg2=6
      expect(data).toHaveLength(12);
      expect(data.filter((m) => m.leg === 1)).toHaveLength(6);
      expect(data.filter((m) => m.leg === 2)).toHaveLength(6);
      // Lượt về: cùng cặp nhưng đổi teamA/teamB (đổi sân). Cặp {a,b} không đổi qua 2 lượt.
      const key = (m: { teamAId: string; teamBId: string }) =>
        [m.teamAId, m.teamBId].sort().join('-');
      const legPairs = (leg: number) => data.filter((m) => m.leg === leg).map(key).sort();
      expect(legPairs(1)).toEqual(legPairs(2)); // cùng tập cặp đội ⇒ đôi cố định cả 2 lượt
      // Có ít nhất 1 trận lượt về đảo thứ tự so với lượt đi
      const leg1Ordered = data.filter((m) => m.leg === 1).map((m) => `${m.teamAId}>${m.teamBId}`);
      const leg2Ordered = data.filter((m) => m.leg === 2).map((m) => `${m.teamAId}>${m.teamBId}`);
      expect(leg2Ordered.some((o) => !leg1Ordered.includes(o))).toBe(true);
      // Ghi nhớ thể thức vào settings
      expect(mockPrisma.minigame.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({ doubleRoundRobin: true }),
          }),
        }),
      );
    });
  });

  /* ── deleteTeam ── */
  describe('deleteTeam', () => {
    it('deletes team and its matches', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.minigameTeam.findUnique.mockResolvedValue({
        id: 't-1',
        minigameId: 'mg-1',
      });
      mockPrisma.minigameMatch.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.minigameTeam.delete.mockResolvedValue({ id: 't-1' });
      const result = await service.deleteTeam('mg-1', 't-1', 'club-1');
      expect(mockPrisma.minigameMatch.deleteMany).toHaveBeenCalled();
      expect(result).toEqual({ id: 't-1' });
    });

    it('throws NotFoundException when team belongs to different minigame', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.minigameTeam.findUnique.mockResolvedValue({
        id: 't-1',
        minigameId: 'other-mg',
      });
      await expect(service.deleteTeam('mg-1', 't-1', 'club-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /* ── updateMatchScore: điểm theo cấu hình + guard hòa ── */
  describe('updateMatchScore', () => {
    const matchWith = (settings: Record<string, unknown>) => ({
      id: 'mt-1',
      teamAId: 'A',
      teamBId: 'B',
      scoreA: null,
      scoreB: null,
      status: 'PENDING',
      minigame: { clubId: 'club-1', settings },
    });

    it('từ chối hòa khi allowDraw không bật', async () => {
      mockPrisma.minigameMatch.findUnique.mockResolvedValue(
        matchWith({ allowDraw: false }),
      );
      await expect(
        service.updateMatchScore('mt-1', 'club-1', 11, 11),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.minigameTeam.update).not.toHaveBeenCalled();
    });

    it('cho phép hòa khi allowDraw bật — cộng drawPoints cấu hình', async () => {
      mockPrisma.minigameMatch.findUnique
        .mockResolvedValueOnce(matchWith({ allowDraw: true, drawPoints: 2 }))
        .mockResolvedValue({ id: 'mt-1' });
      mockPrisma.minigameTeam.update.mockResolvedValue({});
      mockPrisma.minigameMatch.update.mockResolvedValue({});
      await service.updateMatchScore('mt-1', 'club-1', 11, 11);
      expect(mockPrisma.minigameTeam.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'A' },
          data: expect.objectContaining({ points: { increment: 2 } }),
        }),
      );
    });

    it('cộng điểm theo winPoints/lossPoints cấu hình (không hardcode 3/0)', async () => {
      mockPrisma.minigameMatch.findUnique
        .mockResolvedValueOnce(
          matchWith({ winPoints: 5, drawPoints: 2, lossPoints: 1 }),
        )
        .mockResolvedValue({ id: 'mt-1' });
      mockPrisma.minigameTeam.update.mockResolvedValue({});
      mockPrisma.minigameMatch.update.mockResolvedValue({});
      await service.updateMatchScore('mt-1', 'club-1', 11, 5); // A thắng
      expect(mockPrisma.minigameTeam.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'A' },
          data: expect.objectContaining({ points: { increment: 5 } }),
        }),
      );
      expect(mockPrisma.minigameTeam.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'B' },
          data: expect.objectContaining({ points: { increment: 1 } }),
        }),
      );
    });
  });

  /* ── FIXED TEAM / SCHEDULE LOCK ── */
  describe('fixed team & schedule lock', () => {
    it('generateTeams rejects khi đã có matches (đội cố định)', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue({
        ...baseMg,
        format: 'FIXED_DOUBLES_ROUND_ROBIN',
      });
      mockPrisma.minigameMatch.count.mockResolvedValueOnce(6); // đã có lịch
      await expect(service.generateTeams('mg-1', 'club-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.minigameTeam.createMany).not.toHaveBeenCalled();
    });

    it('generateSchedule rejects khi đã có matches (lịch cố định)', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.minigameMatch.count.mockResolvedValueOnce(6); // đã có lịch
      await expect(service.generateSchedule('mg-1', 'club-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.minigameMatch.createMany).not.toHaveBeenCalled();
    });
  });

  /* ── ROUND-ROBIN CIRCLE METHOD ── */
  describe('generateSchedule circle method', () => {
    const runFor = async (teamCount: number) => {
      const teams = Array.from({ length: teamCount }, (_, i) => ({
        id: `t-${i + 1}`,
      }));
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(baseMg); // assertOwnership
      mockPrisma.minigameMatch.count.mockResolvedValueOnce(0);
      mockPrisma.minigameTeam.findMany.mockResolvedValue(teams);
      mockPrisma.minigameMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.minigameMatch.createMany.mockResolvedValue({ count: 0 });
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(fullMg); // findOne
      await service.generateSchedule('mg-1', 'club-1');
      return mockPrisma.minigameMatch.createMany.mock.calls[0][0]
        .data as Array<{
        teamAId: string;
        teamBId: string;
        round: number;
      }>;
    };

    const analyze = (
      data: Array<{ teamAId: string; teamBId: string; round: number }>,
    ) => {
      const rounds = new Set(data.map((m) => m.round));
      const pairs = new Set(
        data.map((m) => [m.teamAId, m.teamBId].sort().join('-')),
      );
      let twicePerRound = false;
      const byRound: Record<number, string[]> = {};
      data.forEach((m) => {
        byRound[m.round] = byRound[m.round] || [];
        byRound[m.round].push(m.teamAId, m.teamBId);
      });
      Object.values(byRound).forEach((ts) => {
        if (new Set(ts).size !== ts.length) twicePerRound = true;
      });
      return {
        rounds: rounds.size,
        matches: data.length,
        dupPair: pairs.size !== data.length,
        twicePerRound,
      };
    };

    it('4 teams → 3 vòng, 6 trận, no dup, no đá 2 trận/vòng', async () => {
      const a = analyze(await runFor(4));
      expect(a).toEqual({
        rounds: 3,
        matches: 6,
        dupPair: false,
        twicePerRound: false,
      });
    });

    it('5 teams → 5 vòng, 10 trận (BYE), no dup', async () => {
      const a = analyze(await runFor(5));
      expect(a).toEqual({
        rounds: 5,
        matches: 10,
        dupPair: false,
        twicePerRound: false,
      });
    });

    it('6 teams → 5 vòng, 15 trận, no dup', async () => {
      const a = analyze(await runFor(6));
      expect(a).toEqual({
        rounds: 5,
        matches: 15,
        dupPair: false,
        twicePerRound: false,
      });
    });
  });

  /* ── business event (EPIC7) ── */
  describe('endMinigame → business event (EPIC7)', () => {
    it('phát MINIGAME_COMPLETED sau khi kết thúc minigame', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.minigame.update.mockResolvedValue({
        ...baseMg,
        status: 'COMPLETED',
      });

      const result = await service.endMinigame('mg-1', 'club-1');

      expect(result.status).toBe('COMPLETED');
      expect(mockEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: 'club-1',
          userId: 'user-1',
          triggerType: 'MINIGAME_COMPLETED',
          idempotencyKey: 'MINIGAME_COMPLETED:mg-1',
        }),
      );
    });
  });
});
