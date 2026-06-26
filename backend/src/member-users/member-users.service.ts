import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PASSWORD = '123456';

function slugify(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, (d) => (d === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

@Injectable()
export class MemberUsersService {
  private readonly logger = new Logger(MemberUsersService.name);
  constructor(private prisma: PrismaService) {}

  private async generateUsername(fullName: string): Promise<string> {
    const base = slugify(fullName) || 'user';
    const existing = await this.prisma.user.findMany({
      where: { username: { startsWith: base } },
      select: { username: true },
    });
    const usedSet = new Set(existing.map((u) => u.username));
    if (!usedSet.has(base)) return base;
    let n = 2;
    while (usedSet.has(`${base}${n}`)) n++;
    return `${base}${n}`;
  }

  async findAll(clubId: string) {
    const users = await this.prisma.user.findMany({
      where: { clubId, role: 'CLUB_MEMBER' },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        notificationEnabled: true,
        createdAt: true,
        member: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  }

  async create(
    clubId: string,
    adminUserId: string,
    dto: {
      memberId: string;
      username?: string;
      email?: string;
      mustChangePassword?: boolean;
      notificationEnabled?: boolean;
    },
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, clubId, isDeleted: false },
    });
    if (!member) throw new NotFoundException('Thành viên không tồn tại');
    if (member.userId) {
      const existing = await this.prisma.user.findUnique({
        where: { id: member.userId },
      });
      if (existing?.isActive)
        throw new BadRequestException(
          'Thành viên này đã có tài khoản đang hoạt động',
        );
    }

    const username =
      dto.username ?? (await this.generateUsername(member.fullName));
    const emailConflict = dto.email
      ? await this.prisma.user.findUnique({ where: { email: dto.email } })
      : null;
    if (emailConflict) throw new BadRequestException('Email đã được sử dụng');

    const usernameConflict = await this.prisma.user.findFirst({
      where: { username },
    });
    if (usernameConflict) throw new BadRequestException('Username đã tồn tại');

    const hash = await argon2.hash(DEFAULT_PASSWORD);
    const email =
      dto.email ?? `${username}@${clubId.slice(0, 8)}.picklefund.local`;

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          clubId,
          username,
          email,
          passwordHash: hash,
          role: 'CLUB_MEMBER',
          mustChangePassword: dto.mustChangePassword ?? true,
          notificationEnabled: dto.notificationEnabled ?? true,
        },
      });
      await tx.member.update({
        where: { id: member.id },
        data: { userId: u.id },
      });
      await tx.auditLog.create({
        data: {
          clubId,
          userId: adminUserId,
          action: 'CREATE',
          resource: 'member_user',
          resourceId: u.id,
          detail: `Tạo tài khoản ${username} cho thành viên ${member.fullName}`,
        },
      });
      return u;
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      memberId: member.id,
      memberName: member.fullName,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async bulkCreate(
    clubId: string,
    adminUserId: string,
    dto: {
      memberIds: string[];
      mustChangePassword?: boolean;
      notificationEnabled?: boolean;
    },
  ) {
    const results: {
      memberId: string;
      memberName: string;
      username: string;
      success: boolean;
      error?: string;
    }[] = [];

    for (const memberId of dto.memberIds) {
      try {
        const result = await this.create(clubId, adminUserId, {
          memberId,
          mustChangePassword: dto.mustChangePassword ?? true,
          notificationEnabled: dto.notificationEnabled ?? true,
        });
        results.push({
          memberId,
          memberName: result.memberName,
          username: result.username,
          success: true,
        });
      } catch (err: any) {
        this.logger.error(`[bulkCreate] memberId=${memberId}: ${err?.message} (code=${err?.code})`);
        results.push({
          memberId,
          memberName: '',
          username: '',
          success: false,
          error: err.message ?? String(err),
        });
      }
    }

    return results;
  }

  async resetPassword(accountId: string, adminUserId: string, clubId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: accountId, clubId, role: 'CLUB_MEMBER' },
    });
    if (!user) throw new NotFoundException('Tài khoản không tồn tại');

    const hash = await argon2.hash(DEFAULT_PASSWORD);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: accountId },
        data: { passwordHash: hash, mustChangePassword: true },
      }),
      this.prisma.auditLog.create({
        data: {
          clubId,
          userId: adminUserId,
          action: 'RESET_PASSWORD',
          resource: 'member_user',
          resourceId: accountId,
          detail: `Reset mật khẩu tài khoản ${user.username}`,
        },
      }),
    ]);
    return { message: 'Đã reset mật khẩu về 123456' };
  }

  async updateStatus(
    accountId: string,
    isActive: boolean,
    adminUserId: string,
    clubId: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: accountId, clubId, role: 'CLUB_MEMBER' },
    });
    if (!user) throw new NotFoundException('Tài khoản không tồn tại');

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: accountId }, data: { isActive } }),
      this.prisma.auditLog.create({
        data: {
          clubId,
          userId: adminUserId,
          action: isActive ? 'UNLOCK_ACCOUNT' : 'LOCK_ACCOUNT',
          resource: 'member_user',
          resourceId: accountId,
          detail: `${isActive ? 'Mở khóa' : 'Khóa'} tài khoản ${user.username}`,
        },
      }),
    ]);
    return { message: isActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản' };
  }

  async previewBulk(clubId: string, memberIds: string[]) {
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds }, clubId, isDeleted: false },
      select: { id: true, fullName: true, userId: true },
    });
    const result: {
      memberId: string;
      fullName: string;
      username: string;
      hasAccount: boolean;
    }[] = [];
    for (const m of members) {
      const username = await this.generateUsername(m.fullName);
      result.push({
        memberId: m.id,
        fullName: m.fullName,
        username,
        hasAccount: !!m.userId,
      });
    }
    return result;
  }
}
