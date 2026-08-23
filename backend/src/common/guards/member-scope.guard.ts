import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * MemberScopeGuard (AUTH-IMPL-01, mở rộng portal member) — giới hạn phạm vi cho MEMBER_VIEW.
 *
 * MEMBER_VIEW được:
 * - Truy cập nhóm route "của chính mình" mọi method (member portal, auth self-service,
 *   phiếu thu cá nhân, thông báo cá nhân, trợ lý Lisa).
 * - ĐỌC (GET-only) dữ liệu toàn CLB phục vụ portal: lịch chơi / đăng ký / check-in /
 *   công nợ / tài chính / danh sách thành viên / thông tin CLB.
 * - Minigame mọi method — mutation do MinigameDelegateGuard siết (chỉ member được ủy quyền).
 * MỌI route quản trị khác (reports, users, clubs quản trị, ...) hoặc mutation ngoài allowlist
 * bị chặn 403 — kể cả khi handler không khai báo @Roles. Guard này KHÔNG ảnh hưởng role khác
 * (SUPER_ADMIN / CLUB_ADMIN / CLUB_TREASURER đi qua bình thường).
 *
 * Bảo mật không tin client: phạm vi dữ liệu thực tế vẫn do các service suy ra từ JWT
 * (memberId / clubId / userId). Guard này là lớp phòng thủ theo route (defense-in-depth).
 */
@Injectable()
export class MemberScopeGuard implements CanActivate {
  /** Tiền tố route member được phép (so khớp sau khi bỏ prefix /api). */
  private static readonly ALLOW_PREFIXES = [
    '/member',
    '/auth',
    '/lisa',
    '/hermes/notifications',
    // Cài đặt thông báo của CHÍNH member (GET/PATCH) — service scope theo userId từ JWT.
    '/hermes/preferences',
    // Cộng đồng CLB (Member Experience v1): member được tạo/đọc/tương tác nội dung
    // trong CLB của mình. Service tự scope theo clubId/memberId từ JWT (không tin client);
    // sửa/xóa chỉ nội dung của chính mình, kiểm duyệt do handler check role admin.
    '/community',
    // Web Push (PWA): member đăng ký/hủy nhận thông báo đẩy trên thiết bị của mình.
    '/push',
  ];

  /** Route chính xác được phép (self-scope; không lộ thông tin member khác). */
  private static readonly ALLOW_EXACT = [
    '/personal-receipts/mine',
    // Văn phòng AI read-only cho member (đồng bộ Office View với admin AIDO):
    // chỉ số liệu tổng hợp hoạt động/kết quả agent, KHÔNG lộ endpoint quản trị /aido khác.
    '/aido/member-office',
  ];

  /**
   * Tiền tố route member được đọc (GET-only) — mở rộng portal: lịch/đăng ký/check-in/công nợ/tài chính/minigame.
   * '/scoring' + '/categories' bổ sung để member CHỈ XEM màn Chấm điểm & danh mục Chi Phí
   * (mutation của 2 module này vẫn bị chặn: không phải GET + có @Roles admin/treasurer).
   */
  private static readonly ALLOW_GET_PREFIXES = [
    '/attendance',
    '/fund-periods',
    '/contributions',
    '/expenses',
    '/members',
    '/clubs/me',
    '/scoring',
    '/categories',
  ];

  /** Minigame: cho qua mọi method — mutation do MinigameDelegateGuard siết (chỉ member được ủy quyền). */
  private static readonly ALLOW_ALL_METHOD_PREFIXES = ['/minigames'];

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{
      user?: { role?: string };
      path?: string;
      url?: string;
      method?: string;
    }>();
    const user = req.user;

    // Chỉ áp dụng cho MEMBER_VIEW; role khác do các guard khác xử lý.
    if (!user || user.role !== 'MEMBER_VIEW') return true;

    const path = this.normalize(req.path ?? req.url ?? '');
    const method = (req.method ?? 'GET').toUpperCase();
    const allowed =
      MemberScopeGuard.ALLOW_EXACT.includes(path) ||
      MemberScopeGuard.ALLOW_PREFIXES.some(
        (p) => path === p || path.startsWith(p + '/'),
      ) ||
      MemberScopeGuard.ALLOW_ALL_METHOD_PREFIXES.some(
        (p) => path === p || path.startsWith(p + '/'),
      ) ||
      (method === 'GET' &&
        MemberScopeGuard.ALLOW_GET_PREFIXES.some(
          (p) => path === p || path.startsWith(p + '/'),
        ));

    if (!allowed) {
      throw new ForbiddenException(
        'Tài khoản thành viên chỉ được truy cập dữ liệu cá nhân.',
      );
    }
    return true;
  }

  /** Bỏ query string + prefix /api + dấu / cuối để so khớp ổn định. */
  private normalize(raw: string): string {
    let p = raw.split('?')[0];
    if (p.startsWith('/api/')) p = p.slice(4);
    else if (p === '/api') p = '/';
    if (p.length > 1 && p.endsWith('/')) p = p.replace(/\/+$/, '');
    return p;
  }
}
