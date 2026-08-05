-- Referral: CLB giới thiệu CLB (additive)
ALTER TABLE "clubs" ADD COLUMN "referral_code" TEXT;
CREATE UNIQUE INDEX "clubs_referral_code_key" ON "clubs"("referral_code");

CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REWARDED');

CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrer_club_id" TEXT NOT NULL,
    "referred_club_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "reward_months" INTEGER NOT NULL DEFAULT 1,
    "rewarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "referrals_referred_club_id_key" ON "referrals"("referred_club_id");
CREATE INDEX "referrals_referrer_club_id_idx" ON "referrals"("referrer_club_id");
