/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const prisma = {
  user: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('UsersService (FIX-USER-AUTH-HASH)', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.user.create.mockImplementation(
      (arg: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'u-new', ...arg.data }),
    );
    prisma.user.update.mockImplementation(
      (arg: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'u1', ...arg.data }),
    );
    const mod: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(UsersService);
  });

  describe('create', () => {
    it('hash bằng argon2 (không bcrypt) — login argon2.verify khớp', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await service.create({
        username: 'pfadmin',
        password: 'S3cret-Pw!',
        email: 'a@b.vn',
        role: 'SUPER_ADMIN',
      });
      const data = prisma.user.create.mock.calls[0][0].data as {
        passwordHash: string;
        password?: string;
      };
      // Không lưu plaintext; hash đúng định dạng argon2; verify roundtrip PASS.
      expect(data.password).toBeUndefined();
      expect(data.passwordHash.startsWith('$argon2')).toBe(true);
      expect(data.passwordHash).not.toContain('S3cret-Pw!');
      await expect(
        argon2.verify(data.passwordHash, 'S3cret-Pw!'),
      ).resolves.toBe(true);
    });

    it('username trùng → Conflict', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'x' });
      await expect(
        service.create({
          username: 'admin',
          password: 'p',
          email: 'a@b.vn',
          role: 'CLUB_ADMIN',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('có password → hash argon2 vào passwordHash, KHÔNG đẩy raw password (tránh 500)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await service.update('u1', { password: 'NewPw-123', isActive: true });
      const data = prisma.user.update.mock.calls[0][0].data as {
        passwordHash?: string;
        password?: string;
        isActive?: boolean;
      };
      expect(data.password).toBeUndefined();
      expect(data.passwordHash?.startsWith('$argon2')).toBe(true);
      expect(data.isActive).toBe(true);
      await expect(
        argon2.verify(data.passwordHash!, 'NewPw-123'),
      ).resolves.toBe(true);
    });

    it('không password → chỉ cập nhật field khác, không đụng passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await service.update('u1', { isActive: false, email: 'x@y.vn' });
      const data = prisma.user.update.mock.calls[0][0].data as Record<
        string,
        unknown
      >;
      expect('passwordHash' in data).toBe(false);
      expect('password' in data).toBe(false);
      expect(data.isActive).toBe(false);
      expect(data.email).toBe('x@y.vn');
    });

    it('user không tồn tại → NotFound', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.update('missing', { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
