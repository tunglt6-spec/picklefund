-- Redesign: auto tính LIVE (không persist event) + reset thang điểm về model 'trừ khi vi phạm'.
DELETE FROM "member_score_events" WHERE "source" IN ('AUTO_ATTENDANCE', 'AUTO_FINANCE');
DELETE FROM "scoring_rules" WHERE "system_key" IS NOT NULL;
-- Rule template mới seed lại qua POST /scoring/seed-rules-all (SUPER_ADMIN) sau deploy + tự seed khi tạo CLB mới.
-- ROLLBACK: không cần (dữ liệu điểm hiện toàn 100 chưa dùng thật).
