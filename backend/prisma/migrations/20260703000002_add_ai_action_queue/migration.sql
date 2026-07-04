-- EPIC4-AI-MANAGER-DASHBOARD-002: AI Action Queue + approval execution + per-action audit trail.

-- CreateEnum
CREATE TYPE "AiAgent" AS ENUM ('MAIKA', 'LISA', 'HERMES', 'MIT_DAT');
CREATE TYPE "AiActionRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "AiActionStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTING', 'EXECUTED', 'FAILED', 'RETRY_PENDING');

-- CreateTable
CREATE TABLE "ai_actions" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "requested_by_ai" "AiAgent" NOT NULL,
    "action_type" VARCHAR(100) NOT NULL,
    "target_module" VARCHAR(100),
    "target_entity_type" VARCHAR(100),
    "target_entity_id" TEXT,
    "risk_level" "AiActionRisk" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "summary" TEXT,
    "request_payload" JSONB,
    "status" "AiActionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approval_required" BOOLEAN NOT NULL DEFAULT true,
    "approval_policy" JSONB,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "execution_result" JSONB,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_action_events" (
    "id" TEXT NOT NULL,
    "action_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "message" TEXT,
    "actor_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_action_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_actions_club_id_status_idx" ON "ai_actions"("club_id", "status");
CREATE INDEX "ai_actions_club_id_requested_by_ai_idx" ON "ai_actions"("club_id", "requested_by_ai");
CREATE INDEX "ai_actions_club_id_risk_level_idx" ON "ai_actions"("club_id", "risk_level");
CREATE INDEX "ai_action_events_action_id_idx" ON "ai_action_events"("action_id");

-- AddForeignKey
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_action_events" ADD CONSTRAINT "ai_action_events_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "ai_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
