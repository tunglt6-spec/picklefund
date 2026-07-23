-- Luật Quỹ: tách LOẠI CHI (sân/sinh hoạt) khỏi CÁCH CHIA (allocationRule).
-- COURT = tiền thuê sân (luôn chia đều); LIVING = sinh hoạt (chia đều HOẶC theo người/buổi).
CREATE TYPE "CostType" AS ENUM ('COURT', 'LIVING');

ALTER TABLE "living_expenses"
  ADD COLUMN "cost_type" "CostType" NOT NULL DEFAULT 'LIVING';

-- Backfill dữ liệu cũ: trước đây "chi phí sân" = khoản EQUAL, nên khoản EQUAL nào có chữ "sân"
-- trong mô tả (thuê sân/tiền sân/thanh toán sân...) nhận là COURT. Khoản còn lại = LIVING.
-- Nhận nhầm/thiếu chỉ ảnh hưởng nhãn cột trên báo cáo (số tiền mỗi người không đổi vì cùng
-- chia đều) — admin sửa lại từng khoản qua form "Loại chi phí" nếu cần.
UPDATE "living_expenses"
SET "cost_type" = 'COURT'
WHERE "fund_source" = 'COMMON'
  AND "allocation_rule" = 'EQUAL'
  AND "description" ILIKE '%sân%';
