-- EPIC4-AI-MANAGER-DASHBOARD-003: Execution Bridge (Mít Đặc) — executor metadata + timing.
ALTER TABLE "ai_actions" ADD COLUMN "executor_agent" "AiAgent";
ALTER TABLE "ai_actions" ADD COLUMN "executor_started_at" TIMESTAMP(3);
ALTER TABLE "ai_actions" ADD COLUMN "executor_finished_at" TIMESTAMP(3);
ALTER TABLE "ai_actions" ADD COLUMN "execution_duration" INTEGER;
