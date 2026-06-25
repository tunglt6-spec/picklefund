export type PlanTier = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  maxMembers: number;
  maxClubs: number;
  aiFeatures: boolean;
  telegramBot: boolean;
  priceMonthly: number;
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  FREE: {
    tier: 'FREE',
    name: 'Miễn phí',
    maxMembers: 20,
    maxClubs: 1,
    aiFeatures: false,
    telegramBot: false,
    priceMonthly: 0,
  },
  STARTER: {
    tier: 'STARTER',
    name: 'Starter',
    maxMembers: 50,
    maxClubs: 1,
    aiFeatures: true,
    telegramBot: false,
    priceMonthly: 99000,
  },
  PRO: {
    tier: 'PRO',
    name: 'Pro',
    maxMembers: 200,
    maxClubs: 3,
    aiFeatures: true,
    telegramBot: true,
    priceMonthly: 299000,
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    name: 'Enterprise',
    maxMembers: 9999,
    maxClubs: 999,
    aiFeatures: true,
    telegramBot: true,
    priceMonthly: 999000,
  },
};

export interface SubscriptionStatus {
  clubId: string;
  tier: PlanTier;
  plan: PlanConfig;
  expiresAt: string | null;
  isActive: boolean;
  daysRemaining: number | null;
  usage: {
    members: number;
    clubs: number;
  };
}
