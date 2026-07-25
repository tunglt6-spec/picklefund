-- Backfill: giải đã có lịch/điểm nhưng còn "Nháp" (DRAFT) → ĐANG DIỄN RA (ACTIVE).
-- Sửa lỗi lịch sử: trước đây tạo lịch / nhập điểm không persist status ở BE nên
-- danh sách giải hiển thị sai "Nháp" dù đang thi đấu. Non-destructive, idempotent,
-- không đụng giải COMPLETED/CANCELLED. Áp dụng mọi bộ môn (đối kháng + golf).
UPDATE "minigames" m
SET "status" = 'ACTIVE',
    "started_at" = COALESCE(m."started_at", now())
WHERE m."status" = 'DRAFT'
  AND (
    EXISTS (
      SELECT 1 FROM "minigame_matches" mm WHERE mm."minigame_id" = m."id"
    )
    OR EXISTS (
      SELECT 1
      FROM "minigame_golf_scores" gs
      JOIN "minigame_golfers" g ON g."id" = gs."golfer_id"
      WHERE g."minigame_id" = m."id"
    )
  );
