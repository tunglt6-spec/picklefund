import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    clubId?: string;
    action?: string;
    search?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const { clubId, action, search, from, to, limit = 100 } = filters;
    // Lọc theo khoảng ngày (createdAt). `to` mở rộng tới cuối ngày để bao trọn ngày đó.
    let createdAt: { gte?: Date; lte?: Date } | undefined;
    if (from || to) {
      createdAt = {};
      if (from) createdAt.gte = new Date(from);
      if (to) {
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        createdAt.lte = toEnd;
      }
    }
    return this.prisma.auditLog.findMany({
      where: {
        ...(clubId ? { clubId } : {}),
        ...(action ? { action } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(search
          ? {
              OR: [
                { detail: { contains: search, mode: 'insensitive' } },
                { resource: { contains: search, mode: 'insensitive' } },
                {
                  user: { username: { contains: search, mode: 'insensitive' } },
                },
              ],
            }
          : {}),
      },
      include: {
        user: { select: { username: true } },
        club: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Ghi audit — KHÔNG BAO GIỜ ném/reject (callers thường gọi floating: `this.audit.log(...)`).
   * Trước đây userId=undefined (caller truyền nhầm user.id) → Prisma ném "Argument user is
   * missing" → unhandledRejection → SẬP backend (502). Nay: thiếu userId → bỏ qua; lỗi khác
   * → nuốt + log. Audit là phụ trợ, không được ảnh hưởng nghiệp vụ.
   */
  async log(data: {
    userId: string;
    clubId?: string | null;
    action: string;
    resource: string;
    resourceId?: string;
    detail?: string;
    ipAddress?: string;
  }) {
    if (!data.userId) {
      this.logger.warn(
        `Bỏ qua audit thiếu userId: ${data.action} ${data.resource}`,
      );
      return null;
    }
    try {
      return await this.prisma.auditLog.create({ data });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(
        `Ghi audit thất bại (không ảnh hưởng nghiệp vụ): ${msg}`,
      );
      return null;
    }
  }
}
