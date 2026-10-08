-- Super Admin ghi nhận thanh toán/gia hạn gói thủ công (additive, không đụng dữ liệu cũ)
ALTER TYPE "PaymentGateway" ADD VALUE IF NOT EXISTS 'MANUAL';
ALTER TABLE "payment_orders" ADD COLUMN IF NOT EXISTS "method" VARCHAR(30);
ALTER TABLE "payment_orders" ADD COLUMN IF NOT EXISTS "months" INTEGER;
ALTER TABLE "payment_orders" ADD COLUMN IF NOT EXISTS "reference" VARCHAR(120);
ALTER TABLE "payment_orders" ADD COLUMN IF NOT EXISTS "note" TEXT;
