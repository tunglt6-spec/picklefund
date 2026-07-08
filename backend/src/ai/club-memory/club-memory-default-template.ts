/**
 * Club Memory — template mặc định áp dụng cho TOÀN NỀN TẢNG (mọi CLB).
 * Ban hành theo yêu cầu chủ nền tảng: quy định hoạt động CLB thể thao chung.
 * Dùng bởi:
 *  - AuthService.register() — CLB tự đăng ký (public signup).
 *  - ClubsService.create() — SUPER_ADMIN tạo CLB từ trang quản trị.
 *  - POST /club-memory/seed-default-all — backfill CLB đã tồn tại (SUPER_ADMIN).
 * Idempotent theo (clubId, title) — xem ClubMemoryService.seedDefaultTemplate().
 */
import { ClubMemoryType } from './club-memory.types';

export interface DefaultClubMemoryItem {
  type: ClubMemoryType;
  title: string;
  content: string;
  tags: string[];
}

export const DEFAULT_CLUB_MEMORY_TEMPLATE: DefaultClubMemoryItem[] = [
  {
    type: ClubMemoryType.KNOWLEDGE,
    title: 'Mục tiêu hoạt động CLB',
    content:
      'Rèn luyện sức khỏe.\nGiao lưu, đoàn kết, văn minh.\nChơi thể thao với tinh thần vui vẻ, công bằng.',
    tags: ['mục tiêu', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.RULE,
    title: 'Quy định về thành viên',
    content:
      'Tôn trọng mọi thành viên.\nKhông phân biệt trình độ, tuổi tác hay giới tính.\nThành viên mới được chào đón và hỗ trợ hòa nhập.',
    tags: ['thành viên', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.OPERATIONAL_NOTE,
    title: 'Quy định tham gia hoạt động',
    content:
      'Đến đúng giờ.\nNếu không tham gia, thông báo sớm cho Ban quản trị hoặc nhóm.\nTự bảo quản tài sản cá nhân.',
    tags: ['tham gia', 'vận hành', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.RULE,
    title: 'Văn hóa ứng xử',
    content:
      'Tôn trọng trọng tài, đối thủ và đồng đội.\nKhông chửi tục, gây gổ hoặc có hành vi thiếu văn minh.\nThắng không kiêu, thua không cay cú.',
    tags: ['ứng xử', 'văn hóa', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.POLICY,
    title: 'Quy định chi phí',
    content:
      'Thành viên có trách nhiệm đóng các khoản phí theo quy định.\nMọi khoản thu, chi được công khai và minh bạch.',
    tags: ['chi phí', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.RULE,
    title: 'Quy định an toàn',
    content:
      'Khởi động trước khi chơi.\nTự chịu trách nhiệm về tình trạng sức khỏe của bản thân.\nƯu tiên an toàn, không thi đấu khi có nguy cơ chấn thương.',
    tags: ['an toàn', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.RULE,
    title: 'Quy định kỷ luật',
    content:
      'Các hành vi sau có thể bị nhắc nhở hoặc đình chỉ tham gia:\nGây mất đoàn kết.\nGian lận trong thi đấu.\nKhông chấp hành quy định của CLB.\nLàm ảnh hưởng đến uy tín của CLB.',
    tags: ['kỷ luật', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.FACT,
    title: 'Nguyên tắc chung của CLB',
    content: 'Tôn trọng – Trung thực – Đoàn kết – Văn minh – An toàn – Vui khỏe.',
    tags: ['nguyên tắc', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.RULE,
    title: '5 nguyên tắc vàng của CLB',
    content:
      'Đúng giờ.\nChơi đẹp, không chơi xấu.\nTôn trọng mọi người.\nGiữ gìn tài sản và hình ảnh CLB.\nĐến để khỏe – về với niềm vui.',
    tags: ['nguyên tắc vàng', 'quy định CLB'],
  },
  // ── Bảng chấm điểm thành viên CLB (100 điểm) ────────────────────────────
  {
    type: ClubMemoryType.RULE,
    title: 'Chấm điểm thành viên - Tham gia',
    content:
      'Tham gia đúng giờ: +2 điểm\nĐi muộn: -2 điểm\nVắng có phép: 0 điểm\nVắng không phép: -5 điểm\nVắng ≥3 buổi liên tiếp không phép: -10 điểm',
    tags: ['chấm điểm', 'tham gia', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.RULE,
    title: 'Chấm điểm thành viên - Văn hóa ứng xử',
    content:
      'Tôn trọng thành viên, Fair Play: +3 điểm\nHỗ trợ đồng đội, thành viên mới: +2 điểm\nChửi tục, ứng xử thiếu văn minh: -5 điểm\nCãi vã, xúc phạm người khác: -10 điểm\nGây gổ, đánh nhau: -30 điểm',
    tags: ['chấm điểm', 'ứng xử', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.RULE,
    title: 'Chấm điểm thành viên - Đóng góp CLB',
    content:
      'Hỗ trợ tổ chức hoạt động: +5 điểm\nGiới thiệu thành viên mới: +5 điểm\nĐề xuất sáng kiến hữu ích: +3 điểm',
    tags: ['chấm điểm', 'đóng góp', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.RULE,
    title: 'Chấm điểm thành viên - Kỷ luật',
    content:
      'Chấp hành tốt nội quy: +2 điểm\nGian lận thi đấu: -10 điểm\nLàm ảnh hưởng uy tín CLB: -15 điểm\nPhá hoại tài sản CLB: -20 điểm',
    tags: ['chấm điểm', 'kỷ luật', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.POLICY,
    title: 'Chấm điểm thành viên - Tài chính',
    content:
      'Đóng quỹ đúng hạn: +2 điểm\nĐóng quỹ trễ hạn: -5 điểm\nNợ quỹ quá hạn: -10 điểm',
    tags: ['chấm điểm', 'tài chính', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.RULE,
    title: 'Chấm điểm thành viên - Thưởng đặc biệt',
    content:
      'Thành viên tiêu biểu tháng: +10 điểm\nĐóng góp đặc biệt cho CLB: +10 điểm',
    tags: ['chấm điểm', 'thưởng', 'quy định CLB'],
  },
  {
    type: ClubMemoryType.KNOWLEDGE,
    title: 'Xếp loại thành viên cuối tháng',
    content:
      'Thang điểm 100, xếp loại theo tổng điểm cuối tháng:\n95–100: Xuất sắc 🏆\n85–94: Tốt ⭐\n70–84: Đạt 👍\n50–69: Cần cải thiện ⚠️\nDưới 50: Xem xét tư cách thành viên 🚫',
    tags: ['chấm điểm', 'xếp loại', 'quy định CLB'],
  },
];
