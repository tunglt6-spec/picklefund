-- Idempotency (backing DB): tối đa 1 báo nộp PENDING của member cho cùng kỳ (reference_id).
-- Chống race double-submit mà app-level check-then-act không bắt được. Partial index để
-- vẫn cho phép nhiều dòng CONFIRMED/CANCELLED lịch sử. (reference_id NULL/MANUAL không bị ràng
-- buộc bởi unique — chấp nhận: nhánh không-kỳ hiếm, vẫn có check tầng app.)
CREATE UNIQUE INDEX IF NOT EXISTS "payments_one_pending_report_per_ref"
ON "payments" ("club_id", "member_id", "reference_id")
WHERE "reported_by_member" = true AND "status" = 'PENDING';
