/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  systemSetting: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  member: { count: jest.fn() },
};

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<BillingService>(BillingService);
  });

  /* ── getSubscription ── */
  describe('getSubscription', () => {
    it('returns FREE tier when no subscription setting exists', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
      mockPrisma.member.count.mockResolvedValue(5);
      const result = await service.getSubscription('club-1');
      expect(result.tier).toBe('FREE');
      expect(result.isActive).toBe(true); // FREE is always active
    });

    it('returns tier from system settings', async () => {
      mockPrisma.systemSetting.findUnique
        .mockResolvedValueOnce({ value: 'PRO' })   // tier setting
        .mockResolvedValueOnce({ value: new Date(Date.now() + 86400000 * 30).toISOString() }); // expiry 30d
      mockPrisma.member.count.mockResolvedValue(10);
      const result = await service.getSubscription('club-1');
      expect(result.tier).toBe('PRO');
      expect(result.isActive).toBe(true);
    });

    it('sets isActive=false when subscription is expired', async () => {
      mockPrisma.systemSetting.findUnique
        .mockResolvedValueOnce({ value: 'STARTER' })
        .mockResolvedValueOnce({ value: new Date('2020-01-01').toISOString() }); // past
      mockPrisma.member.count.mockResolvedValue(5);
      const result = await service.getSubscription('club-1');
      expect(result.isActive).toBe(false);
      expect(result.daysRemaining).toBeLessThan(0);
    });

    it('includes member count in usage', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
      mockPrisma.member.count.mockResolvedValue(42);
      const result = await service.getSubscription('club-1');
      expect(result.usage.members).toBe(42);
    });
  });

  /* ── assertFeature ── */
  describe('assertFeature', () => {
    it('throws ForbiddenException when AI features not included in plan', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null); // FREE tier
      mockPrisma.member.count.mockResolvedValue(0);
      await expect(service.assertFeature('club-1', 'aiFeatures')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  /* ── assertMemberLimit ── */
  describe('assertMemberLimit', () => {
    it('throws ForbiddenException when member count at limit', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null); // FREE: maxMembers = 20
      mockPrisma.member.count.mockResolvedValue(20);
      await expect(service.assertMemberLimit('club-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('does not throw when under member limit', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null); // FREE: maxMembers = 20
      mockPrisma.member.count.mockResolvedValue(19);
      await expect(service.assertMemberLimit('club-1')).resolves.not.toThrow();
    });
  });

  /* ── upgradePlan ── */
  describe('upgradePlan', () => {
    it('upserts tier and expiry settings', async () => {
      mockPrisma.systemSetting.upsert.mockResolvedValue({});
      const result = await service.upgradePlan('club-1', 'STARTER', 3);
      expect(result.tier).toBe('STARTER');
      expect(result.months).toBe(3);
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledTimes(2);
    });

    it('sets correct expiry date (+N months from now)', async () => {
      mockPrisma.systemSetting.upsert.mockResolvedValue({});
      const before = new Date();
      const result = await service.upgradePlan('club-1', 'PRO', 6);
      const expiry = new Date(result.expiresAt);
      const sixMonthsLater = new Date(before);
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      // Allow 5s clock drift
      expect(Math.abs(expiry.getTime() - sixMonthsLater.getTime())).toBeLessThan(5000);
    });
  });

  /* ── getPlans ── */
  describe('getPlans', () => {
    it('returns all plan configs', () => {
      const plans = service.getPlans();
      expect(plans.length).toBeGreaterThanOrEqual(4); // FREE, STARTER, PRO, ENTERPRISE
      const tiers = plans.map(p => p.tier);
      expect(tiers).toContain('FREE');
      expect(tiers).toContain('PRO');
    });
  });

  /* ── AI usage tracking ── */
  describe('trackAiCall / getAiUsage', () => {
    it('upserts monthly token counter', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({ value: '1000' });
      mockPrisma.systemSetting.upsert.mockResolvedValue({});
      await service.trackAiCall('club-1', 500);
      const call = mockPrisma.systemSetting.upsert.mock.calls[0][0];
      expect(call.update.value).toBe('1500');
    });

    it('starts from 0 when no previous token count', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
      mockPrisma.systemSetting.upsert.mockResolvedValue({});
      await service.trackAiCall('club-1', 200);
      const call = mockPrisma.systemSetting.upsert.mock.calls[0][0];
      expect(call.update.value).toBe('200');
    });

    it('returns usage history with cost estimate', async () => {
      const month = new Date().toISOString().slice(0, 7);
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { key: `ai_tokens_club-1_${month}`, value: '1000000' },
      ]);
      const result = await service.getAiUsage('club-1');
      expect(result).toHaveLength(1);
      expect(result[0].tokens).toBe(1000000);
      expect(result[0].estimatedCostVnd).toBeGreaterThan(0);
    });
  });
});
