import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import type { Prisma, Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(clubId?: string) {
    return this.prisma.user.findMany({
      where: { ...(clubId ? { clubId } : {}) },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        clubId: true,
        isActive: true,
        createdAt: true,
        club: { select: { name: true } },
        member: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        clubId: true,
        isActive: true,
      },
    });
    if (!u) throw new NotFoundException('Người dùng không tồn tại');
    return u;
  }

  async create(dto: {
    username: string;
    password: string;
    email: string;
    role: Role;
    clubId?: string;
  }) {
    const exists = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (exists) throw new ConflictException('Tên đăng nhập đã tồn tại');
    // FIX-USER-AUTH-HASH: dùng argon2 (đồng bộ auth.service.login + seed);
    // trước đây dùng bcrypt → login (argon2.verify) luôn thất bại.
    const hash = await argon2.hash(dto.password);
    return this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        role: dto.role,
        clubId: dto.clubId,
        passwordHash: hash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        clubId: true,
      },
    });
  }

  async update(
    id: string,
    dto: {
      username?: string;
      email?: string;
      password?: string;
      role?: Role;
      isActive?: boolean;
    },
  ) {
    await this.findOne(id);
    // FIX-USER-AUTH-HASH: KHÔNG đẩy raw `password` vào Prisma (field không tồn
    // tại → 500). Nếu có password → hash argon2 → map vào passwordHash.
    const { password, ...rest } = dto;
    const data: Prisma.UserUpdateInput = { ...rest };
    if (password !== undefined) {
      data.passwordHash = await argon2.hash(password);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        clubId: true,
      },
    });
  }
}
