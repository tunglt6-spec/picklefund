/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MinigameService } from './minigame.service';
import { PrismaService } from '../prisma/prisma.service';

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
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  minigameMatch: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  member: { findMany: jest.fn() },
};

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
      ],
    }).compile();
    service = module.get<MinigameService>(MinigameService);
  });

  /* ── findAll ── */
  describe('findAll', () => {
    it('returns list filtered by clubId', async () => {
      mockPrisma.minigame.findMany.mockResolvedValue([baseMg]);
      const result = await service.findAll('club-1');
      expect(result).toEqual([baseMg]);
      expect(mockPrisma.minigame.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: 'club-1' } }),
      );
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
      mockPrisma.minigame.findUnique.mockResolvedValue({ ...baseMg, clubId: 'other-club' });
      await expect(service.findOne('mg-1', 'club-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(null);
      await expect(service.findOne('mg-1', 'club-1')).rejects.toThrow(NotFoundException);
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
        data: expect.objectContaining({ clubId: 'club-1', createdById: 'user-1' }),
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
      await expect(service.clearSchedule('mg-1', 'club-1')).rejects.toThrow(NotFoundException);
    });
  });

  /* ── generateTeams ── */
  describe('generateTeams', () => {
    it('throws BadRequestException for unsupported format', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue({ ...baseMg, format: 'SINGLES' });
      await expect(service.generateTeams('mg-1', 'club-1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when fewer than 2 participants', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.minigameParticipant.findMany.mockResolvedValue([{ memberId: 'm-1' }]);
      await expect(service.generateTeams('mg-1', 'club-1')).rejects.toThrow(BadRequestException);
    });

    it('creates teams from participants', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(baseMg); // assertOwnership
      mockPrisma.minigameParticipant.findMany.mockResolvedValue([
        { memberId: 'm-1' }, { memberId: 'm-2' }, { memberId: 'm-3' }, { memberId: 'm-4' },
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

  /* ── generateSchedule ── */
  describe('generateSchedule', () => {
    it('throws BadRequestException when fewer than 2 teams', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([{ id: 't-1' }]);
      await expect(service.generateSchedule('mg-1', 'club-1')).rejects.toThrow(BadRequestException);
    });

    it('creates round-robin matches for 4 teams', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(baseMg);
      mockPrisma.minigameTeam.findMany.mockResolvedValue([
        { id: 't-1' }, { id: 't-2' }, { id: 't-3' }, { id: 't-4' },
      ]);
      mockPrisma.minigameMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.minigameMatch.createMany.mockResolvedValue({ count: 6 });
      mockPrisma.minigame.findUnique.mockResolvedValueOnce(fullMg);
      await service.generateSchedule('mg-1', 'club-1');
      // 4 teams = C(4,2) = 6 matches
      expect(mockPrisma.minigameMatch.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([expect.objectContaining({ minigameId: 'mg-1' })]),
      });
      const callArg = mockPrisma.minigameMatch.createMany.mock.calls[0][0];
      expect(callArg.data).toHaveLength(6);
    });
  });

  /* ── deleteTeam ── */
  describe('deleteTeam', () => {
    it('deletes team and its matches', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.minigameTeam.findUnique.mockResolvedValue({ id: 't-1', minigameId: 'mg-1' });
      mockPrisma.minigameMatch.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.minigameTeam.delete.mockResolvedValue({ id: 't-1' });
      const result = await service.deleteTeam('mg-1', 't-1', 'club-1');
      expect(mockPrisma.minigameMatch.deleteMany).toHaveBeenCalled();
      expect(result).toEqual({ id: 't-1' });
    });

    it('throws NotFoundException when team belongs to different minigame', async () => {
      mockPrisma.minigame.findUnique.mockResolvedValue(baseMg);
      mockPrisma.minigameTeam.findUnique.mockResolvedValue({ id: 't-1', minigameId: 'other-mg' });
      await expect(service.deleteTeam('mg-1', 't-1', 'club-1')).rejects.toThrow(NotFoundException);
    });
  });
});
