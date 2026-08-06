-- AiUsageLog: ghi nhận token/chi phí AI thật (additive, không đụng bảng cũ)
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "club_id" TEXT,
    "agent" VARCHAR(20) NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "model" VARCHAR(80),
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_usd" DECIMAL(12,6),
    "latency_ms" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "fallback" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_usage_logs_club_id_created_at_idx" ON "ai_usage_logs"("club_id", "created_at");
CREATE INDEX "ai_usage_logs_created_at_idx" ON "ai_usage_logs"("created_at");
