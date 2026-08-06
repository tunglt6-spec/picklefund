/**
 * Nội dung Blog — cẩm nang vận hành CLB do Đội ngũ PickleFund biên soạn.
 * Nguyên tắc: nội dung giáo dục/how-to có thật, bám vào tính năng sản phẩm thật;
 * KHÔNG bịa số liệu khách hàng, KHÔNG gán tác giả cá nhân giả, KHÔNG chỉ số tương tác ảo.
 */

export interface BlogSection {
  h?: string
  p?: string[]
  ul?: string[]
}
export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  category: string
  readMins: number
  /** Nội dung bài viết dạng section (heading + đoạn văn + gạch đầu dòng). */
  body: BlogSection[]
}

export const BLOG_CATEGORIES = ['Tài chính', 'Vận hành', 'AI & Chuyển đổi số'] as const

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'quan-ly-quy-clb-minh-bach',
    title: 'Quản lý quỹ CLB minh bạch: 5 nguyên tắc nền tảng',
    excerpt:
      'Quỹ minh bạch là gốc rễ của niềm tin trong một CLB. Năm nguyên tắc dưới đây giúp Ban quản trị vận hành tài chính rõ ràng, giảm tranh cãi và dễ đối soát.',
    category: 'Tài chính',
    readMins: 6,
    body: [
      {
        p: [
          'Phần lớn mâu thuẫn trong các CLB thể thao phong trào không đến từ chuyên môn, mà đến từ tiền. Một khoản thu không rõ nguồn, một khoản chi không có chứng từ, hay một bảng công nợ mỗi người hiểu một kiểu — tất cả đều bào mòn niềm tin. Minh bạch tài chính vì thế không phải là "làm cho đẹp", mà là điều kiện để CLB tồn tại lâu dài.',
        ],
      },
      {
        h: '1. Tách bạch quỹ theo mục đích',
        p: [
          'Hãy phân biệt rõ quỹ chung (vận hành thường xuyên: thuê sân, nước, vật tư) và các quỹ mini theo mục tiêu (giải đấu, du đấu, từ thiện). Việc tách bạch giúp mỗi đồng tiền có "địa chỉ" rõ ràng và tránh tình trạng lấy quỹ mục này bù mục kia.',
        ],
        ul: [
          'Quỹ chung: thu đều đặn, chi cho hoạt động lặp lại.',
          'Quỹ mini: gắn với một sự kiện/mục tiêu cụ thể, có thời hạn.',
          'Không trộn số dư giữa các quỹ khi báo cáo.',
        ],
      },
      {
        h: '2. Mọi khoản đều có lịch sử',
        p: [
          'Một khoản thu/chi chỉ đáng tin khi trả lời được: ai, khi nào, bao nhiêu, vì việc gì. Ghi nhận ngay tại thời điểm phát sinh — càng để lâu càng dễ sai sót và quên.',
        ],
      },
      {
        h: '3. Đối soát công nợ định kỳ',
        p: [
          'Công nợ để lâu là nguồn tranh cãi lớn nhất. Hãy chốt công nợ theo kỳ (tháng/quý), gửi cho từng thành viên bảng đối chiếu của riêng họ, và xử lý dứt điểm trước khi mở kỳ mới.',
        ],
      },
      {
        h: '4. Báo cáo theo kỳ, không theo cảm tính',
        p: [
          'Thay vì trả lời "quỹ còn nhiều mà" khi có người hỏi, hãy để số liệu tự nói: tổng thu, tổng chi, số dư từng quỹ, và biến động so với kỳ trước. Báo cáo định kỳ giúp Ban quản trị phát hiện sớm xu hướng bất thường.',
        ],
      },
      {
        h: '5. Ai cũng xem được phần liên quan đến mình',
        p: [
          'Minh bạch không có nghĩa là mọi người thấy mọi thứ, mà là mỗi người thấy đúng phần liên quan: thành viên xem được lịch sử đóng góp của mình; Ban quản trị xem toàn cảnh. Phân quyền rõ ràng vừa bảo vệ dữ liệu, vừa tạo niềm tin.',
        ],
      },
      {
        h: 'PickleFund hỗ trợ thế nào',
        p: [
          'PickleFund số hóa cả năm nguyên tắc trên: quỹ chung và quỹ mini tách bạch, mỗi khoản thu/chi có lịch sử đầy đủ, đối soát công nợ theo kỳ quỹ, và báo cáo tài chính xuất PDF/Excel chỉ bằng vài thao tác. Thành viên đăng nhập chỉ thấy dữ liệu của CLB mình theo đúng vai trò được cấp.',
        ],
      },
    ],
  },
  {
    slug: 'tang-chuyen-can-buoi-tap',
    title: 'Tăng chuyên cần buổi tập bằng quy trình điểm danh gọn nhẹ',
    excerpt:
      'Chuyên cần thấp thường không phải vì thành viên lười, mà vì quy trình đăng ký và điểm danh rườm rà. Đây là cách làm cho nó nhẹ đi.',
    category: 'Vận hành',
    readMins: 5,
    body: [
      {
        p: [
          'Với CLB phong trào, việc "gom đủ người cho một buổi" nhiều khi tốn công hơn cả buổi tập. Nhắn tin từng nhóm, đếm tay ai đi ai không, rồi lại chia tiền sân thủ công — quy trình càng nặng, thành viên càng ngại. Mấu chốt để tăng chuyên cần là giảm ma sát ở mỗi bước.',
        ],
      },
      {
        h: 'Cho thành viên tự đăng ký',
        p: [
          'Thay vì Ban quản trị đi hỏi từng người, hãy để thành viên tự đăng ký buổi. Việc chủ động "giơ tay" cũng làm tăng cam kết tham gia so với bị động chờ được gọi.',
        ],
      },
      {
        h: 'Check-in nhanh tại sân',
        p: [
          'Điểm danh nên xong trong vài giây: đánh dấu có mặt/vắng mặt ngay trên điện thoại, không cần sổ sách. Dữ liệu điểm danh chính xác là nền tảng để chia chi phí công bằng.',
        ],
        ul: [
          'Đánh dấu PRESENT/ABSENT theo thời gian thực.',
          'Ai đăng ký nhưng vắng vẫn được ghi nhận để đối chiếu.',
          'Số liệu chuyên cần tự tổng hợp theo tháng.',
        ],
      },
      {
        h: 'Chia chi phí theo buổi, tự động',
        p: [
          'Khi điểm danh đã chính xác, việc phân bổ tiền sân theo số người thực đến trở nên hiển nhiên và không ai thắc mắc. Tự động hóa bước này loại bỏ phần lớn tranh cãi "sao tháng này tôi đóng nhiều thế".',
        ],
      },
      {
        h: 'Nhìn lại số liệu để điều chỉnh',
        p: [
          'Chuyên cần theo tháng cho Ban quản trị biết khung giờ nào đông, khung giờ nào vắng, ai có dấu hiệu "rơi rụng" để chủ động giữ chân. Dữ liệu biến quản lý cảm tính thành quyết định có cơ sở.',
        ],
      },
      {
        h: 'PickleFund hỗ trợ thế nào',
        p: [
          'PickleFund cho phép tạo buổi chơi, mở đăng ký, self check-in, điểm danh PRESENT/ABSENT và tự phân bổ chi phí theo buổi. Thống kê chuyên cần theo tháng hiển thị ngay trên dashboard, giúp Ban quản trị nắm tình hình mà không cần cộng tay.',
        ],
      },
    ],
  },
  {
    slug: 'ung-dung-ai-van-hanh-clb',
    title: 'Ứng dụng AI vào vận hành CLB mà vẫn giữ quyền kiểm soát',
    excerpt:
      'AI có thể gánh phần việc lặp lại của CLB, nhưng con người phải giữ quyền quyết định — đặc biệt với tiền bạc. Đây là ranh giới nên thiết lập.',
    category: 'AI & Chuyển đổi số',
    readMins: 6,
    body: [
      {
        p: [
          'Khi nói đến AI, nỗi lo lớn nhất của Ban quản trị thường là: "Lỡ nó tự ý làm sai thì sao?". Đây là lo ngại chính đáng. Nguyên tắc an toàn khi đưa AI vào vận hành CLB là human-in-the-loop: AI đề xuất và thực thi tác vụ lặp lại, nhưng mọi hành động quan trọng đều phải qua con người phê duyệt.',
        ],
      },
      {
        h: 'Việc nên giao cho AI',
        ul: [
          'Tổng hợp, phân tích số liệu và nhận diện điểm bất thường.',
          'Soạn nháp báo cáo, tin nhắn, lời nhắc theo mẫu.',
          'Nhắc lịch, nhắc công nợ, gửi thông báo đã được cấu hình.',
          'Trả lời các câu hỏi thường gặp của thành viên.',
        ],
      },
      {
        h: 'Việc phải giữ cho con người',
        ul: [
          'Mọi khoản chi tiền và cam kết tài chính.',
          'Phê duyệt thay đổi vai trò, quyền truy cập.',
          'Quyết định có tính chính sách của CLB.',
        ],
      },
      {
        h: 'Vì sao ranh giới này quan trọng',
        p: [
          'Giao cho AI phần lặp lại giúp Ban quản trị tiết kiệm thời gian và giảm sai sót thủ công. Nhưng giữ quyền quyết định ở con người mới là thứ bảo vệ CLB khỏi rủi ro: một đề xuất sai của AI, nếu luôn cần người bấm "duyệt", sẽ không bao giờ tự động biến thành hậu quả thật.',
        ],
      },
      {
        h: 'PickleFund hỗ trợ thế nào',
        p: [
          'Đội ngũ AI của PickleFund (AIDO) được thiết kế theo đúng nguyên tắc này: Maika phân tích và khuyến nghị, Lisa hỗ trợ thành viên, Hermes điều phối workflow, Mít Đặc thực thi sau khi được duyệt, và Notification AI gửi thông báo. Mọi con số đến từ dữ liệu thật của CLB, và mọi việc quan trọng đều chờ Ban quản trị xác nhận.',
        ],
      },
    ],
  },
]

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug)
}
