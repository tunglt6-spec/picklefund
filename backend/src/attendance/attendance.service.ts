import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
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
    if (!dto.fundPeriodId) {
      throw new BadRequestException('Cần có kỳ quỹ đang hoạt động để tạo buổi chơi')
    }
    if (!dto.courtFee || dto.courtFee <= 0) {
      throw new BadRequestException('Tiền sân phải lớn hơn 0')
    }
    const period = await this.prisma.fundPeriod.findFirst({ where: { id: dto.fundPeriodId, clubId } })
    if (!period) {
      throw new BadRequestException('Kỳ quỹ không tồn tại hoặc không thuộc câu lạc bộ này')
    }
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
    const { clubId: _c, createdById: _b, id: _id, ...safeDto } = dto
    return this.prisma.attendanceSession.update({
      where: { id },
      data: {
        ...safeDto,
        ...(safeDto.sessionDate ? { sessionDate: new Date(safeDto.sessionDate) } : {}),
        ...(safeDto.courtFee !== undefined ? { courtFee: new Decimal(safeDto.courtFee) } : {}),
        ...(safeDto.location ? { courtName: safeDto.location } : {}),
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

  async getMemberSummary(clubId: string, fundPeriodId?: string) {
    const members = await this.prisma.member.findMany({ where: { clubId, isDeleted: false } })
    let sessions = await this.prisma.attendanceSession.findMany({
      where: { clubId, ...(fundPeriodId ? { fundPeriodId } : {}) },
      select: { id: true },
    })
    // Fallback: if no sessions found for this period, use sessions without any period link
    if (fundPeriodId && sessions.length === 0) {
      sessions = await this.prisma.attendanceSession.findMany({
        where: { clubId, fundPeriodId: null },
        select: { id: true },
      })
    }
    const sessionIds = sessions.map((s) => s.id)

    const records = await this.prisma.attendanceRecord.findMany({
      where: { clubId, status: 'PRESENT', attendanceSessionId: { in: sessionIds } },
      select: { memberId: true },
    })

    const countByMember: Record<string, number> = {}
    records.forEach((r) => { countByMember[r.memberId] = (countByMember[r.memberId] ?? 0) + 1 })

    return members.map((m) => ({
      memberId: m.id,
      memberName: m.fullName,
      attendedSessions: countByMember[m.id] ?? 0,
      totalSessions: sessionIds.length,
    }))
  }

  async updateAttendance(sessionId: string, clubId: string, attendance: { memberId: string; status: 'PRESENT' | 'ABSENT' }[]) {
    await this.findOne(sessionId, clubId)

    if (attendance.length > 0) {
      const validMembers = await this.prisma.member.findMany({
        where: { id: { in: attendance.map(a => a.memberId) }, clubId, isDeleted: false },
        select: { id: true },
      })
      if (validMembers.length !== attendance.length) {
        throw new BadRequestException('Một số thành viên không thuộc CLB này')
      }
    }

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
