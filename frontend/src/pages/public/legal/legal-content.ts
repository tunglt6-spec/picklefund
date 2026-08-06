/**
 * Nội dung các trang Pháp lý — BẢN NHÁP / KHUNG THAM KHẢO.
 * QUAN TRỌNG: đây KHÔNG phải văn bản pháp lý có hiệu lực. Nội dung mang tính khung, cần
 * Ban quản trị và tư vấn pháp lý rà soát & phê duyệt trước khi công bố ràng buộc.
 * Chỉ nêu những thực hành có thật (multi-tenant, RBAC, human-in-the-loop); không bịa
 * chứng chỉ tuân thủ, cam kết uptime hay điều khoản chưa được duyệt.
 */

export interface LegalSection {
  h: string
  p?: string[]
  ul?: string[]
}
export interface LegalDoc {
  slug: string
  title: string
  intro: string
  sections: LegalSection[]
}

export const LEGAL_DOCS: Record<'terms' | 'privacy' | 'cookie', LegalDoc> = {
  terms: {
    slug: 'terms',
    title: 'Điều khoản sử dụng',
    intro:
      'Điều khoản này mô tả các nguyên tắc sử dụng nền tảng PickleFund. Nội dung dưới đây là bản nháp tham khảo và sẽ được hoàn thiện chính thức.',
    sections: [
      { h: '1. Chấp nhận điều khoản', p: ['Bằng việc tạo tài khoản và sử dụng PickleFund, người dùng đồng ý với các nguyên tắc vận hành nêu tại đây. Nếu không đồng ý, vui lòng không sử dụng dịch vụ.'] },
      { h: '2. Tài khoản & vai trò', p: ['Mỗi câu lạc bộ (CLB) quản lý người dùng theo vai trò (quản trị, thủ quỹ, thành viên). Chủ tài khoản chịu trách nhiệm bảo mật thông tin đăng nhập và các hoạt động phát sinh trong CLB của mình.'] },
      { h: '3. Sử dụng hợp lệ', ul: ['Không dùng dịch vụ cho mục đích vi phạm pháp luật.', 'Không xâm phạm dữ liệu của CLB hoặc người dùng khác.', 'Không can thiệp, dò quét hay gây quá tải hệ thống.'] },
      { h: '4. Dữ liệu của CLB', p: ['Dữ liệu do CLB nhập vào thuộc quyền quản lý của CLB đó. PickleFund phân tách dữ liệu theo từng CLB (multi-tenant) và kiểm soát truy cập theo vai trò.'] },
      { h: '5. Vai trò của AI', p: ['Các trợ lý AI hỗ trợ phân tích và thực thi tác vụ lặp lại. Mọi hành động quan trọng, đặc biệt liên quan tài chính, đều cần con người phê duyệt — AI không tự quyết.'] },
      { h: '6. Thanh toán & gói dịch vụ', p: ['Chi tiết về gói, thời hạn, gia hạn và chính sách hoàn tiền được nêu tại trang Bảng giá và sẽ được cập nhật chính thức trong phiên bản hoàn thiện của điều khoản này.'] },
      { h: '7. Giới hạn trách nhiệm', p: ['Dịch vụ được cung cấp trên cơ sở nỗ lực hợp lý. Các cam kết cụ thể về mức độ sẵn sàng dịch vụ sẽ được công bố khi có.'] },
      { h: '8. Thay đổi điều khoản', p: ['Điều khoản có thể được cập nhật. Phiên bản mới sẽ được thông báo qua kênh chính thức của sản phẩm.'] },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: 'Chính sách bảo mật',
    intro:
      'Chính sách này mô tả cách PickleFund thu thập và xử lý dữ liệu. Nội dung dưới đây là bản nháp tham khảo và sẽ được hoàn thiện chính thức.',
    sections: [
      { h: '1. Dữ liệu chúng tôi xử lý', ul: ['Thông tin tài khoản (tên, email, vai trò).', 'Dữ liệu vận hành CLB do người dùng nhập (thành viên, thu/chi, hoạt động, giải đấu).', 'Dữ liệu kỹ thuật cần thiết để vận hành dịch vụ.'] },
      { h: '2. Mục đích sử dụng', p: ['Dữ liệu được dùng để cung cấp và cải thiện dịch vụ quản trị CLB. Chúng tôi không bán dữ liệu người dùng.'] },
      { h: '3. Phân tách & kiểm soát truy cập', p: ['Dữ liệu được phân tách theo từng CLB (multi-tenant). Truy cập được kiểm soát theo vai trò — mỗi người chỉ thấy phần liên quan tới mình.'] },
      { h: '4. Xử lý bởi AI', p: ['Trợ lý AI xử lý dữ liệu của chính CLB để phân tích và hỗ trợ. AI không tự thực hiện hành động quan trọng khi chưa có phê duyệt của con người.'] },
      { h: '5. Lưu trữ & sao lưu', p: ['Hệ thống thực hiện sao lưu định kỳ. Các cam kết chi tiết về sao lưu và khôi phục sẽ được công bố tại Trung tâm Tin cậy khi hoàn thiện.'] },
      { h: '6. Quyền của người dùng', p: ['Người dùng có thể yêu cầu truy cập, chỉnh sửa hoặc xử lý dữ liệu của mình thông qua kênh hỗ trợ chính thức.'] },
      { h: '7. Liên hệ', p: ['Mọi yêu cầu liên quan tới dữ liệu, vui lòng liên hệ qua trang Liên hệ.'] },
    ],
  },
  cookie: {
    slug: 'cookie',
    title: 'Chính sách cookie',
    intro:
      'Chính sách này mô tả cách PickleFund sử dụng cookie và bộ nhớ cục bộ. Nội dung dưới đây là bản nháp tham khảo và sẽ được hoàn thiện chính thức.',
    sections: [
      { h: '1. Cookie là gì', p: ['Cookie và bộ nhớ cục bộ (local storage) là các cơ chế lưu trữ nhỏ trên thiết bị giúp dịch vụ hoạt động và ghi nhớ tùy chọn của bạn.'] },
      { h: '2. Chúng tôi dùng để làm gì', ul: ['Duy trì phiên đăng nhập.', 'Ghi nhớ tùy chọn giao diện (ví dụ chế độ sáng/tối).', 'Đảm bảo các chức năng cốt lõi hoạt động ổn định.'] },
      { h: '3. Quản lý cookie', p: ['Bạn có thể xóa hoặc chặn cookie trong cài đặt trình duyệt. Lưu ý một số chức năng cần thiết có thể không hoạt động đúng nếu bị chặn.'] },
      { h: '4. Cập nhật', p: ['Chính sách này có thể được cập nhật cùng với các thay đổi của sản phẩm.'] },
    ],
  },
}
