# Mô hình Kinh doanh — PickleFund

> **Mục đích:** Mô tả mô hình kinh doanh định hướng của PickleFund  
> **Đối tượng:** Lãnh đạo, Kinh doanh  
> **Lưu ý:** Tài liệu này là định hướng — chưa phải cam kết doanh thu hoặc pháp lý

---

## 1. Mô hình SaaS B2B2C

PickleFund hoạt động theo mô hình **B2B2C**:
- **B (Business):** PickleFund bán platform cho CLB (Business)
- **B (Business):** CLB là khách hàng trực tiếp — Admin quản lý
- **C (Consumer):** Thành viên CLB là người dùng cuối

---

## 2. Phân khúc khách hàng

| Phân khúc | Mô tả | Nhu cầu chính |
|---|---|---|
| CLB nhỏ (< 20 thành viên) | Mới thành lập, quản lý đơn giản | Dễ dùng, giá thấp |
| CLB trung (20-50 thành viên) | Có nhu cầu minh bạch tài chính | Báo cáo, điểm danh |
| CLB lớn (> 50 thành viên) | Nhiều hoạt động, cần automation | AI, dashboard, analytics |

---

## 3. Giá trị cốt lõi cho khách hàng

1. **Tiết kiệm thời gian:** Không cần Excel, không cần tính toán thủ công
2. **Minh bạch tài chính:** Thành viên xem được lịch sử thu chi
3. **Chuyên nghiệp:** Báo cáo PDF, phiếu thu điện tử
4. **Phân tích tự động:** Health Score, khuyến nghị tài chính (V2.1: Maika AI)

---

## 4. Mô hình doanh thu (Định hướng)

| Gói | Đối tượng | Tính năng |
|---|---|---|
| **Free / Pilot** | CLB nhỏ, thử nghiệm | Finance Dashboard, thu/chi cơ bản, báo cáo |
| **Pro** | CLB trung | + AI Health Score, PDF export nâng cao, mobile |
| **Enterprise** | CLB lớn, liên đoàn | + AI Teammates (Maika, Lisa), API access, white-label |

*Giá cụ thể chưa được công bố — sẽ định hướng khi GA.*

---

## 5. Chi phí vận hành ước tính

| Hạng mục | Chi phí |
|---|---|
| VPS Production | Tùy nhà cung cấp (~$20-50/tháng cho CLB đơn lẻ) |
| Domain + SSL | ~$20/năm |
| LLM API (V2.1) | Tùy lượng dùng |
| GitHub Actions | Free tier thường đủ |

---

## 6. Lợi thế cạnh tranh

- Chuyên biệt cho Pickleball Việt Nam — không phải generic CLB tool
- Finance engine chuẩn (Quỹ Chính/Phụ/carryForward) — phù hợp văn hóa CLB thể thao VN
- AI Teammates sắp ra (V2.1) — không có đối thủ nào trong phân khúc này
- Tiếng Việt hoàn toàn — dễ dùng hơn tool nước ngoài
