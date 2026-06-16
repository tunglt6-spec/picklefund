import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { ClubStatus } from '@prisma/client'

@Injectable()
export class ClubsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [clubs, total] = await Promise.all([
      this.prisma.club.findMany({
        where: { status: { not: 'deleted' } },
        include: { _count: { select: { members: true, fundPeriods: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.club.count({ where: { status: { not: 'deleted' } } }),
    ])
    return { clubs, total }
  }

  async findOne(id: string) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: { _count: { select: { members: true, fundPeriods: true } } },
    })
    if (!club) throw new NotFoundException('CLB không tồn tại')
    return club
  }

  async create(dto: { name: string; code: string; address?: string; contactEmail?: string; contactPhone?: string }) {
    return this.prisma.club.create({ data: dto })
  }

  async update(id: string, dto: Partial<{ name: string; address: string; contactEmail: string; contactPhone: string; logoUrl: string }>) {
    return this.prisma.club.update({ where: { id }, data: dto })
  }

  async updateStatus(id: string, status: ClubStatus, reason?: string) {
    return this.prisma.club.update({ where: { id }, data: { status } })
  }

  async stats() {
    const [total, active, suspended, totalMembers, totalPeriods] = await Promise.all([
      this.prisma.club.count({ where: { status: { not: 'deleted' } } }),
      this.prisma.club.count({ where: { status: 'active' } }),
      this.prisma.club.count({ where: { status: 'suspended' } }),
      this.prisma.member.count({ where: { isDeleted: false } }),
      this.prisma.fundPeriod.count(),
    ])
    return { totalClubs: total, activeClubs: active, suspendedClubs: suspended, totalMembers, totalFundPeriods: totalPeriods, loginsLast24h: 0 }
  }
}
