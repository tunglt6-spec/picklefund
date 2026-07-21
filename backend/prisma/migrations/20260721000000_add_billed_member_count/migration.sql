-- Sĩ số tính phí đã chốt theo từng kỳ quỹ (freeze basis).
ALTER TABLE "fund_periods" ADD COLUMN "billed_member_count" INTEGER;

-- Backfill: chốt cứng MỌI kỳ 'chung' TRỪ kỳ active mới nhất mỗi CLB = số thành viên
-- hiện tại (is_deleted=false). Kỳ active mới nhất để NULL (dùng số live → theo danh sách).
WITH counts AS (
  SELECT club_id, COUNT(*)::int AS c
  FROM members
  WHERE is_deleted = false
  GROUP BY club_id
),
latest_active AS (
  SELECT DISTINCT ON (club_id) id
  FROM fund_periods
  WHERE type = 'chung' AND status = 'active'
  ORDER BY club_id, start_date DESC, created_at DESC
)
UPDATE fund_periods fp
SET billed_member_count = counts.c
FROM counts
WHERE fp.type = 'chung'
  AND fp.club_id = counts.club_id
  AND fp.billed_member_count IS NULL
  AND fp.id NOT IN (SELECT id FROM latest_active);
