-- AlterTable: add type column to fund_periods with default 'chung'
ALTER TABLE "fund_periods" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'chung';

-- Backfill: periods with 'bonus' or 'mini' or 'game' in name → type='game'
UPDATE "fund_periods"
SET "type" = 'game'
WHERE lower("name") LIKE '%bonus%'
   OR lower("name") LIKE '%mini%'
   OR lower("name") LIKE '%game%'
   OR lower("name") LIKE '%cá cược%'
   OR lower("name") LIKE '%ca cuoc%';
