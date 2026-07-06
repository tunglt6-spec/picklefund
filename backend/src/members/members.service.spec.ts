/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MembersService } from './members.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  member: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  club: { findUnique: jest.fn() },
  fundPeriod: { findFirst: jest.fn() },
  attendanceSession: { findMany: jest.fn() },
  attendanceRecord: { groupBy: jest.fn() },
  fundContribution: { findMany: jest.fn() },
  minigame: { findMany: jest.fn() },
  minigameParticipant: { findMany: jest.fn() },
};

const baseMember = {
  id: 'mem-1',
  clubId: 'club-1',
  userId: null,
  fullName: 'Nguyễn Văn A',
  phone: '0901234567',
  email: null,
  joinDate: new Date('2026-01-01'),
  status: 'active',
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('MembersService', () => {
  let service: MembersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  describe('create — giới hạn gói dịch vụ (V2.2 Phase 6)', () => {
    const dto = { fullName: 'Người mới', joinDate: '2026-02-01' };

    it('STARTER đủ 20 thành viên → chặn thêm (BadRequest)', async () => {
      mockPrisma.club.findUnique.mockResolvedValue({ plan: 'STARTER' });
      mockPrisma.member.count.mockResolvedValue(20);
      await expect(service.create('club-1', dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockPrisma.member.create).not.toHaveBeenCalled();
    });

    it('STARTER dưới giới hạn → cho tạo', async () => {
      mockPrisma.club.findUnique.mockResolvedValue({ plan: 'STARTER' });
      mockPrisma.member.count.mockResolvedValue(5);
      mockPrisma.member.create.mockResolvedValue(baseMember);
      await service.create('club-1', dto);
      expect(mockPrisma.member.create).toHaveBeenCalled();
    });

    it('PRO → không giới hạn, không cần đếm', async () => {
      mockPrisma.club.findUnique.mockResolvedValue({ plan: 'PRO' });
      mockPrisma.member.create.mockResolvedValue(baseMember);
      await service.create('club-1', dto);
      expect(mockPrisma.member.count).not.toHaveBeenCalled();
      expect(mockPrisma.member.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return active members for clubId', async () => {
      mockPrisma.member.findMany.mockResolvedValue([baseMember]);

      const result = await service.findAll('club-1');

      expect(mockPrisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clubId: 'club-1',
            isDeleted: false,
          }),
        }),
      );
      expect(result).toHaveLength(1);
      expect((result[0] as { fullName: string }).fullName).toBe('Nguyễn Văn A');
    });

    it('should filter by search term when provided', async () => {
      mockPrisma.member.findMany.mockResolvedValue([baseMember]);

      await service.findAll('club-1', 'Nguyễn');

      const callArg = mockPrisma.member.findMany.mock.calls[0][0] as {
        where: { clubId: string };
      };
      // Service may implement search as fullName.contains or OR array — just verify search key is present
      const whereStr = JSON.stringify(callArg.where);
      expect(whereStr).toContain('Nguy');
      expect(callArg.where.clubId).toBe('club-1');
    });
  });

  describe('findOne', () => {
    it('should return member when found', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(baseMember);

      const result = await service.findOne('mem-1', 'club-1');

      expect(result.id).toBe('mem-1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing', 'club-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete member (isDeleted = true)', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(baseMember);
      mockPrisma.member.update.mockResolvedValue({
        ...baseMember,
        isDeleted: true,
      });

      await service.remove('mem-1', 'club-1');

      expect(mockPrisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isDeleted: true }),
        }),
      );
    });
  });

  describe('aiRating (điểm hoạt động TB)', () => {
    it('tính điểm có trọng số + renormalize; TB = trung bình các thành viên', async () => {
      mockPrisma.member.findMany.mockResolvedValue([
        { id: 'm1' },
        { id: 'm2' },
      ]);
      mockPrisma.fundPeriod.findFirst.mockResolvedValue({ id: 'p1' });
      // 2 buổi hoàn tất
      mockPrisma.attendanceSession.findMany.mockResolvedValue([
        { id: 's1' },
        { id: 's2' },
      ]);
      // m1 có mặt 2/2, m2 có mặt 1/2
      mockPrisma.attendanceRecord.groupBy.mockResolvedValue([
        { memberId: 'm1', _count: { _all: 2 } },
        { memberId: 'm2', _count: { _all: 1 } },
      ]);
      // m1 đã đóng quỹ, m2 chưa
      mockPrisma.fundContribution.findMany.mockResolvedValue([
        { memberId: 'm1' },
      ]);
      // CLB có 1 minigame; m1 tham gia, m2 không
      mockPrisma.minigame.findMany.mockResolvedValue([{ id: 'g1' }]);
      mockPrisma.minigameParticipant.findMany.mockResolvedValue([
        { memberId: 'm1' },
      ]);

      const res = await service.aiRating('club-1');

      // m1 = 0.4*1 + 0.4*1 + 0.2*1 = 100 ; m2 = 0.4*0.5 + 0 + 0 = 20 ; TB = 60
      expect(res).toEqual({ average: 60, rated: 2, total: 2 });
    });

    it('CLB không có thành viên → average null', async () => {
      mockPrisma.member.findMany.mockResolvedValue([]);
      const res = await service.aiRating('club-1');
      expect(res).toEqual({ average: null, rated: 0, total: 0 });
    });
  });
});
