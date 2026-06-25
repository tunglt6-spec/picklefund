/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  apiKey: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const baseKey = {
  id: 'key-1',
  name: 'Test Key',
  keyHash: 'abc123hash',
  keyPrefix: 'pf_abc123de',
  createdById: 'user-1',
  isActive: true,
  lastUsedAt: null,
  expiresAt: null,
  createdAt: new Date(),
};

describe('ApiKeysService', () => {
  let service: ApiKeysService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ApiKeysService>(ApiKeysService);
  });

  /* ── create ── */
  describe('create', () => {
    it('creates key and returns raw key once (never stored in plaintext)', async () => {
      mockPrisma.apiKey.create.mockResolvedValue(baseKey);
      const result = await service.create('user-1', 'Test Key');
      expect(result.key).toMatch(/^pf_/);
      expect(result.prefix).toBeDefined();
      // raw key returned; hash stored in DB — verify create was called with hash, not raw
      const createCall = mockPrisma.apiKey.create.mock.calls[0][0];
      expect(createCall.data.keyHash).not.toBe(result.key);
    });

    it('creates key with expiry date when provided', async () => {
      mockPrisma.apiKey.create.mockResolvedValue(baseKey);
      const expiry = new Date('2027-01-01');
      await service.create('user-1', 'Expiring Key', expiry);
      const createCall = mockPrisma.apiKey.create.mock.calls[0][0];
      expect(createCall.data.expiresAt).toEqual(expiry);
    });

    it('creates key without expiry when not provided', async () => {
      mockPrisma.apiKey.create.mockResolvedValue(baseKey);
      await service.create('user-1', 'No Expiry');
      const createCall = mockPrisma.apiKey.create.mock.calls[0][0];
      expect(createCall.data.expiresAt).toBeUndefined();
    });
  });

  /* ── findAll ── */
  describe('findAll', () => {
    it('returns keys for user without exposing hash', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([baseKey]);
      const result = await service.findAll('user-1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdById: 'user-1' } }),
      );
      // Ensure select excludes keyHash
      const call = mockPrisma.apiKey.findMany.mock.calls[0][0];
      expect(call.select?.keyHash).toBeFalsy();
    });
  });

  /* ── revoke ── */
  describe('revoke', () => {
    it('throws NotFoundException when key not found', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);
      await expect(service.revoke('key-x', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when user does not own key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({ ...baseKey, createdById: 'other-user' });
      await expect(service.revoke('key-1', 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deactivates key when owner revokes it', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(baseKey);
      mockPrisma.apiKey.update.mockResolvedValue({ ...baseKey, isActive: false });
      await service.revoke('key-1', 'user-1');
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'key-1' }, data: { isActive: false } }),
      );
    });
  });

  /* ── validateKey ── */
  describe('validateKey', () => {
    it('returns null when key not found in DB', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);
      const result = await service.validateKey('pf_invalidkey');
      expect(result).toBeNull();
    });

    it('returns null when key is inactive', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        ...baseKey,
        isActive: false,
        createdBy: { id: 'user-1' },
      });
      const result = await service.validateKey('pf_somekey');
      expect(result).toBeNull();
    });

    it('returns null when key is expired', async () => {
      const expired = new Date('2020-01-01');
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        ...baseKey,
        isActive: true,
        expiresAt: expired,
        createdBy: { id: 'user-1' },
      });
      const result = await service.validateKey('pf_somekey');
      expect(result).toBeNull();
    });

    it('updates lastUsedAt and returns user when key is valid', async () => {
      const futureExpiry = new Date('2030-01-01');
      const owner = { id: 'user-1', username: 'admin', role: 'SUPER_ADMIN' };
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        ...baseKey,
        isActive: true,
        expiresAt: futureExpiry,
        createdBy: owner,
      });
      mockPrisma.apiKey.update.mockResolvedValue(baseKey);
      const result = await service.validateKey('pf_somekey');
      expect(result).toEqual(owner);
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'key-1' },
          data: { lastUsedAt: expect.any(Date) },
        }),
      );
    });
  });
});
