-- ReportExportLog: đếm số lần xuất báo cáo (additive)
CREATE TABLE "report_export_logs" (
    "id" TEXT NOT NULL,
    "club_id" TEXT,
    "user_id" TEXT,
    "type" VARCHAR(60) NOT NULL,
    "format" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_export_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "report_export_logs_club_id_created_at_idx" ON "report_export_logs"("club_id", "created_at");
CREATE INDEX "report_export_logs_created_at_idx" ON "report_export_logs"("created_at");
