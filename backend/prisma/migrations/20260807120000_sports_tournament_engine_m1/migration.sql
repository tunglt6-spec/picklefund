-- Sports Tournament Engine — M1 nền tảng (ADDITIVE, non-destructive).
-- Thêm participant_type/partner_mode cho minigames + score_detail cho matches, rồi BACKFILL
-- dữ liệu cũ theo legacy mapping (sport/format) — KHÔNG xoá/không sửa dữ liệu hiện có.

-- 1. Cột mới (nullable → an toàn với mọi dòng cũ)
ALTER TABLE "minigames" ADD COLUMN IF NOT EXISTS "participant_type" VARCHAR(20);
ALTER TABLE "minigames" ADD COLUMN IF NOT EXISTS "partner_mode" VARCHAR(20);
ALTER TABLE "minigame_matches" ADD COLUMN IF NOT EXISTS "score_detail" JSONB;

-- 2. Backfill participant_type/partner_mode cho dòng cũ (ưu tiên theo sport trước, rồi format)
--    Môn đội → TEAM
UPDATE "minigames"
   SET "participant_type" = 'TEAM'
 WHERE "participant_type" IS NULL
   AND "sport" IN ('FOOTBALL', 'BASKETBALL', 'VOLLEYBALL', 'AIR_VOLLEYBALL');

--    Môn cá nhân thuần → INDIVIDUAL
UPDATE "minigames"
   SET "participant_type" = 'INDIVIDUAL'
 WHERE "participant_type" IS NULL
   AND "sport" IN ('GOLF', 'RUNNING');

--    Nhóm vợt & còn lại: suy từ format
UPDATE "minigames"
   SET "participant_type" = 'PAIR', "partner_mode" = 'RANDOM'
 WHERE "participant_type" IS NULL
   AND "format" = 'RANDOM_DOUBLES';

UPDATE "minigames"
   SET "participant_type" = 'PAIR', "partner_mode" = 'FIXED'
 WHERE "participant_type" IS NULL
   AND "format" = 'FIXED_DOUBLES_ROUND_ROBIN';

--    Mọi dòng còn lại (GROUP_STAGE/KNOCKOUT/SINGLES nhóm vợt) → INDIVIDUAL
UPDATE "minigames"
   SET "participant_type" = 'INDIVIDUAL'
 WHERE "participant_type" IS NULL;
