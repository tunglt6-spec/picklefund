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

  private signAccess(userId: string, clubId: string | null, role: string, memberId?: string | null) {
    return this.jwt.sign(
      { sub: userId, clubId, role, memberId: memberId ?? null },
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

    const accessToken = this.signAccess(user.id, user.clubId, user.role, user.member?.id)
    const refreshToken = this.signRefresh(user.id, opts?.rememberMe)

    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: this.hashToken(refreshToken),
          expiresAt: this.getRefreshExpiry(opts?.rememberMe),
          ipAddress: opts?.ip,
          userAgent: opts?.userAgent,
        },
      }),
      this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    ])

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id, username: user.username, email: user.email,
        role: user.role, clubId: user.clubId, memberId: user.member?.id ?? null,
        mustChangePassword: user.mustChangePassword,
      },
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

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { member: { select: { id: true } } },
    })
    if (!user || !user.isActive) throw new UnauthorizedException('Tài khoản không hợp lệ')

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })

    const rememberMe = (stored.expiresAt.getTime() - stored.createdAt.getTime()) > 30 * 24 * 3600 * 1000
    const newAccess = this.signAccess(user.id, user.clubId, user.role, user.member?.id)
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

  async register(dto: {
    club: { name: string; code: string; address?: string; contactPhone?: string; contactEmail?: string }
    admin: { fullName: string; username: string; email?: string; password: string }
  }) {
    const existing = await this.prisma.user.findUnique({ where: { username: dto.admin.username } })
    if (existing) throw new BadRequestException('Tên tài khoản đã tồn tại')

    const clubCode = await this.prisma.club.findFirst({ where: { code: dto.club.code } })
    if (clubCode) throw new BadRequestException('Mã CLB đã được sử dụng')

    const hash = await argon2.hash(dto.admin.password)

    const result = await this.prisma.$transaction(async (tx) => {
      const club = await tx.club.create({ data: { name: dto.club.name, code: dto.club.code, address: dto.club.address, contactPhone: dto.club.contactPhone, contactEmail: dto.club.contactEmail } })
      const user = await tx.user.create({ data: { username: dto.admin.username, email: dto.admin.email || `${dto.admin.username}@picklefund.vn`, passwordHash: hash, role: 'CLUB_ADMIN', clubId: club.id } })
      const member = await tx.member.create({ data: { clubId: club.id, fullName: dto.admin.fullName, joinDate: new Date(), status: 'active', userId: user.id } })
      return { club, user, member }
    })

    const accessToken = this.signAccess(result.user.id, result.club.id, 'CLUB_ADMIN')
    const refreshToken = this.signRefresh(result.user.id)
    await this.prisma.refreshToken.create({ data: { userId: result.user.id, token: this.hashToken(refreshToken), expiresAt: this.getRefreshExpiry() } })

    return {
      accessToken,
      refreshToken,
      user: { id: result.user.id, username: result.user.username, email: result.user.email, role: 'CLUB_ADMIN', clubId: result.club.id, memberId: result.member.id },
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new BadRequestException('User không tồn tại')
    const valid = await argon2.verify(user.passwordHash, oldPassword)
    if (!valid) throw new BadRequestException('Mật khẩu cũ không đúng')
    if (newPassword.length < 6) throw new BadRequestException('Mật khẩu mới tối thiểu 6 ký tự')
    if (newPassword === '123456') throw new BadRequestException('Không được dùng mật khẩu mặc định 123456')
    const hash = await argon2.hash(newPassword)
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash, mustChangePassword: false } })
    return { message: 'Đổi mật khẩu thành công' }
  }

  async resetPassword(targetUserId: string, newPassword: string) {
    const hash = await argon2.hash(newPassword)
    await this.prisma.user.update({ where: { id: targetUserId }, data: { passwordHash: hash } })
    return { message: 'Reset mật khẩu thành công' }
  }
}
