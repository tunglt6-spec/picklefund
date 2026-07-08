-- Multi-channel notification: thêm cột `channels` (mảng enum) vào notification_preferences.
-- KHÔNG mất dữ liệu, backward-compatible (giữ nguyên preferred_channel).

-- 1. Thêm cột mảng, default [IN_APP]
ALTER TABLE "notification_preferences"
  ADD COLUMN "channels" "NotificationChannel"[] NOT NULL DEFAULT ARRAY['IN_APP']::"NotificationChannel"[];

-- 2. Backfill từ preferred_channel hiện có: email → ['EMAIL'], telegram → ['TELEGRAM'], in_app → ['IN_APP']
UPDATE "notification_preferences"
  SET "channels" = ARRAY["preferred_channel"]::"NotificationChannel"[]
  WHERE "preferred_channel" IS NOT NULL;

-- ============================================================================
-- ROLLBACK (chạy thủ công nếu cần hạ phiên bản — dữ liệu preferred_channel vẫn còn):
--   ALTER TABLE "notification_preferences" DROP COLUMN "channels";
-- ============================================================================
