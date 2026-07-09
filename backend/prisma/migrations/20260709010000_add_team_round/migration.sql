-- Thêm trường vòng (round) cho MinigameTeam — phục vụ RANDOM_DOUBLES: mỗi vòng bốc
-- cặp mới, các cặp được tag theo vòng. FIXED_DOUBLES để null (đội cố định cả mùa).
-- Non-destructive: cột nullable, không ảnh hưởng dữ liệu hiện có.
ALTER TABLE "minigame_teams" ADD COLUMN "round" INTEGER;
