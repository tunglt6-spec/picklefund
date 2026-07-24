-- Pha 0 (đa bộ môn): thêm sport + scoring_model vào minigames.
-- Non-destructive: cột NOT NULL kèm DEFAULT nên các giải cũ tự nhận PICKLEBALL/HEAD_TO_HEAD.
ALTER TABLE "minigames" ADD COLUMN IF NOT EXISTS "sport" VARCHAR(30) NOT NULL DEFAULT 'PICKLEBALL';
ALTER TABLE "minigames" ADD COLUMN IF NOT EXISTS "scoring_model" VARCHAR(20) NOT NULL DEFAULT 'HEAD_TO_HEAD';
