-- Phase 1 AIDO Workflow Rules: khoá chống trùng rule + hợp nhất bản trùng hiện có.
-- NON-DESTRUCTIVE: chỉ thêm cột/index + TẮT (enabled=false) các bản trùng, GIỮ mọi hàng
-- + toàn bộ WorkflowRun lịch sử. Idempotent (chạy lại không đổi thêm). Reversible (bật lại).

ALTER TABLE "workflow_rules" ADD COLUMN IF NOT EXISTS "scope_key" VARCHAR(120);

CREATE INDEX IF NOT EXISTS "workflow_rules_club_id_trigger_type_scope_key_idx"
  ON "workflow_rules" ("club_id", "trigger_type", "scope_key");

-- Hợp nhất rule trùng do bấm template nhiều lần: trong mỗi nhóm
-- (club_id, trigger_type, COALESCE(scope_key,'')) chỉ GIỮ 1 canonical (tạo sớm nhất) đang bật;
-- các bản trùng còn lại đang bật → TẮT. KHÔNG xoá hàng, KHÔNG xoá run lịch sử.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "club_id", "trigger_type", COALESCE("scope_key", '')
           ORDER BY "created_at" ASC, "id" ASC
         ) AS rn
  FROM "workflow_rules"
  WHERE "enabled" = true
)
UPDATE "workflow_rules" r
SET "enabled" = false, "updated_at" = now()
FROM ranked
WHERE r."id" = ranked.id AND ranked.rn > 1;
