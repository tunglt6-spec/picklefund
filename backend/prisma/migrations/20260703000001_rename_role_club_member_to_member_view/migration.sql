-- AUTH-IMPL-01 FIX-01: canonicalize member read-only role.
-- Rename enum value CLUB_MEMBER -> MEMBER_VIEW (in place: existing rows keep their value under the new label).
ALTER TYPE "Role" RENAME VALUE 'CLUB_MEMBER' TO 'MEMBER_VIEW';

-- Re-assert the column default under the new canonical label.
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'MEMBER_VIEW';
