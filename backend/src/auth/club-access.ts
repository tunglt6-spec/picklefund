import { UnauthorizedException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

/** Trạng thái CLB khiến mọi tài khoản thuộc CLB không được đăng nhập/gọi API (Super Admin không thuộc CLB nên không bị ảnh hưởng). */
export const BLOCKED_CLUB_STATUSES = ['suspended', 'deleted'];

export async function assertClubAccessible(
  prisma: Pick<PrismaService, 'club'>,
  user: { role: string; clubId: string | null },
): Promise<void> {
  if (user.role === 'SUPER_ADMIN' || !user.clubId) return;
  const club = await prisma.club.findUnique({ where: { id: user.clubId }, select: { status: true } });
  if (club && BLOCKED_CLUB_STATUSES.includes(club.status as string)) {
    throw new UnauthorizedException(
      club.status === 'suspended' ? 'CLB đang bị tạm khóa. Vui lòng liên hệ quản trị nền tảng.' : 'CLB không còn hoạt động.',
    );
  }
}
