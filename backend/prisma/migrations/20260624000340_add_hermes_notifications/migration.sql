-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "NotificationPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'TELEGRAM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateTable notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id"         TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "club_id"    TEXT NOT NULL,
  "event_type" VARCHAR(50) NOT NULL,
  "priority"   "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
  "channel"    "NotificationChannel"  NOT NULL DEFAULT 'IN_APP',
  "title"      VARCHAR(200) NOT NULL,
  "body"       TEXT NOT NULL,
  "metadata"   JSONB,
  "status"     "NotificationStatus"   NOT NULL DEFAULT 'PENDING',
  "sent_at"    TIMESTAMP(3),
  "read_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable notification_preferences
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id"                TEXT NOT NULL,
  "user_id"           TEXT NOT NULL,
  "preferred_channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
  "telegram_chat_id"  VARCHAR(50),
  "quiet_hours_start" INTEGER NOT NULL DEFAULT 23,
  "quiet_hours_end"   INTEGER NOT NULL DEFAULT 7,
  "max_daily_push"    INTEGER NOT NULL DEFAULT 3,
  "max_daily_email"   INTEGER NOT NULL DEFAULT 1,
  "max_daily_telegram" INTEGER NOT NULL DEFAULT 5,
  "enabled"           BOOLEAN NOT NULL DEFAULT true,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_user_id_status_idx" ON "notifications"("user_id", "status");
CREATE INDEX IF NOT EXISTS "notifications_club_id_event_type_idx" ON "notifications"("club_id", "event_type");
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
