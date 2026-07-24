-- Pha 2 (golf/leaderboard): golfer cá nhân + điểm gậy theo vòng. Additive — môn khác không dùng.
CREATE TABLE IF NOT EXISTS "minigame_golfers" (
    "id" TEXT NOT NULL,
    "minigame_id" TEXT NOT NULL,
    "member_id" TEXT,
    "guest_name" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "minigame_golfers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "minigame_golf_scores" (
    "id" TEXT NOT NULL,
    "golfer_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "strokes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "minigame_golf_scores_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_mg_golfers_minigame" ON "minigame_golfers"("minigame_id");
CREATE INDEX IF NOT EXISTS "idx_mg_golf_scores_golfer" ON "minigame_golf_scores"("golfer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "minigame_golf_scores_golfer_id_round_key" ON "minigame_golf_scores"("golfer_id", "round");

DO $$ BEGIN
  ALTER TABLE "minigame_golfers"
    ADD CONSTRAINT "minigame_golfers_minigame_id_fkey"
    FOREIGN KEY ("minigame_id") REFERENCES "minigames"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "minigame_golf_scores"
    ADD CONSTRAINT "minigame_golf_scores_golfer_id_fkey"
    FOREIGN KEY ("golfer_id") REFERENCES "minigame_golfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
