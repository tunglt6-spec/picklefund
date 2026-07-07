import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Siết mutation minigame cho MEMBER_VIEW: chỉ member nằm trong danh sách ủy quyền
 * (Club.settings.minigameDelegateMemberIds) mới được tạo/quản lý giải.
 * GET luôn cho qua; role khác (CLUB_ADMIN...) do RolesGuard xử lý.
 */
@Injectable()
export class MinigameDelegateGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{
      user?: { role?: string; memberId?: string | null; clubId?: string };
      method?: string;
    }>();
    const user = req.user;
    const method = (req.method ?? 'GET').toUpperCase();
    if (method === 'GET') return true;
    if (!user || user.role !== 'MEMBER_VIEW') return true; // role khác do RolesGuard
    if (!user.memberId || !user.clubId)
      throw new ForbiddenException('Bạn chưa được ủy quyền quản lý minigame.');
    const club = await this.prisma.club.findUnique({
      where: { id: user.clubId },
      select: { settings: true },
    });
    const delegates =
      ((club?.settings as Record<string, unknown> | null)
        ?.minigameDelegateMemberIds as string[] | undefined) ?? [];
    if (!delegates.includes(user.memberId))
      throw new ForbiddenException('Bạn chưa được ủy quyền quản lý minigame.');
    return true;
  }
}
