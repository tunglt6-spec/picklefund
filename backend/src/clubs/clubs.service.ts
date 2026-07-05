import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ClubStatus, Prisma } from '@prisma/client';

/** EPIC10A: branding trắng nhãn — mặc định fallback PickleFund. */
export interface ClubBranding {
  displayName: string | null;
  shortName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  loginBackground: string | null;
  pdfFooter: string;
  faviconUrl: string | null;
}

const BRANDING_DEFAULTS = {
  primaryColor: '#6366F1',
  secondaryColor: '#06B6D4',
  pdfFooter: 'PickleFund',
};

const BRANDING_KEYS = [
  'displayName',
  'shortName',
  'logoUrl',
  'primaryColor',
  'secondaryColor',
  'loginBackground',
  'pdfFooter',
  'faviconUrl',
] as const;

@Injectable()
export class ClubsService {
  constructor(private prisma: PrismaService) {}

  /** Branding hiệu lực = branding đã lưu, fallback về tên/logo CLB rồi tới PickleFund. */
  async getBranding(clubId: string): Promise<ClubBranding> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { name: true, logoUrl: true, settings: true },
    });
    if (!club) throw new NotFoundException('CLB không tồn tại');
    const b = ((club.settings as Record<string, unknown> | null)?.branding ??
      {}) as Record<string, unknown>;
    const str = (v: unknown): string | null =>
      typeof v === 'string' && v.length > 0 ? v : null;
    return {
      displayName: str(b.displayName) ?? club.name,
      shortName: str(b.shortName),
      logoUrl: str(b.logoUrl) ?? club.logoUrl ?? null,
      primaryColor: str(b.primaryColor) ?? BRANDING_DEFAULTS.primaryColor,
      secondaryColor: str(b.secondaryColor) ?? BRANDING_DEFAULTS.secondaryColor,
      loginBackground: str(b.loginBackground),
      pdfFooter: str(b.pdfFooter) ?? BRANDING_DEFAULTS.pdfFooter,
      faviconUrl: str(b.faviconUrl),
    };
  }

  /** Merge branding mới vào settings.branding (chỉ key hợp lệ đã định nghĩa). */
  async updateBranding(
    clubId: string,
    dto: Partial<Record<(typeof BRANDING_KEYS)[number], string>>,
  ): Promise<ClubBranding> {
    const current = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { settings: true },
    });
    if (!current) throw new NotFoundException('CLB không tồn tại');
    const settings = (current.settings as Record<string, unknown> | null) ?? {};
    const prev =
      (settings.branding as Record<string, unknown> | undefined) ?? {};
    const next: Record<string, unknown> = { ...prev };
    for (const k of BRANDING_KEYS) {
      if (dto[k] !== undefined) next[k] = dto[k];
    }
    await this.prisma.club.update({
      where: { id: clubId },
      data: {
        settings: { ...settings, branding: next } as Prisma.InputJsonValue,
      },
    });
    return this.getBranding(clubId);
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [clubs, total] = await Promise.all([
      this.prisma.club.findMany({
        where: { status: { not: 'deleted' } },
        include: { _count: { select: { members: true, fundPeriods: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.club.count({ where: { status: { not: 'deleted' } } }),
    ]);
    return { clubs, total };
  }

  async findOne(id: string) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: { _count: { select: { members: true, fundPeriods: true } } },
    });
    if (!club) throw new NotFoundException('CLB không tồn tại');
    return club;
  }

  async create(dto: {
    name: string;
    code: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
  }) {
    return this.prisma.club.create({ data: dto });
  }

  async update(id: string, dto: Record<string, unknown>) {
    const directKeys = new Set([
      'name',
      'address',
      'contactEmail',
      'contactPhone',
      'logoUrl',
    ]);
    const data: Prisma.ClubUpdateInput = {};
    const extraSettings: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(dto)) {
      if (directKeys.has(k)) (data as Record<string, unknown>)[k] = v;
      else extraSettings[k] = v;
    }

    if (Object.keys(extraSettings).length > 0) {
      const current = await this.prisma.club.findUnique({
        where: { id },
        select: { settings: true },
      });
      data.settings = {
        ...((current?.settings as Record<string, unknown> | null) ?? {}),
        ...extraSettings,
      } as Prisma.InputJsonValue;
    }
    return this.prisma.club.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: ClubStatus) {
    return this.prisma.club.update({ where: { id }, data: { status } });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.club.update({
      where: { id },
      data: { status: 'deleted' },
    });
  }

  async stats() {
    const [total, active, suspended, totalMembers, totalPeriods] =
      await Promise.all([
        this.prisma.club.count({ where: { status: { not: 'deleted' } } }),
        this.prisma.club.count({ where: { status: 'active' } }),
        this.prisma.club.count({ where: { status: 'suspended' } }),
        this.prisma.member.count({ where: { isDeleted: false } }),
        this.prisma.fundPeriod.count(),
      ]);
    return {
      totalClubs: total,
      activeClubs: active,
      suspendedClubs: suspended,
      totalMembers,
      totalFundPeriods: totalPeriods,
      loginsLast24h: 0,
    };
  }
}
