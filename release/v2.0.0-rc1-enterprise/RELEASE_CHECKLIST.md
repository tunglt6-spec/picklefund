# Checklist Phát hành — PickleFund V2.0 RC1

> **Phiên bản:** V2.0 RC1 | **Ngày:** 2026-06-29  
> **Đối tượng:** Project Manager, Team Lead — xác nhận trước khi công bố release

---

## 1. Kiểm tra code & chất lượng

- [x] Tất cả feature PR đã merge vào `main`
- [x] Không có PR còn `draft` hoặc `open` liên quan đến release này
- [x] Backend tests: 175/175 PASS
- [x] Frontend build: 0 errors
- [x] Frontend lint: 0 errors
- [x] `docker compose config` PASS
- [x] Codex audit: 0 blocking issues còn lại

## 2. Nghiệp vụ tài chính

- [x] Công thức đúng: `Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ`
- [x] Quỹ Phụ không cộng vào Tổng tài sản CLB
- [x] carryForward lấy đúng từ kỳ đã đóng/finalized
- [x] Không sửa logic tài chính trong quá trình làm UI

## 3. Deploy & Hạ tầng

- [x] GitHub Actions deploy pipeline V2 hoạt động
- [x] DB backup tự động trước mỗi deploy
- [x] Health check tự động sau deploy
- [x] Auto rollback hoạt động
- [x] `https://api.picklefund.uk/health` → OK
- [x] `https://app.picklefund.uk/` → OK

## 4. Bảo mật

- [x] Không có secrets trong git history
- [x] `.env.example` chỉ có placeholder
- [x] `TELEGRAM_BOT_TOKEN` không bị echo trong logs
- [x] `npm audit` — không có critical vulnerabilities

## 5. Tài liệu

- [x] RELEASE_NOTES.md cập nhật đầy đủ
- [x] CHANGELOG.md cập nhật theo Keep a Changelog
- [x] Enterprise Release Package (26 files) hoàn chỉnh
- [x] Tất cả tài liệu bằng tiếng Việt
- [x] INDEX.md liên kết tất cả tài liệu
- [x] CHECKSUMS.txt ghi hash các file quan trọng

## 6. Communication

- [ ] Thông báo cho Admin CLB pilot về version mới
- [ ] Cập nhật trạng thái release trên project tracker
- [ ] Ghi nhận ngày phát hành chính thức: **2026-06-29**

## 7. Sau phát hành

- [ ] Monitor health endpoints 24 giờ đầu
- [ ] Thu thập phản hồi từ Admin CLB pilot
- [ ] Ghi nhận vấn đề mới (nếu có) vào KNOWN_ISSUES.md
- [ ] Lên kế hoạch cho V2.0 GA dựa trên phản hồi

---

## Kết quả

**Phiên bản:** V2.0 RC1  
**Ngày phát hành:** 2026-06-29  
**Trạng thái:** ✅ Sẵn sàng phát hành  
**Loại:** Release Candidate — Pilot production  
**Backend tests:** 175/175 PASS  
**Codex audit:** PASS (6/6 blockers đã fix)
