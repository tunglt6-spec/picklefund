import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(clubId: string, fundPeriodId?: string) {
    return this.prisma.attendanceSession.findMany({
      where: { clubId, ...(fundPeriodId ? { fundPeriodId } : {}) },
      orderBy: { sessionDate: 'desc' },
      include: {
        _count: { select: { attendanceRecords: { where: { status: 'PRESENT' } } } },
      },
    })
  }

  async findOne(id: string, clubId: string) {
    const s = await this.prisma.attendanceSession.findFirst({
      where: { id, clubId },
      include: {
        attendanceRecords: { include: { member: true } },
      },
    })
    if (!s) throw new NotFoundException('Buổi tập không tồn tại')
    return s
  }

  async create(clubId: string, userId: string, dto: { fundPeriodId: string; sessionDate: string; courtFee: number; courtName?: string; startTime?: string; endTime?: string; notes?: string }) {
    return this.prisma.attendanceSession.create({
      data: {
        clubId,
        createdById: userId,
        fundPeriodId: dto.fundPeriodId,
        sessionDate: new Date(dto.sessionDate),
        courtFee: new Decimal(dto.courtFee),
        courtName: dto.courtName,
        startTime: dto.startTime,
        endTime: dto.endTime,
        notes: dto.notes,
      },
    })
  }

  async update(id: string, clubId: string, dto: any) {
    await this.findOne(id, clubId)
    return this.prisma.attendanceSession.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.sessionDate ? { sessionDate: new Date(dto.sessionDate) } : {}),
        ...(dto.courtFee !== undefined ? { courtFee: new Decimal(dto.courtFee) } : {}),
        ...(dto.location ? { courtName: dto.location } : {}),
      },
    })
  }

  async getAttendance(sessionId: string, clubId: string) {
    const session = await this.findOne(sessionId, clubId)
    const members = await this.prisma.member.findMany({ where: { clubId, isDeleted: false } })
    const records = session.attendanceRecords

    return members.map((m) => {
      const rec = records.find((r) => r.memberId === m.id)
      return {
        memberId: m.id,
        memberName: m.fullName,
        status: rec?.status ?? 'ABSENT',
        recordId: rec?.id ?? null,
      }
    })
  }

  async findAttendedByMember(memberId: string, clubId: string): Promise<string[]> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { memberId, clubId, status: 'PRESENT' },
      select: { attendanceSessionId: true },
    })
    return records.map((r) => r.attendanceSessionId)
  }

  async updateAttendance(sessionId: string, clubId: string, attendance: { memberId: string; status: 'PRESENT' | 'ABSENT' }[]) {
    await this.findOne(sessionId, clubId)

    await Promise.all(
      attendance.map((a) =>
        this.prisma.attendanceRecord.upsert({
          where: { attendanceSessionId_memberId: { attendanceSessionId: sessionId, memberId: a.memberId } },
          create: { attendanceSessionId: sessionId, memberId: a.memberId, clubId, status: a.status },
          update: { status: a.status },
        }),
      ),
    )

    const presentCount = attendance.filter((a) => a.status === 'PRESENT').length
    return { updated: attendance.length, presentCount }
  }
}
