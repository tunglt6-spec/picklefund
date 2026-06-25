import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;

    if (user.role === 'SUPER_ADMIN') return true;

    if (!user.clubId)
      throw new ForbiddenException('Tài khoản chưa được gắn với CLB nào');

    // Inject clubId from JWT into request for downstream use
    req.clubId = user.clubId;
    return true;
  }
}
