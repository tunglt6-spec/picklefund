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
  /** Đang trong thời gian ÂN HẠN (đã quá hạn nhưng chưa hạ gói). */
  inGrace: boolean;
  /** Hết ân hạn lúc nào (expiresAt + GRACE_DAYS). null nếu không áp dụng. */
  graceUntil: string | null;
  /** Đã yêu cầu hủy (không tự gia hạn) — vẫn dùng đến hết hạn. */
  cancelled: boolean;
  usage: {
    members: number;
    clubs: number;
  };
}

/** Số ngày ÂN HẠN sau khi hết hạn: giữ dữ liệu + cho xem/xuất, hạ gói sau khoảng này. */
export const GRACE_DAYS = 5;

export interface PromoConfig {
  code: string;
  label: string;
  percentOff?: number; // giảm theo %
  amountOff?: number; // giảm số tiền (VND)
  active: boolean;
}

/** Mã ưu đãi (config, không lưu DB ở nền Phase 2). Backend TỰ tính giảm — không tin client. */
export const PROMO_CODES: Record<string, PromoConfig> = {
  WELCOME10: { code: 'WELCOME10', label: 'Giảm 10%', percentOff: 10, active: true },
  PICKLE50K: { code: 'PICKLE50K', label: 'Giảm 50.000đ', amountOff: 50000, active: true },
};

/** Tính giảm giá hợp lệ cho 1 mã trên `amount`. Trả 0 nếu mã sai/không active. */
export function computeDiscount(code: string | undefined | null, amount: number): { discount: number; promo: PromoConfig | null } {
  if (!code) return { discount: 0, promo: null };
  const promo = PROMO_CODES[code.trim().toUpperCase()];
  if (!promo || !promo.active) return { discount: 0, promo: null };
  let d = 0;
  if (promo.percentOff) d = Math.round((amount * promo.percentOff) / 100);
  if (promo.amountOff) d = Math.max(d, promo.amountOff);
  d = Math.min(d, amount); // không vượt quá số tiền
  return { discount: d, promo };
}
