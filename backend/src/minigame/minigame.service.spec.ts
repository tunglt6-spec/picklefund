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
    updateMany: jest.fn(),
  },
  minigameParticipant: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
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
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  minigameTeamMember: {
    create: jest.fn(),
    createMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  minigameGolfer: {
    createMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  minigameGolfScore: {
    upsert: jest.fn(),
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
        { minigameId: 'mg-1', _min: { playedAt: new Date('2026-07-10') }, _max: { playedAt: new Date('2026-07-12') }, _count: { _all: 3 } },
      ]);
      mockPrisma.minigameGolfer.groupBy.mockResolvedValue([]);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([]);
      const result = await service.findAll('club-1');
      expect(result).toEqual([
        { ...baseMg, firstPlayedAt: new Date('2026-07-10'), lastPlayedAt: new Date('2026-07-12'), playerCount: 0, matchCount: 0, completedCount: 3, groupCount: 0 },
      ]);
      expect(mockPrisma.minigame.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: 'club-1' } }),
      );
    });

    it('giải chưa có trận đấu → firstPlayedAt/lastPlayedAt = null', async () => {
      mockPrisma.minigame.findMany.mockResolvedValue([baseMg]);
      mockPrisma.minigameMatch.groupBy.mockResolvedValue([]);
      mockPrisma.minigameGolfer.groupBy.mockResolvedValue([]);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([]);
      const result = await service.findAll('club-1');
      expect(result).toEqual([
        { ...baseMg, firstPlayedAt: null, lastPlayedAt: null, playerCount: 0, matchCount: 0, completedCount: 0, groupCount: 0 },
      ]);
    });

    it('groupCount đếm settings.groups (GROUP_STAGE)', async () => {
      mockPrisma.minigame.findMany.mockResolvedValue([
        { ...baseMg, format: 'GROUP_STAGE', settings: { groups: [{ id: 'A' }, { id: 'B' }] } },
      ]);
      mockPrisma.minigameMatch.groupBy.mockResolvedValue([]);
      mockPrisma.minigameGolfer.groupBy.mockResolvedValue([]);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([]);
      const result = await service.findAll('club-1');
      expect(result[0].groupCount).toBe(2);
    });
  });

  describe('participant & round persistence', () => {
    it('removeParticipant: xóa participant thành viên (không đụng guests)', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue({
        id: 'mg-1',
        clubId: 'club-1',
        settings: { guests: [{ id: 'guest-x', name: 'K' }] },
      });
      mockPrisma.minigameParticipant.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.minigame.update.mockClear();
      await service.removeParticipant('mg-1', 'club-1', 'mem-9');
      expect(mockPrisma.minigameParticipant.deleteMany).toHaveBeenCalledWith({
        where: { minigameId: 'mg-1', memberId: 'mem-9' },
      });
      expect(mockPrisma.minigame.update).not.toHaveBeenCalled();
    });

    it('removeParticipant: xóa KHÁCH khỏi settings.guests khi không phải member', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue({
        id: 'mg-1',
        clubId: 'club-1',
        settings: { guests: [{ id: 'guest-x', name: 'K' }, { id: 'guest-y', name: 'L' }] },
      });
      mockPrisma.minigameParticipant.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.minigame.update.mockResolvedValue({});
      await service.removeParticipant('mg-1', 'club-1', 'guest-x');
      expect(mockPrisma.minigame.update).toHaveBeenCalledWith({
        where: { id: 'mg-1' },
        data: { settings: { guests: [{ id: 'guest-y', name: 'L' }] } },
      });
    });

    it('updateParticipantName: đổi tên khách; từ chối khi không phải khách', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue({
        id: 'mg-1',
        clubId: 'club-1',
        settings: { guests: [{ id: 'guest-x', name: 'Cũ' }] },
      });
      mockPrisma.minigame.update.mockResolvedValue({});
      await service.updateParticipantName('mg-1', 'club-1', 'guest-x', 'Mới');
      expect(mockPrisma.minigame.update).toHaveBeenCalledWith({
        where: { id: 'mg-1' },
        data: { settings: { guests: [{ id: 'guest-x', name: 'Mới' }] } },
      });
      await expect(
        service.updateParticipantName('mg-1', 'club-1', 'mem-9', 'X'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lockRound: thêm roundNumber vào settings.lockedRounds (không nhân đôi)', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue({
        id: 'mg-1',
        clubId: 'club-1',
        settings: { lockedRounds: [1] },
      });
      mockPrisma.minigame.update.mockResolvedValue({});
      await service.lockRound('mg-1', 'club-1', 2);
      expect(mockPrisma.minigame.update).toHaveBeenCalledWith({
        where: { id: 'mg-1' },
        data: { settings: { lockedRounds: [1, 2] } },
      });
      mockPrisma.minigame.update.mockClear();
      await service.lockRound('mg-1', 'club-1', 1); // đã có → không update lại
      expect(mockPrisma.minigame.update).not.toHaveBeenCalled();
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

    it('truyền sport/scoringModel khi có (đa bộ môn Pha 0)', async () => {
      mockPrisma.minigame.create.mockResolvedValue(baseMg);
      await service.create('club-1', 'user-1', {
        name: 'Giải Golf',
        format: 'SINGLES',
        sport: 'GOLF',
        scoringModel: 'LEADERBOARD',
      });
      expect(mockPrisma.minigame.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sport: 'GOLF', scoringModel: 'LEADERBOARD' }),
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

  describe('clearMatchScore', () => {
    it('reverts team stats and resets match when previously COMPLETED', async () => {
      mockPrisma.minigameMatch.findUnique
        .mockResolvedValueOnce({
          id: 'match-1',
          teamAId: 'team-a',
          teamBId: 'team-b',
          scoreA: 11,
          scoreB: 7,
          status: 'COMPLETED',
          minigame: { clubId: 'club-1', settings: {} },
        })
        .mockResolvedValueOnce({ id: 'match-1', status: 'PENDING' });
      mockPrisma.minigameTeam.update.mockResolvedValue({});
      mockPrisma.minigameMatch.update.mockResolvedValue({});

      await service.clearMatchScore('match-1', 'club-1');

      // Đảo thống kê: đội A (thắng) -1 win -3 điểm; đội B (thua) -1 loss -0 điểm.
      expect(mockPrisma.minigameTeam.update).toHaveBeenCalledWith({
        where: { id: 'team-a' },
        data: {
          wins: { decrement: 1 },
          losses: { decrement: 0 },
          points: { decrement: 3 },
        },
      });
      expect(mockPrisma.minigameTeam.update).toHaveBeenCalledWith({
        where: { id: 'team-b' },
        data: {
          wins: { decrement: 0 },
          losses: { decrement: 1 },
          points: { decrement: 0 },
        },
      });
      // Reset trận về trạng thái trống.
      expect(mockPrisma.minigameMatch.update).toHaveBeenCalledWith({
        where: { id: 'match-1' },
        data: {
          scoreA: null,
          scoreB: null,
          winnerId: null,
          status: 'PENDING',
          playedAt: null,
        },
      });
    });

    it('does not touch team stats when match not COMPLETED', async () => {
      mockPrisma.minigameTeam.update.mockClear();
      mockPrisma.minigameMatch.findUnique
        .mockResolvedValueOnce({
          id: 'match-2',
          teamAId: 'team-a',
          teamBId: 'team-b',
          scoreA: null,
          scoreB: null,
          status: 'PENDING',
          minigame: { clubId: 'club-1', settings: {} },
        })
        .mockResolvedValueOnce({ id: 'match-2', status: 'PENDING' });
      mockPrisma.minigameMatch.update.mockResolvedValue({});

      await service.clearMatchScore('match-2', 'club-1');
      expect(mockPrisma.minigameTeam.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when match not owned by club', async () => {
      mockPrisma.minigameMatch.findUnique.mockResolvedValueOnce({
        id: 'match-3',
        status: 'COMPLETED',
        minigame: { clubId: 'other-club', settings: {} },
      });
      await expect(
        service.clearMatchScore('match-3', 'club-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMatch', () => {
    it('reverts stats when COMPLETED then deletes the match row', async () => {
      mockPrisma.minigameTeam.update.mockClear();
      mockPrisma.minigameMatch.findUnique.mockResolvedValueOnce({
        id: 'match-d1',
        teamAId: 'team-a',
        teamBId: 'team-b',
        scoreA: 5,
        scoreB: 11,
        status: 'COMPLETED',
        minigame: { clubId: 'club-1', settings: {} },
      });
      mockPrisma.minigameTeam.update.mockResolvedValue({});
      mockPrisma.minigameMatch.delete.mockResolvedValue({});

      const res = await service.deleteMatch('match-d1', 'club-1');

      // Đội B thắng: A -1 loss -0đ; B -1 win -3đ.
      expect(mockPrisma.minigameTeam.update).toHaveBeenCalledWith({
        where: { id: 'team-b' },
        data: {
          wins: { decrement: 1 },
          losses: { decrement: 0 },
          points: { decrement: 3 },
        },
      });
      expect(mockPrisma.minigameMatch.delete).toHaveBeenCalledWith({
        where: { id: 'match-d1' },
      });
      expect(res).toEqual({ deleted: true });
    });

    it('deletes without touching team stats when not COMPLETED', async () => {
      mockPrisma.minigameTeam.update.mockClear();
      mockPrisma.minigameMatch.findUnique.mockResolvedValueOnce({
        id: 'match-d2',
        teamAId: 'team-a',
        teamBId: 'team-b',
        scoreA: null,
        scoreB: null,
        status: 'PENDING',
        minigame: { clubId: 'club-1', settings: {} },
      });
      mockPrisma.minigameMatch.delete.mockResolvedValue({});

      await service.deleteMatch('match-d2', 'club-1');
      expect(mockPrisma.minigameTeam.update).not.toHaveBeenCalled();
      expect(mockPrisma.minigameMatch.delete).toHaveBeenCalled();
    });

    it('throws NotFoundException when match not owned by club', async () => {
      mockPrisma.minigameMatch.findUnique.mockResolvedValueOnce({
        id: 'match-d3',
        status: 'COMPLETED',
        minigame: { clubId: 'other-club', settings: {} },
      });
      await expect(service.deleteMatch('match-d3', 'club-1')).rejects.toThrow(
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

  /* ── roster đội đồng đội (bóng đá — Pha 1) ── */
  describe('createRosterTeam / removeRosterMember', () => {
    it('tạo đội kèm roster (member CLB + khách)', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg); // assertOwnership
      mockPrisma.member.findMany.mockResolvedValue([{ id: 'm-1' }, { id: 'm-2' }]);
      mockPrisma.minigameTeam.create.mockResolvedValue({ id: 'team-1', members: [] });
      await service.createRosterTeam('mg-1', 'club-1', {
        name: 'FC Sấm Sét',
        memberIds: ['m-1', 'm-2'],
        guests: [{ name: 'Khách A' }, { name: '  ' }],
      });
      const arg = mockPrisma.minigameTeam.create.mock.calls[0][0];
      expect(arg.data.name).toBe('FC Sấm Sét');
      expect(arg.data.members.create).toEqual([
        { memberId: 'm-1' },
        { memberId: 'm-2' },
        { guestName: 'Khách A' }, // khách tên rỗng bị loại
      ]);
    });

    it('chặn member không thuộc CLB', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.member.findMany.mockResolvedValue([{ id: 'm-1' }]); // thiếu m-2
      await expect(
        service.createRosterTeam('mg-1', 'club-1', { name: 'X', memberIds: ['m-1', 'm-2'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('xoá roster member: chặn khi khác CLB', async () => {
      mockPrisma.minigameTeamMember.findUnique.mockResolvedValue({
        id: 'rm-1',
        team: { minigame: { clubId: 'club-KHAC' } },
      });
      await expect(
        service.removeRosterMember('rm-1', 'club-1'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.minigameTeamMember.delete).not.toHaveBeenCalled();
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

    it('lưu playedAt (ngày chọn) + note khi có; note rỗng → null', async () => {
      mockPrisma.minigameMatch.findUnique
        .mockResolvedValueOnce(matchWith({ winPoints: 3 }))
        .mockResolvedValue({ id: 'mt-1' });
      mockPrisma.minigameTeam.update.mockResolvedValue({});
      mockPrisma.minigameMatch.update.mockClear();
      mockPrisma.minigameMatch.update.mockResolvedValue({});
      await service.updateMatchScore('mt-1', 'club-1', 11, 5, {
        playedAt: '2026-07-01',
        note: '  Trận hay  ',
      });
      expect(mockPrisma.minigameMatch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mt-1' },
          data: expect.objectContaining({
            playedAt: new Date('2026-07-01'),
            note: 'Trận hay',
          }),
        }),
      );
    });

    it('nâng minigame sang ACTIVE khi nhập điểm (chỉ nếu còn tiền-diễn-ra)', async () => {
      mockPrisma.minigame.updateMany.mockClear();
      mockPrisma.minigameMatch.findUnique
        .mockResolvedValueOnce({
          ...matchWith({ winPoints: 3 }),
          minigame: { clubId: 'club-1', id: 'mg-1', settings: { winPoints: 3 } },
        })
        .mockResolvedValue({ id: 'mt-1' });
      mockPrisma.minigameTeam.update.mockResolvedValue({});
      mockPrisma.minigameMatch.update.mockResolvedValue({});
      await service.updateMatchScore('mt-1', 'club-1', 11, 5);
      expect(mockPrisma.minigame.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'mg-1',
          status: { notIn: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
        },
        data: expect.objectContaining({ status: 'ACTIVE' }),
      });
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

  /* ── generateFootballSchedule (Pha 1c) ── */
  describe('generateFootballSchedule', () => {
    const footballMg = { ...baseMg, sport: 'FOOTBALL', format: 'GROUP_STAGE' };

    it('4 đội → vòng tròn 6 trận (1 lượt)', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(footballMg); // assertOwnership
      mockPrisma.minigameMatch.count.mockResolvedValueOnce(0);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([
        { id: 't-1' }, { id: 't-2' }, { id: 't-3' }, { id: 't-4' },
      ]);
      mockPrisma.minigameMatch.createMany.mockResolvedValue({ count: 6 });
      mockPrisma.minigame.update.mockResolvedValue(footballMg);
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(fullMg); // findOne
      await service.generateFootballSchedule('mg-1', 'club-1', false);
      const data = mockPrisma.minigameMatch.createMany.mock.calls[0][0].data;
      expect(data).toHaveLength(6);
    });

    it('4 đội lượt đi & về → 12 trận', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(footballMg);
      mockPrisma.minigameMatch.count.mockResolvedValueOnce(0);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([
        { id: 't-1' }, { id: 't-2' }, { id: 't-3' }, { id: 't-4' },
      ]);
      mockPrisma.minigameMatch.createMany.mockResolvedValue({ count: 12 });
      mockPrisma.minigame.update.mockResolvedValue(footballMg);
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(fullMg);
      await service.generateFootballSchedule('mg-1', 'club-1', true);
      const data = mockPrisma.minigameMatch.createMany.mock.calls[0][0].data;
      expect(data).toHaveLength(12);
    });

    it('không phải môn đồng đội → chặn', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(baseMg); // sport mặc định PICKLEBALL
      await expect(
        service.generateFootballSchedule('mg-1', 'club-1', false),
      ).rejects.toThrow('bóng đá');
    });

    it('bóng rổ (BASKETBALL) dùng chung engine vòng tròn', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce({ ...baseMg, sport: 'BASKETBALL' });
      mockPrisma.minigameMatch.count.mockResolvedValueOnce(0);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([
        { id: 't-1' }, { id: 't-2' }, { id: 't-3' }, { id: 't-4' },
      ]);
      mockPrisma.minigameMatch.createMany.mockResolvedValue({ count: 6 });
      mockPrisma.minigame.update.mockResolvedValue({ ...baseMg, sport: 'BASKETBALL' });
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(fullMg);
      await service.generateFootballSchedule('mg-1', 'club-1', false);
      const data = mockPrisma.minigameMatch.createMany.mock.calls[0][0].data;
      expect(data).toHaveLength(6);
    });

    it('đã có lịch → chặn tạo lại', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(footballMg);
      mockPrisma.minigameMatch.count.mockResolvedValueOnce(6);
      await expect(
        service.generateFootballSchedule('mg-1', 'club-1', false),
      ).rejects.toThrow('đã được cố định');
    });

    it('ít hơn 2 đội → chặn', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(footballMg);
      mockPrisma.minigameMatch.count.mockResolvedValueOnce(0);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([{ id: 't-1' }]);
      await expect(
        service.generateFootballSchedule('mg-1', 'club-1', false),
      ).rejects.toThrow('ít nhất 2 đội');
    });
  });

  /* ── generateKnockout / advanceKnockout (Pha 1d) ── */
  describe('knockout (loại trực tiếp)', () => {
    const footballMg = { ...baseMg, sport: 'FOOTBALL' };
    const setupTeams = (count: number) => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(footballMg); // assertOwnership
      mockPrisma.minigameMatch.count.mockResolvedValueOnce(0);
      mockPrisma.minigameTeam.findMany.mockResolvedValue(
        Array.from({ length: count }, (_, i) => ({ id: `t-${i + 1}` })),
      );
      mockPrisma.minigameMatch.createMany.mockResolvedValue({ count });
      mockPrisma.minigame.update.mockResolvedValue(footballMg);
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(fullMg); // findOne
    };

    it('4 đội → vòng 1 có 2 trận, không BYE', async () => {
      setupTeams(4);
      await service.generateKnockout('mg-1', 'club-1');
      const data = mockPrisma.minigameMatch.createMany.mock.calls[0][0].data;
      expect(data).toHaveLength(2);
      expect(data.every((m: any) => m.teamAId && m.teamBId)).toBe(true);
    });

    it('3 đội → size 4: 1 trận thật + 1 walkover (COMPLETED, có winner)', async () => {
      setupTeams(3);
      await service.generateKnockout('mg-1', 'club-1');
      const data = mockPrisma.minigameMatch.createMany.mock.calls[0][0].data;
      expect(data).toHaveLength(2);
      const walkover = data.find((m: any) => m.status === 'COMPLETED');
      expect(walkover).toBeTruthy();
      expect(walkover.winnerId).toBeTruthy();
      expect(walkover.teamBId).toBeNull();
    });

    it('< 2 đội → chặn', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(footballMg);
      mockPrisma.minigameMatch.count.mockResolvedValueOnce(0);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([{ id: 't-1' }]);
      await expect(
        service.generateKnockout('mg-1', 'club-1'),
      ).rejects.toThrow('ít nhất 2 đội');
    });

    it('advance: 2 trận thắng ở vòng 1 → sinh 1 trận chung kết', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(footballMg); // assertOwnership
      mockPrisma.minigameMatch.findMany.mockResolvedValueOnce([
        { id: 'm1', round: 1, courtNo: 1, status: 'COMPLETED', winnerId: 't-1' },
        { id: 'm2', round: 1, courtNo: 2, status: 'COMPLETED', winnerId: 't-3' },
      ]);
      mockPrisma.minigameMatch.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(fullMg); // findOne
      await service.advanceKnockout('mg-1', 'club-1');
      const data = mockPrisma.minigameMatch.createMany.mock.calls[0][0].data;
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({ teamAId: 't-1', teamBId: 't-3', round: 2 });
    });

    it('advance: vòng còn trận chưa phân thắng bại → chặn', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(footballMg);
      mockPrisma.minigameMatch.findMany.mockResolvedValueOnce([
        { id: 'm1', round: 1, courtNo: 1, status: 'COMPLETED', winnerId: 't-1' },
        { id: 'm2', round: 1, courtNo: 2, status: 'PENDING', winnerId: null },
      ]);
      await expect(
        service.advanceKnockout('mg-1', 'club-1'),
      ).rejects.toThrow('chưa có đội thắng');
    });

    it('advance: đã tới chung kết (1 trận) → chặn', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(footballMg);
      mockPrisma.minigameMatch.findMany.mockResolvedValueOnce([
        { id: 'm1', round: 2, courtNo: 1, status: 'COMPLETED', winnerId: 't-1' },
      ]);
      await expect(
        service.advanceKnockout('mg-1', 'club-1'),
      ).rejects.toThrow('chung kết');
    });
  });

  /* ── Golf / leaderboard (Pha 2) ── */
  describe('golf (leaderboard)', () => {
    const golfMg = { ...baseMg, sport: 'GOLF', scoringModel: 'LEADERBOARD' };

    it('addGolfers: tạo golfer từ member + khách', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(golfMg); // assertOwnership
      mockPrisma.member.findMany.mockResolvedValue([{ id: 'm-1' }]);
      mockPrisma.minigameGolfer.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(fullMg); // findOne
      await service.addGolfers('mg-1', 'club-1', {
        memberIds: ['m-1'], guests: [{ name: 'Khách A' }],
      });
      const data = mockPrisma.minigameGolfer.createMany.mock.calls[0][0].data;
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ memberId: 'm-1' }),
          expect.objectContaining({ guestName: 'Khách A' }),
        ]),
      );
    });

    it('addGolfers: không phải giải golf → chặn', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(baseMg); // PICKLEBALL
      await expect(
        service.addGolfers('mg-1', 'club-1', { guests: [{ name: 'X' }] }),
      ).rejects.toThrow('golf');
    });

    it('upsertGolfScore: lưu điểm gậy hợp lệ', async () => {
      mockPrisma.minigameGolfer.findUnique.mockResolvedValue({
        id: 'g-1', minigame: { clubId: 'club-1', id: 'mg-1' },
      });
      mockPrisma.minigameGolfScore.upsert.mockResolvedValue({});
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(fullMg); // findOne
      await service.upsertGolfScore('g-1', 'club-1', 1, 72);
      expect(mockPrisma.minigameGolfScore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { golferId_round: { golferId: 'g-1', round: 1 } },
          create: { golferId: 'g-1', round: 1, strokes: 72 },
          update: { strokes: 72 },
        }),
      );
    });

    it('upsertGolfScore: số gậy < 1 → chặn', async () => {
      mockPrisma.minigameGolfer.findUnique.mockResolvedValue({
        id: 'g-1', minigame: { clubId: 'club-1', id: 'mg-1' },
      });
      await expect(
        service.upsertGolfScore('g-1', 'club-1', 1, 0),
      ).rejects.toThrow('số nguyên dương');
    });

    it('upsertGolfScore: golfer khác CLB → chặn', async () => {
      mockPrisma.minigameGolfer.findUnique.mockResolvedValue({
        id: 'g-1', minigame: { clubId: 'club-KHAC', id: 'mg-1' },
      });
      await expect(
        service.upsertGolfScore('g-1', 'club-1', 1, 72),
      ).rejects.toThrow('không tồn tại');
    });

    it('removeGolfer: xóa golfer trong CLB', async () => {
      mockPrisma.minigameGolfer.findUnique.mockResolvedValue({
        id: 'g-1', minigame: { clubId: 'club-1', id: 'mg-1' },
      });
      mockPrisma.minigameGolfer.delete.mockResolvedValue({});
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(fullMg);
      await service.removeGolfer('g-1', 'club-1');
      expect(mockPrisma.minigameGolfer.delete).toHaveBeenCalledWith({ where: { id: 'g-1' } });
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
