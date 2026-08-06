/**
 * landing-content.ts — Nguồn nội dung TẬP TRUNG cho Landing Page thương mại PickleFund v1.
 * Mọi menu, chỉ số, bộ môn, feature, agent, testimonial, pricing, FAQ, footer đều khai báo ở đây
 * để dễ cập nhật (không rải hard-code ở nhiều component). KHÔNG chứa secret/dữ liệu nhạy cảm.
 *
 * Định vị: PickleFund — AI Sports Community Platform (đa bộ môn, không chỉ Pickleball).
 */
import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid, Cpu, Wallet, Users, CalendarCheck, Trophy, BarChart3, Smartphone,
  Building2, GraduationCap, Briefcase, ShieldCheck, LineChart, Sparkles, RefreshCw,
  BookOpen, PlayCircle, HelpCircle, Newspaper, Rss, Download, FileText, Tag, Info,
  Target, Route, HeartHandshake, Phone, Bot,
} from 'lucide-react'

/* ── Kiểu dữ liệu menu ── */
export interface MenuItem {
  icon?: LucideIcon
  title: string
  desc?: string
  href?: string
  /** true = chưa có route/nội dung → render "Đang cập nhật", không phải dead link. */
  soon?: boolean
}
export interface MenuGroup {
  title?: string
  items: MenuItem[]
}
export interface MegaMenu {
  key: string
  label: string
  heading?: string
  description?: string
  /** Số cột lưới cho panel desktop. */
  columns: number
  groups: MenuGroup[]
  ctas?: { label: string; href: string }[]
}

/* ── VI. Mega menu SẢN PHẨM ── */
export const PRODUCT_MENU: MegaMenu = {
  key: 'product',
  label: 'Sản phẩm',
  heading: 'AI Sports Community Platform',
  description:
    'Một nền tảng duy nhất giúp CLB quản lý tài chính, thành viên, hoạt động, giải đấu và vận hành cùng đội ngũ AI.',
  columns: 2,
  groups: [
    {
      items: [
        { icon: LayoutGrid, title: 'Tổng quan nền tảng', desc: 'Khám phá toàn bộ hệ sinh thái quản trị CLB thể thao trên một nền tảng duy nhất.', href: '/#features' },
        { icon: Cpu, title: 'AIDO – AI Digital Office', desc: 'Không gian vận hành AI với Maika, Lisa, Hermes, Mít Đặc và Notification AI.', href: '/product/aido' },
        { icon: Wallet, title: 'Quỹ & Tài chính', desc: 'Quản lý thu, chi, công nợ, quỹ chung, quỹ mini và báo cáo tài chính minh bạch.', href: '/#features' },
        { icon: Users, title: 'Thành viên & Tài khoản', desc: 'Quản lý hồ sơ thành viên, quyền truy cập, chuyên cần và lịch sử tham gia.', href: '/#features' },
      ],
    },
    {
      items: [
        { icon: CalendarCheck, title: 'Hoạt động CLB', desc: 'Quản lý lịch sinh hoạt, đăng ký buổi, check-in và điểm danh.', href: '/#features' },
        { icon: Trophy, title: 'Giải đấu & Minigame', desc: 'Tạo giải, xếp lịch đấu, ghi nhận kết quả, bảng điểm và xếp hạng.', href: '/#features' },
        { icon: BarChart3, title: 'Báo cáo & Executive Report', desc: 'Dashboard thời gian thực và báo cáo điều hành AIDO cho Ban quản trị.', href: '/product/executive-report' },
        { icon: Smartphone, title: 'Đa nền tảng', desc: 'Sử dụng đồng bộ trên Web, Desktop và Mobile/PWA.', href: '/#features' },
      ],
    },
  ],
  ctas: [
    { label: 'Xem tổng quan sản phẩm', href: '/#features' },
    { label: 'Khám phá AIDO', href: '/#aido' },
  ],
}

