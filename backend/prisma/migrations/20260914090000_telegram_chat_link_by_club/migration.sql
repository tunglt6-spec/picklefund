-- Chuyển mapping chat Telegram của CLB từ KHÓA-THEO-CHAT sang KHÓA-THEO-CLB.
--
-- Trước: key = 'telegram_chat_<chatId>', value = clubId  → mỗi chatId chỉ gắn được 1 CLB
--        (link chatId cho CLB B làm mất liên kết ở CLB A vì trùng key).
-- Nay:   key = 'telegram_club_chat_<clubId>', value = chatId → 1 Chat ID DÙNG CHUNG cho
--        NHIỀU CLB (mỗi CLB một key riêng, không đè nhau).
--
-- Data-only, idempotent (chạy lại không tác dụng phụ). ESCAPE '\' để '_' là ký tự thật.

-- 1) Tạo bản ghi khóa-theo-CLB từ các bản ghi khóa-theo-chat hiện có.
INSERT INTO "system_settings" ("key", "value", "updated_at")
SELECT
  'telegram_club_chat_' || "value",
  substring("key" FROM (length('telegram_chat_') + 1)),
  now()
FROM "system_settings"
WHERE "key" LIKE 'telegram\_chat\_%' ESCAPE '\'
ON CONFLICT ("key") DO UPDATE
  SET "value" = EXCLUDED."value", "updated_at" = now();

-- 2) Xóa các bản ghi khóa-theo-chat cũ (đã chuyển xong).
DELETE FROM "system_settings" WHERE "key" LIKE 'telegram\_chat\_%' ESCAPE '\';
