import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import type { Prisma, Role } from '@prisma/client';
import { AccountNotifyService } from '../account-notify/account-notify.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private accountNotify: AccountNotifyService,
  ) {}

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

  /** Danh sách PHÂN TRANG + tìm kiếm + lọc vai trò (Super Admin, toàn hệ thống). */
  async findPaged(q: { page?: number; limit?: number; search?: string; role?: string }) {
    const limit = Math.min(100, Math.max(1, Math.floor(Number(q.limit)) || 25));
    const page = Math.max(1, Math.floor(Number(q.page)) || 1);
    const search = q.search?.trim();
    const where: Prisma.UserWhereInput = {
      ...(q.role && ['SUPER_ADMIN', 'CLUB_ADMIN', 'CLUB_TREASURER', 'MEMBER_VIEW'].includes(q.role) ? { role: q.role as Role } : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { member: { fullName: { contains: search, mode: 'insensitive' } } },
              { club: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, username: true, email: true, role: true, clubId: true, isActive: true, createdAt: true,
          club: { select: { name: true } }, member: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  /** Tổng hợp cho thẻ KPI (toàn hệ thống, không phụ thuộc trang/bộ lọc). */
  async summary() {
    const [total, active, byRole, clubs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.findMany({ where: { clubId: { not: null } }, distinct: ['clubId'], select: { clubId: true } }),
    ]);
    const roles: Record<string, number> = { SUPER_ADMIN: 0, CLUB_ADMIN: 0, CLUB_TREASURER: 0, MEMBER_VIEW: 0 };
    for (const r of byRole) roles[r.role] = r._count._all;
    return { total, active, inactive: total - active, byRole: roles, clubs: clubs.length };
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
    const created = await this.prisma.user.create({
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
        club: { select: { name: true } },
      },
    });
    // Tài khoản mới: email chào mừng + báo Super Admin (best-effort, không chặn tạo user).
    void this.accountNotify.onNewAccount({
      email: created.email,
      displayName: created.username,
      username: created.username,
      role: created.role,
      clubName: created.club?.name ?? null,
      clubId: created.clubId ?? null,
      source: 'super-user',
    });
    // Trả về đúng shape cũ (không lộ quan hệ club) để không đổi hợp đồng API.
    return {
      id: created.id,
      username: created.username,
      email: created.email,
      role: created.role,
      clubId: created.clubId,
    };
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
