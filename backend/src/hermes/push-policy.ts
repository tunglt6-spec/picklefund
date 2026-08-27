/**
 * Chính sách Web Push DÙNG CHUNG cho MỌI luồng gửi push (Hermes events + AI Action runtime).
 * Trước đây logic này chỉ nằm trong HermesService (private) nên luồng NotificationRuntime
 * (thông báo AI Action) đẩy push VÔ ĐIỀU KIỆN — bỏ qua enabled/quiet-hours/muted. Gom về 1
 * nguồn để 2 luồng hành xử GIỐNG HỆT nhau.
 */

export interface PushPref {
  enabled?: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  pushMutedCategories?: string[];
}

/**
 * Nhóm push (member/admin tự tắt theo nhóm) — ĐỒNG BỘ với bộ lọc thông báo FE (catOf) +
 * push categories. 5 key: community · finance · ai · system · activity. Check community/finance
 * TRƯỚC ai để 'community_report' (chứa 'report') không rơi nhầm 'ai'.
 */
export function pushCategoryOf(eventType: string): string {
  const s = (eventType || '').toLowerCase();
  if (s.includes('community') || s.includes('matchmaking')) return 'community';
  if (s.includes('payment') || s.includes('fund')) return 'finance';
  if (/brief|report|maika|insight|suggest|recommend|\bai\b/.test(s)) return 'ai';
  if (/anomaly|health|system|config|error/.test(s)) return 'system';
  return 'activity';
}

/** Giờ yên tĩnh (theo giờ máy chủ). start>end → vắt qua nửa đêm. */
export function isQuietHoursNow(start: number, end: number): boolean {
  const hour = new Date().getHours();
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}

/**
 * Có nên BUZZ push không (in-app notification vẫn luôn ghi đủ; đây chỉ quyết định push):
 *  - pref.enabled=false → tắt hẳn.
 *  - Quiet-hours (trừ HIGH = việc gấp) → không buzz ban đêm.
 *  - pushMutedCategories chứa nhóm của eventType → user đã tắt nhóm này.
 */
export function shouldPushNow(
  eventType: string,
  priority: string,
  pref: PushPref | null,
): boolean {
  if (pref && pref.enabled === false) return false;
  const isHigh = priority === 'HIGH';
  if (!isHigh && pref && isQuietHoursNow(pref.quietHoursStart, pref.quietHoursEnd)) {
    return false;
  }
  if (
    pref?.pushMutedCategories?.length &&
    pref.pushMutedCategories.includes(pushCategoryOf(eventType))
  ) {
    return false;
  }
  return true;
}

/** Đường dẫn mở khi bấm push, theo vai trò (admin ≠ member route). */
export function notifRouteForRole(role: string | null | undefined): string {
  return role === 'MEMBER_VIEW' ? '/member/notifications' : '/notifications';
}
