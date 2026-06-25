/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { MemberUsersService } from './member-users.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('argon2');

// Prisma array-style $transaction: resolves all promises in the array
const mockTransaction = jest.fn().mockImplementation((operations: Promise<unknown>[]) =>
  Promise.all(operations),
);

const mockPrisma = {
  member: { findFirst: jest.fn(), update: jest.fn() },
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auditLog: { create: jest.fn() },
  $transaction: mockTransaction,
};

const baseMember = {
  id: 'mem-1',
  clubId: 'club-1',
  fullName: 'Nguyễn Văn An',
  userId: null,
  isDeleted: false,
};

const baseUser = {
  id: 'user-1',
  clubId: 'club-1',
  username: 'nguyenvanan',
  email: 'nguyenvanan@club-1.picklefund.local',
  role: 'CLUB_MEMBER',
  isActive: true,
  mustChangePassword: true,
  notificationEnabled: true,
  lastLoginAt: null,
  createdAt: new Date(),
  member: { id: 'mem-1', fullName: 'Nguyễn Văn An', phone: null, email: null },
};

describe('MemberUsersService', () => {
  let service: MemberUsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (argon2.hash as jest.Mock).mockResolvedValue('hashed_pw');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberUsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<MemberUsersService>(MemberUsersService);
  });

  /* ── findAll ── */
  describe('findAll', () => {
    it('returns member users scoped to clubId', async () => {
      mockPrisma.user.findMany.mockResolvedValue([baseUser]);
      const result = await service.findAll('club-1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: 'club-1', role: 'CLUB_MEMBER' } }),
      );
    });
  });

  /* ── create ── */
  describe('create', () => {
    it('throws NotFoundException when member does not exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null);
      await expect(
        service.create('club-1', 'admin-1', { memberId: 'mem-x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when member already has active account', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ ...baseMember, userId: 'existing-user' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user', isActive: true });
      await expect(
        service.create('club-1', 'admin-1', { memberId: 'mem-1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when email already taken', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(baseMember);
      mockPrisma.user.findMany.mockResolvedValue([]);
      // findUnique called for email check → returns conflict
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'other-user' });
      await expect(
        service.create('club-1', 'admin-1', { memberId: 'mem-1', email: 'used@example.com' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates user in transaction and links to member', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(baseMember);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue(null); // no email conflict
      mockPrisma.user.findFirst.mockResolvedValue(null);  // no username conflict
      mockPrisma.user.create.mockResolvedValue(baseUser);
      mockPrisma.member.update.mockResolvedValue(baseMember);
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Override $transaction to use callback style (service uses callback)
      mockPrisma.$transaction.mockImplementationOnce(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return cb(mockPrisma);
      });

      const result = await service.create('club-1', 'admin-1', { memberId: 'mem-1' });
      expect(result.username).toBe('nguyenvanan');
      expect(mockPrisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'mem-1' } }),
      );
    });
  });

  /* ── resetPassword ── */
  describe('resetPassword', () => {
    it('throws NotFoundException for cross-tenant or non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.resetPassword('user-x', 'admin-1', 'club-other'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('resets password and requires password change', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(baseUser);
      // Array-style $transaction — each operation returns a result
      mockPrisma.user.update.mockResolvedValue({ ...baseUser, mustChangePassword: true });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.resetPassword('user-1', 'admin-1', 'club-1');
      expect(result.message).toContain('123456');
    });
  });

  /* ── updateStatus ── */
  describe('updateStatus', () => {
    it('throws NotFoundException for unknown user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.updateStatus('user-x', false, 'admin-1', 'club-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deactivates user and returns message', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(baseUser);
      mockPrisma.user.update.mockResolvedValue({ ...baseUser, isActive: false });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.updateStatus('user-1', false, 'admin-1', 'club-1');
      expect(result.message).toMatch(/khóa/i);
    });

    it('activates user and returns message', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ ...baseUser, isActive: false });
      mockPrisma.user.update.mockResolvedValue({ ...baseUser, isActive: true });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.updateStatus('user-1', true, 'admin-1', 'club-1');
      expect(result.message).toMatch(/mở khóa/i);
    });
  });
});
