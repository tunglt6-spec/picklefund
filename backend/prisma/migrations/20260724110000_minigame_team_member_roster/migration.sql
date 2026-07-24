-- Pha 1a (bóng đá): roster nhiều người cho môn đồng đội. Additive — môn đôi không dùng.
CREATE TABLE IF NOT EXISTS "minigame_team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "member_id" TEXT,
    "guest_name" VARCHAR(120),
    "role" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "minigame_team_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_mtm_team" ON "minigame_team_members"("team_id");

DO $$ BEGIN
  ALTER TABLE "minigame_team_members"
    ADD CONSTRAINT "minigame_team_members_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "minigame_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
