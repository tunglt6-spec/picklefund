import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import type { ClubStatus, Prisma, ServicePlan } from '@prisma/client';
import { ClubMemoryService } from '../ai/club-memory/club-memory.service';
import { ScoringService } from '../scoring/scoring.service';

/** Giới hạn số thành viên theo gói dịch vụ (null = không giới hạn). Nguồn duy nhất. */
export const PLAN_MEMBER_LIMIT: Record<ServicePlan, number | null> = {
  STARTER: 15,
  PRO: null,
  CLUB_PLUS: null,
};

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
  private readonly logger = new Logger(ClubsService.name);

  constructor(
    private prisma: PrismaService,
    private clubMemory: ClubMemoryService,
    private scoring: ScoringService,
  ) {}

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
        include: { _count: { select: { members: { where: { isDeleted: false } }, fundPeriods: true } } },
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
      include: { _count: { select: { members: { where: { isDeleted: false } }, fundPeriods: true } } },
    });
    if (!club) throw new NotFoundException('CLB không tồn tại');
    return club;
  }

  /**
   * Tạo CLB kèm tài khoản admin ban đầu (bắt buộc) trong 1 transaction.
   * Admin = người tạo CLB, có email cá nhân thật → dùng làm email gửi thông báo về sau.
   * Mật khẩu do SUPER_ADMIN đặt + buộc đổi lần đầu (mustChangePassword). Argon2 hash.
   */
  async create(
    dto: {
      name: string;
      code: string;
      address?: string;
      contactEmail?: string;
      contactPhone?: string;
      adminUsername: string;
      adminEmail: string;
      adminPassword: string;
    },
    actorUserId: string,
  ) {
    // Chặn trùng email/username trước khi tạo (thông báo rõ thay vì lỗi Prisma thô).
    const [emailConflict, usernameConflict] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.adminEmail } }),
      this.prisma.user.findFirst({ where: { username: dto.adminUsername } }),
    ]);
    if (emailConflict)
      throw new BadRequestException('Email admin đã được sử dụng');
    if (usernameConflict)
      throw new BadRequestException('Username admin đã tồn tại');

    const passwordHash = await argon2.hash(dto.adminPassword);
    const club = await this.prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          name: dto.name,
          code: dto.code,
          address: dto.address,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
        },
      });
      await tx.user.create({
        data: {
          clubId: club.id,
          username: dto.adminUsername,
          email: dto.adminEmail,
          passwordHash,
          role: Role.CLUB_ADMIN,
          mustChangePassword: true,
        },
      });
      return club;
    });

    // Seed template Club Memory mặc định (toàn nền tảng) SAU khi transaction commit
    // (PrismaClubMemoryRepository dùng connection riêng — gọi trong tx sẽ vi phạm
    // khóa ngoại vì club.id chưa commit). Không chặn tạo CLB nếu seed lỗi.
    this.clubMemory
      .seedDefaultTemplate(club.id, actorUserId)
      .catch((err: unknown) =>
        this.logger.warn(
          `Seed Club Memory mặc định thất bại cho club ${club.id}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    // Seed quy tắc chấm điểm mặc định (fire-and-forget, không chặn tạo CLB).
    this.scoring
      .seedDefaultRules(club.id)
      .catch((err: unknown) =>
        this.logger.warn(
          `Seed quy tắc điểm mặc định thất bại cho club ${club.id}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return club;
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

  /** SUPER_ADMIN đổi gói dịch vụ + hạn sử dụng (V2.2). */
  async setPlan(id: string, plan: ServicePlan, planExpiresAt?: string | null) {
    await this.findOne(id);
    return this.prisma.club.update({
      where: { id },
      data: {
        plan,
        planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.club.update({
      where: { id },
      data: { status: 'deleted' },
    });
  }

  /** Danh sách memberId được ủy quyền quản lý minigame (lưu trong Club.settings JSON — additive, không migration). */
  async getMinigameDelegates(clubId: string): Promise<string[]> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { settings: true },
    });
    if (!club) throw new NotFoundException('CLB không tồn tại');
    const settings = club.settings as Record<string, unknown> | null;
    return (settings?.minigameDelegateMemberIds as string[]) ?? [];
  }

  /** CLUB_ADMIN cập nhật danh sách ủy quyền minigame (validate member thuộc CLB). */
  async setMinigameDelegates(
    clubId: string,
    memberIds: string[],
  ): Promise<string[]> {
    const unique = [...new Set(memberIds)];
    if (unique.length > 0) {
      const found = await this.prisma.member.findMany({
        where: { id: { in: unique }, clubId, isDeleted: false },
        select: { id: true },
      });
      if (found.length !== unique.length)
        throw new BadRequestException('Một số thành viên không thuộc CLB này');
    }
    const current = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { settings: true },
    });
    if (!current) throw new NotFoundException('CLB không tồn tại');
    const existing = (current.settings as Record<string, unknown> | null) ?? {};
    await this.prisma.club.update({
      where: { id: clubId },
      data: {
        settings: {
          ...existing,
          minigameDelegateMemberIds: unique,
        } as Prisma.InputJsonValue,
      },
    });
    return unique;
  }

  async stats() {
    const since24h = new Date(Date.now() - 24 * 3_600_000);
    const [total, active, suspended, totalMembers, totalPeriods, logins24h] =
      await Promise.all([
        this.prisma.club.count({ where: { status: { not: 'deleted' } } }),
        this.prisma.club.count({ where: { status: 'active' } }),
        this.prisma.club.count({ where: { status: 'suspended' } }),
        this.prisma.member.count({ where: { isDeleted: false } }),
        this.prisma.fundPeriod.count(),
        // Đăng nhập 24h THẬT: User.lastLoginAt cập nhật mỗi lần đăng nhập (auth.service).
        this.prisma.user.count({ where: { lastLoginAt: { gte: since24h } } }),
      ]);
    return {
      totalClubs: total,
      activeClubs: active,
      suspendedClubs: suspended,
      totalMembers,
      totalFundPeriods: totalPeriods,
      loginsLast24h: logins24h,
    };
  }
}
