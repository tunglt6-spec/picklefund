-- CreateTable
CREATE TABLE "maika_insights" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "severity" VARCHAR(20),
    "score" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maika_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lisa_messages" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "member_id" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lisa_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maika_insights_club_id_created_at_idx" ON "maika_insights"("club_id", "created_at");

-- CreateIndex
CREATE INDEX "maika_insights_club_id_type_idx" ON "maika_insights"("club_id", "type");

-- CreateIndex
CREATE INDEX "lisa_messages_club_id_created_at_idx" ON "lisa_messages"("club_id", "created_at");

-- AddForeignKey
ALTER TABLE "maika_insights" ADD CONSTRAINT "maika_insights_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lisa_messages" ADD CONSTRAINT "lisa_messages_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
