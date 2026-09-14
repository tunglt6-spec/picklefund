-- Thêm cột ghi chú cho khoản chi (Chi). FE đã có ô "Ghi chú (nếu có)" nhưng trước đây
-- không lưu (không có cột) → mất dữ liệu âm thầm khi sửa. Thêm cột nullable, idempotent.
ALTER TABLE "living_expenses" ADD COLUMN IF NOT EXISTS "notes" TEXT;