/* ── VIII. Mega menu GIẢI PHÁP ── */
export const SOLUTIONS_MENU: MegaMenu = {
  key: 'solutions',
  label: 'Giải pháp',
  columns: 2,
  groups: [
    {
      title: 'Theo loại hình tổ chức',
      items: [
        { icon: Building2, title: 'CLB Pickleball', desc: 'Quản lý thành viên, tài chính, hoạt động và giải đấu Pickleball.', href: '/#sports' },
        { icon: Building2, title: 'CLB Tennis', desc: 'Điều phối lịch sinh hoạt, thành viên, sân và các hoạt động thi đấu.', href: '/#sports' },
        { icon: Building2, title: 'CLB Cầu lông', desc: 'Quản lý đăng ký buổi, điểm danh, tài chính và giải đấu nội bộ.', href: '/#sports' },
        { icon: Building2, title: 'CLB Bóng bàn', desc: 'Quản lý cộng đồng, lịch chơi, bảng điểm và hoạt động CLB.', href: '/#sports' },
        { icon: Building2, title: 'CLB Bóng đá', desc: 'Quản lý đội bóng, thành viên, lịch thi đấu và đóng góp tài chính.', href: '/#sports' },
        { icon: Building2, title: 'CLB Bóng rổ', desc: 'Theo dõi thành viên, buổi tập, lịch thi đấu và hoạt động đội.', href: '/#sports' },
        { icon: Briefcase, title: 'Doanh nghiệp & Cộng đồng', desc: 'Tổ chức các cộng đồng thể thao nội bộ minh bạch và hiệu quả.', href: '/#sports' },
        { icon: GraduationCap, title: 'Trường học & Trung tâm thể thao', desc: 'Quản lý học viên, câu lạc bộ, hoạt động và giải đấu tập trung.', href: '/#sports' },
      ],
    },
    {
      title: 'Theo nhu cầu',
      items: [
        { icon: ShieldCheck, title: 'Minh bạch tài chính', desc: 'Quản lý thu chi, công nợ và báo cáo rõ ràng.', href: '/#features' },
        { icon: Users, title: 'Quản lý thành viên', desc: 'Lưu trữ hồ sơ, phân quyền và theo dõi chuyên cần.', href: '/#features' },
        { icon: Trophy, title: 'Tổ chức giải đấu', desc: 'Tạo giải, xếp lịch, cập nhật kết quả và bảng xếp hạng.', href: '/#features' },
        { icon: RefreshCw, title: 'Chuyển đổi số CLB', desc: 'Thay thế quy trình rời rạc bằng một nền tảng thống nhất.', href: '/#why' },
        { icon: LineChart, title: 'AI hỗ trợ vận hành', desc: 'Ứng dụng AIDO để phân tích, hỗ trợ, điều phối, thực thi và thông báo.', href: '/#aido' },
      ],
    },
  ],
  ctas: [
    { label: 'Tìm giải pháp phù hợp', href: '/#sports' },
    { label: 'Xem tính năng', href: '/#features' },
  ],
}

/* ── IX. Mega menu TÀI NGUYÊN ── */
export const RESOURCES_MENU: MegaMenu = {
  key: 'resources',
  label: 'Tài nguyên',
  columns: 3,
  groups: [
    {
      title: 'Hướng dẫn',
      items: [
        { icon: BookOpen, title: 'Hướng dẫn sử dụng', desc: 'Tài liệu từng bước để bắt đầu và vận hành PickleFund.', href: '/resources/guide' },
        { icon: PlayCircle, title: 'Video Demo', desc: 'Xem nhanh cách các chức năng chính hoạt động.', href: '/resources/video' },
        { icon: HelpCircle, title: 'Câu hỏi thường gặp', desc: 'Giải đáp các vấn đề phổ biến về sản phẩm và triển khai.', href: '/resources/faq' },
        { icon: GraduationCap, title: 'PickleFund Academy', desc: 'Hub học tập: hướng dẫn, cẩm nang, demo và giải đáp.', href: '/academy' },
      ],
    },
    {
      title: 'Kiến thức',
      items: [
        { icon: Rss, title: 'Blog', desc: 'Cẩm nang vận hành CLB: tài chính, vận hành và ứng dụng AI.', href: '/resources/blog' },
        { icon: LineChart, title: 'Máy tính ROI', desc: 'Ước lượng thời gian và chi phí tiết kiệm theo số liệu CLB của bạn.', href: '/roi' },
        { icon: Newspaper, title: 'Tin tức PickleFund', desc: 'Cập nhật sản phẩm, hoạt động và các phiên bản mới.', soon: true },
        { icon: Sparkles, title: 'AI & Chuyển đổi số', desc: 'Kiến thức ứng dụng AI vào vận hành tổ chức thể thao.', href: '/resources/blog' },
        { icon: BookOpen, title: 'Kinh nghiệm vận hành CLB', desc: 'Các bài viết thực tế về tài chính, thành viên và hoạt động.', href: '/resources/blog' },
        { icon: CalendarCheck, title: 'Webinar & sự kiện', desc: 'Đăng ký nhận thông báo các buổi webinar hướng dẫn vận hành.', href: '/webinar' },
      ],
    },
    {
      title: 'Tải xuống',
      items: [
        { icon: Download, title: 'Tải & cài đặt', href: '/download' },
        { icon: Tag, title: 'Bảng giá', href: '/pricing' },
        { icon: ShieldCheck, title: 'Trung tâm Tin cậy', href: '/trust' },
        { icon: FileText, title: 'Release Notes', soon: true },
      ],
    },
  ],
}

