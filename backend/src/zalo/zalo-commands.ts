/** Lệnh tra cứu/thao tác nhanh trong nhóm hoặc chat riêng với bot Zalo (không phải /thu /chi /lienket /ketnoi). */
export type ZaloCommandName =
  | 'quy'
  | 'congno'
  | 'lich'
  | 'bxh'
  | 'dangky'
  | 'huy'
  | 'diemdanh'
  | 'no'
  | 'help';

export interface ZaloCommand {
  name: ZaloCommandName;
  /** Số thứ tự buổi chơi (1-based) cho /dangky, /huy; undefined = buổi gần nhất. */
  index?: number;
}

const ALIAS: Record<string, ZaloCommandName> = {
  quy: 'quy',
  congno: 'congno',
  lich: 'lich',
  bxh: 'bxh',
  dangky: 'dangky',
  huy: 'huy',
  huydangky: 'huy',
  diemdanh: 'diemdanh',
  no: 'no',
  help: 'help',
  trogiup: 'help',
  lenh: 'help',
};

/**
 * Nhận diện lệnh ở bất kỳ vị trí đứng sau @mention của bot, vd "@Bot /quy", "/dangky 2".
 * Chỉ lệnh nằm CUỐI tin (tối đa 1 tham số số) mới hợp lệ — tránh bắt nhầm đoạn chat thường có dấu "/".
 */
export function parseZaloCommand(text: string): ZaloCommand | null {
  const match = text
    .trim()
    .match(/(?:^|\s)\/([a-z]{2,12})(?:\s+(\d{1,2}))?$/i);
  if (!match) return null;
  const name = ALIAS[match[1].toLowerCase()];
  if (!name) return null;
  return { name, index: match[2] ? Number(match[2]) : undefined };
}

export const ZALO_HELP_TEXT = [
  'Lệnh của bot CLB:',
  '/quy — số dư quỹ chính và quỹ phụ',
  '/congno — số thành viên chưa đóng quỹ kỳ hiện tại',
  '/lich — các buổi chơi sắp tới',
  '/bxh — bảng xếp hạng giải đang diễn ra',
  '/dangky [số] và /huy [số] — đăng ký / hủy buổi chơi (cần liên kết tài khoản)',
  '/diemdanh — tự điểm danh buổi chơi hôm nay (cần liên kết tài khoản)',
  '/no — xem khoản chưa đóng của bạn (cần liên kết tài khoản)',
  'Liên kết tài khoản: trong app → mục Liên kết Zalo, rồi nhắn riêng cho bot /lienket MÃ.',
].join('\n');
