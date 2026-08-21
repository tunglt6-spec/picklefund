-- Member Experience v1 (ADDITIVE, non-destructive).
-- 1) Mở rộng "payments" cho luồng "Báo đã nộp quỹ" (member khai báo → admin xác nhận).
-- 2) Tạo Cộng đồng CLB: posts / comments / reactions + Tìm kèo (matchmaking).
-- Toàn bộ là thêm mới (ADD COLUMN nullable/default + CREATE TABLE/TYPE) → an toàn dữ liệu prod.

-- ============================================================
-- Enums (Community + Matchmaking)
-- ============================================================
CREATE TYPE "CommunityPostKind" AS ENUM ('GENERAL', 'SESSION', 'TOURNAMENT');
CREATE TYPE "ReactionTargetType" AS ENUM ('POST', 'COMMENT');
CREATE TYPE "ReactionEmoji" AS ENUM ('THUMBS_UP', 'HEART', 'CLAP', 'FIRE');
CREATE TYPE "MatchmakingStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED', 'CANCELLED');

-- ============================================================
-- Payments: cột mới cho "Báo đã nộp quỹ" (Scope 1)
-- ============================================================
ALTER TABLE "payments" ADD COLUMN "reported_by_member" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payments" ADD COLUMN "member_note" VARCHAR(500);
ALTER TABLE "payments" ADD COLUMN "proof_url" TEXT;
ALTER TABLE "payments" ADD COLUMN "recheck_note" VARCHAR(500);

-- ============================================================
-- CreateTable
-- ============================================================
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "author_member_id" TEXT NOT NULL,
    "kind" "CommunityPostKind" NOT NULL DEFAULT 'GENERAL',
    "body" TEXT NOT NULL,
    "image_url" TEXT,
    "session_id" TEXT,
    "minigame_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_comments" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "author_member_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_reactions" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "target_type" "ReactionTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "emoji" "ReactionEmoji" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchmaking_requests" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "creator_member_id" TEXT NOT NULL,
    "sport" VARCHAR(40) NOT NULL,
    "play_date" DATE NOT NULL,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "format" VARCHAR(40),
    "needed_count" INTEGER NOT NULL DEFAULT 1,
    "skill_level" INTEGER,
    "note" VARCHAR(500),
    "status" "MatchmakingStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matchmaking_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchmaking_participants" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matchmaking_participants_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- CreateIndex
-- ============================================================
CREATE INDEX "community_posts_club_id_is_deleted_created_at_idx" ON "community_posts"("club_id", "is_deleted", "created_at");
CREATE INDEX "community_posts_club_id_session_id_idx" ON "community_posts"("club_id", "session_id");
CREATE INDEX "community_posts_club_id_minigame_id_idx" ON "community_posts"("club_id", "minigame_id");
CREATE INDEX "community_comments_club_id_post_id_created_at_idx" ON "community_comments"("club_id", "post_id", "created_at");
CREATE INDEX "community_reactions_target_type_target_id_idx" ON "community_reactions"("target_type", "target_id");
CREATE UNIQUE INDEX "community_reactions_target_type_target_id_member_id_key" ON "community_reactions"("target_type", "target_id", "member_id");
CREATE INDEX "matchmaking_requests_club_id_status_play_date_idx" ON "matchmaking_requests"("club_id", "status", "play_date");
CREATE INDEX "matchmaking_participants_club_id_request_id_idx" ON "matchmaking_participants"("club_id", "request_id");
CREATE UNIQUE INDEX "matchmaking_participants_request_id_member_id_key" ON "matchmaking_participants"("request_id", "member_id");

-- ============================================================
-- AddForeignKey
-- ============================================================
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_member_id_fkey" FOREIGN KEY ("author_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_author_member_id_fkey" FOREIGN KEY ("author_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "community_reactions" ADD CONSTRAINT "community_reactions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "community_reactions" ADD CONSTRAINT "community_reactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "matchmaking_requests" ADD CONSTRAINT "matchmaking_requests_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "matchmaking_requests" ADD CONSTRAINT "matchmaking_requests_creator_member_id_fkey" FOREIGN KEY ("creator_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "matchmaking_participants" ADD CONSTRAINT "matchmaking_participants_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "matchmaking_participants" ADD CONSTRAINT "matchmaking_participants_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "matchmaking_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matchmaking_participants" ADD CONSTRAINT "matchmaking_participants_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
