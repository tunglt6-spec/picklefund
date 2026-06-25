import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    clubId?: string;
    action?: string;
    search?: string;
    limit?: number;
  }) {
    const { clubId, action, search, limit = 100 } = filters;
    return this.prisma.auditLog.findMany({
      where: {
        ...(clubId ? { clubId } : {}),
        ...(action ? { action } : {}),
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

  async log(data: {
    userId: string;
    clubId?: string | null;
    action: string;
    resource: string;
    resourceId?: string;
    detail?: string;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }
}
