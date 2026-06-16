import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MinigameFormat } from '@prisma/client'

@Injectable()
export class MinigameService {
  constructor(private prisma: PrismaService) {}

  private async assertOwnership(id: string, clubId: string) {
    const mg = await this.prisma.minigame.findUnique({ where: { id } })
    if (!mg || mg.clubId !== clubId) throw new NotFoundException('Minigame không tồn tại')
    return mg
  }

  async findAll(clubId: string) {
    return this.prisma.minigame.findMany({
      where: { clubId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { participants: true, teams: true, matches: true } } },
    })
  }

  async findOne(id: string, clubId: string) {
    const mg = await this.prisma.minigame.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
            player1: { select: { id: true, fullName: true } },
            player2: { select: { id: true, fullName: true } },
          },
          orderBy: { points: 'desc' },
        },
        matches: {
          include: {
            teamA: { select: { id: true, name: true } },
            teamB: { select: { id: true, name: true } },
          },
          orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
        },
        participants: { include: { member: { select: { id: true, fullName: true } } } },
      },
    })
    if (!mg || mg.clubId !== clubId) throw new NotFoundException('Minigame không tồn tại')
    return mg
  }

  async create(clubId: string, createdById: string, dto: { name: string; format: MinigameFormat; scheduledAt?: Date; settings?: any }) {
    return this.prisma.minigame.create({
      data: { clubId, createdById, ...dto },
    })
  }

  async addParticipants(id: string, clubId: string, memberIds: string[]) {
    await this.assertOwnership(id, clubId)
    await this.prisma.minigameParticipant.createMany({
      data: memberIds.map(memberId => ({ minigameId: id, memberId })),
      skipDuplicates: true,
    })
    return this.findOne(id, clubId)
  }

  async generateTeams(id: string, clubId: string) {
    const mg = await this.assertOwnership(id, clubId)
    if (mg.format !== 'RANDOM_DOUBLES') throw new BadRequestException('Chỉ hỗ trợ format RANDOM_DOUBLES')

    const participants = await this.prisma.minigameParticipant.findMany({ where: { minigameId: id } })
    if (participants.length < 2) throw new BadRequestException('Cần ít nhất 2 người chơi')

    // Shuffle
    const shuffled = [...participants].sort(() => Math.random() - 0.5)
    const teams: Array<{ minigameId: string; name: string; player1Id: string; player2Id?: string }> = []
    for (let i = 0; i < shuffled.length; i += 2) {
      teams.push({
        minigameId: id,
        name: `Đôi ${Math.floor(i / 2) + 1}`,
        player1Id: shuffled[i].memberId,
        player2Id: shuffled[i + 1]?.memberId,
      })
    }

    await this.prisma.minigameTeam.deleteMany({ where: { minigameId: id } })
    await this.prisma.minigameTeam.createMany({ data: teams })
    return this.findOne(id, clubId)
  }

  async generateSchedule(id: string, clubId: string) {
    const mg = await this.assertOwnership(id, clubId)
    const teams = await this.prisma.minigameTeam.findMany({ where: { minigameId: id } })
    if (teams.length < 2) throw new BadRequestException('Cần ít nhất 2 đội')

    // Round-robin schedule
    const matches: Array<{ minigameId: string; teamAId: string; teamBId: string; round: number; courtNo: number }> = []
    let round = 1
    for (let i = 0; i < teams.length - 1; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({ minigameId: id, teamAId: teams[i].id, teamBId: teams[j].id, round, courtNo: (matches.length % 4) + 1 })
      }
      round++
    }

    await this.prisma.minigameMatch.deleteMany({ where: { minigameId: id } })
    await this.prisma.minigameMatch.createMany({ data: matches })
    return this.findOne(id, clubId)
  }

  async startMinigame(id: string, clubId: string) {
    await this.assertOwnership(id, clubId)
    return this.prisma.minigame.update({
      where: { id },
      data: { status: 'ACTIVE', startedAt: new Date() },
    })
  }

  async updateMatchScore(matchId: string, clubId: string, scoreA: number, scoreB: number) {
    const match = await this.prisma.minigameMatch.findUnique({ where: { id: matchId }, include: { minigame: true } })
    if (!match || match.minigame.clubId !== clubId) throw new NotFoundException('Trận đấu không tồn tại')

    const winnerId = scoreA > scoreB ? match.teamAId : scoreB > scoreA ? match.teamBId : null

    await this.prisma.minigameMatch.update({
      where: { id: matchId },
      data: { scoreA, scoreB, winnerId, status: 'COMPLETED', playedAt: new Date() },
    })

    // Update team stats
    if (match.teamAId) {
      await this.prisma.minigameTeam.update({
        where: { id: match.teamAId },
        data: {
          wins: { increment: scoreA > scoreB ? 1 : 0 },
          losses: { increment: scoreA < scoreB ? 1 : 0 },
          points: { increment: scoreA > scoreB ? 3 : scoreA === scoreB ? 1 : 0 },
        },
      })
    }
    if (match.teamBId) {
      await this.prisma.minigameTeam.update({
        where: { id: match.teamBId },
        data: {
          wins: { increment: scoreB > scoreA ? 1 : 0 },
          losses: { increment: scoreB < scoreA ? 1 : 0 },
          points: { increment: scoreB > scoreA ? 3 : scoreA === scoreB ? 1 : 0 },
        },
      })
    }

    return this.prisma.minigameMatch.findUnique({ where: { id: matchId } })
  }

  async endMinigame(id: string, clubId: string) {
    await this.assertOwnership(id, clubId)
    return this.prisma.minigame.update({
      where: { id },
      data: { status: 'COMPLETED', endedAt: new Date() },
    })
  }

  async cancel(id: string, clubId: string) {
    await this.assertOwnership(id, clubId)
    return this.prisma.minigame.update({ where: { id }, data: { status: 'CANCELLED' } })
  }
}
