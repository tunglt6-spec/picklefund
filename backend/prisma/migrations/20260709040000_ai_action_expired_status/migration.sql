-- AiAction: thêm trạng thái EXPIRED (đề xuất CHỜ DUYỆT quá hạn TTL tự hết hạn).
-- ADDITIVE + idempotent: chỉ thêm giá trị enum, KHÔNG đổi/bỏ giá trị cũ (PENDING_APPROVAL
-- giữ nguyên → backward-compat). Postgres 12+ cho phép ADD VALUE trong transaction khi
-- giá trị mới không dùng ngay trong cùng transaction (đúng ở đây).
ALTER TYPE "AiActionStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
