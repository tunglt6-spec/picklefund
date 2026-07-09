-- GROUP_STAGE (Vòng bảng): mỗi trận thuộc 1 BẢNG. Bảng lưu ở Minigame.settings.groups
-- (JSON, memberKeys = memberId | guestId); match.group_id là TAG string tới bảng đó
-- (không phải FK — bảng sống trong JSON). Nullable + additive: RANDOM/FIXED doubles không dùng.
ALTER TABLE "minigame_matches" ADD COLUMN "group_id" TEXT;
