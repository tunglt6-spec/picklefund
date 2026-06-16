-- CreateEnum
CREATE TYPE "MinigameFormat" AS ENUM ('RANDOM_DOUBLES', 'FIXED_DOUBLES_ROUND_ROBIN', 'GROUP_STAGE', 'KNOCKOUT', 'SINGLES');

-- CreateEnum
CREATE TYPE "MinigameStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totp_secret" TEXT;

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minigames" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "format" "MinigameFormat" NOT NULL,
    "status" "MinigameStatus" NOT NULL DEFAULT 'DRAFT',
    "settings" JSONB,
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "minigames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minigame_participants" (
    "id" TEXT NOT NULL,
    "minigame_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minigame_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minigame_teams" (
    "id" TEXT NOT NULL,
    "minigame_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "player1_id" TEXT NOT NULL,
    "player2_id" TEXT,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minigame_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minigame_matches" (
    "id" TEXT NOT NULL,
    "minigame_id" TEXT NOT NULL,
    "team_a_id" TEXT,
    "team_b_id" TEXT,
    "score_a" INTEGER,
    "score_b" INTEGER,
    "winner_id" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "court_no" INTEGER,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "played_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minigame_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "minigame_participants_minigame_id_member_id_key" ON "minigame_participants"("minigame_id", "member_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minigames" ADD CONSTRAINT "minigames_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minigame_participants" ADD CONSTRAINT "minigame_participants_minigame_id_fkey" FOREIGN KEY ("minigame_id") REFERENCES "minigames"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minigame_participants" ADD CONSTRAINT "minigame_participants_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minigame_teams" ADD CONSTRAINT "minigame_teams_minigame_id_fkey" FOREIGN KEY ("minigame_id") REFERENCES "minigames"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minigame_teams" ADD CONSTRAINT "minigame_teams_player1_id_fkey" FOREIGN KEY ("player1_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minigame_teams" ADD CONSTRAINT "minigame_teams_player2_id_fkey" FOREIGN KEY ("player2_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minigame_matches" ADD CONSTRAINT "minigame_matches_minigame_id_fkey" FOREIGN KEY ("minigame_id") REFERENCES "minigames"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minigame_matches" ADD CONSTRAINT "minigame_matches_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "minigame_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minigame_matches" ADD CONSTRAINT "minigame_matches_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "minigame_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
