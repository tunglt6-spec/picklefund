-- AI observability chuẩn hoá (Phase 0): 1 sink persisted duy nhất cho mọi lời gọi LLM.
-- Additive, non-destructive.
ALTER TABLE "ai_usage_logs"
  ADD COLUMN "source" VARCHAR(20),
  ADD COLUMN "correlation_id" VARCHAR(64),
  ADD COLUMN "user_id" TEXT,
  ADD COLUMN "error_type" VARCHAR(60);

CREATE INDEX "ai_usage_logs_correlation_id_idx" ON "ai_usage_logs"("correlation_id");
