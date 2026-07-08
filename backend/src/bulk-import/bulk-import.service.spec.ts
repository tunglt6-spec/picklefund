/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { BulkImportService } from './bulk-import.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  member: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  club: { findUnique: jest.fn() },
  fundPeriod: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  attendanceSession: {
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  sessionRegistration: { findUnique: jest.fn(), create: jest.fn() },
  attendanceRecord: { findUnique: jest.fn(), create: jest.fn() },
  fundContribution: { create: jest.fn() },
  livingExpense: { create: jest.fn() },
};

const CLUB_ID = 'club-1';
const USER_ID = 'user-1';

describe('BulkImportService', () => {
  let service: BulkImportService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.member.findMany.mockResolvedValue([]);
    mockPrisma.club.findUnique.mockResolvedValue({ plan: 'PRO' });
    mockPrisma.fundPeriod.findMany.mockResolvedValue([]);
    mockPrisma.attendanceSession.findMany.mockResolvedValue([]);
    mockPrisma.sessionRegistration.findUnique.mockResolvedValue(null);
    mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkImportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<BulkImportService>(BulkImportService);
  });

  describe('members', () => {
    it('tạo thành viên mới, bỏ qua thành viên đã trùng tên (không phân biệt hoa thường)', async () => {
      mockPrisma.member.findMany.mockResolvedValue([
        { id: 'mem-existing', fullName: 'Nguyễn Văn A' },
      ]);
      mockPrisma.member.create.mockResolvedValue({ id: 'mem-new' });

      const result = await service.import(CLUB_ID, USER_ID, {
        members: [
          { fullName: 'nguyễn văn a' }, // trùng (khác hoa/thường) -> matched
          { fullName: 'Trần Thị B', joinDate: '2024-01-01' },
        ],
      });

      expect(result.members.matched).toBe(1);
      expect(result.members.created).toBe(1);
      expect(mockPrisma.member.create).toHaveBeenCalledTimes(1);
    });

    it('chặn tạo thêm khi vượt giới hạn gói STARTER (20 thành viên)', async () => {
      mockPrisma.club.findUnique.mockResolvedValue({ plan: 'STARTER' });
      mockPrisma.member.findMany.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          id: `m${i}`,
          fullName: `Member ${i}`,
        })),
      );

      const result = await service.import(CLUB_ID, USER_ID, {
        members: [{ fullName: 'Member Thứ 21' }],
      });

      expect(result.members.created).toBe(0);
      expect(result.members.errors).toHaveLength(1);
      expect(result.members.errors[0].error).toContain('giới hạn');
      expect(mockPrisma.member.create).not.toHaveBeenCalled();
    });
  });

  describe('fundPeriods', () => {
    it('tạo kỳ quỹ mới, bỏ qua kỳ đã tồn tại theo tên', async () => {
      mockPrisma.fundPeriod.findMany.mockResolvedValue([
        { id: 'period-existing', name: 'Tháng 1_2024' },
      ]);
      mockPrisma.fundPeriod.create.mockResolvedValue({ id: 'period-new' });

      const result = await service.import(CLUB_ID, USER_ID, {
        fundPeriods: [
          {
            name: 'Tháng 1_2024',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            contributionAmount: 150000,
          },
          {
            name: 'Tháng 2_2024',
            startDate: '2024-02-01',
            endDate: '2024-02-29',
            contributionAmount: 150000,
          },
        ],
      });

      expect(result.fundPeriods.matched).toBe(1);
      expect(result.fundPeriods.created).toBe(1);
    });

    it('báo lỗi khi ngày kết thúc không sau ngày bắt đầu', async () => {
      const result = await service.import(CLUB_ID, USER_ID, {
        fundPeriods: [
          {
            name: 'Kỳ lỗi',
            startDate: '2024-02-01',
            endDate: '2024-01-01',
            contributionAmount: 100000,
          },
        ],
      });
      expect(result.fundPeriods.created).toBe(0);
      expect(result.fundPeriods.errors[0].error).toContain('Ngày kết thúc');
    });
  });

  describe('sessions + registrations + attendance (phụ thuộc kỳ quỹ)', () => {
    it('báo lỗi rõ ràng khi buổi/kỳ quỹ tham chiếu không tồn tại', async () => {
      const result = await service.import(CLUB_ID, USER_ID, {
        sessions: [
          {
            periodName: 'Kỳ không tồn tại',
            sessionDate: '2024-01-03',
            courtFee: 750000,
          },
        ],
        registrations: [
          {
            periodName: 'Kỳ không tồn tại',
            sessionDate: '2024-01-03',
            memberName: 'A',
          },
        ],
        attendance: [
          {
            periodName: 'Kỳ không tồn tại',
            sessionDate: '2024-01-03',
            memberName: 'A',
            status: 'PRESENT',
          },
        ],
      });
      expect(result.sessions.errors[0].error).toContain('Không tìm thấy kỳ quỹ');
      expect(result.registrations.errors[0].error).toContain('Không tìm thấy buổi');
      expect(result.attendance.errors[0].error).toContain('Không tìm thấy buổi');
    });

    it('tạo session mới trong kỳ đã có sẵn, đăng ký + điểm danh thành viên, đánh dấu buổi hoàn thành', async () => {
      mockPrisma.fundPeriod.findMany.mockResolvedValue([
        { id: 'period-1', name: 'Tháng 1_2024' },
      ]);
      mockPrisma.member.findMany.mockResolvedValue([
        { id: 'mem-1', fullName: 'Nguyễn Văn A' },
      ]);
      mockPrisma.attendanceSession.create.mockResolvedValue({ id: 'sess-1' });

      const result = await service.import(CLUB_ID, USER_ID, {
        sessions: [
          { periodName: 'Tháng 1_2024', sessionDate: '2024-01-03', courtFee: 750000 },
        ],
        registrations: [
          { periodName: 'Tháng 1_2024', sessionDate: '2024-01-03', memberName: 'Nguyễn Văn A' },
        ],
        attendance: [
          { periodName: 'Tháng 1_2024', sessionDate: '2024-01-03', memberName: 'Nguyễn Văn A', status: 'PRESENT' },
        ],
      });

      expect(result.sessions.created).toBe(1);
      expect(result.registrations.created).toBe(1);
      expect(result.attendance.created).toBe(1);
      expect(mockPrisma.sessionRegistration.create).toHaveBeenCalledWith({
        data: { clubId: CLUB_ID, attendanceSessionId: 'sess-1', memberId: 'mem-1' },
      });
      expect(mockPrisma.attendanceRecord.create).toHaveBeenCalledWith({
        data: { clubId: CLUB_ID, attendanceSessionId: 'sess-1', memberId: 'mem-1', status: 'PRESENT' },
      });
      expect(mockPrisma.attendanceSession.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['sess-1'] } },
        data: { status: 'completed' },
      });
    });

    it('đăng ký/điểm danh vào session ĐÃ CÓ SẴN (không nằm trong batch sessions của lần import này)', async () => {
      mockPrisma.fundPeriod.findMany.mockResolvedValue([
        { id: 'period-1', name: 'Tháng 1_2024' },
      ]);
      mockPrisma.attendanceSession.findMany.mockResolvedValue([
        { id: 'sess-existing', fundPeriodId: 'period-1', sessionDate: new Date('2024-01-03') },
      ]);
      mockPrisma.member.findMany.mockResolvedValue([
        { id: 'mem-1', fullName: 'Nguyễn Văn A' },
      ]);

      const result = await service.import(CLUB_ID, USER_ID, {
        attendance: [
          { periodName: 'Tháng 1_2024', sessionDate: '2024-01-03', memberName: 'Nguyễn Văn A', status: 'PRESENT' },
        ],
      });

      expect(result.attendance.created).toBe(1);
      expect(mockPrisma.attendanceRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ attendanceSessionId: 'sess-existing' }),
        }),
      );
    });

    it('bỏ qua (matched) đăng ký/điểm danh đã tồn tại, không tạo trùng', async () => {
      mockPrisma.fundPeriod.findMany.mockResolvedValue([
        { id: 'period-1', name: 'Tháng 1_2024' },
      ]);
      mockPrisma.attendanceSession.findMany.mockResolvedValue([
        { id: 'sess-existing', fundPeriodId: 'period-1', sessionDate: new Date('2024-01-03') },
      ]);
      mockPrisma.member.findMany.mockResolvedValue([
        { id: 'mem-1', fullName: 'Nguyễn Văn A' },
      ]);
      mockPrisma.sessionRegistration.findUnique.mockResolvedValue({ id: 'reg-1' });
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({ id: 'att-1' });

      const result = await service.import(CLUB_ID, USER_ID, {
        registrations: [
          { periodName: 'Tháng 1_2024', sessionDate: '2024-01-03', memberName: 'Nguyễn Văn A' },
        ],
        attendance: [
          { periodName: 'Tháng 1_2024', sessionDate: '2024-01-03', memberName: 'Nguyễn Văn A', status: 'PRESENT' },
        ],
      });

      expect(result.registrations.matched).toBe(1);
      expect(result.registrations.created).toBe(0);
      expect(result.attendance.matched).toBe(1);
      expect(result.attendance.created).toBe(0);
      expect(mockPrisma.sessionRegistration.create).not.toHaveBeenCalled();
      expect(mockPrisma.attendanceRecord.create).not.toHaveBeenCalled();
      // Không có attendance mới -> không đánh dấu session completed.
      expect(mockPrisma.attendanceSession.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('contributions + expenses', () => {
    it('tạo khoản thu, báo lỗi khi thiếu kỳ quỹ/thành viên hoặc số tiền <= 0', async () => {
      mockPrisma.fundPeriod.findMany.mockResolvedValue([
        { id: 'period-1', name: 'Tháng 1_2024' },
      ]);
      mockPrisma.member.findMany.mockResolvedValue([
        { id: 'mem-1', fullName: 'Nguyễn Văn A' },
      ]);
      mockPrisma.fundContribution.create.mockResolvedValue({ id: 'c1' });

      const result = await service.import(CLUB_ID, USER_ID, {
        contributions: [
          { periodName: 'Tháng 1_2024', memberName: 'Nguyễn Văn A', amount: 150000, paidAt: '2024-01-01' },
          { periodName: 'Kỳ lạ', memberName: 'Nguyễn Văn A', amount: 150000, paidAt: '2024-01-01' },
          { periodName: 'Tháng 1_2024', memberName: 'Người lạ', amount: 150000, paidAt: '2024-01-01' },
          { periodName: 'Tháng 1_2024', memberName: 'Nguyễn Văn A', amount: 0, paidAt: '2024-01-01' },
        ],
      });

      expect(result.contributions.created).toBe(1);
      expect(result.contributions.errors).toHaveLength(3);
    });

    it('tạo khoản chi với allocationRule/status mặc định EQUAL/pending khi không truyền', async () => {
      mockPrisma.fundPeriod.findMany.mockResolvedValue([
        { id: 'period-1', name: 'Tháng 1_2024' },
      ]);
      mockPrisma.livingExpense.create.mockResolvedValue({ id: 'e1' });

      const result = await service.import(CLUB_ID, USER_ID, {
        expenses: [
          { periodName: 'Tháng 1_2024', description: 'Tiền sân', amount: 750000, expenseDate: '2024-01-05' },
        ],
      });

      expect(result.expenses.created).toBe(1);
      expect(mockPrisma.livingExpense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ allocationRule: 'EQUAL', status: 'pending' }),
        }),
      );
    });
  });

  it('không phát Hermes event / không phụ thuộc HermesEventPublisher (bulk backfill im lặng)', async () => {
    // Nếu constructor cần thêm dependency nào khác ngoài PrismaService, TestingModule
    // ở beforeEach sẽ throw khi compile — test này xác nhận module chỉ cần PrismaService.
    expect(service).toBeInstanceOf(BulkImportService);
  });
});
