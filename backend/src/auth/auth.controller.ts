import { Controller, Post, Get, Body, Patch, Req } from '@nestjs/common'
import { type Request } from 'express'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { CurrentUser, Public } from '../common/decorators'
import { ok } from '../common/response'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: { username: string; password: string; rememberMe?: boolean }, @Req() req: Request) {
    const result = await this.auth.login(body.username, body.password, {
      rememberMe: body.rememberMe,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    return ok(result, 'Đăng nhập thành công')
  }

  @Public()
  @Post('register')
  async register(@Body() body: { club: any; admin: any }) {
    return ok(await this.auth.register(body), 'Đăng ký CLB thành công')
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }, @Req() req: Request) {
    const result = await this.auth.refresh(body.refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    return ok(result, 'Token đã được làm mới')
  }

  @ApiBearerAuth()
  @Post('logout')
  async logout(@Body() body: { refreshToken: string }) {
    return ok(await this.auth.logout(body.refreshToken))
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() user: any) {
    return ok(await this.auth.me(user.userId))
  }

  @ApiBearerAuth()
  @Patch('change-password')
  async changePassword(@CurrentUser() user: any, @Body() body: { oldPassword: string; newPassword: string }) {
    return ok(await this.auth.changePassword(user.userId, body.oldPassword, body.newPassword))
  }
}
