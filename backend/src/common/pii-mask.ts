/**
 * Che PII thành viên cho MEMBER_VIEW (read-only) — lớp phòng thủ ở tầng API.
 * UI MEMBER_VIEW vẫn hiển thị chuỗi (đã che) bình thường; shape response không đổi.
 */

export interface PiiViewer {
  role?: string;
  userId?: string | null;
  memberId?: string | null;
}

/** '0912345678' -> '09******78'. Chuỗi quá ngắn che hết trừ 1 ký tự đầu. */
export function maskPhone(phone: string | null | undefined): string | null {
  if (phone === null || phone === undefined) return null;
  const s = String(phone).trim();
  if (!s) return s;
  if (s.length <= 4) return s[0] + '*'.repeat(s.length - 1);
  return s.slice(0, 2) + '*'.repeat(s.length - 4) + s.slice(-2);
}

/** 'abc@gmail.com' -> 'a***@gmail.com'. Không có '@' => che phần sau ký tự đầu. */
export function maskEmail(email: string | null | undefined): string | null {
  if (email === null || email === undefined) return null;
  const s = String(email).trim();
  if (!s) return s;
  const at = s.lastIndexOf('@');
  if (at <= 0) return s[0] + '***';
  return s[0] + '***' + s.slice(at);
}

function isSelf(m: Record<string, unknown>, v: PiiViewer): boolean {
  if (v.memberId && m.id === v.memberId) return true;
  if (v.userId && (m.userId === v.userId || m.id === v.userId)) return true;
  return false;
}

/** Object "giống thành viên": có fullName và có ít nhất 1 trường liên hệ/nội bộ. */
export function looksLikeMember(o: Record<string, unknown>): boolean {
  return (
    typeof o.fullName === 'string' &&
    ('phone' in o || 'email' in o || 'notes' in o)
  );
}

/**
 * Trả bản sao member đã che nếu viewer là MEMBER_VIEW và member không phải chính họ.
 * Role khác / chính chủ: trả nguyên object. Luôn xóa hash/mật khẩu nếu lỡ có.
 */
export function maskMemberPii<T extends Record<string, any>>(
  member: T,
  viewer: PiiViewer | null | undefined,
): T {
  if (!member || typeof member !== 'object') return member;
  if (!viewer || viewer.role !== 'MEMBER_VIEW') return member;
  const out: Record<string, any> = { ...member };
  delete out.passwordHash; // không bao giờ trả hash
  delete out.password;
  if (isSelf(member, viewer)) return out as T;
  delete out.loginName;
  if ('phone' in out) out.phone = maskPhone(out.phone);
  if ('email' in out) out.email = maskEmail(out.email);
  if ('notes' in out) out.notes = null; // ghi chú nội bộ của admin
  return out as T;
}

/** Duyệt đệ quy response, che mọi object giống thành viên của người khác. */
export function maskPiiDeep(value: unknown, viewer: PiiViewer, depth = 0): unknown {
  if (depth > 12 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((x) => maskPiiDeep(x, viewer, depth + 1));
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value; // Date, Decimal, ...
  const obj = value as Record<string, unknown>;
  const base = looksLikeMember(obj) ? maskMemberPii(obj, viewer) : obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(base)) out[k] = maskPiiDeep(v, viewer, depth + 1);
  return out;
}
