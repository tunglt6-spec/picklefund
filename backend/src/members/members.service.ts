import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async findAll(clubId: string, search?: string) {
    return this.prisma.member.findMany({
      where: {
        clubId,
        isDeleted: false,
        ...(search ? { fullName: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { fullName: 'asc' },
    })
  }

  async findOne(id: string, clubId: string) {
    const m = await this.prisma.member.findFirst({ where: { id, clubId, isDeleted: false } })
    if (!m) throw new NotFoundException('Thành viên không tồn tại')
    return m
  }

  async create(clubId: string, dto: { fullName: string; phone?: string; email?: string; joinDate: string; notes?: string }) {
    return this.prisma.member.create({
      data: { ...dto, clubId, joinDate: new Date(dto.joinDate) },
    })
  }

  async update(id: string, clubId: string, dto: any) {
    await this.findOne(id, clubId)
    const { clubId: _c, createdById: _b, id: _id, ...safeDto } = dto
    return this.prisma.member.update({
      where: { id },
      data: { ...safeDto, ...(safeDto.joinDate ? { joinDate: new Date(safeDto.joinDate) } : {}) },
    })
  }

  async remove(id: string, clubId: string) {
    await this.findOne(id, clubId)
    return this.prisma.member.update({ where: { id }, data: { isDeleted: true, status: 'left' } })
  }

  async summary(memberId: string, fundPeriodId: string, clubId: string) {
    const [attended, contributions] = await Promise.all([
      this.prisma.attendanceRecord.count({ where: { memberId, status: 'PRESENT', attendanceSession: { fundPeriodId } } }),
      this.prisma.fundContribution.aggregate({ where: { memberId, fundPeriodId, clubId }, _sum: { amount: true } }),
    ])
    return { attendedSessions: attended, amountPaid: Number(contributions._sum.amount ?? 0) }
  }
}
