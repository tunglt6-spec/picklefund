import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, name: string, expiresAt?: Date) {
    const raw = `pf_${randomBytes(32).toString('hex')}`;
    const prefix = raw.substring(0, 10);
    const hash = createHash('sha256').update(raw).digest('hex');

    const key = await this.prisma.apiKey.create({
      data: {
        name,
        keyHash: hash,
        keyPrefix: prefix,
        createdById: userId,
        expiresAt,
      },
    });
    return {
      id: key.id,
      name: key.name,
      key: raw,
      prefix,
      createdAt: key.createdAt,
    };
  }

  async findAll(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { createdById: userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string, userId: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('API key not found');
    if (key.createdById !== userId) throw new ForbiddenException();
    return this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async validateKey(raw: string) {
    const hash = createHash('sha256').update(raw).digest('hex');
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash: hash },
      include: { createdBy: true },
    });
    if (!key || !key.isActive) return null;
    if (key.expiresAt && key.expiresAt < new Date()) return null;

    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });
    return key.createdBy;
  }
}
