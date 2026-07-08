/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClubMemoryService } from '../ai/club-memory/club-memory.service';
import { ScoringService } from '../scoring/scoring.service';

const mockClubMemory = {
  seedDefaultTemplate: jest.fn().mockResolvedValue({ created: 0, skipped: 0 }),
};

const mockScoring = {
  seedDefaultRules: jest.fn().mockResolvedValue({ created: 0, skipped: 0 }),
};

const mockPrisma = {
  club: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
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
        { provide: ClubMemoryService, useValue: mockClubMemory },
        { provide: ScoringService, useValue: mockScoring },
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
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  /* ── create ── */
  describe('create', () => {
    const adminFields = {
      adminUsername: 'admin_pball',
      adminEmail: 'owner@pball.vn',
      adminPassword: 'secret123',
    };

    it('creates club + CLUB_ADMIN account (mustChangePassword) trong transaction', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // email chưa dùng
      mockPrisma.user.findFirst.mockResolvedValue(null); // username chưa dùng
      mockPrisma.$transaction.mockImplementation(
        (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
      );
      mockPrisma.club.create.mockResolvedValue(baseClub);
      mockPrisma.user.create.mockResolvedValue({ id: 'u-admin' });

      const result = await service.create(
        {
          name: 'CLB Pickleball Hà Nội',
          code: 'PBALL-HN',
          ...adminFields,
        },
        'super-admin-1',
      );

      expect(result.id).toBe('club-1');
      expect(mockPrisma.club.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'CLB Pickleball Hà Nội',
            code: 'PBALL-HN',
          }),
        }),
      );
      // Admin tạo với role CLUB_ADMIN, gắn clubId, buộc đổi mật khẩu, KHÔNG lưu mật khẩu thô.
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clubId: 'club-1',
            username: 'admin_pball',
            email: 'owner@pball.vn',
            role: 'CLUB_ADMIN',
            mustChangePassword: true,
          }),
        }),
      );
      const created = mockPrisma.user.create.mock.calls[0][0].data;
      expect(created.passwordHash).toBeDefined();
      expect(created.passwordHash).not.toBe('secret123'); // đã hash
      expect(created.password).toBeUndefined();
    });

    it('seed Club Memory template mặc định cho CLB mới, gán actorUserId là người tạo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(
        (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
      );
      mockPrisma.club.create.mockResolvedValue(baseClub);
      mockPrisma.user.create.mockResolvedValue({ id: 'u-admin' });

      await service.create(
        { name: 'CLB Pickleball Hà Nội', code: 'PBALL-HN', ...adminFields },
        'super-admin-1',
      );

      expect(mockClubMemory.seedDefaultTemplate).toHaveBeenCalledWith(
        'club-1',
        'super-admin-1',
      );
    });

    it('email admin đã dùng → BadRequest, KHÔNG tạo club', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ name: 'X', code: 'X1', ...adminFields }, 'super-admin-1'),
      ).rejects.toThrow('Email admin đã được sử dụng');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('username admin đã dùng → BadRequest, KHÔNG tạo club', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create({ name: 'X', code: 'X1', ...adminFields }, 'super-admin-1'),
      ).rejects.toThrow('Username admin đã tồn tại');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  /* ── update ── */
  describe('update', () => {
    it('updates direct fields (name, address, etc.)', async () => {
      mockPrisma.club.update.mockResolvedValue({
        ...baseClub,
        name: 'CLB mới',
      });
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
      mockPrisma.club.findUnique.mockResolvedValue({
        ...baseClub,
        settings: { theme: 'dark' },
      });
      mockPrisma.club.update.mockResolvedValue(baseClub);

      await service.update('club-1', { defaultContribution: 500000 });

      const call = mockPrisma.club.update.mock.calls[0][0];
      expect(call.data.settings).toMatchObject({
        theme: 'dark',
        defaultContribution: 500000,
      });
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
      mockPrisma.club.update.mockResolvedValue({
        ...baseClub,
        status: 'suspended',
      });
      await service.updateStatus('club-1', 'suspended');
      expect(mockPrisma.club.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'club-1' } }),
      );
    });
  });

  describe('setPlan (V2.2 Phase 6)', () => {
    it('đổi gói + hạn sử dụng', async () => {
      mockPrisma.club.findUnique.mockResolvedValue(baseClub);
      mockPrisma.club.update.mockResolvedValue({ ...baseClub, plan: 'PRO' });
      await service.setPlan('club-1', 'PRO', '2026-12-31');
      expect(mockPrisma.club.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'club-1' },
          data: expect.objectContaining({ plan: 'PRO' }),
        }),
      );
    });

    it('không hạn → planExpiresAt null', async () => {
      mockPrisma.club.findUnique.mockResolvedValue(baseClub);
      mockPrisma.club.update.mockResolvedValue({
        ...baseClub,
        plan: 'CLUB_PLUS',
      });
      await service.setPlan('club-1', 'CLUB_PLUS');
      const call = mockPrisma.club.update.mock.calls[0][0] as {
        data: { planExpiresAt: Date | null };
      };
      expect(call.data.planExpiresAt).toBeNull();
    });
  });
});
