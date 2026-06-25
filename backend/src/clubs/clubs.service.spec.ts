/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  club: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

const baseClub = {
  id: 'club-1',
  name: 'CLB Pickleball Hà Nội',
  code: 'PBALL-HN',
  address: '123 Nguyễn Trãi',
  contactEmail: 'admin@pball.vn',
  contactPhone: '0901234567',
  status: 'active',
  settings: {},
  logoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { members: 10, fundPeriods: 3 },
};

describe('ClubsService', () => {
  let service: ClubsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClubsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ClubsService>(ClubsService);
  });

  /* ── findAll ── */
  describe('findAll', () => {
    it('excludes deleted clubs', async () => {
      mockPrisma.club.findMany.mockResolvedValue([baseClub]);
      mockPrisma.club.count.mockResolvedValue(1);

      await service.findAll();
      expect(mockPrisma.club.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { not: 'deleted' } }),
        }),
      );
    });

    it('paginates correctly', async () => {
      mockPrisma.club.findMany.mockResolvedValue([]);
      mockPrisma.club.count.mockResolvedValue(0);

      await service.findAll(2, 10);
      const call = mockPrisma.club.findMany.mock.calls[0][0];
      expect(call.skip).toBe(10);
      expect(call.take).toBe(10);
    });

    it('returns total count alongside items', async () => {
      mockPrisma.club.findMany.mockResolvedValue([baseClub]);
      mockPrisma.club.count.mockResolvedValue(5);

      const result = await service.findAll();
      expect(result.total).toBe(5);
      expect(result.clubs).toHaveLength(1);
    });
  });

  /* ── findOne ── */
  describe('findOne', () => {
    it('returns club when found', async () => {
      mockPrisma.club.findUnique.mockResolvedValue(baseClub);
      const result = await service.findOne('club-1');
      expect(result.id).toBe('club-1');
    });

    it('throws NotFoundException when club does not exist', async () => {
      mockPrisma.club.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  /* ── create ── */
  describe('create', () => {
    it('creates club with required fields', async () => {
      mockPrisma.club.create.mockResolvedValue(baseClub);
      const result = await service.create({
        name: 'CLB Pickleball Hà Nội',
        code: 'PBALL-HN',
      });
      expect(result.id).toBe('club-1');
      expect(mockPrisma.club.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'CLB Pickleball Hà Nội', code: 'PBALL-HN' }),
        }),
      );
    });
  });

  /* ── update ── */
  describe('update', () => {
    it('updates direct fields (name, address, etc.)', async () => {
      mockPrisma.club.update.mockResolvedValue({ ...baseClub, name: 'CLB mới' });
      const result = await service.update('club-1', { name: 'CLB mới' });
      expect(result.name).toBe('CLB mới');
      expect(mockPrisma.club.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'club-1' },
          data: expect.objectContaining({ name: 'CLB mới' }),
        }),
      );
    });

    it('merges extra settings fields into JSON settings column', async () => {
      mockPrisma.club.findUnique.mockResolvedValue({ ...baseClub, settings: { theme: 'dark' } });
      mockPrisma.club.update.mockResolvedValue(baseClub);

      await service.update('club-1', { defaultContribution: 500000 });

      const call = mockPrisma.club.update.mock.calls[0][0];
      expect(call.data.settings).toMatchObject({ theme: 'dark', defaultContribution: 500000 });
    });

    it('does not fetch settings when only direct fields are updated', async () => {
      mockPrisma.club.update.mockResolvedValue(baseClub);
      await service.update('club-1', { name: 'CLB Test' });
      expect(mockPrisma.club.findUnique).not.toHaveBeenCalled();
    });
  });

  /* ── updateStatus ── */
  describe('updateStatus', () => {
    it('updates club status', async () => {
      mockPrisma.club.update.mockResolvedValue({ ...baseClub, status: 'suspended' });
      await service.updateStatus('club-1', 'suspended' as any, 'Vi phạm nội quy');
      expect(mockPrisma.club.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'club-1' } }),
      );
    });
  });
});
