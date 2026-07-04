-- EPIC6-HERMES-RUNTIME-001: idempotency key cho runtime dispatch.
-- NULL = test-trigger thủ công (không giới hạn). Postgres coi NULL là distinct
-- nên unique index chỉ chặn trùng khi key được cung cấp.
ALTER TABLE "workflow_runs" ADD COLUMN "idempotency_key" VARCHAR(120);

CREATE UNIQUE INDEX "workflow_runs_club_id_workflow_rule_id_idempotency_key_key"
  ON "workflow_runs"("club_id", "workflow_rule_id", "idempotency_key");