/* ── X. Mega menu VỀ CHÚNG TÔI ── */
export const ABOUT_MENU: MegaMenu = {
  key: 'about',
  label: 'Về chúng tôi',
  columns: 2,
  groups: [
    {
      items: [
        { icon: BookOpen, title: 'Câu chuyện PickleFund', desc: 'Hành trình xây dựng nền tảng quản trị cộng đồng thể thao tích hợp AI.', href: '/about' },
        { icon: Target, title: 'Tầm nhìn & Sứ mệnh', desc: 'Giúp các CLB thể thao vận hành minh bạch, chuyên nghiệp và bền vững.', href: '/about' },
        { icon: Route, title: 'Lộ trình phát triển', desc: 'Định hướng phát triển sản phẩm theo nhu cầu thực tế của cộng đồng.', href: '/roadmap' },
        { icon: Bot, title: 'Đội ngũ AI', desc: 'Giới thiệu Maika, Lisa, Hermes, Mít Đặc và Notification AI.', href: '/product/aido' },
      ],
    },
    {
      items: [
        { icon: HeartHandshake, title: 'Khách hàng tiêu biểu', desc: 'Cách các loại hình CLB ứng dụng PickleFund trong thực tế.', href: '/success-stories' },
        { icon: Briefcase, title: 'Đối tác', desc: 'Các tổ chức, cộng đồng và đơn vị hợp tác.', soon: true },
        { icon: Phone, title: 'Liên hệ', desc: 'Thông tin liên hệ và kênh hỗ trợ chính thức.', href: '/contact' },
        { icon: Info, title: 'Bảng giá', desc: 'Các gói dịch vụ và cách bắt đầu.', href: '/pricing' },
      ],
    },
  ],
}

export const MEGA_MENUS: MegaMenu[] = [PRODUCT_MENU, SOLUTIONS_MENU, RESOURCES_MENU, ABOUT_MENU]

/* ── XIII. Thống kê (nội dung marketing đã duyệt) ── */
export const STATS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: '30+', label: 'CLB đang sử dụng', icon: Users },
  { value: '1.000+', label: 'Thành viên tin dùng', icon: HeartHandshake },
  { value: '10+', label: 'Bộ môn thể thao', icon: Trophy },
  { value: '98%', label: 'Hài lòng với nền tảng', icon: Sparkles },
  { value: '5', label: 'Trợ lý AI đồng hành', icon: Bot },
]

/* ── XIV. Bộ môn thể thao (emoji phân biệt rõ, không trùng) ── */
export const SPORTS: { emoji: string; name: string }[] = [
  { emoji: '🥒', name: 'Pickleball' },
  { emoji: '🎾', name: 'Tennis' },
  { emoji: '🏸', name: 'Cầu lông' },
  { emoji: '🏓', name: 'Bóng bàn' },
  { emoji: '⚽', name: 'Bóng đá' },
  { emoji: '🏀', name: 'Bóng rổ' },
  { emoji: '⛳', name: 'Golf' },
  { emoji: '🏊', name: 'Bơi lội' },
  { emoji: '🏃', name: 'Chạy bộ' },
  { emoji: '➕', name: 'Khác' },
]

