import { Controller, Post, Get, Body, Patch, Req, HttpCode } from '@nestjs/common';
import { type Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser, Public } from '../common/decorators';
import { ok } from '../common/response';
import {
  LoginDto,
  RegisterClubDto,
  RefreshTokenDto,
  LogoutDto,
  ChangePasswordDto,
} from './auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: Request) {
    const result = await this.auth.login(body.username, body.password, {
      rememberMe: body.rememberMe,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return ok(result, 'Đăng nhập thành công');
  }

  @Public()
  @Throttle({ short: { ttl: 3600000, limit: 3 } })
  @Post('register')
  async register(@Body() body: RegisterClubDto) {
    return ok(await this.auth.register(body), 'Đăng ký CLB thành công');
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto, @Req() req: Request) {
    const result = await this.auth.refresh(body.refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return ok(result, 'Token đã được làm mới');
  }

  @ApiBearerAuth()
  @Post('logout')
  async logout(@Body() body: LogoutDto) {
    return ok(await this.auth.logout(body.refreshToken));
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() user: any) {
    return ok(await this.auth.me(user.userId));
  }

  @ApiBearerAuth()
  @Patch('change-password')
  async changePassword(
    @CurrentUser() user: any,
    @Body() body: ChangePasswordDto,
  ) {
    return ok(
      await this.auth.changePassword(
        user.userId,
        body.oldPassword,
        body.newPassword,
      ),
    );
  }
}
