CREATE TABLE "zalo_identities" (
"id" TEXT NOT NULL,
"clubId" TEXT NOT NULL,
"userId" TEXT NOT NULL,
"botVersion" TEXT NOT NULL,
"chatId" TEXT NOT NULL,
"zaloUserId" TEXT NOT NULL,
"displayName" TEXT NOT NULL,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "zalo_identities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "zalo_identities_clubId_userId_key" ON "zalo_identities"("clubId","userId");
CREATE UNIQUE INDEX "zalo_identities_clubId_botVersion_zaloUserId_key" ON "zalo_identities"("clubId","botVersion","zaloUserId");
CREATE TABLE "zalo_link_challenges" (
"id" TEXT NOT NULL,
"clubId" TEXT NOT NULL,
"userId" TEXT NOT NULL,
"botVersion" TEXT NOT NULL,
"chatId" TEXT NOT NULL,
"codeHash" TEXT NOT NULL,
"expiresAt" TIMESTAMP(3) NOT NULL,
"candidateId" TEXT,
"candidateName" TEXT,
CONSTRAINT "zalo_link_challenges_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "zalo_link_challenges_clubId_userId_key" ON "zalo_link_challenges"("clubId","userId");
CREATE UNIQUE INDEX "zalo_link_challenges_codeHash_key" ON "zalo_link_challenges"("codeHash");
CREATE TABLE "zalo_finance_drafts" (
"id" TEXT NOT NULL,
"clubId" TEXT NOT NULL,
"botVersion" TEXT NOT NULL,
"chatId" TEXT NOT NULL,
"messageId" TEXT NOT NULL,
"senderUserId" TEXT NOT NULL,
"senderZaloId" TEXT NOT NULL,
"kind" TEXT NOT NULL,
"payload" JSONB NOT NULL,
"status" TEXT NOT NULL DEFAULT 'PENDING',
"expiresAt" TIMESTAMP(3) NOT NULL,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,
"approvedBy" TEXT,
"approvedAt" TIMESTAMP(3),
"recordId" TEXT,
CONSTRAINT "zalo_finance_drafts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "zalo_finance_drafts_clubId_botVersion_chatId_messageId_key" ON "zalo_finance_drafts"("clubId","botVersion","chatId","messageId");
CREATE INDEX "zalo_finance_drafts_clubId_status_createdAt_idx" ON "zalo_finance_drafts"("clubId","status","createdAt");
