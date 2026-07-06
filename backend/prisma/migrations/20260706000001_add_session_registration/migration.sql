-- V2.2 Phase 3b: RSVP đăng ký buổi chơi. Bảng session_registrations TÁCH BIỆT
-- attendance_records (điểm danh thực tế) — không ảnh hưởng tính quỹ. Additive, non-destructive.
CREATE TABLE "session_registrations" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "attendance_session_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_registrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "session_registrations_attendance_session_id_member_id_key"
  ON "session_registrations"("attendance_session_id", "member_id");
CREATE INDEX "session_registrations_club_id_attendance_session_id_idx"
  ON "session_registrations"("club_id", "attendance_session_id");

ALTER TABLE "session_registrations" ADD CONSTRAINT "session_registrations_club_id_fkey"
  FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session_registrations" ADD CONSTRAINT "session_registrations_attendance_session_id_fkey"
  FOREIGN KEY ("attendance_session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_registrations" ADD CONSTRAINT "session_registrations_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
