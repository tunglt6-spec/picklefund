-- Push thông minh theo loại: member tự tắt push theo nhóm. Additive, non-destructive.
ALTER TABLE "notification_preferences"
  ADD COLUMN "push_muted_categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
