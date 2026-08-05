-- Phase 2: mã ưu đãi + thông tin xuất hoá đơn trên đơn thanh toán (additive)
ALTER TABLE "payment_orders" ADD COLUMN "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "payment_orders" ADD COLUMN "promo_code" TEXT;
ALTER TABLE "payment_orders" ADD COLUMN "billing_info" JSONB;
