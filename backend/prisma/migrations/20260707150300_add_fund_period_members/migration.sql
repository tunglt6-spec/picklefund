-- FUND-IMPL-01: Roster thành viên "được kỳ vọng đóng" của 1 kỳ quỹ (chủ yếu Quỹ Phụ/
-- giải đấu — không phải mọi thành viên CLB đều tham gia). TÁCH BIỆT fund_contributions
-- (log giao dịch thật) — dùng cho tính năng "Sao chép thành viên từ kỳ quỹ trước".
-- Additive, non-destructive.
CREATE TABLE "fund_period_members" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "fund_period_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "expected_amount" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_period_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fund_period_members_fund_period_id_member_id_key"
  ON "fund_period_members"("fund_period_id", "member_id");
CREATE INDEX "fund_period_members_club_id_fund_period_id_idx"
  ON "fund_period_members"("club_id", "fund_period_id");

ALTER TABLE "fund_period_members" ADD CONSTRAINT "fund_period_members_club_id_fkey"
  FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fund_period_members" ADD CONSTRAINT "fund_period_members_fund_period_id_fkey"
  FOREIGN KEY ("fund_period_id") REFERENCES "fund_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fund_period_members" ADD CONSTRAINT "fund_period_members_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