/* ── XV. Feature cards ── */
export interface FeatureCard {
  icon: LucideIcon
  title: string
  desc: string
  /** Số liệu MINH HOẠ marketing (không phải dữ liệu runtime tài khoản thật). */
  stats?: { label: string; value: string; tone?: string }[]
  progress?: { label: string; percent: number }
  /** true = hiển thị cụm avatar 5 trợ lý AI (card "Trợ lý AI thông minh"). */
  agents?: boolean
}
export const FEATURES: FeatureCard[] = [
  {
    icon: Wallet, title: 'Quỹ & tài chính minh bạch',
    desc: 'Quỹ chung, quỹ mini tách bạch. Thu/chi rõ ràng, đối soát tự động.',
    stats: [
      { label: 'Tổng quỹ', value: '125.750.000đ', tone: 'var(--pf-primary)' },
      { label: 'Quỹ chung', value: '98.450.000đ', tone: 'var(--pf-green)' },
      { label: 'Quỹ mini', value: '27.300.000đ', tone: 'var(--pf-color-info)' },
    ],
  },
  {
    icon: CalendarCheck, title: 'Thành viên & điểm danh',
    desc: 'Quản lý thành viên, check-in nhanh, thống kê chuyên cần và lịch sinh hoạt.',
    stats: [
      { label: 'Tổng số buổi', value: '12' },
      { label: 'Đạt yêu cầu', value: '10 (83%)', tone: 'var(--pf-green)' },
    ],
    progress: { label: 'Chuyên cần tháng', percent: 83 },
  },
  {
    icon: Trophy, title: 'Giải đấu & minigame',
    desc: 'Tạo giải đấu, minigame, bốc thăm, xếp bảng và theo dõi kết quả dễ dàng.',
    stats: [
      { label: 'VĐV tham gia', value: '32', tone: 'var(--pf-primary)' },
      { label: 'Trận đã đấu', value: '16', tone: 'var(--pf-color-info)' },
    ],
  },
  {
    icon: FileText, title: 'Báo cáo & xuất PDF',
    desc: 'Báo cáo thu/chi, công nợ và hoạt động theo kỳ, xuất PDF rõ ràng.',
  },
  {
    icon: Bot, title: 'Trợ lý AI thông minh',
    desc: 'Maika phân tích, Lisa hỗ trợ, Hermes điều phối, Mít Đặc thực thi và Notification AI thông báo.',
    agents: true,
  },
  {
    icon: Smartphone, title: 'Đa nền tảng',
    desc: 'Web, Desktop và Mobile/PWA đồng bộ dữ liệu theo thời gian thực.',
  },
]

/* ── XVI. AIDO — đúng 5 agent, ranh giới vai trò giữ nguyên ── */
export interface Agent {
  name: string
  role: string
  shortLabel: string
  desc: string
  color: string
  soft: string
  /** Ảnh nhân vật (public/agents/*.png). Có fallback initial nếu thiếu file. */
  avatar: string
  /** Trạng thái đang chạy (hiển thị dạng chấm xanh) — khớp minh hoạ. */
  status: string
}
export const AGENTS: Agent[] = [
  { name: 'Maika', role: 'Club Intelligence Manager', shortLabel: 'AI Analyst', desc: 'Phân tích CLB, đưa ra khuyến nghị, nhận diện rủi ro và cơ hội.', color: 'var(--pf-color-ai)', soft: 'var(--pf-color-ai-soft)', avatar: '/agents/maika.png', status: 'Đang phân tích' },
  { name: 'Lisa', role: 'Member Assistant', shortLabel: 'AI Assistant', desc: 'Hỗ trợ thành viên, giải đáp thắc mắc, nhắc việc và chuyển yêu cầu.', color: 'var(--pf-color-info)', soft: 'var(--pf-color-info-soft)', avatar: '/agents/lisa.png', status: 'Đang trả lời' },
  { name: 'Hermes', role: 'Workflow Orchestrator', shortLabel: 'AI Orchestrator', desc: 'Điều phối workflow, lịch, phê duyệt và thông báo ở tầng điều phối.', color: 'var(--pf-secondary)', soft: 'var(--pf-secondary-soft)', avatar: '/agents/hermes.png', status: 'Đang điều phối' },
  { name: 'Mít Đặc', role: 'Execution Agent', shortLabel: 'AI Executor', desc: 'Thực thi hành động sau khi được phê duyệt và cấp quyền phù hợp.', color: 'var(--pf-color-warning)', soft: 'var(--pf-color-warning-soft)', avatar: '/agents/mit-dac.png', status: 'Đang thực thi' },
  { name: 'Notification AI', role: 'Notification Agent', shortLabel: 'AI Notifier', desc: 'Gửi thông báo qua In-app, Email và Telegram theo cấu hình.', color: 'var(--pf-primary)', soft: 'var(--pf-primary-soft)', avatar: '/agents/notification-ai.png', status: 'Đang gửi' },
]

