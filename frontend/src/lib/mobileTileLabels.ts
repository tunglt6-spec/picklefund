import { fold } from './fold'

/** Compact captions only; canonical labels, routes and icon identities stay intact. */
const SHORT_LABELS: Record<string, string> = {
  'Danh sách thành viên': 'Thành viên',
  'Tài khoản thành viên': 'Tài khoản',
  'Quy tắc chấm điểm': 'Quy tắc',
  'Vai trò & phân quyền': 'Phân quyền',
  'Lịch sử hoạt động': 'Lịch sử',
  'Xác nhận nộp quỹ': 'Xác nhận',
  'Hoạt động tuần': 'Theo tuần',
  'Tổng quan thi đấu': 'Tổng quan',
  'Tổng quan cá nhân': 'Tổng quan',
  'Lịch sử đóng quỹ': 'Đóng quỹ',
  'Trung tâm điều hành AI': 'Điều hành',
  'Báo cáo điều hành': 'Báo cáo',
  'Giám sát dữ liệu': 'Dữ liệu',
  'Chỉ số vận hành': 'Chỉ số',
  'Trung tâm thông báo': 'Thông báo',
  'Trung tâm cảnh báo': 'Cảnh báo',
  'Luật tự động hóa': 'Tự động hóa',
  'Nhật ký kiểm toán': 'Kiểm toán',
  'Nhật ký thực thi (Mít Đặc)': 'Thực thi',
  'Nhật ký phân tích (Maika)': 'Phân tích',
  'Nhật ký hỏi–đáp (Lisa)': 'Hỏi đáp',
  'Thông tin CLB': 'CLB',
  'Tài khoản cá nhân': 'Tài khoản',
}

export const mobileTileLabel = (label: string): string => SHORT_LABELS[label] ?? label

/** Search accepts both the displayed caption and the original descriptive name. */
export function matchesMobileTile(label: string, query: string): boolean {
  const q = fold(query.trim())
  return fold(label).includes(q) || fold(mobileTileLabel(label)).includes(q)
}
