-- Chặn ghi trùng mã tham chiếu thanh toán thủ công (chỉ tạo nếu dữ liệu hiện có KHÔNG trùng — không làm hỏng migrate deploy).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "payment_orders"
    WHERE "gateway" = 'MANUAL' AND "status" IN ('PAID', 'PENDING') AND "reference" IS NOT NULL
    GROUP BY "reference" HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "payment_orders_manual_reference_uq"
      ON "payment_orders" ("reference")
      WHERE "gateway" = 'MANUAL' AND "status" IN ('PAID', 'PENDING') AND "reference" IS NOT NULL;
  END IF;
END $$;
