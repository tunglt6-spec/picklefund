import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcryptjs'
import type { Role } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(clubId?: string) {
    return this.prisma.user.findMany({
      where: { ...(clubId ? { clubId } : {}) },
      select: { id: true, username: true, email: true, role: true, clubId: true, isActive: true, createdAt: true, club: { select: { name: true } }, member: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, role: true, clubId: true, isActive: true },
    })
    if (!u) throw new NotFoundException('Người dùng không tồn tại')
    return u
  }

  async create(dto: { username: string; password: string; email: string; role: Role; clubId?: string }) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } })
    if (exists) throw new ConflictException('Tên đăng nhập đã tồn tại')
    const hash = await bcrypt.hash(dto.password, 10)
    return this.prisma.user.create({
      data: { username: dto.username, email: dto.email, role: dto.role, clubId: dto.clubId, passwordHash: hash },
      select: { id: true, username: true, email: true, role: true, clubId: true },
    })
  }

  async update(id: string, dto: { email?: string; role?: Role; isActive?: boolean }) {
    await this.findOne(id)
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, username: true, email: true, role: true, isActive: true },
    })
  }
}
