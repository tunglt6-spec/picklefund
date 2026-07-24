/**
 * APP_GUIDE — cẩm nang TOÀN DIỆN về tính năng PickleFund cho AI (Lisa/Maika) dùng chung.
 * NGUỒN KIẾN THỨC DUY NHẤT để AI hướng dẫn người dùng dùng app (mọi module, thao tác, vai trò).
 * ⚠️ CẬP NHẬT FILE NÀY mỗi khi thêm/đổi/đổi tên tính năng — cả Lisa và Maika đều đọc từ đây.
 * Viết dạng cheat-sheet dày đặc để đủ phủ mà vẫn kiểm soát token (Lisa chạy model *lite*).
 */
export const APP_GUIDE = `=== CẨM NANG TOÀN DIỆN PICKLEFUND (để hướng dẫn người dùng dùng app) ===
PickleFund = nền tảng quản lý quỹ & hoạt động CLB thể thao ĐA BỘ MÔN tại Việt Nam (KHÔNG chỉ pickleball).
7 bộ môn tạo giải: Pickleball, Tennis, Cầu lông, Bóng bàn (môn vợt — đánh đôi/đơn/vòng bảng);
Bóng đá, Bóng rổ (đồng đội — vòng tròn hoặc loại trực tiếp, tính điểm & hiệu số);
Golf (cá nhân — stroke-play, tổng gậy nhỏ nhất thắng).
Khi người dùng hỏi "cách làm X" hoặc "app có gì", dựa vào cẩm nang này để chỉ CỤ THỂ: vào module nào, bấm gì.
Nếu thao tác cần quyền quản trị mà người hỏi là thành viên → vẫn chỉ đường và nói rõ "cần quyền Chủ nhiệm/Thủ quỹ".

VAI TRÒ & QUYỀN:
- Chủ nhiệm (Club Admin): toàn quyền quản lý CLB.
- Thủ quỹ: quản lý tài chính (thu/chi/sổ quỹ/nhắc nợ) + xem chấm điểm.
- Thành viên: CHỈ XEM dữ liệu CLB + tự thao tác phần CÁ NHÂN (đăng ký buổi, check-in, xem số dư/công nợ/phiếu thu của mình).
- Super Admin: quản trị nhiều CLB (cấp hệ thống).
Quy tắc chung: mọi Thêm/Sửa/Xóa (tạo giải, nhập thu-chi, tạo kỳ quỹ, quản lý thành viên...) = quyền Chủ nhiệm/Thủ quỹ; thành viên chỉ xem.

MENU: Chủ nhiệm có 6 module — AIDO (Văn phòng AI) · Thành viên · Tài chính · Hoạt động CLB · Tạo Giải đấu · Hệ thống.
Thủ quỹ: Tổng quan · Sổ quỹ · Chấm điểm · Nhắc nhở. Thành viên: Văn phòng AI · Tổng quan · Cá nhân · Tài chính · Hoạt động · Giải đấu · Thông báo.

── MODULE "TÀI CHÍNH" (tab: Tổng quan · Kỳ Quỹ · Thu · Chi · Công nợ · Báo cáo) ──
• Kỳ Quỹ: tạo Quỹ Chính / Quỹ Phụ (có thể sao chép thành viên từ kỳ trước); sửa/xóa (đơn & hàng loạt); Bắt đầu/Đóng/Mở lại kỳ; tạo phiếu thu cho cả kỳ; Nhập Excel đóng quỹ (có file mẫu); Nhập dữ liệu CLB mới; xem/copy mã QR VietQR; xem số dư chuyển kỳ & giao dịch nổi bật.
• Thu Quỹ (đóng quỹ): 2 bảng Quỹ Chính (chọn kỳ) & Quỹ Phụ; Ghi nhận thu (nguồn quỹ, thành viên, kỳ, số tiền, ngày, CK/tiền mặt); ghi cho tất cả người chưa đóng; sửa/xóa; Bật/tắt xác nhận đóng quỹ; xuất phiếu thu Quỹ Phụ (PDF); xuất Excel/PDF.
• Chi phí: thêm khoản chi (nguồn quỹ, kỳ, loại: thuê sân / sinh hoạt; phân bổ: chia đều / theo số buổi / theo người tham gia); đính kèm hóa đơn; duyệt trạng thái (Chờ duyệt/Đã duyệt/Đã thanh toán/Từ chối); sửa/xóa; xuất PDF.
• Công nợ: theo dõi (chỉ xem) ai còn nợ / chờ xác nhận / đã đóng + tỷ lệ thu.
• Báo cáo: 4 tab (Tổng hợp/Tài chính/Thành viên/Điểm danh) + biểu đồ + bill từng người; Xuất PDF/Excel/Infographic.
Thủ quỹ có màn riêng "Sổ quỹ": Nhập thu · Nhập chi · Sổ Quỹ Chi Tiết (số dư lũy kế); và "Nhắc nhở": gửi nhắc đóng quỹ từng người hoặc tất cả.

── MODULE "THÀNH VIÊN" (tab: Danh sách · Tài khoản · Vai trò & phân quyền · Lịch sử) ──
Thêm/sửa/xóa thành viên (họ tên, SĐT, email, ngày vào, trình độ); đổi trạng thái (Đang hoạt động/Tạm ngưng/Đã rời); xuất Excel/PDF. Tài khoản: tạo (đơn & hàng loạt), reset mật khẩu, khóa/mở khóa. Vai trò: gán Chủ nhiệm/Thủ quỹ/Thành viên.

── MODULE "HOẠT ĐỘNG CLB" (tab: Lịch · Đăng ký · Check-in · Điểm danh · Hoạt động tuần) ──
Lịch sinh hoạt: xem/tạo/sửa/xóa buổi chơi. Đăng ký buổi: thành viên tự đăng ký (RSVP) buổi sắp tới. Check-in: điểm danh một chạm. Điểm danh: tạo buổi, đánh dấu có mặt & lưu, sửa/xóa buổi, chuyển buổi sang kỳ quỹ khác. Hoạt động tuần: thống kê số buổi/đăng ký/check-in/tỷ lệ chuyên cần (xem).

── MODULE "TẠO GIẢI ĐẤU" (tên cũ "Thi đấu") ──
Màn chính 2 cột: TRÁI = form tạo giải (chọn 1 trong 7 bộ môn → tên/ngày → tạo); PHẢI = tổng quan bộ môn đang chọn (KPI · lịch thi đấu · bảng xếp hạng · thể thức · hoạt động gần đây). Có nút "Danh sách giải" xem tất cả.
• Tạo giải (quyền admin/được ủy quyền): chọn bộ môn → thể thức → vợt: chọn thành viên + bốc thăm; bóng đá/rổ: dựng đội & cầu thủ, chọn Vòng tròn/Loại trực tiếp, nhập tỉ số; golf: thêm golfer, nhập gậy từng vòng.
• Trong màn giải: bốc thăm vòng, nhập/lưu kết quả từng trận, kết thúc giải; xem Bảng xếp hạng & Lịch thi đấu; xuất BXH ra ảnh/PDF.
• Danh sách giải: lọc theo bộ môn & trạng thái; Xem/Sửa/Xóa; nút "Ủy quyền" (admin chọn thành viên được phép quản lý giải).
Thành viên: xem giải/BXH/lịch; chỉ quản lý nếu được ủy quyền.

── "CHẤM ĐIỂM" (thành viên) ──
Điểm mặc định 100, tự trừ theo điểm danh & đóng quỹ, cộng/trừ điều chỉnh thủ công. Chủ nhiệm: thêm/xóa quy tắc (nhóm Tham gia/Đóng góp/Kỷ luật/Thưởng...), thêm điều chỉnh cho thành viên, chốt kỳ. Thủ quỹ/thành viên: xem.

── MODULE "HỆ THỐNG" (tab: Thông báo · Gói dịch vụ · Cài đặt) ──
Thông báo: xem & đánh dấu đã đọc (nhắc đóng quỹ, buổi chơi, cảnh báo, brief); badge số chưa đọc cập nhật ~30s. Gói dịch vụ: xem gói & chi phí (nâng cấp gói). Cài đặt: Thông tin CLB · Thương hiệu (logo/màu/tên/favicon/footer PDF/nền login) · Tài khoản (đổi mật khẩu) · Thông báo · Thanh toán (thông tin ngân hàng cho QR) · Telegram.

── AI (đội ngũ 4 trợ lý) ──
Maika (phân tích & cảnh báo, điểm sức khỏe CLB — cho admin), Lisa (trợ lý thành viên — chính là tôi, hỏi đáp & nhắc nhở), Hermes (duyệt & kiểm soát hành động), Mít Đặc (thực thi tác vụ). AIDO = "Văn phòng AI" xem đội ngũ & vận hành; admin duyệt hành động AI ở màn AI Approvals.

── KHÁI NIỆM CẦN BIẾT ──
• Quỹ Chính (chung): đóng theo KỲ, tính theo số thành viên, có công nợ & nhắc nợ. Quỹ Phụ (Mini/game): thu theo loại (phạt/thưởng/game...), người nộp có thể là khách, không bắt buộc gắn kỳ; có phiếu thu riêng.
• 3 trạng thái đóng quỹ: Chưa đóng → Chờ xác nhận (đã ghi nhận, chưa duyệt) → Đã đóng (đã xác nhận). Thủ quỹ bật/tắt xác nhận ở Thu Quỹ/Nhập thu.
• Trạng thái kỳ quỹ: Nháp → Đang mở → Đóng/Đã chốt (nút Bắt đầu/Đóng/Mở lại).
• Ủy quyền minigame: admin cho phép thành viên cụ thể quản lý giải (nút "Ủy quyền" ở Danh sách giải).
• Xuất PDF/Excel có ở: Kỳ Quỹ, Thu Quỹ, Chi phí, Báo cáo (+Infographic), Thành viên, Phiếu thu cá nhân.
• Đổi mật khẩu: Cài đặt → Tài khoản (hoặc trang đổi mật khẩu bắt buộc lần đầu). Đổi vai trò: Thành viên → Vai trò & phân quyền. Giao diện toàn tiếng Việt.
• Kênh thông báo: In-app, Email, Telegram (bật/cấu hình ở Cài đặt).

THÀNH VIÊN tự làm được: xem hồ sơ & số dư; phiếu thu (có QR khi còn nợ, xuất PDF); lịch sử đóng & sao kê kỳ đã chốt; lịch tham gia; công nợ cá nhân; đăng ký buổi & check-in; xem thông báo; xem giải/BXH. KHÔNG tạo/sửa/xóa dữ liệu CLB.

HƯỚNG DẪN NHANH (nhu cầu → vào đâu):
- Kiểm tra đã đóng quỹ chưa / còn nợ: Tài chính → Công nợ (hoặc hỏi thẳng tôi để xem số của bạn).
- Đóng quỹ / lấy mã QR: mở Phiếu thu (Cá nhân → Phiếu thu) có QR; việc GHI NHẬN thu do thủ quỹ làm ở Thu Quỹ.
- Đăng ký / điểm danh buổi chơi: Hoạt động CLB → Đăng ký buổi / Check-in.
- Xem hoặc tạo giải đấu, xem bảng xếp hạng: Tạo Giải đấu (tạo giải cần quyền admin).
- Xuất báo cáo tài chính: Tài chính → Báo cáo → Xuất PDF/Excel/Infographic.
- Thêm thành viên / tạo tài khoản / đổi vai trò: module Thành viên (quyền admin).
- Đổi mật khẩu / logo / thông tin CLB / ngân hàng QR: Hệ thống → Cài đặt.
- Nhắc thành viên đóng quỹ: (thủ quỹ) Nhắc nhở → Gửi nhắc.`;
