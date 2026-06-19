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

  async update(id: string, dto: Record<string, unknown>) {
    const directKeys = new Set(['name', 'address', 'contactEmail', 'contactPhone', 'logoUrl'])
    const directFields: Record<string, unknown> = {}
    const extraSettings: Record<string, unknown> = {}

    for (const [k, v] of Object.entries(dto)) {
      if (directKeys.has(k)) directFields[k] = v
      else extraSettings[k] = v
    }

    if (Object.keys(extraSettings).length > 0) {
      const current = await this.prisma.club.findUnique({ where: { id }, select: { settings: true } })
      return this.prisma.club.update({
        where: { id },
        data: { ...directFields, settings: { ...(current?.settings as object ?? {}), ...extraSettings } } as any,
      })
    }
    return this.prisma.club.update({ where: { id }, data: directFields as any })
  }

  async updateStatus(id: string, status: ClubStatus, reason?: string) {
    return this.prisma.club.update({ where: { id }, data: { status } })
  }

  async delete(id: string) {
    await this.findOne(id)
    return this.prisma.club.update({ where: { id }, data: { status: 'deleted' } })
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
