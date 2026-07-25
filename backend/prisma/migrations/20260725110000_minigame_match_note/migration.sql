-- Thêm cột ghi chú cho trận đấu (nhập ở modal điểm) — additive, non-destructive.
ALTER TABLE "minigame_matches" ADD COLUMN "note" VARCHAR(300);
