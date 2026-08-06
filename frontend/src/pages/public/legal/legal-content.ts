/**
 * Nội dung các trang Pháp lý — BẢN NHÁP / KHUNG THAM KHẢO ĐẦY ĐỦ HƠN.
 * QUAN TRỌNG: đây KHÔNG phải văn bản pháp lý có hiệu lực. Nội dung mang tính khung để Ban quản
 * trị + tư vấn pháp lý rà soát & phê duyệt trước khi công bố ràng buộc.
 * - Chỉ nêu thực hành có thật (multi-tenant, RBAC, human-in-the-loop, HTTPS, sao lưu định kỳ).
 * - KHÔNG bịa chứng chỉ tuân thủ, cam kết uptime, tên pháp nhân, địa chỉ hay ngày hiệu lực.
 *   Những chỗ đó để dạng placeholder "[…]" trong `placeholders` để người phụ trách điền.
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
  /** Các thông tin pháp nhân/định danh CẦN ĐIỀN trước khi công bố (hiển thị dạng nhắc việc). */
  placeholders: string[]
  sections: LegalSection[]
}

const CONTACT_NOTE = 'Mọi yêu cầu liên quan tới nội dung này, vui lòng liên hệ qua trang Liên hệ hoặc email hỗ trợ chính thức của PickleFund.'

