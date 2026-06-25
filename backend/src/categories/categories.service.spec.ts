/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  expenseCategory: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  livingExpense: {
    updateMany: jest.fn(),
  },
};

const baseCat = {
  id: 'cat-1',
  clubId: 'club-1',
  name: 'Tiền sân',
  icon: '🏸',
  isDefault: false,
  createdAt: new Date(),
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CategoriesService>(CategoriesService);
  });

  /* ── findAll ── */
  describe('findAll', () => {
    it('returns categories scoped to clubId', async () => {
      mockPrisma.expenseCategory.findMany.mockResolvedValue([baseCat]);
      const result = await service.findAll('club-1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.expenseCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: 'club-1' } }),
      );
    });

    it('returns empty array for club with no categories', async () => {
      mockPrisma.expenseCategory.findMany.mockResolvedValue([]);
      const result = await service.findAll('club-new');
      expect(result).toHaveLength(0);
    });
  });

  /* ── create ── */
  describe('create', () => {
    it('creates a category for the club', async () => {
      mockPrisma.expenseCategory.create.mockResolvedValue(baseCat);
      const result = await service.create('club-1', { name: 'Tiền sân', icon: '🏸' });
      expect(result.id).toBe('cat-1');
      expect(mockPrisma.expenseCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clubId: 'club-1', name: 'Tiền sân', icon: '🏸' }),
        }),
      );
    });

    it('creates a category without icon', async () => {
      mockPrisma.expenseCategory.create.mockResolvedValue({ ...baseCat, icon: undefined });
      await service.create('club-1', { name: 'Khác' });
      const call = mockPrisma.expenseCategory.create.mock.calls[0][0];
      expect(call.data.name).toBe('Khác');
    });
  });

  /* ── update ── */
  describe('update', () => {
    it('updates category name in same club', async () => {
      mockPrisma.expenseCategory.findFirst.mockResolvedValue(baseCat);
      const updated = { ...baseCat, name: 'Tiền sân mới' };
      mockPrisma.expenseCategory.update.mockResolvedValue(updated);

      const result = await service.update('cat-1', 'club-1', { name: 'Tiền sân mới' });
      expect(result.name).toBe('Tiền sân mới');
      expect(mockPrisma.expenseCategory.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cat-1' }, data: { name: 'Tiền sân mới' } }),
      );
    });

    it('throws NotFoundException for cross-tenant update', async () => {
      mockPrisma.expenseCategory.findFirst.mockResolvedValue(null);
      await expect(
        service.update('cat-1', 'club-other', { name: 'Hack' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrisma.expenseCategory.update).not.toHaveBeenCalled();
    });
  });

  /* ── remove ── */
  describe('remove', () => {
    it('unlinks expenses then deletes category', async () => {
      mockPrisma.expenseCategory.findFirst.mockResolvedValue(baseCat);
      mockPrisma.livingExpense.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.expenseCategory.delete.mockResolvedValue(baseCat);

      await service.remove('cat-1', 'club-1');

      // Unlink step must happen before delete
      expect(mockPrisma.livingExpense.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { categoryId: 'cat-1', clubId: 'club-1' },
          data: { categoryId: null },
        }),
      );
      expect(mockPrisma.expenseCategory.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cat-1' } }),
      );
    });

    it('throws NotFoundException for cross-tenant delete', async () => {
      mockPrisma.expenseCategory.findFirst.mockResolvedValue(null);
      await expect(service.remove('cat-1', 'club-other')).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrisma.livingExpense.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.expenseCategory.delete).not.toHaveBeenCalled();
    });

    it('removes category even when no expenses are linked (count=0)', async () => {
      mockPrisma.expenseCategory.findFirst.mockResolvedValue(baseCat);
      mockPrisma.livingExpense.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.expenseCategory.delete.mockResolvedValue(baseCat);

      await expect(service.remove('cat-1', 'club-1')).resolves.not.toThrow();
      expect(mockPrisma.expenseCategory.delete).toHaveBeenCalled();
    });
  });
});
