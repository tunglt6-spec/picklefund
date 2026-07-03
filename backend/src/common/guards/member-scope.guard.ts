import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * MemberScopeGuard (AUTH-IMPL-01) — enforce read-only self-scope cho MEMBER_VIEW ở tầng backend.
 *
 * MEMBER_VIEW chỉ được truy cập nhóm route "của chính mình" (member portal, auth self-service,
 * phiếu thu cá nhân, thông báo cá nhân, trợ lý Lisa). MỌI route quản trị (members, fund-periods,
 * attendance, contributions, expenses, minigames, reports, users, clubs, ...) bị chặn 403 —
 * kể cả khi handler không khai báo @Roles. Guard này KHÔNG ảnh hưởng các role khác
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
  ];

  /** Route chính xác được phép (self-scope; không lộ thông tin member khác). */
  private static readonly ALLOW_EXACT = ['/personal-receipts/mine'];

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{
      user?: { role?: string };
      path?: string;
      url?: string;
    }>();
    const user = req.user;

    // Chỉ áp dụng cho MEMBER_VIEW; role khác do các guard khác xử lý.
    if (!user || user.role !== 'MEMBER_VIEW') return true;

    const path = this.normalize(req.path ?? req.url ?? '');
    const allowed =
      MemberScopeGuard.ALLOW_EXACT.includes(path) ||
      MemberScopeGuard.ALLOW_PREFIXES.some(
        (p) => path === p || path.startsWith(p + '/'),
      );

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
