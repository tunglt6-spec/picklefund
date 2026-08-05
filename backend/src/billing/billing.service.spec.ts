import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  club: { findUnique: jest.fn() },
  member: { count: jest.fn() },
  subscription: { findUnique: jest.fn() },
  systemSetting: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
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

  /* ── getSubscription — nguồn thật Club.plan/planExpiresAt ── */
  describe('getSubscription', () => {
    it('throws NotFoundException when club does not exist', async () => {
      mockPrisma.club.findUnique.mockResolvedValue(null);
      await expect(service.getSubscription('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns STARTER tier + isActive=true when club has no expiry', async () => {
      mockPrisma.club.findUnique.mockResolvedValue({
        plan: 'STARTER',
        planExpiresAt: null,
      });
      mockPrisma.member.count.mockResolvedValue(5);
      const result = await service.getSubscription('club-1');
      expect(result.tier).toBe('STARTER');
      expect(result.isActive).toBe(true);
      expect(result.daysRemaining).toBeNull();
    });

    it('reads tier directly from Club.plan (PRO)', async () => {
      mockPrisma.club.findUnique.mockResolvedValue({
        plan: 'PRO',
        planExpiresAt: new Date(Date.now() + 86400000 * 30),
      });
      mockPrisma.member.count.mockResolvedValue(10);
      const result = await service.getSubscription('club-1');
      expect(result.tier).toBe('PRO');
      expect(result.isActive).toBe(true);
    });

    it('sets isActive=false when planExpiresAt is in the past', async () => {
      mockPrisma.club.findUnique.mockResolvedValue({
        plan: 'PRO',
        planExpiresAt: new Date('2020-01-01'),
      });
      mockPrisma.member.count.mockResolvedValue(5);
      const result = await service.getSubscription('club-1');
      expect(result.isActive).toBe(false);
      expect(result.daysRemaining).toBeLessThan(0);
    });

    it('includes member count in usage', async () => {
      mockPrisma.club.findUnique.mockResolvedValue({
        plan: 'STARTER',
        planExpiresAt: null,
      });
      mockPrisma.member.count.mockResolvedValue(42);
      const result = await service.getSubscription('club-1');
      expect(result.usage.members).toBe(42);
    });
  });

  /* ── getPlans — khớp ServicePlan (STARTER/PRO/CLUB_PLUS), không còn FREE/ENTERPRISE ── */
  describe('getPlans', () => {
    it('returns exactly the 3 ServicePlan tiers', () => {
      const plans = service.getPlans();
      const tiers = plans.map((p) => p.tier).sort();
      expect(tiers).toEqual(['CLUB_PLUS', 'PRO', 'STARTER']);
    });

    it('STARTER maxMembers matches PLAN_MEMBER_LIMIT (20)', () => {
      const plans = service.getPlans();
      const starter = plans.find((p) => p.tier === 'STARTER');
      expect(starter?.maxMembers).toBe(20);
    });

    it('PRO/CLUB_PLUS are unlimited (sentinel 9999)', () => {
      const plans = service.getPlans();
      const pro = plans.find((p) => p.tier === 'PRO');
      const clubPlus = plans.find((p) => p.tier === 'CLUB_PLUS');
      expect(pro?.maxMembers).toBe(9999);
      expect(clubPlus?.maxMembers).toBe(9999);
    });
  });

  /* ── AI usage tracking — độc lập với gói dịch vụ, giữ nguyên hành vi cũ ── */
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
