-- Index hiệu năng (audit tối ưu 2026-07-21). Postgres KHÔNG tự tạo index cho FK → khai báo tay.
CREATE INDEX IF NOT EXISTS "idx_mm_minigame_status" ON "minigame_matches"("minigame_id", "status");
CREATE INDEX IF NOT EXISTS "idx_mt_minigame" ON "minigame_teams"("minigame_id");
CREATE INDEX IF NOT EXISTS "idx_fp_club_type_status" ON "fund_periods"("club_id", "type", "status");
CREATE INDEX IF NOT EXISTS "idx_fp_club_start" ON "fund_periods"("club_id", "start_date");
CREATE INDEX IF NOT EXISTS "idx_le_club_fundsrc_status" ON "living_expenses"("club_id", "fund_source", "status");
CREATE INDEX IF NOT EXISTS "idx_le_att_session" ON "living_expenses"("attendance_session_id");
CREATE INDEX IF NOT EXISTS "idx_le_club_expdate" ON "living_expenses"("club_id", "expense_date");
CREATE INDEX IF NOT EXISTS "idx_as_club_session_date" ON "attendance_sessions"("club_id", "session_date");
CREATE INDEX IF NOT EXISTS "idx_fc_club_fundsrc_confirmed" ON "fund_contributions"("club_id", "fund_source", "is_confirmed");
