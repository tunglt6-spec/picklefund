-- Khách mời là NGƯỜI CHƠI hạng nhất trong minigame: đội có thể gồm khách (không phải member).
-- Thêm cột guest + tên hiển thị (denormalized) cho từng slot; cho player1_id nullable
-- (slot có thể là khách → không có member id). Non-destructive: cột thêm nullable,
-- dữ liệu đội cũ (player1_id member) giữ nguyên.
ALTER TABLE "minigame_teams" ALTER COLUMN "player1_id" DROP NOT NULL;
ALTER TABLE "minigame_teams" ADD COLUMN "player1_guest_id" TEXT;
ALTER TABLE "minigame_teams" ADD COLUMN "player1_name" TEXT;
ALTER TABLE "minigame_teams" ADD COLUMN "player2_guest_id" TEXT;
ALTER TABLE "minigame_teams" ADD COLUMN "player2_name" TEXT;
