import type { ServicePlan } from '@prisma/client';
import { PLAN_MEMBER_LIMIT } from '../clubs/clubs.service';

export interface PlanConfig {
  tier: ServicePlan;
  name: string;
  /** null = "Liên hệ" (không có giá cố định, khớp Pricing.tsx công khai). */
  priceMonthly: number | null;
  /** Giá theo NĂM (thường rẻ hơn ~2 tháng). null = không bán theo năm / "Liên hệ". */
  priceYearly: number | null;
  /** 9999 = không giới hạn — quy ước hiển thị đã dùng sẵn ở frontend. */
  maxMembers: number;
  maxClubs: number;
  aiFeatures: boolean;
  telegramBot: boolean;
}

const memberLimit = (plan: ServicePlan) => PLAN_MEMBER_LIMIT[plan] ?? 9999;

/** Nguồn cấu hình gói dịch vụ DUY NHẤT — khớp `Club.plan` (ServicePlan, PLAN_MEMBER_LIMIT
 * ở clubs.service.ts) và bảng giá công khai `frontend/src/pages/public/Pricing.tsx`.
 * Trước đây có 1 hệ song song (PlanTier: FREE/STARTER/PRO/ENTERPRISE, lưu SystemSetting)
 * không liên quan gì tới `Club.plan` thật — đã gộp về đây. */
export const PLAN_CONFIGS: Record<ServicePlan, PlanConfig> = {
  STARTER: {
    tier: 'STARTER',
    name: 'Starter',
    priceMonthly: 0,
    priceYearly: 0,
    maxMembers: memberLimit('STARTER'),
    maxClubs: 1,
    aiFeatures: false,
    telegramBot: false,
  },
  PRO: {
    tier: 'PRO',
    name: 'Pro',
    priceMonthly: 199000,
    priceYearly: 1990000, // ~2 tháng miễn phí khi trả năm
    maxMembers: memberLimit('PRO'),
    maxClubs: 1,
    aiFeatures: true,
    telegramBot: true,
  },
  CLUB_PLUS: {
    tier: 'CLUB_PLUS',
    name: 'Club+',
    priceMonthly: null,
    priceYearly: null,
    maxMembers: memberLimit('CLUB_PLUS'),
    maxClubs: 9999,
    aiFeatures: true,
    telegramBot: true,
  },
};

export interface SubscriptionStatus {
  clubId: string;
  tier: ServicePlan;
  plan: PlanConfig;
  expiresAt: string | null;
  isActive: boolean;
  daysRemaining: number | null;
  usage: {
    members: number;
    clubs: number;
  };
}
