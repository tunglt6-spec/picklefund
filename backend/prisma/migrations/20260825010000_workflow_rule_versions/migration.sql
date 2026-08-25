-- Lịch sử phiên bản WorkflowRule (Phase 3 lifecycle): snapshot để rollback. Additive.
CREATE TABLE "workflow_rule_versions" (
  "id" TEXT NOT NULL,
  "rule_id" TEXT NOT NULL,
  "club_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "trigger_type" VARCHAR(60) NOT NULL,
  "scope_key" VARCHAR(120),
  "conditions_json" JSONB,
  "actions_json" JSONB,
  "schedule_type" VARCHAR(20) NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "changed_by" TEXT,
  "change_note" VARCHAR(200),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflow_rule_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workflow_rule_versions_rule_id_version_idx" ON "workflow_rule_versions"("rule_id", "version");
CREATE INDEX "workflow_rule_versions_club_id_created_at_idx" ON "workflow_rule_versions"("club_id", "created_at");
