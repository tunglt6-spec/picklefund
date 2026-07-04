-- EPIC8-NOTIFICATION-RUNTIME-001: NotificationJob cho Hermes Notification Runtime.
CREATE TYPE "NotificationJobStatus" AS ENUM ('DRY_RUN', 'READY', 'FAILED');

CREATE TABLE "notification_jobs" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "target_type" VARCHAR(30) NOT NULL,
    "target_id" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "body_summary" VARCHAR(300),
    "payload_json" JSONB,
    "status" "NotificationJobStatus" NOT NULL,
    "idempotency_key" VARCHAR(120),
    "error_message" TEXT,
    "ai_action_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "notification_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_jobs_club_id_channel_idempotency_key_key"
  ON "notification_jobs"("club_id", "channel", "idempotency_key");
CREATE INDEX "notification_jobs_club_id_status_idx" ON "notification_jobs"("club_id", "status");
CREATE INDEX "notification_jobs_club_id_created_at_idx" ON "notification_jobs"("club_id", "created_at");

ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_club_id_fkey"
  FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
