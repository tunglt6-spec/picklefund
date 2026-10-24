import {
  Users, Award, UserCog, ShieldCheck, History, CalendarRange, ArrowDownCircle, ArrowUpCircle, HandCoins, BarChart3, BadgeCheck,
  CalendarDays, CalendarPlus, LogIn, ClipboardCheck, Activity, LayoutDashboard, Trophy, Swords, FileCheck2, Medal,
  Newspaper, Handshake, Bell, CreditCard, Settings, Receipt, Wallet, CalendarCheck, BookOpen, type LucideIcon,
} from 'lucide-react'

import type { ModuleKey } from './hubApps'

export interface NavDef { label: string; icon: LucideIcon; module: ModuleKey }

/**
 * DANH MỤC TÊN–ICON DÙNG CHUNG cho điều hướng mobile: lối tắt Tổng quan, lưới phân hệ (ModuleTabs) và trang Ứng dụng
 * đều lấy từ đây → cùng một chức năng luôn cùng tên và cùng icon. Khóa dạng `nhóm.chức-năng`.
 */
export const NAV_CATALOG = {
  'mem.list': { label: 'Danh sách thành viên', icon: Users, module: 'members' },
  'mem.scoring': { label: 'Chấm điểm', icon: Award, module: 'members' },
  'mem.accounts': { label: 'Tài khoản thành viên', icon: UserCog, module: 'members' },
  'mem.roles': { label: 'Vai trò & phân quyền', icon: ShieldCheck, module: 'members' },
  'mem.history': { label: 'Lịch sử hoạt động', icon: History, module: 'members' },
  'fin.periods': { label: 'Kỳ quỹ', icon: CalendarRange, module: 'finance' },
  'fin.income': { label: 'Thu quỹ', icon: ArrowDownCircle, module: 'finance' },
  'fin.expense': { label: 'Chi phí', icon: ArrowUpCircle, module: 'finance' },
  'fin.debts': { label: 'Công nợ', icon: HandCoins, module: 'finance' },
  'fin.reports': { label: 'Báo cáo', icon: BarChart3, module: 'finance' },
  'fin.payments': { label: 'Xác nhận nộp quỹ', icon: BadgeCheck, module: 'finance' },
  'act.schedule': { label: 'Lịch', icon: CalendarDays, module: 'activity' },
  'act.registration': { label: 'Đăng ký', icon: CalendarPlus, module: 'activity' },
  'act.checkin': { label: 'Check-in', icon: LogIn, module: 'activity' },
  'act.attendance': { label: 'Điểm danh', icon: ClipboardCheck, module: 'activity' },
  'act.weekly': { label: 'Hoạt động tuần', icon: Activity, module: 'activity' },
  'cmp.overview': { label: 'Tổng quan thi đấu', icon: LayoutDashboard, module: 'compete' },
  'cmp.tournaments': { label: 'Giải đấu', icon: Trophy, module: 'compete' },
  'cmp.schedule': { label: 'Lịch đấu', icon: Swords, module: 'compete' },
  'cmp.results': { label: 'Kết quả', icon: FileCheck2, module: 'compete' },
  'cmp.standings': { label: 'Xếp hạng', icon: Medal, module: 'compete' },
  'com.feed': { label: 'Bảng tin', icon: Newspaper, module: 'community' },
  'com.match': { label: 'Tìm kèo', icon: Handshake, module: 'community' },
  'com.moderation': { label: 'Kiểm duyệt', icon: ShieldCheck, module: 'community' },
  'sys.notifications': { label: 'Thông báo', icon: Bell, module: 'system' },
  'sys.billing': { label: 'Gói dịch vụ', icon: CreditCard, module: 'system' },
  'sys.settings': { label: 'Cài đặt', icon: Settings, module: 'system' },
  'me.receipt': { label: 'Phiếu thu', icon: Receipt, module: 'finance' },
  'me.contrib': { label: 'Lịch sử đóng quỹ', icon: Wallet, module: 'finance' },
  'me.attend': { label: 'Lịch tham gia', icon: CalendarCheck, module: 'activity' },
  'tre.income': { label: 'Nhập thu', icon: ArrowDownCircle, module: 'finance' },
  'tre.expense': { label: 'Nhập chi', icon: ArrowUpCircle, module: 'finance' },
  'tre.ledger': { label: 'Sổ quỹ', icon: BookOpen, module: 'finance' },
} satisfies Record<string, NavDef>

export type NavId = keyof typeof NAV_CATALOG

/** Thuộc tính `icon` + `menuLabel` cho một tab của module (trải ra bằng `...nav('fin.debts')`). */
export const nav = (id: NavId) => ({ icon: NAV_CATALOG[id].icon, menuLabel: NAV_CATALOG[id].label, module: NAV_CATALOG[id].module })
