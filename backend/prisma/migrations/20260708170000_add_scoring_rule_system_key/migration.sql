-- Thêm systemKey BẤT BIẾN cho scoring_rules: auto-scoring khớp rule qua key này thay vì
-- label (CLB có thể sửa label). ADDITIVE, backfill từ rule template đã seed. Không mất dữ liệu.

-- 1. Thêm cột
ALTER TABLE "scoring_rules" ADD COLUMN "system_key" VARCHAR(60);

-- 2. Backfill cho các rule template đã seed (khớp theo label mặc định).
--    Rule CLB tự sửa label → không khớp → giữ NULL (coi như rule tùy chỉnh).
UPDATE "scoring_rules" SET "system_key" = CASE "label"
  WHEN 'Tham gia đúng giờ' THEN 'PARTICIPATION_ON_TIME'
  WHEN 'Đi muộn' THEN 'PARTICIPATION_LATE'
  WHEN 'Vắng không phép' THEN 'PARTICIPATION_ABSENT_UNEXCUSED'
  WHEN 'Vắng ≥3 buổi liên tiếp không phép' THEN 'PARTICIPATION_ABSENT_STREAK'
  WHEN 'Tôn trọng, Fair Play' THEN 'CONDUCT_FAIRPLAY'
  WHEN 'Hỗ trợ đồng đội, thành viên mới' THEN 'CONDUCT_SUPPORT'
  WHEN 'Chửi tục, ứng xử thiếu văn minh' THEN 'CONDUCT_RUDE'
  WHEN 'Cãi vã, xúc phạm người khác' THEN 'CONDUCT_INSULT'
  WHEN 'Gây gổ, đánh nhau' THEN 'CONDUCT_FIGHT'
  WHEN 'Hỗ trợ tổ chức hoạt động' THEN 'CONTRIBUTION_ORGANIZE'
  WHEN 'Giới thiệu thành viên mới' THEN 'CONTRIBUTION_REFER'
  WHEN 'Đề xuất sáng kiến hữu ích' THEN 'CONTRIBUTION_IDEA'
  WHEN 'Chấp hành tốt nội quy' THEN 'DISCIPLINE_COMPLY'
  WHEN 'Gian lận thi đấu' THEN 'DISCIPLINE_CHEAT'
  WHEN 'Làm ảnh hưởng uy tín CLB' THEN 'DISCIPLINE_REPUTATION'
  WHEN 'Phá hoại tài sản CLB' THEN 'DISCIPLINE_VANDALISM'
  WHEN 'Đóng quỹ đúng hạn' THEN 'FINANCE_ON_TIME'
  WHEN 'Đóng quỹ trễ hạn' THEN 'FINANCE_LATE'
  WHEN 'Nợ quỹ quá hạn' THEN 'FINANCE_OVERDUE'
  WHEN 'Thành viên tiêu biểu tháng' THEN 'BONUS_STAR'
  WHEN 'Đóng góp đặc biệt cho CLB' THEN 'BONUS_SPECIAL'
  ELSE NULL END
WHERE "system_key" IS NULL;

-- 3. Unique (club_id, system_key). Postgres cho phép nhiều NULL → rule CLB tự tạo không vướng.
CREATE UNIQUE INDEX "scoring_rules_club_id_system_key_key" ON "scoring_rules"("club_id", "system_key");

-- ============================================================================
-- ROLLBACK (thủ công):
--   DROP INDEX "scoring_rules_club_id_system_key_key";
--   ALTER TABLE "scoring_rules" DROP COLUMN "system_key";
-- ============================================================================
