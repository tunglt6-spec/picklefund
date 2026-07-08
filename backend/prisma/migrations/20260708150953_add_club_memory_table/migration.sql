-- Club Memory v2.2: persist thay In-Memory Repository (trước đây mất dữ liệu
-- mỗi lần backend restart/deploy). Bảng mới hoàn toàn — KHÔNG mất dữ liệu hiện có.

-- 1. Enum loại tri thức
CREATE TYPE "ClubMemoryType" AS ENUM ('FACT', 'RULE', 'PREFERENCE', 'POLICY', 'KNOWLEDGE', 'OPERATIONAL_NOTE');

-- 2. Bảng club_memories
CREATE TABLE "club_memories" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "type" "ClubMemoryType" NOT NULL,
    "title" VARCHAR(300),
    "content" TEXT NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_memories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "club_memories_club_id_idx" ON "club_memories"("club_id");
CREATE INDEX "club_memories_club_id_type_idx" ON "club_memories"("club_id", "type");

ALTER TABLE "club_memories" ADD CONSTRAINT "club_memories_club_id_fkey"
  FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- ROLLBACK (chạy thủ công nếu cần hạ phiên bản):
--   DROP TABLE "club_memories";
--   DROP TYPE "ClubMemoryType";
-- ============================================================================