/* ── XVII. Vì sao chọn PickleFund (6 lợi ích) ── */
export const BENEFITS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Sparkles, title: 'Dễ dùng', desc: 'Giao diện đơn giản, ai cũng có thể sử dụng.' },
  { icon: RefreshCw, title: 'Tiết kiệm thời gian', desc: 'Tự động hóa công việc, giảm thao tác thủ công.' },
  { icon: ShieldCheck, title: 'Minh bạch tuyệt đối', desc: 'Mọi giao dịch và dữ liệu đều rõ ràng, dễ đối soát.' },
  { icon: ShieldCheck, title: 'An toàn dữ liệu', desc: 'Bảo mật, sao lưu và kiểm soát truy cập phù hợp.' },
  { icon: HeartHandshake, title: 'Hỗ trợ tận tâm', desc: 'Đồng hành cùng CLB trong quá trình sử dụng.' },
  { icon: Bot, title: 'AI hỗ trợ vận hành', desc: 'Phân tích, hỗ trợ, điều phối và thông báo theo đúng quyền hạn.' },
]

/* ── XVIII. Testimonials (nội dung minh hoạ, nhãn nội bộ dễ thay) ── */
export interface Testimonial {
  quote: string
  name: string
  role: string
  initials: string
  color: string
}
export const TESTIMONIALS: Testimonial[] = [
  { quote: 'PickleFund giúp CLB chúng tôi minh bạch quỹ, tiết kiệm nhiều thời gian quản lý.', name: 'CLB Smash Brothers', role: 'Quản trị viên', initials: 'SB', color: 'var(--pf-primary)' },
  { quote: 'AI nhắc nhở rất hữu ích, đặc biệt là cảnh báo công nợ và chuyên cần.', name: 'Sunrise Pickleball Club', role: 'Chủ nhiệm CLB', initials: 'SP', color: 'var(--pf-color-info)' },
  { quote: 'Tạo giải và bốc thăm tự động quá nhanh và chính xác.', name: 'Happy Paddles', role: 'Thành viên', initials: 'HP', color: 'var(--pf-secondary)' },
]

/* ── XIX. Pricing (tái dùng dữ liệu gói hiện hành của dự án) ── */
export interface PricingTier {
  name: string
  price: string
  period: string
  desc: string
  featured?: boolean
  features: string[]
  cta: string
}
export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Starter', price: 'Miễn phí', period: '', desc: 'Cho CLB mới thành lập.',
    features: ['Tối đa 15 thành viên', 'Quỹ chung · Thu/Chi · Điểm danh', 'Lịch sinh hoạt · Báo cáo cơ bản', 'Web + Mobile'],
    cta: 'Bắt đầu miễn phí',
  },
  {
    name: 'Pro', price: '99k', period: '/tháng', desc: 'Cho CLB đang phát triển.', featured: true,
    features: ['Không giới hạn thành viên', 'Quỹ Mini · Công nợ · Giải đấu · Minigame', 'AIDO · Maika · Lisa · Hermes · Telegram', 'Báo cáo PDF/Excel · Backup Cloud', 'Hỗ trợ ưu tiên'],
    cta: '🚀 Nâng cấp ngay',
  },
  {
    name: 'Enterprise', price: 'Liên hệ', period: '', desc: 'Trung tâm · Học viện · Chuỗi CLB.',
    features: ['Tất cả tính năng Pro', 'Multi Club · White Label · Domain riêng', 'API · AI Workflow nâng cao', 'Phân quyền nhiều cấp · Đào tạo · SLA'],
    cta: 'Đăng ký tư vấn',
  },
]

