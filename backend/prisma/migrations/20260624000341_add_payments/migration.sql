DO $$ BEGIN
  CREATE TYPE "PaymentRefType" AS ENUM ('CONTRIBUTION', 'EXPENSE', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "payments" (
  "id"             TEXT NOT NULL,
  "club_id"        TEXT NOT NULL,
  "member_id"      TEXT NOT NULL,
  "amount"         DECIMAL(15,2) NOT NULL,
  "description"    VARCHAR(500) NOT NULL,
  "reference_type" "PaymentRefType" NOT NULL,
  "reference_id"   TEXT,
  "bank_code"      VARCHAR(10) NOT NULL DEFAULT 'MB',
  "account_number" VARCHAR(30) NOT NULL,
  "account_name"   VARCHAR(100) NOT NULL,
  "qr_image_url"   TEXT,
  "status"         "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "confirmed_by"   TEXT,
  "confirmed_at"   TIMESTAMP(3),
  "expired_at"     TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payments_club_id_status_idx" ON "payments"("club_id", "status");
CREATE INDEX IF NOT EXISTS "payments_member_id_idx" ON "payments"("member_id");

ALTER TABLE "payments" ADD CONSTRAINT "payments_club_id_fkey"
  FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "members"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_by_fkey"
  FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE SET NULL;
