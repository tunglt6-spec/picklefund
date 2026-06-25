import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { MembersService } from './members.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  member: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}

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
}

describe('MembersService', () => {
  let service: MembersService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<MembersService>(MembersService)
  })

  describe('findAll', () => {
    it('should return active members for clubId', async () => {
      mockPrisma.member.findMany.mockResolvedValue([baseMember])

      const result = await service.findAll('club-1')

      expect(mockPrisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clubId: 'club-1', isDeleted: false }) }),
      )
      expect(result).toHaveLength(1)
      expect(result[0].fullName).toBe('Nguyễn Văn A')
    })

    it('should filter by search term when provided', async () => {
      mockPrisma.member.findMany.mockResolvedValue([baseMember])

      await service.findAll('club-1', 'Nguyễn')

      const callArg = mockPrisma.member.findMany.mock.calls[0][0]
      // Service may implement search as fullName.contains or OR array — just verify search key is present
      const whereStr = JSON.stringify(callArg.where)
      expect(whereStr).toContain('Nguy')
      expect(callArg.where.clubId).toBe('club-1')
    })
  })

  describe('findOne', () => {
    it('should return member when found', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(baseMember)

      const result = await service.findOne('mem-1', 'club-1')

      expect(result.id).toBe('mem-1')
    })

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)

      await expect(service.findOne('missing', 'club-1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('should soft-delete member (isDeleted = true)', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(baseMember)
      mockPrisma.member.update.mockResolvedValue({ ...baseMember, isDeleted: true })

      await service.remove('mem-1', 'club-1')

      expect(mockPrisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isDeleted: true }) }),
      )
    })
  })
})
