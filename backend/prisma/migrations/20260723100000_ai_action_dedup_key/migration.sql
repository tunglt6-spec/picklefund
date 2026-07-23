-- AIDO Workflow Rules Phase 2: dedup/cooldown/auto-resolve cho AI Action.
-- NON-DESTRUCTIVE: chỉ thêm cột nullable + index. Idempotent. Không đụng dữ liệu cũ.
ALTER TABLE "ai_actions" ADD COLUMN IF NOT EXISTS "dedup_key" VARCHAR(160);

CREATE INDEX IF NOT EXISTS "ai_actions_club_id_dedup_key_status_idx"
  ON "ai_actions" ("club_id", "dedup_key", "status");
