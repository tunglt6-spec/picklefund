import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as argon2 from 'argon2'
import { createHash } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private signAccess(userId: string, clubId: string | null, role: string) {
    return this.jwt.sign(
      { sub: userId, clubId, role },
      { secret: this.config.get('JWT_SECRET'), expiresIn: this.config.get('JWT_EXPIRES_IN', '15m') },
    )
  }

  private signRefresh(userId: string, rememberMe = false) {
    const expiresIn = rememberMe
      ? this.config.get('JWT_REFRESH_REMEMBER_EXPIRES_IN', '90d')
      : this.config.get('JWT_REFRESH_EXPIRES_IN', '30d')
    return this.jwt.sign(
      { sub: userId, type: 'refresh' },
      { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn },
    )
  }

  private getRefreshExpiry(rememberMe = false): Date {
    const days = rememberMe ? 90 : 30
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d
  }

  async login(username: string, password: string, opts?: { rememberMe?: boolean; ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { member: { select: { id: true } } },
    })
    if (!user || !user.isActive) throw new UnauthorizedException('Tài khoản không tồn tại hoặc bị khóa')

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) throw new UnauthorizedException('Mật khẩu không đúng')

    const accessToken = this.signAccess(user.id, user.clubId, user.role)
    const refreshToken = this.signRefresh(user.id, opts?.rememberMe)

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: this.hashToken(refreshToken),
        expiresAt: this.getRefreshExpiry(opts?.rememberMe),
        ipAddress: opts?.ip,
        userAgent: opts?.userAgent,
      },
    })

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, clubId: user.clubId, memberId: user.member?.id ?? null },
    }
  }

  async refresh(token: string, opts?: { ip?: string; userAgent?: string }) {
    let payload: any
    try {
      payload = this.jwt.verify(token, { secret: this.config.get('JWT_REFRESH_SECRET') })
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn')
    }

    const hashed = this.hashToken(token)
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: hashed } })
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token đã bị thu hồi hoặc hết hạn')
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.isActive) throw new UnauthorizedException('Tài khoản không hợp lệ')

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })

    const rememberMe = (stored.expiresAt.getTime() - stored.createdAt.getTime()) > 30 * 24 * 3600 * 1000
    const newAccess = this.signAccess(user.id, user.clubId, user.role)
    const newRefresh = this.signRefresh(user.id, rememberMe)

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: this.hashToken(newRefresh),
        expiresAt: this.getRefreshExpiry(rememberMe),
        ipAddress: opts?.ip,
        userAgent: opts?.userAgent,
      },
    })

    return { accessToken: newAccess, refreshToken: newRefresh }
  }

  async logout(token: string) {
    const hashed = this.hashToken(token)
    await this.prisma.refreshToken.updateMany({
      where: { token: hashed, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return { message: 'Đăng xuất thành công' }
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, role: true, clubId: true, member: { select: { id: true, fullName: true } } },
    })
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new BadRequestException('User không tồn tại')
    const valid = await argon2.verify(user.passwordHash, oldPassword)
    if (!valid) throw new BadRequestException('Mật khẩu cũ không đúng')
    const hash = await argon2.hash(newPassword)
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } })
    return { message: 'Đổi mật khẩu thành công' }
  }

  async resetPassword(targetUserId: string, newPassword: string) {
    const hash = await argon2.hash(newPassword)
    await this.prisma.user.update({ where: { id: targetUserId }, data: { passwordHash: hash } })
    return { message: 'Reset mật khẩu thành công' }
  }
}
