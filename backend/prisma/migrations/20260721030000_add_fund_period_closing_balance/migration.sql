-- Cache số dư cuối kỳ (persist khi finalize) → bỏ đệ quy carryForward trong summary().
ALTER TABLE "fund_periods" ADD COLUMN "closing_balance" DECIMAL(15,2);
