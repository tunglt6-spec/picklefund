import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { HermesService } from '../hermes/hermes.service';

/**
 * Referral: CLB giới thiệu CLB. Mỗi CLB có 1 mã (referralCode). CLB mới áp mã của CLB khác →
 * tạo Referral(PENDING). Khi CLB được-giới-thiệu KÍCH HOẠT Pro (thanh toán thật) → cả hai được
 * +1 tháng Pro (rewardForReferredClub, gọi từ billing.activate). Vô hạn (planExpiresAt=null) → bỏ qua.
 */
@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);
  private readonly appUrl =
    process.env.APP_PUBLIC_URL || process.env.APP_URL || 'https://app.picklefund.uk';

  constructor(
    private prisma: PrismaService,
    private audit: AuditLogsService,
    private hermes: HermesService,
  ) {}

  private genCode(): string {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ ký tự dễ nhầm
    let c = '';
    for (let i = 0; i < 6; i++) c += abc[Math.floor(Math.random() * abc.length)];
    return 'PF' + c;
  }

  async getOrCreateCode(clubId: string): Promise<string> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { referralCode: true },
    });
    if (club?.referralCode) return club.referralCode;
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = this.genCode();
      try {
        await this.prisma.club.update({ where: { id: clubId }, data: { referralCode: code } });
        return code;
      } catch {
        /* trùng unique → thử mã khác */
      }
    }
    throw new BadRequestException('Không tạo được mã giới thiệu, thử lại sau.');
  }

  async getMy(clubId: string) {
    const code = await this.getOrCreateCode(clubId);
    const [referred, incoming] = await Promise.all([
      this.prisma.referral.findMany({ where: { referrerClubId: clubId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.referral.findUnique({ where: { referredClubId: clubId } }),
    ]);
    return {
      code,
      shareUrl: `${this.appUrl}/login?ref=${code}`,
      referredCount: referred.length,
      rewardedCount: referred.filter((r) => r.status === 'REWARDED').length,
      pendingCount: referred.filter((r) => r.status === 'PENDING').length,
      referredBy: incoming ? { code: incoming.code, status: incoming.status } : null,
    };
  }

  async applyCode(clubId: string, rawCode: string, userId?: string) {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) throw new BadRequestException('Thiếu mã giới thiệu.');
    const owner = await this.prisma.club.findUnique({
      where: { referralCode: code },
      select: { id: true, name: true },
    });
    if (!owner) throw new BadRequestException('Mã giới thiệu không tồn tại.');
    if (owner.id === clubId) throw new BadRequestException('Không thể tự giới thiệu chính CLB của mình.');
    const existing = await this.prisma.referral.findUnique({ where: { referredClubId: clubId } });
    if (existing) throw new BadRequestException('CLB của bạn đã dùng mã giới thiệu rồi.');
    await this.prisma.referral.create({
      data: { referrerClubId: owner.id, referredClubId: clubId, code },
    });
    if (userId) {
      void this.audit.log({
        userId,
        clubId,
        action: 'CREATE',
        resource: 'Referral',
        resourceId: code,
        detail: `Áp mã giới thiệu ${code} (từ CLB ${owner.name})`,
      });
    }
    return { ok: true, referrerName: owner.name };
  }

  /** Thưởng sau khi CLB được-giới-thiệu kích hoạt Pro. Idempotent (chỉ khi PENDING). */
  async rewardForReferredClub(referredClubId: string): Promise<void> {
    const ref = await this.prisma.referral.findUnique({ where: { referredClubId } });
    if (!ref || ref.status !== 'PENDING') return;
    const months = ref.rewardMonths;
    await this.grantProMonths(ref.referredClubId, months);
    await this.grantProMonths(ref.referrerClubId, months);
    await this.prisma.referral.update({
      where: { id: ref.id },
      data: { status: 'REWARDED', rewardedAt: new Date() },
    });
    void this.hermes.dispatch({
      eventType: 'referral_reward',
      clubId: ref.referrerClubId,
      title: `Bạn được +${months} tháng Pro (giới thiệu)`,
      body: `CLB bạn giới thiệu đã lên Pro — hệ thống cộng ${months} tháng Pro cho CLB của bạn.`,
      metadata: { referredClubId, months },
    });
    void this.hermes.dispatch({
      eventType: 'referral_reward',
      clubId: ref.referredClubId,
      title: `Bạn được +${months} tháng Pro (được giới thiệu)`,
      body: `Cảm ơn đã dùng mã giới thiệu — cộng ${months} tháng Pro cho CLB của bạn.`,
      metadata: { months },
    });
    this.logger.log(`Referral rewarded: ${ref.referrerClubId} + ${ref.referredClubId} (+${months}mo)`);
  }

  /** Cộng N tháng Pro cho 1 CLB. Vô hạn (null) → bỏ qua; còn hạn → cộng tiếp; hết/khác → từ now. */
  private async grantProMonths(clubId: string, months: number): Promise<void> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { plan: true, planExpiresAt: true },
    });
    if (!club) return;
    if (club.plan === 'PRO' && club.planExpiresAt == null) return; // vô hạn Admin cấp → không cap
    const now = new Date();
    const base =
      club.plan === 'PRO' && club.planExpiresAt && club.planExpiresAt > now ? club.planExpiresAt : now;
    const exp = new Date(base);
    exp.setMonth(exp.getMonth() + months);
    await this.prisma.club.update({ where: { id: clubId }, data: { plan: 'PRO', planExpiresAt: exp } });
    await this.prisma.subscription.upsert({
      where: { clubId },
      create: {
        clubId,
        planTier: 'PRO',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        startedAt: now,
        expiresAt: exp,
      },
      update: { planTier: 'PRO', status: 'ACTIVE', expiresAt: exp },
    });
  }
}
