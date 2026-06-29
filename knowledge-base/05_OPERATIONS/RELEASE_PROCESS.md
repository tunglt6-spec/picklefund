# Quy trình Release PickleFund

**Mục đích:** Quy trình chuẩn cho mỗi release
**Đối tượng:** PM, Developer, DevOps
**Cập nhật:** 2026-06-29

---

## Pre-release Checklist

- [ ] Tất cả tests PASS (175/175)
- [ ] Code review hoàn thành
- [ ] RELEASE_HISTORY.md cập nhật
- [ ] Không còn TODO/FIXME quan trọng
- [ ] .env production đã cập nhật nếu có biến mới

---

## Release Steps

1. Merge vào `main`
2. GitHub Actions trigger tự động
3. Quan sát Telegram notification
4. Verify trên app.picklefund.uk

---

## Hotfix Process

1. Tạo nhánh `hotfix/description` từ `main`
2. Fix + test
3. Merge vào `main`
4. Deploy như thường

---

## Versioning

- Format: `V{major}.{minor}.{patch}`
- Major: Thay đổi kiến trúc lớn
- Minor: Tính năng mới
- Patch: Bug fix

---

## Release Notes

Cập nhật [01_PRODUCT/RELEASE_HISTORY.md](../01_PRODUCT/RELEASE_HISTORY.md) sau mỗi release.
