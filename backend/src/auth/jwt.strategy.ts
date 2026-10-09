import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { assertClubAccessible } from './club-access';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // Cache ngắn (30s) trạng thái CLB theo clubId để không thêm 1 truy vấn cho MỖI request.
  private readonly clubOk = new Map<string, number>();

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    clubId: string | null;
    role: string;
    memberId?: string | null;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();
    if (user.role !== 'SUPER_ADMIN' && user.clubId) {
      const until = this.clubOk.get(user.clubId) ?? 0;
      if (until < Date.now()) {
        await assertClubAccessible(this.prisma, user);
        this.clubOk.set(user.clubId, Date.now() + 30_000);
      }
    }
    return {
      userId: user.id,
      clubId: user.clubId,
      role: user.role,
      username: user.username,
      memberId: payload.memberId ?? null,
    };
  }
}
