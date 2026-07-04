-- EPIC5-HERMES-WORKFLOW-ENGINE-001: rule-based workflow engine (rules + runs).

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "workflow_rules" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "trigger_type" VARCHAR(60) NOT NULL,
    "conditions_json" JSONB,
    "actions_json" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "workflow_rule_id" TEXT,
    "trigger_type" VARCHAR(60) NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',
    "context_json" JSONB,
    "result_json" JSONB,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_rules_club_id_enabled_idx" ON "workflow_rules"("club_id", "enabled");
CREATE INDEX "workflow_rules_club_id_trigger_type_idx" ON "workflow_rules"("club_id", "trigger_type");
CREATE INDEX "workflow_runs_club_id_status_idx" ON "workflow_runs"("club_id", "status");
CREATE INDEX "workflow_runs_workflow_rule_id_idx" ON "workflow_runs"("workflow_rule_id");

-- AddForeignKey
ALTER TABLE "workflow_rules" ADD CONSTRAINT "workflow_rules_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_rule_id_fkey" FOREIGN KEY ("workflow_rule_id") REFERENCES "workflow_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
