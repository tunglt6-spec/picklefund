-- Thêm trường trình độ (skill level 1-5) cho thành viên — phục vụ ghép cặp cân bằng minigame.
-- Non-destructive: cột nullable, không ảnh hưởng dữ liệu hiện có.
ALTER TABLE "members" ADD COLUMN "skill_level" INTEGER;