export const LEGAL_DOCS: Record<'terms' | 'privacy' | 'cookie', LegalDoc> = {
  terms: {
    slug: 'terms',
    title: 'Điều khoản sử dụng',
    intro:
      'Điều khoản này mô tả các nguyên tắc khi sử dụng nền tảng PickleFund. Đây là bản nháp tham khảo; phiên bản chính thức sẽ được công bố sau khi hoàn thiện.',
    placeholders: ['Tên pháp nhân vận hành', 'Địa chỉ đăng ký kinh doanh', 'Mã số doanh nghiệp/thuế', 'Ngày hiệu lực', 'Luật áp dụng & cơ quan giải quyết tranh chấp'],
    sections: [
      { h: '1. Giới thiệu & phạm vi', p: ['Điều khoản áp dụng cho mọi người dùng truy cập và sử dụng nền tảng PickleFund ("Dịch vụ"), bao gồm website và ứng dụng. Bằng việc tạo tài khoản hoặc sử dụng Dịch vụ, bạn đồng ý với các nguyên tắc dưới đây. Nếu không đồng ý, vui lòng ngừng sử dụng.'] },
      { h: '2. Định nghĩa', ul: ['"CLB": câu lạc bộ/tổ chức sử dụng Dịch vụ để quản lý hoạt động.', '"Người dùng": cá nhân truy cập Dịch vụ với một vai trò nhất định.', '"Nội dung của CLB": dữ liệu do CLB và thành viên nhập vào Dịch vụ.'] },
      { h: '3. Tài khoản & vai trò', p: ['Mỗi CLB quản lý người dùng theo vai trò (quản trị, thủ quỹ, thành viên và các vai trò tùy chỉnh). Người dùng chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động phát sinh dưới tài khoản của mình. Vui lòng thông báo ngay khi nghi ngờ tài khoản bị truy cập trái phép.'] },
      { h: '4. Đăng ký & dùng thử', p: ['Một số gói cho phép dùng thử hoặc sử dụng miễn phí với giới hạn nhất định. Chúng tôi có thể điều chỉnh phạm vi gói miễn phí và sẽ thông báo qua kênh chính thức khi có thay đổi đáng kể.'] },
      { h: '5. Gói dịch vụ & thanh toán', p: ['Chi tiết các gói, giới hạn, chu kỳ và cách gia hạn được nêu tại trang Bảng giá. Phí (nếu có) được tính theo gói và thời hạn bạn chọn. Khi hết hạn, tài khoản có thể được áp dụng thời gian ân hạn trước khi tự động hạ về gói thấp hơn.'] },
      { h: '6. Chính sách hoàn tiền', p: ['Điều kiện và quy trình hoàn tiền sẽ được quy định cụ thể trong phiên bản chính thức. Trước khi trả phí, bạn có thể dùng thử để đánh giá mức độ phù hợp. Nội dung phần này cần được hoàn thiện và phê duyệt trước khi có hiệu lực.'] },
      { h: '7. Sử dụng hợp lệ', ul: ['Không dùng Dịch vụ cho mục đích vi phạm pháp luật.', 'Không truy cập trái phép dữ liệu của CLB hoặc người dùng khác.', 'Không can thiệp, dò quét, khai thác lỗ hổng hoặc gây quá tải hệ thống.', 'Không tải lên nội dung vi phạm quyền của bên thứ ba.'] },
      { h: '8. Dữ liệu & quyền sở hữu', p: ['Nội dung của CLB thuộc quyền quản lý của CLB đó. PickleFund phân tách dữ liệu theo từng CLB (multi-tenant) và kiểm soát truy cập theo vai trò. Chúng tôi xử lý dữ liệu để cung cấp và cải thiện Dịch vụ, theo Chính sách bảo mật.'] },
      { h: '9. Vai trò của AI', p: ['Các trợ lý AI hỗ trợ phân tích và thực thi tác vụ lặp lại dựa trên dữ liệu của chính CLB. Mọi hành động quan trọng, đặc biệt liên quan tài chính, đều cần con người phê duyệt — AI không tự quyết. Người dùng chịu trách nhiệm rà soát trước khi phê duyệt.'] },
      { h: '10. Sở hữu trí tuệ', p: ['Nền tảng, mã nguồn, giao diện, thương hiệu và tài liệu của PickleFund thuộc sở hữu của đơn vị vận hành. Người dùng được cấp quyền sử dụng Dịch vụ theo điều khoản này, không bao gồm quyền sao chép hay khai thác trái phép.'] },
      { h: '11. Tạm ngưng & chấm dứt', p: ['Chúng tôi có thể tạm ngưng hoặc chấm dứt quyền truy cập nếu phát hiện vi phạm điều khoản. Người dùng có thể ngừng sử dụng bất cứ lúc nào. Việc xử lý dữ liệu sau khi chấm dứt sẽ tuân theo Chính sách bảo mật và quy định hoàn thiện sau.'] },
      { h: '12. Giới hạn trách nhiệm & miễn trừ', p: ['Dịch vụ được cung cấp trên cơ sở nỗ lực hợp lý. Các cam kết cụ thể về mức độ sẵn sàng dịch vụ (nếu có) sẽ được công bố tại Trung tâm Tin cậy. Trong phạm vi pháp luật cho phép, đơn vị vận hành không chịu trách nhiệm cho các thiệt hại gián tiếp phát sinh ngoài tầm kiểm soát hợp lý.'] },
      { h: '13. Luật áp dụng & giải quyết tranh chấp', p: ['Luật áp dụng và cơ quan giải quyết tranh chấp sẽ được ghi rõ trong phiên bản chính thức. Các bên ưu tiên giải quyết trên tinh thần thiện chí trước khi sử dụng các biện pháp khác.'] },
      { h: '14. Thay đổi điều khoản', p: ['Điều khoản có thể được cập nhật theo thời gian. Thay đổi đáng kể sẽ được thông báo qua kênh chính thức. Việc tiếp tục sử dụng sau khi cập nhật đồng nghĩa với việc chấp nhận phiên bản mới.'] },
      { h: '15. Liên hệ', p: [CONTACT_NOTE] },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: 'Chính sách bảo mật',
    intro:
      'Chính sách này mô tả cách PickleFund thu thập, sử dụng và bảo vệ dữ liệu. Đây là bản nháp tham khảo; phiên bản chính thức sẽ được công bố sau khi hoàn thiện.',
    placeholders: ['Tên pháp nhân & vai trò bên kiểm soát dữ liệu', 'Đầu mối phụ trách dữ liệu (DPO/liên hệ)', 'Danh sách nhà cung cấp hạ tầng/bên xử lý', 'Thời hạn lưu trữ cụ thể', 'Ngày hiệu lực'],
    sections: [
      { h: '1. Phạm vi', p: ['Chính sách áp dụng cho dữ liệu được xử lý khi bạn sử dụng nền tảng PickleFund. Chính sách cần được đọc cùng với Điều khoản sử dụng và Chính sách cookie.'] },
      { h: '2. Dữ liệu chúng tôi xử lý', ul: ['Thông tin tài khoản: tên, email, vai trò.', 'Nội dung vận hành CLB do người dùng nhập: thành viên, thu/chi, hoạt động, giải đấu.', 'Dữ liệu kỹ thuật cần thiết để vận hành và bảo mật Dịch vụ (ví dụ nhật ký truy cập ở mức tối thiểu).'] },
      { h: '3. Cách chúng tôi thu thập', p: ['Dữ liệu được thu thập trực tiếp khi bạn tạo tài khoản, nhập liệu hoặc sử dụng các tính năng của Dịch vụ. Một phần dữ liệu kỹ thuật được tạo ra tự động trong quá trình vận hành.'] },
      { h: '4. Mục đích sử dụng', ul: ['Cung cấp và duy trì các tính năng quản trị CLB.', 'Bảo mật, phát hiện lạm dụng và khắc phục sự cố.', 'Cải thiện chất lượng Dịch vụ.', 'Liên hệ hỗ trợ theo yêu cầu.'] },
      { h: '5. Phân tách & kiểm soát truy cập', p: ['Dữ liệu được phân tách theo từng CLB (multi-tenant). Truy cập được kiểm soát theo vai trò — mỗi người chỉ thấy phần liên quan tới mình. Truy cập tới hệ thống được thực hiện qua kết nối mã hóa (HTTPS).'] },
      { h: '6. Chia sẻ với bên thứ ba', p: ['Chúng tôi không bán dữ liệu người dùng. Dữ liệu có thể được xử lý bởi các nhà cung cấp hạ tầng phục vụ vận hành Dịch vụ; danh sách và vai trò của các bên này sẽ được nêu rõ trong phiên bản chính thức. Chúng tôi có thể tiết lộ khi pháp luật yêu cầu.'] },
      { h: '7. Xử lý bởi AI', p: ['Trợ lý AI xử lý dữ liệu của chính CLB để phân tích và hỗ trợ. AI không tự thực hiện hành động quan trọng khi chưa có phê duyệt của con người.'] },
      { h: '8. Lưu trữ & sao lưu', p: ['Hệ thống thực hiện sao lưu định kỳ để phục vụ khôi phục. Thời hạn lưu trữ cụ thể theo loại dữ liệu sẽ được nêu rõ trong phiên bản chính thức. Các cam kết chi tiết về sao lưu/khôi phục được trình bày tại Trung tâm Tin cậy khi hoàn thiện.'] },
      { h: '9. Cookie', p: ['Việc sử dụng cookie và bộ nhớ cục bộ được mô tả tại Chính sách cookie.'] },
      { h: '10. Quyền của bạn', p: ['Bạn có thể yêu cầu truy cập, chỉnh sửa hoặc xử lý dữ liệu của mình thông qua kênh hỗ trợ chính thức. Chúng tôi xử lý các yêu cầu hợp lệ theo quy định pháp luật áp dụng.'] },
      { h: '11. Dữ liệu trẻ em', p: ['Dịch vụ hướng tới việc quản lý CLB do người trưởng thành phụ trách. Nếu CLB quản lý dữ liệu của người chưa thành niên, người phụ trách chịu trách nhiệm bảo đảm cơ sở pháp lý phù hợp khi nhập liệu.'] },
      { h: '12. Thay đổi chính sách', p: ['Chính sách có thể được cập nhật. Thay đổi đáng kể sẽ được thông báo qua kênh chính thức.'] },
      { h: '13. Liên hệ', p: [CONTACT_NOTE] },
    ],
  },
  cookie: {
    slug: 'cookie',
    title: 'Chính sách cookie',
    intro:
      'Chính sách này mô tả cách PickleFund sử dụng cookie và bộ nhớ cục bộ. Đây là bản nháp tham khảo; phiên bản chính thức sẽ được công bố sau khi hoàn thiện.',
    placeholders: ['Danh sách cookie bên thứ ba (nếu có)', 'Thời hạn lưu của từng loại', 'Ngày hiệu lực'],
    sections: [
      { h: '1. Cookie là gì', p: ['Cookie và bộ nhớ cục bộ (local storage) là các cơ chế lưu trữ nhỏ trên thiết bị, giúp Dịch vụ hoạt động và ghi nhớ tùy chọn của bạn.'] },
      { h: '2. Các loại chúng tôi sử dụng', ul: ['Cần thiết: duy trì phiên đăng nhập và các chức năng cốt lõi (không thể tắt nếu muốn dùng Dịch vụ).', 'Tùy chọn: ghi nhớ thiết lập giao diện như chế độ sáng/tối.'] },
      { h: '3. Cookie bên thứ ba', p: ['Nếu Dịch vụ sử dụng thành phần của bên thứ ba có đặt cookie, danh sách và mục đích sẽ được nêu rõ trong phiên bản chính thức.'] },
      { h: '4. Quản lý cookie', p: ['Bạn có thể xóa hoặc chặn cookie trong cài đặt trình duyệt. Lưu ý: một số chức năng cần thiết có thể không hoạt động đúng nếu bị chặn.'] },
      { h: '5. Cập nhật', p: ['Chính sách này có thể được cập nhật cùng với các thay đổi của sản phẩm.'] },
    ],
  },
}
