-- Báo cáo nội dung cộng đồng (member flag → admin duyệt). Additive, non-destructive.
CREATE TABLE "community_reports" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "reporter_member_id" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolved_by_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "community_reports_target_type_target_id_reporter_member_id_key" ON "community_reports"("target_type","target_id","reporter_member_id");
CREATE INDEX "community_reports_club_id_status_idx" ON "community_reports"("club_id","status");
