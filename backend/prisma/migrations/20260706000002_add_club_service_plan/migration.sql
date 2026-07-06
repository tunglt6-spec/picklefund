-- V2.2 Phase 6: gói dịch vụ SaaS. Additive, non-destructive (CLB hiện có mặc định STARTER).
CREATE TYPE "ServicePlan" AS ENUM ('STARTER', 'PRO', 'CLUB_PLUS');

ALTER TABLE "clubs" ADD COLUMN "plan" "ServicePlan" NOT NULL DEFAULT 'STARTER';
ALTER TABLE "clubs" ADD COLUMN "plan_expires_at" TIMESTAMP(3);