/* ── XX. FAQ ── */
export const FAQS: { q: string; a: string }[] = [
  { q: 'PickleFund hỗ trợ những bộ môn thể thao nào?', a: 'PickleFund hỗ trợ nhiều bộ môn: Pickleball, Tennis, Cầu lông, Bóng bàn, Bóng đá, Bóng rổ, Golf và có thể mở rộng cho các bộ môn khác — tất cả trên cùng một nền tảng.' },
  { q: 'PickleFund có sử dụng được trên điện thoại không?', a: 'Có. PickleFund hoạt động trên Web, Desktop và Mobile dưới dạng PWA, dữ liệu đồng bộ theo thời gian thực nên bạn có thể quản lý CLB mọi lúc, mọi nơi.' },
  { q: 'PickleFund có tích hợp AI không?', a: 'Có. AIDO – AI Digital Office gồm 5 trợ lý: Maika phân tích, Lisa hỗ trợ thành viên, Hermes điều phối workflow, Mít Đặc thực thi và Notification AI gửi thông báo — luôn cần con người phê duyệt việc quan trọng.' },
  { q: 'PickleFund có thể xuất báo cáo PDF không?', a: 'Có. Bạn có thể xuất báo cáo thu/chi, công nợ và hoạt động theo kỳ ra PDF rõ ràng, phục vụ họp và đối soát.' },
  { q: 'Một tài khoản có thể quản lý nhiều CLB không?', a: 'Có, tùy theo gói dịch vụ. Gói cao cấp cho phép quản lý nhiều CLB/chi nhánh với thương hiệu riêng.' },
  { q: 'Dữ liệu CLB có được bảo mật không?', a: 'Dữ liệu được bảo mật, sao lưu định kỳ và kiểm soát truy cập theo vai trò. Mỗi CLB chỉ thấy dữ liệu của mình.' },
  { q: 'Có cần cài đặt phần mềm không?', a: 'Không. PickleFund chạy trực tiếp trên trình duyệt, thiết lập trong ít phút và có thể cài như ứng dụng (PWA) trên điện thoại nếu muốn.' },
  { q: 'Có thể dùng thử trước khi đăng ký không?', a: 'Có. Bạn có thể dùng thử miễn phí để trải nghiệm đầy đủ tính năng trước khi quyết định.' },
]

/* ── XXII. Footer ── */
export const FOOTER_GROUPS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Sản phẩm',
    items: [
      { title: 'Tổng quan nền tảng', href: '/#features' },
      { title: 'AIDO – AI Digital Office', href: '/product/aido' },
      { title: 'Quỹ & Tài chính', href: '/#features' },
      { title: 'Thành viên & Điểm danh', href: '/#features' },
      { title: 'Giải đấu & Minigame', href: '/#features' },
      { title: 'Báo cáo & Executive Report', href: '/product/executive-report' },
      { title: 'Đa nền tảng', href: '/#features' },
    ],
  },
  {
    title: 'Giải pháp',
    items: [
      { title: 'CLB Pickleball', href: '/#sports' },
      { title: 'CLB Tennis', href: '/#sports' },
      { title: 'CLB Cầu lông', href: '/#sports' },
      { title: 'CLB Bóng bàn', href: '/#sports' },
      { title: 'CLB Bóng đá', href: '/#sports' },
      { title: 'Doanh nghiệp & Cộng đồng', href: '/#sports' },
      { title: 'Trường học & Trung tâm thể thao', href: '/#sports' },
    ],
  },
  {
    title: 'Tài nguyên',
    items: [
      { title: 'Hướng dẫn sử dụng', href: '/resources/guide' },
      { title: 'Video Demo', href: '/resources/video' },
      { title: 'FAQ', href: '/resources/faq' },
      { title: 'Blog', href: '/resources/blog' },
      { title: 'Máy tính ROI', href: '/roi' },
      { title: 'PickleFund Academy', href: '/academy' },
      { title: 'Webinar & sự kiện', href: '/webinar' },
      { title: 'Trung tâm Tin cậy', href: '/trust' },
      { title: 'Tải & cài đặt', href: '/download' },
      { title: 'Release Notes', soon: true },
      { title: 'Bảng giá', href: '/pricing' },
    ],
  },
  {
    title: 'Về chúng tôi',
    items: [
      { title: 'Câu chuyện PickleFund', href: '/about' },
      { title: 'Tầm nhìn & Sứ mệnh', href: '/about' },
      { title: 'Lộ trình phát triển', href: '/roadmap' },
      { title: 'Đội ngũ AI', href: '/product/aido' },
      { title: 'Khách hàng', href: '/success-stories' },
      { title: 'Đối tác', soon: true },
      { title: 'Liên hệ', href: '/contact' },
    ],
  },
]

export const FOOTER_LEGAL: MenuItem[] = [
  { title: 'Điều khoản sử dụng', href: '/legal/terms' },
  { title: 'Chính sách bảo mật', href: '/legal/privacy' },
  { title: 'Chính sách cookie', href: '/legal/cookie' },
]

/** Thông tin liên hệ — chỉ dùng giá trị THẬT đã có trong cấu hình dự án. */
export const CONTACT = {
  email: 'support@picklefund.uk',
  brandDesc:
    'Nền tảng quản trị CLB & cộng đồng thể thao tích hợp AI — tài chính, thành viên, hoạt động, giải đấu và AI Digital Office trên một nền tảng.',
}
