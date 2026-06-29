# ADR-001: Tách biệt Quỹ Chính và Quỹ Phụ

**Ngày:** 2026-06  
**Trạng thái:** ✅ Accepted

---

## Bối cảnh

PickleFund cần quản lý hai loại quỹ khác nhau trong CLB Pickleball:
1. Quỹ vận hành chính — thu quỹ thành viên, chi phí sân, sinh hoạt
2. Quỹ phụ trợ — minigame, thưởng, tài trợ, cá cược vui

Câu hỏi: Có nên gộp chung hai quỹ này không?

---

## Quyết định

**Tách biệt hoàn toàn Quỹ Chính và Quỹ Phụ.**

- Quỹ Chính: quỹ vận hành CLB chính thức
- Quỹ Phụ: quỹ phụ trợ hoạt động độc lập
- Tổng tài sản CLB = Quỹ Chính + Số dư chuyển kỳ (không cộng Quỹ Phụ)

---

## Lý do

1. **Ngữ nghĩa khác nhau:** Quỹ Phụ (minigame, thưởng) không phải tài sản chính thức của CLB — không ảnh hưởng công nợ, không ảnh hưởng phiếu thu thành viên
2. **Minh bạch:** Thành viên cần thấy rõ tiền CLB chính thức vs tiền hoạt động vui
3. **Kiểm toán:** Báo cáo tài chính CLB chỉ reflect Quỹ Chính
4. **Tránh lẫn lộn:** Gộp chung gây nhầm lẫn khi phân tích tài chính

---

## Hậu quả

**Tích cực:**
- Tài chính CLB rõ ràng, minh bạch
- Dễ kiểm toán từng loại quỹ
- Member Receipt chỉ liên quan Quỹ Chính

**Tiêu cực:**
- Cần quản lý 2 loại quỹ riêng
- UI cần hiển thị đủ thông tin cả 2 quỹ

---

## Các phương án đã xem xét

**Phương án 1: Gộp chung 1 quỹ**  
Đơn giản hơn nhưng mất ngữ nghĩa — tiền minigame lẫn với tiền thuê sân. Bị từ chối.

**Phương án 2: Nhiều hơn 2 loại quỹ**  
Quá phức tạp cho CLB nhỏ. Không cần thiết trong giai đoạn hiện tại.

---

## Triển khai

- API: `commonFund` (Quỹ Chính), `miniFund` (Quỹ Phụ), `clubAssets` (Tổng)
- DB: `expense.type` phân biệt `court/activity/club` vs `minigame`
- Frontend: 4 KPI card riêng biệt với màu sắc và icon khác nhau
