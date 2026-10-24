import {
  Users, Award, UserCog, ShieldCheck, History, CalendarRange, ArrowDownCircle, ArrowUpCircle, HandCoins, BarChart3, BadgeCheck,
  CalendarDays, CalendarPlus, LogIn, ClipboardCheck, Activity, LayoutDashboard, Trophy, Swords, FileCheck2, Medal,
  Newspaper, Handshake, Bell, CreditCard, Settings, Receipt, Wallet, CalendarCheck, BookOpen, type LucideIcon,
} from 'lucide-react'

export interface NavDef { label: string; icon: LucideIcon }

/**
 * DANH MỤC TÊN–ICON DÙNG CHUNG cho điều hướng mobile: lối tắt Tổng quan, lưới phân hệ (ModuleTabs) và trang Ứng dụng
 * đều lấy từ đây → cùng một chức năng luôn cùng tên và cùng icon. Khóa dạng `nhóm.chức-năng`.
 */
export const NAV_CATALOG = {
  'mem.list': { label: 'Danh sách thành viên', icon: Users },
  'mem.scoring': { label: 'Chấm điểm', icon: Award },
  'mem.accounts': { label: 'Tài khoản thành viên', icon: UserCog },
  'mem.roles': { label: 'Vai trò & phân quyền', icon: ShieldCheck },
  'mem.history': { label: 'Lịch sử hoạt động', icon: History },
  'fin.periods': { label: 'Kỳ quỹ', icon: CalendarRange },
  'fin.income': { label: 'Thu quỹ', icon: ArrowDownCircle },
  'fin.expense': { label: 'Chi phí', icon: ArrowUpCircle },
  'fin.debts': { label: 'Công nợ', icon: HandCoins },
  'fin.reports': { label: 'Báo cáo', icon: BarChart3 },
  'fin.payments': { label: 'Xác nhận nộp quỹ', icon: BadgeCheck },
  'act.schedule': { label: 'Lịch', icon: CalendarDays },
  'act.registration': { label: 'Đăng ký', icon: CalendarPlus },
  'act.checkin': { label: 'Check-in', icon: LogIn },
  'act.attendance': { label: 'Điểm danh', icon: ClipboardCheck },
  'act.weekly': { label: 'Hoạt động tuần', icon: Activity },
  'cmp.overview': { label: 'Tổng quan thi đấu', icon: LayoutDashboard },
  'cmp.tournaments': { label: 'Giải đấu', icon: Trophy },
  'cmp.schedule': { label: 'Lịch đấu', icon: Swords },
  'cmp.results': { label: 'Kết quả', icon: FileCheck2 },
  'cmp.standings': { label: 'Xếp hạng', icon: Medal },
  'com.feed': { label: 'Bảng tin', icon: Newspaper },
  'com.match': { label: 'Tìm kèo', icon: Handshake },
  'com.moderation': { label: 'Kiểm duyệt', icon: ShieldCheck },
  'sys.notifications': { label: 'Thông báo', icon: Bell },
  'sys.billing': { label: 'Gói dịch vụ', icon: CreditCard },
  'sys.settings': { label: 'Cài đặt', icon: Settings },
  'me.receipt': { label: 'Phiếu thu', icon: Receipt },
  'me.contrib': { label: 'Lịch sử đóng quỹ', icon: Wallet },
  'me.attend': { label: 'Lịch tham gia', icon: CalendarCheck },
  'tre.income': { label: 'Nhập thu', icon: ArrowDownCircle },
  'tre.expense': { label: 'Nhập chi', icon: ArrowUpCircle },
  'tre.ledger': { label: 'Sổ quỹ', icon: BookOpen },
} satisfies Record<string, NavDef>

export type NavId = keyof typeof NAV_CATALOG

/** Thuộc tính `icon` + `menuLabel` cho một tab của module (trải ra bằng `...nav('fin.debts')`). */
export const nav = (id: NavId) => ({ icon: NAV_CATALOG[id].icon, menuLabel: NAV_CATALOG[id].label })
