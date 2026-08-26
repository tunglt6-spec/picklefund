-- Cache OpenGraph link-preview cho Cộng đồng CLB. Additive.
CREATE TABLE "link_previews" (
  "id" TEXT NOT NULL,
  "url_hash" VARCHAR(64) NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "title" VARCHAR(300),
  "description" VARCHAR(600),
  "image" VARCHAR(2048),
  "site_name" VARCHAR(120),
  "ok" BOOLEAN NOT NULL DEFAULT true,
  "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "link_previews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "link_previews_url_hash_key" ON "link_previews"("url_hash");
