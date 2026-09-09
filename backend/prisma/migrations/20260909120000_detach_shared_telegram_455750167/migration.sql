-- Tách chat Telegram DÙNG CHUNG 455750167 (super admin) khỏi các CLB.
-- Bối cảnh: trước đây mọi CLB đều dùng chung chat 455750167 để nhận thông báo.
-- Sau khi chuyển Telegram sang mô hình theo-CLB, gỡ chat dùng chung này để mỗi CLB
-- tự liên kết chat riêng; 455750167 chỉ còn phục vụ Super Admin (qua superTelegramChatId
-- là key RIÊNG, KHÔNG bị migration này đụng tới).
--
-- Data-only, idempotent (chạy lại không gây lỗi/không tác dụng phụ).

-- 1) Gỡ liên kết CLB → chat 455750167 (systemSetting key 'telegram_chat_455750167').
DELETE FROM "system_settings" WHERE "key" = 'telegram_chat_455750167';

-- 2) Xoá pref.telegramChatId = 455750167 (dữ liệu cũ khi các admin nhập chung chat này).
UPDATE "notification_preferences"
SET "telegram_chat_id" = NULL
WHERE "telegram_chat_id" = '455750167';
