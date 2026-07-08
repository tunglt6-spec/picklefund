import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClubMemoryRepository } from './club-memory.prisma-repository';
import { PrismaService } from '../../prisma/prisma.service';
import { ClubMemoryObject, ClubMemoryType } from './club-memory.types';

const mockPrisma = {
  clubMemory: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

function obj(over: Partial<ClubMemoryObject> = {}): ClubMemoryObject {
  const now = new Date();
  return {
    memoryId: 'm1',
    clubId: 'club-1',
    type: ClubMemoryType.FACT,
    title: null,
    content: 'c',
    tags: [],
    metadata: {},
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

function row(over: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: 'm1',
    clubId: 'club-1',
    type: 'FACT',
    title: null,
    content: 'c',
    tags: [],
    metadata: {},
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

describe('PrismaClubMemoryRepository', () => {
  let repo: PrismaClubMemoryRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaClubMemoryRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    repo = module.get<PrismaClubMemoryRepository>(PrismaClubMemoryRepository);
  });

  it('create() ghi đúng field và map ngược lại đúng ClubMemoryObject', async () => {
    mockPrisma.clubMemory.create.mockResolvedValue(row({ id: 'a', content: 'old' }));

    const result = await repo.create(obj({ memoryId: 'a', content: 'old' }));

    expect(mockPrisma.clubMemory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: 'a', clubId: 'club-1', content: 'old' }),
      }),
    );
    expect(result.memoryId).toBe('a');
    expect(result.content).toBe('old');
  });

  it('findById() trả null khi không có bản ghi', async () => {
    mockPrisma.clubMemory.findUnique.mockResolvedValue(null);
    expect(await repo.findById('missing')).toBeNull();
  });

  it('replace() cập nhật, KHÔNG đụng clubId/type/createdBy/createdAt', async () => {
    mockPrisma.clubMemory.update.mockResolvedValue(row({ id: 'a', content: 'new' }));

    await repo.replace(obj({ memoryId: 'a', content: 'new' }));

    const call = mockPrisma.clubMemory.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'a' });
    expect(call.data).not.toHaveProperty('clubId');
    expect(call.data).not.toHaveProperty('type');
    expect(call.data).not.toHaveProperty('createdBy');
    expect(call.data).not.toHaveProperty('createdAt');
    expect(call.data.content).toBe('new');
  });

  it('deleteById() trả true khi xóa thành công, false khi lỗi (không tồn tại)', async () => {
    mockPrisma.clubMemory.delete.mockResolvedValueOnce({});
    expect(await repo.deleteById('a')).toBe(true);

    mockPrisma.clubMemory.delete.mockRejectedValueOnce(new Error('Record not found'));
    expect(await repo.deleteById('missing')).toBe(false);
  });

  it('listByClub() lọc theo clubId, sắp xếp updatedAt desc (qua Prisma orderBy)', async () => {
    mockPrisma.clubMemory.findMany.mockResolvedValue([
      row({ id: 'new' }),
      row({ id: 'old' }),
    ]);

    const result = await repo.listByClub('club-1');

    expect(mockPrisma.clubMemory.findMany).toHaveBeenCalledWith({
      where: { clubId: 'club-1' },
      orderBy: { updatedAt: 'desc' },
    });
    expect(result.map((r) => r.memoryId)).toEqual(['new', 'old']);
  });

  it('clear() xóa toàn bộ bảng (chỉ dùng cho test)', async () => {
    await repo.clear();
    expect(mockPrisma.clubMemory.deleteMany).toHaveBeenCalledWith({});
  });
});
