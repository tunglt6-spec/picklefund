/**
 * Nội dung các trang Pháp lý CHÍNH THỨC (do chủ sản phẩm cung cấp, cập nhật 06/08/2026).
 * Mô hình "blocks" cho phép xen kẽ đoạn văn (p) / gạch đầu dòng (ul) / tiêu đề phụ (sub) /
 * khối liên hệ (contact) theo đúng thứ tự bản gốc.
 */

export interface LegalBlock {
  p?: string
  ul?: string[]
  sub?: string
  contact?: { org: string; website: string; email: string }
}
export interface LegalSection {
  h: string
  blocks: LegalBlock[]
}
export interface LegalDoc {
  slug: string
  title: string
  updatedAt: string
  intro: string
  sections: LegalSection[]
}

const CONTACT = { org: 'PickleFund – Sports Club Manager', website: 'https://app.picklefund.uk', email: 'support@picklefund.uk' }

export const LEGAL_DOCS: Record<'terms' | 'privacy' | 'cookie', LegalDoc> = {
  terms: {
    slug: 'terms',
    title: 'Điều khoản sử dụng',
    updatedAt: '06/08/2026',
    intro:
      'Chào mừng bạn đến với PickleFund – Sports Club Manager. Điều khoản sử dụng này quy định các quyền, nghĩa vụ và trách nhiệm của người dùng khi truy cập và sử dụng nền tảng PickleFund. Vui lòng đọc kỹ trước khi sử dụng dịch vụ.',
    sections: [
      { h: '1. Chấp nhận điều khoản', blocks: [
        { p: 'Bằng việc đăng ký tài khoản, đăng nhập hoặc sử dụng bất kỳ chức năng nào của PickleFund, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ Điều khoản sử dụng này cùng các chính sách liên quan của nền tảng.' },
        { p: 'Nếu bạn không đồng ý với bất kỳ nội dung nào, vui lòng không sử dụng dịch vụ.' },
      ] },
      { h: '2. Giới thiệu dịch vụ', blocks: [
        { p: 'PickleFund là nền tảng quản lý câu lạc bộ thể thao, hỗ trợ số hóa toàn bộ hoạt động quản trị như:' },
        { ul: ['Quản lý thành viên.', 'Quản lý quỹ thu/chi.', 'Công nợ.', 'Điểm danh & Check-in.', 'Lịch sinh hoạt.', 'Giải đấu & Minigame.', 'Báo cáo điều hành.', 'AIDO AI Digital Office.'] },
        { p: 'Nền tảng được thiết kế cho các câu lạc bộ Pickleball, Tennis, Cầu lông, Bóng bàn và các mô hình cộng đồng thể thao khác.' },
      ] },
      { h: '3. Tài khoản người dùng', blocks: [
        { p: 'Người dùng có trách nhiệm:' },
        { ul: ['Cung cấp thông tin chính xác khi đăng ký.', 'Bảo mật tài khoản và mật khẩu.', 'Không chia sẻ tài khoản cho người khác.', 'Chịu trách nhiệm đối với mọi hoạt động phát sinh từ tài khoản của mình.'] },
        { p: 'PickleFund có quyền tạm khóa hoặc chấm dứt tài khoản nếu phát hiện hành vi vi phạm điều khoản hoặc gây ảnh hưởng đến hệ thống.' },
      ] },
      { h: '4. Quyền và trách nhiệm của Câu lạc bộ', blocks: [
        { p: 'Mỗi câu lạc bộ chịu trách nhiệm quản lý thành viên, phân quyền và dữ liệu thuộc phạm vi quản lý của mình.' },
        { p: 'Quản trị viên CLB có quyền:' },
        { ul: ['Thêm hoặc xóa thành viên.', 'Phân quyền sử dụng.', 'Quản lý dữ liệu của CLB.', 'Quản lý quỹ và hoạt động.'] },
        { p: 'Mọi quyết định quản trị nội bộ thuộc trách nhiệm của CLB.' },
      ] },
      { h: '5. Quy định sử dụng', blocks: [
        { p: 'Người dùng cam kết không:' },
        { ul: ['Sử dụng nền tảng cho mục đích vi phạm pháp luật.', 'Truy cập trái phép dữ liệu của CLB khác.', 'Phát tán mã độc hoặc phần mềm gây hại.', 'Can thiệp, dò quét hoặc gây quá tải hệ thống.', 'Sao chép, sửa đổi hoặc khai thác trái phép phần mềm PickleFund.', 'Sử dụng dịch vụ nhằm mục đích gian lận hoặc gây thiệt hại cho người khác.'] },
        { p: 'PickleFund có quyền áp dụng các biện pháp kỹ thuật hoặc hành chính để bảo vệ hệ thống khi phát hiện hành vi vi phạm.' },
      ] },
      { h: '6. Dữ liệu của Câu lạc bộ', blocks: [
        { p: 'Mọi dữ liệu được tạo và nhập vào hệ thống thuộc quyền quản lý của chính Câu lạc bộ.' },
        { p: 'PickleFund:' },
        { ul: ['Không sở hữu dữ liệu của khách hàng.', 'Không sử dụng dữ liệu cho mục đích thương mại khi chưa có sự đồng ý của khách hàng.', 'Áp dụng cơ chế phân tách dữ liệu theo từng Câu lạc bộ (Multi-Tenant).', 'Kiểm soát truy cập theo vai trò người dùng.'] },
        { p: 'Khách hàng có quyền xuất dữ liệu của mình theo các chức năng được nền tảng hỗ trợ.' },
      ] },
      { h: '7. Vai trò của AIDO AI', blocks: [
        { p: 'AIDO AI Digital Office được phát triển nhằm hỗ trợ Ban quản trị và thành viên trong quá trình vận hành Câu lạc bộ.' },
        { p: 'Các AI Agent có thể:' },
        { ul: ['Phân tích dữ liệu.', 'Đưa ra khuyến nghị.', 'Hỗ trợ trả lời câu hỏi.', 'Nhắc nhở công việc.', 'Điều phối quy trình.', 'Tự động hóa các tác vụ được cho phép.'] },
        { p: 'AI không thay thế vai trò của con người.' },
        { p: 'Các quyết định liên quan đến:' },
        { ul: ['Thu/chi tài chính.', 'Thanh toán.', 'Chỉnh sửa dữ liệu quan trọng.', 'Phân quyền quản trị.', 'Xóa dữ liệu.'] },
        { p: 'đều phải do người có thẩm quyền của Câu lạc bộ thực hiện hoặc phê duyệt.' },
      ] },
      { h: '8. Gói dịch vụ và thanh toán', blocks: [
        { p: 'PickleFund cung cấp nhiều gói dịch vụ với các tính năng và mức giá khác nhau.' },
        { p: 'Thông tin về:' },
        { ul: ['Giá dịch vụ.', 'Chu kỳ thanh toán.', 'Gia hạn.', 'Nâng cấp.', 'Chính sách hoàn tiền.'] },
        { p: 'được công bố tại trang Bảng giá và Chính sách thanh toán.' },
        { p: 'Người dùng chịu trách nhiệm thanh toán đúng hạn để duy trì quyền sử dụng các tính năng của gói dịch vụ đã đăng ký.' },
      ] },
      { h: '9. Quyền sở hữu trí tuệ', blocks: [
        { p: 'Toàn bộ phần mềm, giao diện, thiết kế, logo, hình ảnh, tài liệu, cơ sở dữ liệu và thương hiệu PickleFund thuộc quyền sở hữu của PickleFund hoặc các chủ sở hữu hợp pháp.' },
        { p: 'Người dùng không được sao chép, phân phối, chỉnh sửa hoặc sử dụng cho mục đích thương mại nếu chưa có sự đồng ý bằng văn bản của PickleFund.' },
      ] },
      { h: '10. Giới hạn trách nhiệm', blocks: [
        { p: 'PickleFund luôn nỗ lực cung cấp dịch vụ ổn định và an toàn.' },
        { p: 'Tuy nhiên, PickleFund không chịu trách nhiệm đối với:' },
        { ul: ['Sai sót do người dùng nhập dữ liệu.', 'Quyết định quản lý nội bộ của Câu lạc bộ.', 'Thiệt hại phát sinh từ việc sử dụng sai mục đích.', 'Gián đoạn do sự cố Internet, điện, thiết bị hoặc các nguyên nhân ngoài khả năng kiểm soát.'] },
        { p: 'Trong mọi trường hợp, người dùng vẫn là bên chịu trách nhiệm đối với các quyết định quản trị và tài chính của Câu lạc bộ.' },
      ] },
      { h: '11. Thay đổi điều khoản', blocks: [
        { p: 'PickleFund có quyền cập nhật Điều khoản sử dụng nhằm phù hợp với sự phát triển của sản phẩm hoặc quy định pháp luật.' },
        { p: 'Phiên bản mới sẽ được công bố trên website hoặc thông báo trực tiếp trong hệ thống trước khi có hiệu lực.' },
        { p: 'Việc tiếp tục sử dụng dịch vụ sau khi điều khoản được cập nhật được xem là người dùng đã đồng ý với nội dung thay đổi.' },
      ] },
      { h: '12. Liên hệ', blocks: [
        { p: 'Nếu có câu hỏi liên quan đến Điều khoản sử dụng, vui lòng liên hệ:' },
        { contact: CONTACT },
        { p: 'Chúng tôi luôn sẵn sàng hỗ trợ và tiếp nhận mọi ý kiến đóng góp để không ngừng nâng cao chất lượng dịch vụ.' },
      ] },
    ],
  },

  privacy: {
    slug: 'privacy',
    title: 'Chính sách bảo mật',
    updatedAt: '06/08/2026',
    intro:
      'Tại PickleFund – Sports Club Manager, chúng tôi cam kết bảo vệ quyền riêng tư và dữ liệu của khách hàng. Chính sách này giải thích cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ thông tin khi bạn sử dụng nền tảng PickleFund.',
    sections: [
      { h: '1. Mục đích thu thập thông tin', blocks: [
        { p: 'PickleFund thu thập thông tin nhằm:' },
        { ul: ['Cung cấp và vận hành dịch vụ.', 'Xác thực tài khoản người dùng.', 'Quản lý câu lạc bộ và thành viên.', 'Đồng bộ dữ liệu giữa các thiết bị.', 'Hỗ trợ AI phân tích và tự động hóa theo yêu cầu của người dùng.', 'Cải thiện chất lượng sản phẩm và trải nghiệm sử dụng.', 'Hỗ trợ kỹ thuật và chăm sóc khách hàng.', 'Thực hiện các nghĩa vụ theo quy định của pháp luật (nếu có).'] },
      ] },
      { h: '2. Thông tin chúng tôi thu thập', blocks: [
        { p: 'Trong quá trình sử dụng dịch vụ, PickleFund có thể thu thập các nhóm thông tin sau:' },
        { sub: 'Thông tin tài khoản' },
        { ul: ['Họ và tên', 'Địa chỉ email', 'Số điện thoại (nếu cung cấp)', 'Ảnh đại diện (nếu có)'] },
        { sub: 'Thông tin câu lạc bộ' },
        { ul: ['Tên câu lạc bộ', 'Danh sách thành viên', 'Vai trò người dùng', 'Lịch hoạt động', 'Giải đấu', 'Quỹ thu/chi', 'Công nợ', 'Báo cáo'] },
        { sub: 'Thông tin kỹ thuật' },
        { ul: ['Địa chỉ IP', 'Loại trình duyệt', 'Thiết bị sử dụng', 'Hệ điều hành', 'Nhật ký truy cập', 'Thời gian đăng nhập'] },
      ] },
      { h: '3. Cách chúng tôi sử dụng thông tin', blocks: [
        { p: 'Thông tin được sử dụng để:' },
        { ul: ['Cung cấp các chức năng của PickleFund.', 'Quản lý dữ liệu của từng câu lạc bộ.', 'Đồng bộ dữ liệu giữa Web, Desktop và Mobile.', 'Gửi thông báo trong hệ thống.', 'Hỗ trợ các tính năng AI của AIDO.', 'Phân tích hiệu năng hệ thống.', 'Phòng chống gian lận và bảo vệ an toàn dữ liệu.'] },
        { p: 'Chúng tôi không sử dụng dữ liệu của khách hàng cho mục đích quảng cáo hoặc kinh doanh khi chưa có sự đồng ý của khách hàng.' },
      ] },
      { h: '4. Bảo mật dữ liệu', blocks: [
        { p: 'PickleFund áp dụng nhiều biện pháp nhằm bảo vệ dữ liệu người dùng, bao gồm:' },
        { ul: ['Mã hóa kết nối bằng giao thức HTTPS.', 'Kiểm soát truy cập theo vai trò người dùng.', 'Phân tách dữ liệu giữa các câu lạc bộ.', 'Sao lưu dữ liệu định kỳ.', 'Theo dõi nhật ký hoạt động của hệ thống.', 'Giám sát và xử lý các truy cập bất thường.'] },
        { p: 'Mặc dù luôn nỗ lực bảo vệ dữ liệu ở mức cao nhất, không có hệ thống nào có thể đảm bảo an toàn tuyệt đối trên môi trường Internet.' },
      ] },
      { h: '5. Chia sẻ thông tin', blocks: [
        { p: 'PickleFund không bán, trao đổi hoặc cho thuê thông tin cá nhân của người dùng.' },
        { p: 'Thông tin chỉ được chia sẻ trong các trường hợp sau:' },
        { ul: ['Có sự đồng ý của người dùng.', 'Theo yêu cầu của cơ quan nhà nước có thẩm quyền theo quy định pháp luật.', 'Cho các đối tác cung cấp hạ tầng hoặc dịch vụ kỹ thuật phục vụ việc vận hành nền tảng, với điều kiện các đối tác phải tuân thủ nghĩa vụ bảo mật thông tin.'] },
      ] },
      { h: '6. Quyền của người dùng', blocks: [
        { p: 'Người dùng có quyền:' },
        { ul: ['Xem thông tin của mình.', 'Cập nhật thông tin cá nhân.', 'Thay đổi mật khẩu.', 'Xuất dữ liệu của câu lạc bộ thông qua các chức năng được hệ thống hỗ trợ.', 'Yêu cầu xóa tài khoản theo Chính sách xóa tài khoản của PickleFund.'] },
      ] },
      { h: '7. Lưu trữ dữ liệu', blocks: [
        { p: 'Thông tin được lưu trữ trong thời gian cần thiết để:' },
        { ul: ['Duy trì hoạt động của dịch vụ.', 'Thực hiện các nghĩa vụ theo quy định của pháp luật.', 'Giải quyết khiếu nại hoặc tranh chấp (nếu có).'] },
        { p: 'Sau khi người dùng yêu cầu xóa tài khoản và hoàn tất quy trình xử lý, dữ liệu sẽ được xóa hoặc ẩn danh theo chính sách lưu trữ của PickleFund.' },
      ] },
      { h: '8. Bảo vệ trẻ em', blocks: [
        { p: 'PickleFund không chủ đích thu thập thông tin cá nhân của trẻ em khi chưa có sự đồng ý của cha mẹ hoặc người giám hộ theo quy định của pháp luật.' },
      ] },
      { h: '9. Thay đổi Chính sách bảo mật', blocks: [
        { p: 'Chính sách bảo mật có thể được cập nhật để phù hợp với sự phát triển của sản phẩm hoặc các quy định pháp luật hiện hành.' },
        { p: 'Phiên bản mới sẽ được công bố trên website hoặc thông báo trong hệ thống trước khi có hiệu lực.' },
      ] },
      { h: '10. Liên hệ', blocks: [
        { p: 'Nếu bạn có bất kỳ câu hỏi nào liên quan đến Chính sách bảo mật hoặc việc xử lý dữ liệu cá nhân, vui lòng liên hệ:' },
        { contact: CONTACT },
        { p: 'Chúng tôi cam kết tôn trọng quyền riêng tư của người dùng và không ngừng cải thiện các biện pháp bảo mật để mang đến một nền tảng quản lý câu lạc bộ an toàn, minh bạch và đáng tin cậy.' },
      ] },
    ],
  },

  cookie: {
    slug: 'cookie',
    title: 'Chính sách Cookie',
    updatedAt: '06/08/2026',
    intro:
      'PickleFund – Sports Club Manager sử dụng Cookie và các công nghệ tương tự nhằm nâng cao trải nghiệm người dùng, đảm bảo hệ thống hoạt động ổn định và cải thiện chất lượng dịch vụ. Bằng việc tiếp tục sử dụng website hoặc ứng dụng PickleFund, bạn đồng ý với việc sử dụng Cookie theo Chính sách này.',
    sections: [
      { h: '1. Cookie là gì?', blocks: [
        { p: 'Cookie là các tệp dữ liệu nhỏ được lưu trên trình duyệt hoặc thiết bị của bạn khi truy cập website. Cookie giúp hệ thống ghi nhớ thông tin và tùy chọn của người dùng để cải thiện trải nghiệm trong những lần truy cập tiếp theo.' },
        { p: 'Cookie không chứa mã độc và không làm ảnh hưởng đến thiết bị của bạn.' },
      ] },
      { h: '2. Mục đích sử dụng Cookie', blocks: [
        { p: 'PickleFund sử dụng Cookie để:' },
        { ul: ['Duy trì trạng thái đăng nhập của người dùng.', 'Ghi nhớ ngôn ngữ và các tùy chọn hiển thị.', 'Cải thiện hiệu suất và tốc độ truy cập.', 'Phân tích lưu lượng truy cập và hành vi sử dụng nhằm nâng cao chất lượng sản phẩm.', 'Bảo vệ tài khoản và phát hiện các truy cập bất thường.', 'Đảm bảo các chức năng của website và ứng dụng hoạt động ổn định.'] },
      ] },
      { h: '3. Các loại Cookie sử dụng', blocks: [
        { sub: 'Cookie cần thiết' },
        { p: 'Đây là các Cookie bắt buộc để website và ứng dụng hoạt động bình thường. Ví dụ:' },
        { ul: ['Đăng nhập hệ thống.', 'Xác thực phiên làm việc.', 'Bảo mật tài khoản.', 'Duy trì trạng thái sử dụng.'] },
        { p: 'Nếu tắt các Cookie này, một số chức năng của PickleFund có thể không hoạt động đúng.' },
        { sub: 'Cookie hiệu năng' },
        { p: 'Được sử dụng để:' },
        { ul: ['Đo lường hiệu suất hệ thống.', 'Phân tích tốc độ tải trang.', 'Theo dõi lỗi phát sinh.', 'Tối ưu trải nghiệm người dùng.'] },
        { p: 'Các thông tin này được tổng hợp và không nhằm nhận diện cá nhân.' },
        { sub: 'Cookie chức năng' },
        { p: 'Giúp ghi nhớ các lựa chọn của người dùng như:' },
        { ul: ['Ngôn ngữ.', 'Giao diện sáng hoặc tối.', 'Thiết bị đã đăng nhập.', 'Các tùy chọn hiển thị.'] },
        { p: 'Nhờ đó người dùng không phải thiết lập lại mỗi lần sử dụng.' },
        { sub: 'Cookie phân tích' },
        { p: 'Các Cookie này giúp PickleFund hiểu cách người dùng sử dụng sản phẩm để:' },
        { ul: ['Cải thiện giao diện.', 'Nâng cao trải nghiệm sử dụng.', 'Phát triển các tính năng mới.', 'Tối ưu hiệu năng của nền tảng.'] },
        { p: 'Dữ liệu được sử dụng dưới dạng tổng hợp và không nhằm mục đích theo dõi cá nhân.' },
      ] },
      { h: '4. Cookie của bên thứ ba', blocks: [
        { p: 'Trong một số trường hợp, PickleFund có thể sử dụng dịch vụ của bên thứ ba nhằm hỗ trợ vận hành hệ thống, phân tích hiệu suất hoặc cung cấp chức năng bổ sung.' },
        { p: 'Các dịch vụ này có thể thiết lập Cookie theo chính sách riêng của họ.' },
        { p: 'PickleFund chỉ hợp tác với các đối tác uy tín và không sử dụng Cookie của bên thứ ba để bán hoặc chia sẻ thông tin cá nhân của người dùng.' },
      ] },
      { h: '5. Quản lý Cookie', blocks: [
        { p: 'Người dùng có thể:' },
        { ul: ['Chấp nhận hoặc từ chối Cookie thông qua cài đặt trình duyệt.', 'Xóa Cookie đã lưu trên thiết bị.', 'Thiết lập trình duyệt để cảnh báo khi Cookie được tạo.'] },
        { p: 'Việc vô hiệu hóa một số Cookie có thể ảnh hưởng đến khả năng sử dụng hoặc làm giảm trải nghiệm của một số chức năng trên PickleFund.' },
      ] },
      { h: '6. Thay đổi Chính sách Cookie', blocks: [
        { p: 'PickleFund có thể cập nhật Chính sách Cookie nhằm phù hợp với sự phát triển của sản phẩm hoặc các quy định pháp luật hiện hành.' },
        { p: 'Phiên bản mới sẽ được công bố trên website hoặc thông báo trong hệ thống trước khi có hiệu lực.' },
      ] },
      { h: '7. Liên hệ', blocks: [
        { p: 'Nếu bạn có bất kỳ câu hỏi nào liên quan đến Chính sách Cookie, vui lòng liên hệ:' },
        { contact: CONTACT },
        { p: 'Chúng tôi luôn nỗ lực mang đến một nền tảng an toàn, minh bạch và thân thiện, đồng thời tôn trọng quyền riêng tư và quyền kiểm soát dữ liệu của mọi người dùng.' },
      ] },
    ],
  },
}
