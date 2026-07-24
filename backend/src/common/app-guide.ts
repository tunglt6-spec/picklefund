/**
 * APP_GUIDE — cẩm nang tính năng PickleFund cho AI (Lisa/Maika) dùng chung.
 * Đây là NGUỒN KIẾN THỨC DUY NHẤT về "app có gì / dùng thế nào" để AI hướng dẫn người dùng.
 * ⚠️ CẬP NHẬT FILE NÀY mỗi khi thêm/đổi/đổi tên tính năng — cả Lisa và Maika đều đọc từ đây.
 * Viết súc tích: Lisa chạy model *lite*, prompt càng gọn càng rẻ/nhanh.
 */
export const APP_GUIDE = `=== CẨM NANG SỬ DỤNG PICKLEFUND (để hướng dẫn người dùng) ===
PickleFund là nền tảng quản lý quỹ & hoạt động CLB thể thao ĐA BỘ MÔN tại Việt Nam (KHÔNG chỉ riêng pickleball).
Hỗ trợ 7 bộ môn khi tạo giải đấu:
- Môn vợt (đánh đôi/đơn/vòng bảng): Pickleball, Tennis, Cầu lông, Bóng bàn.
- Đồng đội (đội nhiều người, vòng tròn hoặc loại trực tiếp, tính điểm & hiệu số): Bóng đá, Bóng rổ.
- Cá nhân: Golf (stroke-play — tổng gậy nhỏ nhất thắng).

6 MODULE CHÍNH (menu bên trái):
1) AIDO (Văn phòng AI): xem đội ngũ AI đang làm việc & tổng quan vận hành.
2) Thành viên: danh sách/hồ sơ thành viên, vai trò, tài khoản.
3) Tài chính: Quỹ (chính/phụ), Thu (đóng quỹ), Chi phí, Kỳ quỹ, Công nợ, Báo cáo (xuất PDF).
4) Hoạt động CLB: Lịch sinh hoạt, Đăng ký buổi, Check-in, Điểm danh.
5) Tạo Giải đấu (TÊN CŨ là "Thi đấu"): tạo & quản lý giải đấu đa bộ môn, bảng xếp hạng, lịch thi đấu, lịch sử.
6) Hệ thống: Thông báo, Gói dịch vụ, Cài đặt.

HƯỚNG DẪN NHANH THEO NHU CẦU:
- Kiểm tra đã đóng quỹ chưa / còn công nợ: vào "Tài chính" (hoặc hỏi thẳng Lisa để xem số liệu của bạn).
- Đăng ký buổi chơi / Check-in: vào "Hoạt động CLB" → Đăng ký buổi / Check-in (thành viên tự làm được).
- Xem giải đấu / bảng xếp hạng / lịch thi đấu: vào "Tạo Giải đấu" → nút "Danh sách giải" (hoặc panel Tổng quan bên phải) → chọn giải → xem BXH/lịch trong màn giải.
- Tạo giải đấu mới (QUYỀN ADMIN): vào "Tạo Giải đấu" → cột trái chọn 1 trong 7 bộ môn → điền tên/ngày → Tạo. Panel bên phải hiển thị tổng quan bộ môn đang chọn.
  · Bóng đá/Bóng rổ: dựng đội & cầu thủ → chọn Vòng tròn hoặc Loại trực tiếp → nhập tỉ số → xem BXH.
  · Golf: thêm golfer → nhập số gậy từng vòng → BXH theo tổng gậy.
  · Môn vợt: chọn Đánh đôi ngẫu nhiên / Vòng bảng / Đôi cố định → chọn thành viên → bốc thăm/nhập điểm.
- Nhập kết quả/tỉ số/điểm: trong màn quản lý giải (tab "Lịch & Kết quả" / "Nhập điểm").
- Xuất bảng xếp hạng ra ảnh/PDF: trong tab "Bảng xếp hạng" của giải, nút Xuất ảnh / Xuất PDF.

PHÂN QUYỀN: Chủ nhiệm (admin) & Thủ quỹ mới được THÊM/SỬA/XÓA (tạo giải, nhập thu-chi, quản lý thành viên).
Thành viên chỉ XEM và tự thao tác phần cá nhân (đăng ký buổi, check-in, xem số dư & công nợ của mình).`;
