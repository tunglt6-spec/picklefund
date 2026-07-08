-- Member Scoring Phase 1: chấm điểm thành viên động (quy tắc per-club + sự kiện + snapshot).
-- Bảng + enum mới hoàn toàn (ADDITIVE) — KHÔNG DROP/DELETE dữ liệu hiện có.

-- 1. Enum
CREATE TYPE "ScoringCategory" AS ENUM ('PARTICIPATION', 'CONDUCT', 'CONTRIBUTION', 'DISCIPLINE', 'FINANCE', 'BONUS');
CREATE TYPE "ScoringSource" AS ENUM ('AUTO_ATTENDANCE', 'AUTO_FINANCE', 'MANUAL');

-- 2. Bảng scoring_rules — quy tắc điểm có cấu trúc per-club.
CREATE TABLE "scoring_rules" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "category" "ScoringCategory" NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "delta" INTEGER NOT NULL,
    "source" "ScoringSource" NOT NULL DEFAULT 'MANUAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scoring_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scoring_rules_club_id_category_idx" ON "scoring_rules"("club_id", "category");

-- 3. Bảng member_score_events — sự kiện cộng/trừ điểm theo tháng.
CREATE TABLE "member_score_events" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "rule_id" TEXT,
    "category" "ScoringCategory" NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "delta" INTEGER NOT NULL,
    "source" "ScoringSource" NOT NULL,
    "period_month" VARCHAR(7) NOT NULL,
    "note" TEXT,
    "ref_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_score_events_pkey" PRIMARY KEY ("id")
);

-- Chống cộng trùng event auto (ref_id set). Manual ref_id=NULL → Postgres coi NULL khác nhau → cho phép lặp.
CREATE UNIQUE INDEX "member_score_events_member_id_source_period_month_ref_id_key" ON "member_score_events"("member_id", "source", "period_month", "ref_id");
CREATE INDEX "member_score_events_club_id_period_month_idx" ON "member_score_events"("club_id", "period_month");
CREATE INDEX "member_score_events_member_id_period_month_idx" ON "member_score_events"("member_id", "period_month");

-- 4. Bảng member_score_snapshots — chốt điểm cuối tháng.
CREATE TABLE "member_score_snapshots" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "period_month" VARCHAR(7) NOT NULL,
    "total_score" INTEGER NOT NULL,
    "classification" VARCHAR(40) NOT NULL,
    "finalized_by" TEXT,
    "finalized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_score_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "member_score_snapshots_member_id_period_month_key" ON "member_score_snapshots"("member_id", "period_month");
CREATE INDEX "member_score_snapshots_club_id_period_month_idx" ON "member_score_snapshots"("club_id", "period_month");

-- 5. Foreign keys
ALTER TABLE "scoring_rules" ADD CONSTRAINT "scoring_rules_club_id_fkey"
  FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "member_score_events" ADD CONSTRAINT "member_score_events_club_id_fkey"
  FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_score_events" ADD CONSTRAINT "member_score_events_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_score_events" ADD CONSTRAINT "member_score_events_rule_id_fkey"
  FOREIGN KEY ("rule_id") REFERENCES "scoring_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "member_score_snapshots" ADD CONSTRAINT "member_score_snapshots_club_id_fkey"
  FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_score_snapshots" ADD CONSTRAINT "member_score_snapshots_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- ROLLBACK (chạy thủ công nếu cần hạ phiên bản):
--   DROP TABLE "member_score_snapshots";
--   DROP TABLE "member_score_events";
--   DROP TABLE "scoring_rules";
--   DROP TYPE "ScoringSource";
--   DROP TYPE "ScoringCategory";
-- ============================================================================
