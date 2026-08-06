-- FundPeriod.dueDate: hạn đóng quỹ (additive, nullable) — dùng tính công nợ quá hạn / thu đúng hạn
ALTER TABLE "fund_periods" ADD COLUMN "due_date" DATE;
