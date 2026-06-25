-- Add missing indexes for query performance

-- FundContribution: member billing queries and confirmation filter
CREATE INDEX IF NOT EXISTS "fund_contributions_club_id_member_id_idx" ON "fund_contributions"("club_id", "member_id");
CREATE INDEX IF NOT EXISTS "fund_contributions_club_id_is_confirmed_idx" ON "fund_contributions"("club_id", "is_confirmed");

-- PersonalReceipt: list all receipts for a period in a club
CREATE INDEX IF NOT EXISTS "personal_receipts_club_id_fund_period_id_idx" ON "personal_receipts"("club_id", "fund_period_id");

-- ExpenseCategory: club-scoped category lookup
CREATE INDEX IF NOT EXISTS "expense_categories_club_id_idx" ON "expense_categories"("club_id");

-- AuditLog: activity feed and user history
CREATE INDEX IF NOT EXISTS "audit_logs_club_id_created_at_idx" ON "audit_logs"("club_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
