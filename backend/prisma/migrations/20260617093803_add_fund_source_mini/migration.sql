-- CreateEnum
CREATE TYPE "FundSource" AS ENUM ('COMMON', 'MINI');

-- CreateEnum
CREATE TYPE "MiniIncomeType" AS ENUM ('BETTING', 'SPONSORSHIP', 'PENALTY', 'DONATION', 'OTHER');

-- CreateEnum
CREATE TYPE "MiniExpenseType" AS ENUM ('GAME_REWARD', 'TOURNAMENT_PRIZE', 'PARTY', 'BALL_PURCHASE', 'OTHER');

-- DropForeignKey
ALTER TABLE "fund_contributions" DROP CONSTRAINT "fund_contributions_fund_period_id_fkey";

-- DropForeignKey
ALTER TABLE "fund_contributions" DROP CONSTRAINT "fund_contributions_member_id_fkey";

-- DropForeignKey
ALTER TABLE "living_expenses" DROP CONSTRAINT "living_expenses_fund_period_id_fkey";

-- AlterTable
ALTER TABLE "fund_contributions" ADD COLUMN     "fund_source" "FundSource" NOT NULL DEFAULT 'COMMON',
ADD COLUMN     "mini_income_type" "MiniIncomeType",
ADD COLUMN     "payer_name" VARCHAR(200),
ADD COLUMN     "related_minigame_id" TEXT,
ALTER COLUMN "fund_period_id" DROP NOT NULL,
ALTER COLUMN "member_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "living_expenses" ADD COLUMN     "allocation_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "fund_source" "FundSource" NOT NULL DEFAULT 'COMMON',
ADD COLUMN     "mini_expense_type" "MiniExpenseType",
ADD COLUMN     "receiver_name" VARCHAR(200),
ADD COLUMN     "related_minigame_id" TEXT,
ALTER COLUMN "fund_period_id" DROP NOT NULL,
ALTER COLUMN "allocation_rule" SET DEFAULT 'FUND_ONLY';

-- AddForeignKey
ALTER TABLE "fund_contributions" ADD CONSTRAINT "fund_contributions_fund_period_id_fkey" FOREIGN KEY ("fund_period_id") REFERENCES "fund_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_contributions" ADD CONSTRAINT "fund_contributions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_contributions" ADD CONSTRAINT "fund_contributions_related_minigame_id_fkey" FOREIGN KEY ("related_minigame_id") REFERENCES "minigames"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "living_expenses" ADD CONSTRAINT "living_expenses_fund_period_id_fkey" FOREIGN KEY ("fund_period_id") REFERENCES "fund_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "living_expenses" ADD CONSTRAINT "living_expenses_related_minigame_id_fkey" FOREIGN KEY ("related_minigame_id") REFERENCES "minigames"("id") ON DELETE SET NULL ON UPDATE CASCADE;
