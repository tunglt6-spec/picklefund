import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MemberUsersService } from './member-users.service';
import { CurrentUser, Roles} from '../common/decorators';
import { ok } from '../common/response';

@ApiTags('Member Users')
@ApiBearerAuth()
@Controller('member-users')
export class MemberUsersController {
  constructor(private svc: MemberUsersService) {}

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Get()
  async findAll(@CurrentUser() user: any) {
    return ok(await this.svc.findAll(user.clubId));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post()
  async create(
    @CurrentUser() user: any,
    @Body()
    body: {
      memberId: string;
      username?: string;
      email?: string;
      mustChangePassword?: boolean;
      notificationEnabled?: boolean;
    },
  ) {
    return ok(
      await this.svc.create(user.clubId, user.userId, body),
      'Tạo tài khoản thành công',
    );
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('bulk-create')
  async bulkCreate(
    @CurrentUser() user: any,
    @Body()
    body: {
      memberIds: string[];
      mustChangePassword?: boolean;
      notificationEnabled?: boolean;
    },
  ) {
    return ok(
      await this.svc.bulkCreate(user.clubId, user.userId, body),
      'Tạo tài khoản hàng loạt hoàn tất',
    );
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post('preview-bulk')
  async previewBulk(
    @CurrentUser() user: any,
    @Body() body: { memberIds: string[] },
  ) {
    return ok(await this.svc.previewBulk(user.clubId, body.memberIds));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.svc.resetPassword(id, user.userId, user.clubId));
  }

  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
    @CurrentUser() user: any,
  ) {
    return ok(
      await this.svc.updateStatus(id, body.isActive, user.userId, user.clubId),
    );
  }
}
