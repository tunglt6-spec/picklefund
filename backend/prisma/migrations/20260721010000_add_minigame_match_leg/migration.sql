-- Lượt đấu cho double round-robin (1 = lượt đi, 2 = lượt về). Trận cũ mặc định leg = 1.
ALTER TABLE "minigame_matches" ADD COLUMN "leg" INTEGER NOT NULL DEFAULT 1;
